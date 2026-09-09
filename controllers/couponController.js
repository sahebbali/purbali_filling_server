import Coupon from "../models/couponModel.js";
import User from "../models/userModel.js";

// @access  Private/Admin
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
      usageLimit,
      isActive,
      applicableProducts,
      applicableCategories,
      userLimit,
    } = req.body;

    const existCreator = await User.findOne({ email: req.auth.email });
    if (!existCreator) {
      return res.status(400).json({
        success: false,
        message: "Creator not found",
      });
    }
    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({
      code: code.toUpperCase(),
    });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }
    console.log(req.auth);

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minPurchase: minPurchase || 0,
      maxDiscount,
      startDate,
      endDate,
      usageLimit,
      isActive: isActive !== undefined ? isActive : true,
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      userLimit: userLimit || 1,
      createdBy: existCreator?.name || "Admin",
    });

    res.status(201).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
const getAllCoupons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by status
    if (req.query.status === "active") {
      query.isActive = true;
      query.endDate = { $gte: new Date() };
    } else if (req.query.status === "expired") {
      query.endDate = { $lt: new Date() };
    } else if (req.query.status === "inactive") {
      query.isActive = false;
    }

    // Search by code
    if (req.query.search) {
      query.code = { $regex: req.query.search, $options: "i" };
    }

    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email");

    const total = await Coupon.countDocuments(query);

    res.status(200).json({
      success: true,
      data: coupons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single coupon
// @route   GET /api/coupons/:id
// @access  Private/Admin
const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("usedBy.user", "name email");

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private/Admin
const updateCoupon = async (req, res) => {
  try {
    let coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // check duplicate code
    if (req.body.code && req.body.code.toUpperCase() !== coupon.code) {
      const existingCoupon = await Coupon.findOne({
        code: req.body.code.toUpperCase(),
        _id: { $ne: req.params.id },
      });

      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: "Coupon code already exists",
        });
      }
    }

    // assign fields
    Object.assign(coupon, req.body);

    if (req.body.code) {
      coupon.code = req.body.code.toUpperCase();
    }

    await coupon.save();

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    await coupon.deleteOne();

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle coupon status
// @route   PATCH /api/coupons/:id/toggle-status
// @access  Private/Admin
const toggleCouponStatus = async (req, res) => {
  try {
    // console.log("Toggling coupon status for ID:", req.params.id);
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      data: coupon,
      message: `Coupon ${
        coupon.isActive ? "activated" : "deactivated"
      } successfully`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Validate and apply coupon (Public)
// @route   POST /api/coupons/validate
// @access  Private
const validateCoupon = async (req, res) => {
  try {
    const { couponCode, cartTotal } = req.body;
    console.log("Validating coupon:", couponCode, "for cart total:", cartTotal);
    const requester = req.auth?.email;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    if (!cartTotal || cartTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart total",
      });
    }

    const result = await Coupon.calculateDiscount(
      couponCode,
      cartTotal,
      requester,
    );

    res.status(200).json({
      success: true,
      data: {
        coupon: {
          id: result.coupon._id,
          code: result.coupon.code,
          description: result.coupon.description,
          discountType: result.coupon.discountType,
          discountValue: result.coupon.discountValue,
          maxDiscount: result.coupon.maxDiscount,
        },
        discount: result.discount,
        newTotal: result.newTotal,
        message: `Coupon applied successfully! You saved ৳${result.discount.toFixed(
          2,
        )}`,
      },
    });
  } catch (error) {
    console.log("Error validating coupon:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get coupon statistics
// @route   GET /api/coupons/stats
// @access  Private/Admin
const getCouponStats = async (req, res) => {
  try {
    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({
      isActive: true,
      endDate: { $gte: new Date() },
      startDate: { $lte: new Date() },
    });
    const expiredCoupons = await Coupon.countDocuments({
      endDate: { $lt: new Date() },
    });

    const totalUsage = await Coupon.aggregate([
      { $group: { _id: null, total: { $sum: "$usedCount" } } },
    ]);

    const topCoupons = await Coupon.find()
      .sort({ usedCount: -1 })
      .limit(5)
      .select("code usedCount discountValue discountType");

    res.status(200).json({
      success: true,
      data: {
        totalCoupons,
        activeCoupons,
        expiredCoupons,
        totalUsage: totalUsage[0]?.total || 0,
        topCoupons,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Apply coupon to order (record usage)
// @route   POST /api/coupons/apply-to-order
// @access  Private
const applyCouponToOrder = async (req, res) => {
  try {
    const { couponId, orderId, cartTotal, discountAmount } = req.body;
    const userId = req.user.id;

    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    if (!coupon.isValid) {
      return res.status(400).json({
        success: false,
        message: "Coupon is not valid",
      });
    }

    if (!coupon.canBeUsedByUser(userId)) {
      return res.status(400).json({
        success: false,
        message: "You have reached the usage limit for this coupon",
      });
    }

    await coupon.applyCoupon(userId, orderId, cartTotal, discountAmount);

    res.status(200).json({
      success: true,
      message: "Coupon applied to order successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const getValidCoupons = async (req, res) => {
  try {
    const now = new Date();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {
      isActive: true,
      startDate: { $lte: now }, // already started
      endDate: { $gte: now }, // not expired
    };

    // Search by coupon code
    if (req.query.search) {
      query.code = { $regex: req.query.search, $options: "i" };
    }

    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email");

    const total = await Coupon.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Valid coupons fetched successfully",
      data: coupons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export default {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  validateCoupon,
  getCouponStats,
  applyCouponToOrder,
  getValidCoupons,
};
