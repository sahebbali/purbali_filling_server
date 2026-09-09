import Product from "../models/productModel.js";
import Discount from "../models/discountModel.js";

export const getSearchProducts = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    // If search is empty return no data
    if (!search.trim()) {
      return res.status(200).json({
        success: true,
        total: 0,
        currentPage: Number(page),
        totalPages: 0,
        data: [],
      });
    }

    // Build search filter
    const filter = {
      isActive: true,
      $or: [
        {
          name: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          slug: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ],
    };

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get products
    const products = await Product.find(filter)
      .select("_id name slug category originalPrice")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean({ virtuals: true });

    // Total count
    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: products,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// @desc    Get all discounts with product details
// @route   GET /api/discounts
// @access  Public
export const getDiscounts = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    console.log("Query Params:", { status, search, page, limit });
    let query = {};

    const now = new Date();
    query = {
      isActive: true,
      // startDate: { $lte: now },
      // endDate: { $gte: now },
      productName: {
        $regex: search ? search.trim() : "",
        $options: "i",
      },
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [discounts, total] = await Promise.all([
      Discount.find(query)
        .populate("productId", "name price category")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Discount.countDocuments(query),
    ]);

    // Format response
    const formattedDiscounts = discounts.map((discount) => ({
      id: discount._id,
      productId: discount.productId._id,
      productName: discount.productId.name,
      productPrice: discount.productId.price,
      discountType: discount.discountType,
      discountAmount: discount.discountAmount,
      startDate: discount.startDate,
      endDate: discount.endDate,
      isActive: discount.isActive,
      isCurrentlyActive: discount.isCurrentlyActive,
    }));

    res.status(200).json({
      success: true,
      data: formattedDiscounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single discount by ID
// @route   GET /api/discounts/:id
// @access  Public
export const getDiscountById = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id).populate(
      "productId",
      "name price category",
    );

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Discount not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: discount._id,
        productId: discount.productId._id,
        productName: discount.productId.name,
        productPrice: discount.productId.price,
        discountType: discount.discountType,
        discountAmount: discount.discountAmount,
        startDate: discount.startDate,
        endDate: discount.endDate,
        isActive: discount.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get discounts for specific product
// @route   GET /api/discounts/product/:productId
// @access  Public
export const getDiscountByProduct = async (req, res) => {
  try {
    const discount = await Discount.findOne({
      productId: req.params.productId,
    }).populate("productId", "name price category");

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "No discount found for this product",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: discount._id,
        productId: discount.productId._id,
        productName: discount.productId.name,
        productPrice: discount.productId.price,
        discountType: discount.discountType,
        discountAmount: discount.discountAmount,
        startDate: discount.startDate,
        endDate: discount.endDate,
        isActive: discount.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new discount
// @route   POST /api/discounts
// @access  Private
export const createDiscount = async (req, res) => {
  try {
    const {
      productId,
      productName,
      discountType,
      discountAmount,
      startDate,
      endDate,
    } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if discount already exists for this product
    const existingDiscount = await Discount.findOne({ productId });
    if (existingDiscount) {
      return res.status(400).json({
        success: false,
        message:
          "A discount already exists for this product. Please update the existing discount.",
      });
    }

    const discount = await Discount.create({
      productId,
      productName,
      discountType,
      discountAmount,
      startDate,
      endDate,
    });

    const populatedDiscount = await discount.populate(
      "productId",
      "name price category",
    );

    res.status(201).json({
      success: true,
      data: {
        id: populatedDiscount._id,
        productId: populatedDiscount.productId._id,
        productName: populatedDiscount.productId.name,
        productPrice: populatedDiscount.productId.price,
        discountType: populatedDiscount.discountType,
        discountAmount: populatedDiscount.discountAmount,
        startDate: populatedDiscount.startDate,
        endDate: populatedDiscount.endDate,
        isActive: populatedDiscount.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update discount
// @route   PUT /api/discounts/:id
// @access  Private
export const updateDiscount = async (req, res) => {
  try {
    const {
      productId,
      discountType,
      discountAmount,
      startDate,
      endDate,
      isActive,
    } = req.body;

    // If productId is being changed, check if new product already has a discount
    if (productId) {
      const existingDiscount = await Discount.findOne({
        productId,
        _id: { $ne: req.params.id },
      });
      if (existingDiscount) {
        return res.status(400).json({
          success: false,
          message: "The new product already has a discount",
        });
      }
    }

    const discount = await Discount.findByIdAndUpdate(
      req.params.id,
      {
        productId: productId || undefined,
        discountType,
        discountAmount,
        startDate,
        endDate,
        isActive,
        updatedAt: Date.now(),
      },
      { new: true },
    );

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Discount not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: discount._id,
        productId: discount.productId._id,
        productName: discount.productId.name,
        productPrice: discount.productId.price,
        discountType: discount.discountType,
        discountAmount: discount.discountAmount,
        startDate: discount.startDate,
        endDate: discount.endDate,
        isActive: discount.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete discount
// @route   DELETE /api/discounts/:id
// @access  Private
export const deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Discount not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Discount deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get discount statistics
// @route   GET /api/discounts/stats/summary
// @access  Private
export const getDiscountStats = async (req, res) => {
  try {
    const now = new Date();

    const [
      totalDiscounts,
      activeDiscounts,
      percentageDiscounts,
      fixedDiscounts,
    ] = await Promise.all([
      Discount.countDocuments(),
      Discount.countDocuments({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }),
      Discount.aggregate([
        { $match: { discountType: "percentage" } },
        {
          $group: {
            _id: null,
            avgAmount: { $avg: "$discountAmount" },
            maxAmount: { $max: "$discountAmount" },
            minAmount: { $min: "$discountAmount" },
          },
        },
      ]),
      Discount.aggregate([
        { $match: { discountType: "fixed" } },
        {
          $group: {
            _id: null,
            avgAmount: { $avg: "$discountAmount" },
            maxAmount: { $max: "$discountAmount" },
            minAmount: { $min: "$discountAmount" },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDiscounts,
        activeDiscounts,
        expiredDiscounts: totalDiscounts - activeDiscounts,
        percentageStats: percentageDiscounts[0] || {
          avgAmount: 0,
          maxAmount: 0,
          minAmount: 0,
        },
        fixedStats: fixedDiscounts[0] || {
          avgAmount: 0,
          maxAmount: 0,
          minAmount: 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
