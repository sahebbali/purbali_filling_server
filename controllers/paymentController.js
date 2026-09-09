import Order from "../models/orderModel.js";

const getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      method,
      startDate,
      endDate,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter = {};

    if (status) {
      filter.paymentStatus = status;
    }

    if (method) {
      filter["payment.method"] = method;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { "payment.transactionId": { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
      ];
    }

    // Run query + count in parallel
    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .select("orderId customer payment paymentStatus total status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    // Shape response to match PaymentList data structure
    const payments = orders.map((order) => ({
      id: order._id,
      orderId: order.orderId,
      transactionId: order.payment?.transactionId || "N/A",
      customer: order.customer?.name || "Unknown",
      customerEmail: order.customer?.email,
      amount: order.total,
      method: order.payment?.method || "unknown",
      status: order.paymentStatus,
      date: order.payment?.paymentDate || order.createdAt,
      gatewayResponse: order.paymentStatus === "paid" ? "Success" : "Pending",
      refundable: order.paymentStatus === "paid",
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment ID" });
    }

    const order = await Order.findOne({ orderId: id }).lean();

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    const payment = {
      id: order._id,
      orderId: order.orderId,
      transactionId: order.payment?.transactionId || "N/A",
      bkashNumber: order.payment?.bkashNumber || "",
      customer: order.customer,
      items: order.items,
      subtotal: order.subtotal,
      total: order.total,
      shipping: order.shipping,
      discount: order.discount,
      tax: order.tax,
      amount: order.total,
      method: order.payment?.method || "unknown",
      status: order.paymentStatus,
      orderStatus: order.status,
      date: order.payment?.paymentDate || order.createdAt,
      gatewayResponse: order.paymentStatus === "paid" ? "Success" : "Pending",
      refundable: order.paymentStatus === "paid",
      timeline: order.timeline,
      notes: order.notes,
    };

    return res.status(200).json({ success: true, data: payment });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
      error: error.message,
    });
  }
};

const submitBkashPayment = async (req, res) => {
  try {
    const { orderId, bkashNumber, transactionId } = req.body;
    console.log(req.body);

    // Validation
    if (!orderId || !bkashNumber || !transactionId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment already completed",
      });
    }

    // CloudinaryStorage already uploaded file

    // Update Payment Info
    order.payment = {
      method: "bkash",
      bkashNumber,
      transactionId,

      paymentDate: new Date(),
    };

    order.paymentStatus = "pending";

    order.timeline.push({
      status: "payment_submitted",
      date: new Date(),
      note: "Customer submitted bKash payment",
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment submitted successfully",
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { status, orderId } = req.body;

    // Validate input
    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: "Order ID and status are required",
      });
    }

    // Validate status value
    const validStatuses = [
      "pending",
      "processing",
      "paid",
      "failed",
      "refunded",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if payment status is already 'paid' and prevent changes
    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot change payment status: Order is already marked as paid",
      });
    }

    // Prevent changing from paid to any other status
    if (order.paymentStatus === "paid" && status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot change status from 'paid' to another status",
      });
    }

    // Additional validation: prevent reverting from completed/refunded states
    const irreversibleStatuses = ["paid", "refunded"];
    if (
      irreversibleStatuses.includes(order.paymentStatus) &&
      order.paymentStatus !== status
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot change payment status: Order is already ${order.paymentStatus}`,
      });
    }

    // Update payment status
    const previousStatus = order.paymentStatus;
    order.paymentStatus = status;

    // Set payment date only when transitioning to 'paid'
    if (status === "paid" && previousStatus !== "paid") {
      order.payment.paymentDate = new Date();

      // Optional: Add audit log or trigger other actions
      // await logPaymentStatusChange(orderId, previousStatus, status);
      // await sendPaymentConfirmationEmail(order);
    }

    // Optional: Handle other status-specific logic
    if (status === "failed") {
      order.payment.failedAttempts = (order.payment.failedAttempts || 0) + 1;
      order.payment.lastFailedAttempt = new Date();
    }

    if (status === "refunded") {
      order.payment.refundDate = new Date();
      order.payment.refundAmount = order.totalAmount;
    }

    await order.save();

    res.json({
      success: true,
      message: "Payment status updated successfully",
      data: {
        orderId: order.orderId,
        previousStatus,
        currentStatus: order.paymentStatus,
        paymentDate: order.payment.paymentDate,
        order: order,
      },
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export default {
  getAllPayments,
  getPaymentById,
  submitBkashPayment,
  updatePaymentStatus,
};
