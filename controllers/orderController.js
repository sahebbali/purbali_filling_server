import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Coupon from "../models/couponModel.js";
import User from "../models/userModel.js";
import {
  updateStockQuantity,
  updateUserAddress,
  updateUserTotalOrder,
} from "../utils/index.js";
import { sendOrderStatusMail } from "../email/sendOrderStatusMail.js";
import { sendOrderConfirmationEmail } from "../email/sendOrderConfirmationEmail.js";

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getAllOrdersAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
    } = req.query;

    let query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .sort("-createdAt")
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    console.log("Fetching order with ID:", req.params.id); // Debug log
    const order = await Order.findOne({
      $or: [{ orderId: req.params.id }],
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const requester = req.auth.email;
    const currentCustomer = await User.findOne({ email: requester });
    if (!currentCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer not found for the authenticated user",
      });
    }

    // console.log("Requester email from token:", requester);
    const { items, shipping, shippingAddress, payment, notes, coupon } =
      req.body;

    const customer = {
      name: currentCustomer.name,
      email: currentCustomer.email,
      phone: currentCustomer.phone || "",
      address: currentCustomer.address || "",
    };
    // console.log("Creating order with data:", req.body);

    // Validation
    if (!customer || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: "Customer information and items are required",
      });
    }

    // Calculate totals
    let subtotal = 0;
    let itemsCount = 0;
    const orderItems = [];

    for (let item of items) {
      // Find product by SKU or ID or name
      let product;
      if (item.product) {
        product = await Product.findById(item.product);
      } else if (item.name) {
        product = await Product.findOne({ name: item.name });
      } else if (item.slug) {
        product = await Product.findOne({ slug: item.slug });
      }

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ${
            item.sku || item.name || item.product
          } not found`,
        });
      }

      // Check if product is active
      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product "${product.name}" is not available`,
        });
      }

      // Get the price (use originalPrice if available, otherwise regularPrice)
      const price =
        product.originalPrice && product.originalPrice < product.regularPrice
          ? product.originalPrice
          : product.regularPrice;

      // Check stock availability
      const requestedQuantity = item.quantity;
      if (product.stockQuantity < requestedQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}, Requested: ${requestedQuantity}`,
        });
      }

      // Calculate item subtotal
      const itemSubtotal = price * requestedQuantity;
      subtotal += itemSubtotal;
      itemsCount += requestedQuantity;

      // Prepare order item
      orderItems.push({
        product: product._id,
        name: product.name,
        image: item.image,
        sku: product.sku || product.slug,
        quantity: requestedQuantity,
        price: price,
        selectedColor: item.colorId || null,
        selectedSize: item.sizeId || null,
        originalPrice: product.regularPrice,
        discount: product.originalPrice
          ? product.regularPrice - product.originalPrice
          : 0,
      });

      // Update stock
      product.stockQuantity -= requestedQuantity;

      // Add low stock alert if needed
      if (product.stockQuantity <= product.lowStockThreshold) {
        console.log(
          `Low stock alert: ${product.name} has only ${product.stockQuantity} units left`,
        );
      }

      await product.save();
    }

    // Calculate taxes and totals
    const taxRate = 0.08; // 8% tax - changed to match frontend
    const tax = subtotal * taxRate;
    let total = subtotal + (shipping || 0) + tax;
    let discountAmount = 0;
    let appliedCoupon = null;

    // Apply coupon if provided
    if (coupon && coupon.code) {
      try {
        const validCoupon = await Coupon.findOne({
          code: coupon.code.toUpperCase(),
          isActive: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        });

        if (validCoupon) {
          // Check minimum purchase requirement
          if (subtotal >= validCoupon.minPurchase) {
            // Check usage limit
            if (
              validCoupon.usageLimit === 0 ||
              validCoupon.usedCount < validCoupon.usageLimit
            ) {
              // Check if user has already used this coupon
              const userCouponUsage = validCoupon.usedBy?.some(
                (u) => u.userEmail === currentCustomer.email,
              );

              if (!userCouponUsage || validCoupon.userLimit > 1) {
                // Calculate discount
                if (validCoupon.discountType === "percentage") {
                  discountAmount = (subtotal * validCoupon.discountValue) / 100;
                  // Cap discount at subtotal
                  discountAmount = Math.min(discountAmount, subtotal);
                } else if (validCoupon.discountType === "fixed") {
                  discountAmount = validCoupon.discountValue;
                  // Cap discount at subtotal
                  discountAmount = Math.min(discountAmount, subtotal);
                }

                // Update total after discount
                total = total - discountAmount;

                // Track coupon usage
                await Coupon.findByIdAndUpdate(validCoupon._id, {
                  $inc: { usedCount: 1 },
                  $push: {
                    usedBy: {
                      userId: currentCustomer._id,
                      userEmail: currentCustomer.email,
                      usedAt: new Date(),
                      orderAmount: subtotal,
                      discountAmount: discountAmount,
                    },
                  },
                });

                appliedCoupon = {
                  code: validCoupon.code,
                  discountType: validCoupon.discountType,
                  discountValue: validCoupon.discountValue,
                  discountAmount: parseFloat(discountAmount.toFixed(2)),
                };
              }
            }
          }
        }
      } catch (couponError) {
        console.error("Error applying coupon:", couponError);
        // Don't fail the order if coupon is invalid, just proceed without discount
      }
    }

    // Generate unique order ID
    const orderCount = await Order.countDocuments();
    const orderId = `ORD-${String(orderCount + 1).padStart(4, "0")}`;

    // Create order
    const order = new Order({
      orderId,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        address: customer.address,
      },
      items: orderItems,
      itemsCount,
      subtotal: parseFloat(subtotal.toFixed(2)),
      shipping: parseFloat((shipping || 0).toFixed(2)),
      shippingAddress: shippingAddress || [],
      tax: parseFloat(tax.toFixed(2)),
      discount: appliedCoupon ? parseFloat(discountAmount.toFixed(2)) : 0,
      coupons: appliedCoupon ? [appliedCoupon] : [],
      total: parseFloat(total.toFixed(2)),
      payment: {
        method: payment?.method || "pending",
        transactionId: payment?.transactionId || null,
        paymentDate: new Date(),
        bkashNumber: payment?.bkashNumber || null,
      },
      paymentStatus: "pending",
      status: "pending",
      notes: notes || "",
      timeline: [
        {
          status: "pending",
          date: new Date(),
          note: `Order created successfully${
            appliedCoupon ? ` with coupon ${appliedCoupon.code}` : ""
          }`,
        },
      ],
    });

    await order.save();

    // Update user's total orders
    await User.findOneAndUpdate(
      { email: customer.email },
      {
        $inc: { totalOrders: itemsCount },
      },
    );
    if (currentCustomer.addresses.length === 0 && shippingAddress) {
      await updateUserAddress(customer.email, shippingAddress);
    }

    await sendOrderConfirmationEmail(order);

    // Populate product details for response
    const populatedOrder = await Order.findById(order._id)
      .populate("items.product", "name sku regularPrice originalPrice images")
      .populate("coupons");

    res.status(201).json({
      success: true,
      message: appliedCoupon
        ? `Order created successfully! You saved ৳${discountAmount.toFixed(
            2,
          )} with coupon ${appliedCoupon.code}`
        : "Order created successfully",
      order: populatedOrder,
      discount: appliedCoupon
        ? {
            amount: discountAmount,
            code: appliedCoupon.code,
            savedAmount: discountAmount,
          }
        : null,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
};
// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note, sendEmail } = req.body;

    const order = await Order.findOne({
      $or: [{ orderId: req.params.id }],
    });

    console.log("Updating order status for ID:", req.params.id, "to", status);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Store old status for comparison
    const oldStatus = order.status;

    // Update order status
    order.status = status;

    if (status === "delivered") {
      // 1) Update user totals
      await updateUserTotalOrder(order.customer.email, 1);
      let profit = 0;
      // 2) Update all ordered products in parallel
      await Promise.all(
        order.items.map(async (item) => {
          const updatedProduct = await updateStockQuantity(
            item.product,
            item.quantity,
            "minus",
          );
          profit =
            item.price * item.quantity - updatedProduct.cost * item.quantity;
          // console.log(`Profit for ${item.name}:`, profit);
        }),
      );
      // console.log("Profit:", profit);
      await Order.findOneAndUpdate(
        { _id: order._id },
        { $inc: { totalProfit: profit } },
      );
      // update total profit
    }

    // Add to timeline
    if (note) {
      order.timeline.push({
        status,
        note,
        date: new Date(),
      });
    } else {
      // Add default note if none provided
      const defaultNote = `Order status updated from ${oldStatus} to ${status}`;
      order.timeline.push({
        status,
        note: defaultNote,
        date: new Date(),
      });
    }

    await order.save();

    // Send email notification if requested
    if (sendEmail === true || sendEmail === "true") {
      try {
        await sendOrderStatusMail(order, status, note || null);
        console.log(
          `Email notification sent to ${order.customer.email} about status update to ${status}`,
        );
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't fail the main request if email fails
      }
    }

    res.json({
      success: true,
      order,
      message: "Order status updated successfully",
      emailSent: sendEmail ? true : false,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk update order statuses
// @route   PUT /api/orders/bulk/status
// @access  Private
const bulkUpdateStatus = async (req, res) => {
  try {
    const { orderIds, status } = req.body;

    const result = await Order.updateMany(
      { orderId: { $in: orderIds } },
      {
        $set: { status },
        $push: { timeline: { status, note: `Bulk updated to ${status}` } },
      },
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} orders updated successfully`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update payment status
// @route   PUT /api/orders/:id/payment
// @access  Private
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, transactionId } = req.body;

    const order = await Order.findOne({
      $or: [{ _id: req.params.id }, { orderId: req.params.id }],
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.paymentStatus = paymentStatus;
    if (transactionId) {
      order.payment.transactionId = transactionId;
    }
    if (paymentStatus === "paid") {
      order.payment.paymentDate = new Date();
    }

    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      $or: [{ _id: req.params.id }, { orderId: req.params.id }],
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    await order.deleteOne();
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get order statistics
// @route   GET /api/orders/stats/summary
// @access  Private
const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const recentOrders = await Order.find().sort("-createdAt").limit(5);

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        ordersByStatus,
        recentOrders,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    const requester = req.auth.email;
    console.log("Requester: get order", requester);
    // Build query
    let query = { "customer.email": requester };

    // Add status filter if provided
    if (status && status !== "all") {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // Execute queries in parallel
    const [orders, totalCount] = await Promise.all([
      Order.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Order.countDocuments(query),
    ]);

    // Get status counts for filters
    const statusCounts = await Order.aggregate([
      { $match: { "customer.email": requester } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const statusSummary = {
      all: totalCount,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
    };

    statusCounts.forEach((item) => {
      if (statusSummary.hasOwnProperty(item._id)) {
        statusSummary[item._id] = item.count;
      }
    });

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit),
      },
      statusSummary,
      message: "Orders fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Prevent cancel if already delivered
    if (order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Delivered orders cannot be cancelled",
      });
    }

    // Prevent duplicate cancel
    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order already cancelled",
      });
    }

    // Update order
    order.status = "cancelled";

    // Optional payment status change
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";
    } else {
      order.paymentStatus = "cancelled";
    }

    // Add timeline history
    order.timeline.push({
      status: "cancelled",
      date: new Date(),
      note: "Order cancelled successfully",
    });

    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  getAllOrdersAdmin,
  getOrderById,
  createOrder,
  updateOrderStatus,
  bulkUpdateStatus,
  updatePaymentStatus,
  deleteOrder,
  getOrderStats,
  getMyOrders,
  cancelOrder,
};
