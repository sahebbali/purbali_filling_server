import { Types, mongoose } from "mongoose";
import Category from "../models/categoryModel.js";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import CarouselManager from "../models/carouselManagerModel.js";

// Helper function to transform category for frontend
const transformCategory = (carousel) => {
  return {
    id: carousel._id.toString(),
    header: carousel.header,
    brand: carousel.brand,
    subHeader: carousel.subHeader,
    buttonText: carousel.buttonText || "",
    status: carousel.is_active ? "active" : "inactive",
    bannerImages: carousel.bannerImages || [],
    createdAt: carousel.created_at
      ? new Date(carousel.created_at).toLocaleDateString()
      : new Date().toLocaleDateString(),
  };
};

// Get all categories
const getAllCarousels = async (req, res) => {
  try {
    console.log("Fetching all carousels...");
    const { includeInactive = false } = req.query;

    const filter = includeInactive === "true" ? {} : {};

    const Carousels = await CarouselManager.find(filter)
      .sort({ level: 1, name: 1 })
      .lean();

    const transformed = Carousels.map(transformCategory);

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const category = await Category.findById(id)
      .populate("parent", "name")
      .lean();

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    const transformed = category.map(transformCategory);

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getCategoryByBrand = async (req, res) => {
  try {
    const { brand } = req.params;
    console.log("Brand param:", brand);
    const category = await Category.find({ brand: brand.toString() }).lean();
    console.log("Category found:", category);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    const transformed = category.map(transformCategory);
    res.json(transformed);
  } catch (error) {
    console.error("Get category by brand error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Create new category
const createCarousel = async (req, res) => {
  try {
    const { brand, header, subHeader, buttonText, status } = req.body;

    console.log("BODY:", req.body);
    // console.log("FILES:", req.files);

    // Check category name
    const existingCarousel = await CarouselManager.findOne({ header });

    if (existingCarousel) {
      return res
        .status(400)
        .json({ error: "Carousel with this header already exists" });
    }

    // Banner Uploads
    const bannerFile = req.files?.banners?.[0];
    if (!bannerFile) {
      return res.status(400).json({
        error: "Banner image is required",
      });
    }

    const uploadedBanners = {
      url: bannerFile.path,
      publicId: bannerFile.filename,
      order: 0,
    };

    // Create Category
    const category = await CarouselManager.create({
      brand: brand?.trim() || "Tescon",
      header: header || "",
      subHeader: subHeader || "",
      buttonText: buttonText || "",
      is_active: status === "active",
      bannerImages: uploadedBanners,
    });

    res.status(201).json({
      message: "Carousel created successfully",
      data: category,
    });
  } catch (error) {
    console.log(error);

    if (error.code === 11000) {
      return res.status(400).json({
        error: "Duplicate key error",
      });
    }

    res.status(500).json({
      error: error.message,
    });
  }
};

// Update category
const updateCarousel = async (req, res) => {
  try {
    const { id } = req.params;

    const { brand, header, subHeader, buttonText, status } = req.body;

    const carousel = await CarouselManager.findById(id);

    if (!carousel) {
      return res.status(404).json({
        error: "Carousel not found",
      });
    }

    // Duplicate header check
    if (header && header.trim() !== carousel.header) {
      const exists = await CarouselManager.exists({
        _id: { $ne: id },
        header: header.trim(),
      });

      if (exists) {
        return res.status(400).json({
          error: "Carousel header already exists",
        });
      }
    }

    // Update banner if a new one is uploaded
    const bannerFile = req.files?.banners?.[0];

    if (bannerFile) {
      // Delete old Cloudinary image if needed
      if (carousel.bannerImages?.[0]?.publicId) {
        // await cloudinary.uploader.destroy(carousel.bannerImages[0].publicId);
      }

      carousel.bannerImages = [
        {
          url: bannerFile.path,
          publicId: bannerFile.filename,
          order: 0,
        },
      ];
    }

    if (brand !== undefined) carousel.brand = brand.trim();
    if (header !== undefined) carousel.header = header.trim();
    if (subHeader !== undefined) carousel.subHeader = subHeader.trim();
    if (buttonText !== undefined) carousel.buttonText = buttonText.trim();
    if (status !== undefined) carousel.is_active = status === "active";

    await carousel.save();

    return res.status(200).json({
      message: "Carousel updated successfully",
      data: carousel,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
};

// Delete category
const deleteCarousel = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log("Attempting to delete category with ID:", id); // Debug log

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const deleted = await CarouselManager.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Carousel not found" });
    }

    res.json({ message: "Carousel Deleted Successfully" });
  } catch (error) {
    console.error("Error deleting carousel:", error);
    res.status(500).json({ error: error.message });
  }
};

// Toggle category status (active/inactive)
const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    category.is_active = !category.is_active;
    await category.save();

    res.json({
      message: `Category ${
        category.is_active ? "activated" : "deactivated"
      } successfully`,
      status: category.is_active ? "active" : "inactive",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCategoryStats = async (req, res) => {
  try {
    const data = await Category.aggregate([
      // Match only active categories
      { $match: { is_active: true } },

      // Lookup products that belong to this category
      {
        $lookup: {
          from: "products",
          let: { categoryName: "$name" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$category", "$$categoryName"] },
                is_active: true,
              },
            },
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalStock: { $sum: { $ifNull: ["$stockQuantity", 0] } },
                totalValue: {
                  $sum: {
                    $multiply: [
                      { $ifNull: ["$regularPrice", 0] },
                      { $ifNull: ["$stockQuantity", 0] },
                    ],
                  },
                },
              },
            },
          ],
          as: "stats",
        },
      },

      // Unwind stats (handle empty case)
      {
        $addFields: {
          stats: {
            $ifNull: [
              { $arrayElemAt: ["$stats", 0] },
              { totalProducts: 0, totalStock: 0, totalValue: 0 },
            ],
          },
        },
      },

      // Project final structure
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          icon: 1,
          subcategories: 1,
          products: "$stats.totalProducts",
          stock: "$stats.totalStock",
          revenue: { $toString: { $round: ["$stats.totalValue", 2] } },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Get category stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category stats",
      error: error.message,
    });
  }
};

const getDashboardData = async (req, res) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = startOfThisMonth;

    // Single aggregation pipeline for all order-related stats
    const [orderStats, counts, outOfStockCount] = await Promise.all([
      // Get all order statistics in one aggregation
      Order.aggregate([
        {
          $facet: {
            // Total revenue and orders (delivered, not refunded)
            totalStats: [
              {
                $match: {
                  status: "delivered",
                  paymentStatus: { $ne: "refunded" },
                },
              },
              {
                $group: {
                  _id: null,
                  revenue: { $sum: "$total" },
                  totalOrders: { $sum: 1 },
                },
              },
            ],
            // Last month stats
            lastMonthStats: [
              {
                $match: {
                  createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth },
                  status: "delivered",
                  paymentStatus: { $ne: "refunded" },
                },
              },
              {
                $group: {
                  _id: null,
                  revenue: { $sum: "$total" },
                  orders: { $sum: 1 },
                },
              },
            ],
            // This month orders count (all orders for comparison)
            thisMonthOrders: [
              {
                $match: {
                  createdAt: { $gte: startOfThisMonth },
                },
              },
              { $count: "count" },
            ],
            // Last month orders count (all orders for comparison)
            lastMonthOrdersCount: [
              {
                $match: {
                  createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth },
                },
              },
              { $count: "count" },
            ],
          },
        },
        {
          $project: {
            revenue: {
              $ifNull: [{ $arrayElemAt: ["$totalStats.revenue", 0] }, 0],
            },
            totalOrders: {
              $ifNull: [{ $arrayElemAt: ["$totalStats.totalOrders", 0] }, 0],
            },
            lastMonthRevenue: {
              $ifNull: [{ $arrayElemAt: ["$lastMonthStats.revenue", 0] }, 0],
            },
            lastMonthOrders: {
              $ifNull: [{ $arrayElemAt: ["$lastMonthStats.orders", 0] }, 0],
            },
            thisMonthOrders: {
              $ifNull: [{ $arrayElemAt: ["$thisMonthOrders.count", 0] }, 0],
            },
            lastMonthOrdersTotal: {
              $ifNull: [
                { $arrayElemAt: ["$lastMonthOrdersCount.count", 0] },
                0,
              ],
            },
          },
        },
      ]),

      // Get user and product counts in parallel
      Promise.all([
        User.countDocuments({ role: "user" }),
        Product.countDocuments(),
        Order.countDocuments(), // Total orders count
      ]),

      // Get out of stock count
      Product.countDocuments({
        stockQuantity: { $lte: 0 },
        is_active: true,
      }),
    ]);

    // Extract data from aggregation result
    const stats = orderStats[0] || {};
    const [totalUsers, totalProducts, totalOrdersAll] = counts;

    // Calculate percentage change
    const thisMonthOrdersCount = stats.thisMonthOrders || 0;
    const lastMonthOrdersTotal = stats.lastMonthOrdersTotal || 0;
    const percentage =
      lastMonthOrdersTotal === 0
        ? thisMonthOrdersCount > 0
          ? 100
          : 0
        : ((thisMonthOrdersCount - lastMonthOrdersTotal) /
            lastMonthOrdersTotal) *
          100;

    res.json({
      success: true,
      revenue: stats.revenue || 0,
      totalOrders: totalOrdersAll || 0,
      totalUsers: totalUsers || 0,
      totalProducts: totalProducts || 0,
      outOfStock: outOfStockCount || 0,
      lastMonthRevenue: stats.lastMonthRevenue || 0,
      lastMonthOrders: stats.lastMonthOrders || 0,
      thisMonthOrders: thisMonthOrdersCount,
      percentage: percentage.toFixed(2),
      // Additional useful metrics
      averageOrderValue:
        stats.totalOrders > 0
          ? (stats.revenue / stats.totalOrders).toFixed(2)
          : 0,
    });
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  getAllCarousels,

  createCarousel,
  updateCarousel,
  deleteCarousel,
  toggleStatus,
  getCategoryStats,
  getDashboardData,
  getCategoryByBrand,
};
