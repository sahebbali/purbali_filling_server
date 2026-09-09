import { Types, mongoose } from "mongoose";
import Category from "../models/categoryModel.js";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";

// Helper function to transform category for frontend
const transformCategory = (category) => {
  return {
    id: category._id.toString(),
    name: category.name,
    brand: category.brand,
    slug: category.slug,
    description: category.description || "",
    subcategories: category.subcategories || [],
    parent: category.parent_id?.toString() || "",
    status: category.is_active ? "active" : "inactive",
    icon: category.icon || "🗂️",
    bannerImages: category.bannerImages || [],

    createdAt: category.created_at
      ? new Date(category.created_at).toLocaleDateString()
      : new Date().toLocaleDateString(),
    level: category.level,
    path: category.path,
    products: 0, // You can add product count query here if needed
  };
};

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const { includeInactive = false } = req.query;

    const filter = includeInactive === "true" ? {} : {};

    const categories = await Category.find(filter)
      .populate("parent", "name")
      .sort({ level: 1, name: 1 })
      .lean();

    const transformed = categories.map(transformCategory);

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get category tree (hierarchical)
const getCategoryTree = async (req, res) => {
  try {
    const categories = await Category.find({ is_active: true }).lean();

    // Build tree structure
    const categoryMap = {};
    const roots = [];

    categories.forEach((category) => {
      categoryMap[category._id] = {
        ...transformCategory(category),
        children: [],
      };
    });

    categories.forEach((category) => {
      if (category.parent_id) {
        const parentId = category.parent_id.toString();
        if (categoryMap[parentId]) {
          categoryMap[parentId].children.push(categoryMap[category._id]);
        } else {
          roots.push(categoryMap[category._id]);
        }
      } else {
        roots.push(categoryMap[category._id]);
      }
    });

    res.json(roots);
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
const createCategory = async (req, res) => {
  try {
    const {
      brand,
      name,
      slug,
      description,
      parent_id,
      status,
      icon,
      subcategories,
    } = req.body;

    console.log("BODY:", req.body);
    // console.log("FILES:", req.files);

    // Check category name
    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      return res
        .status(400)
        .json({ error: "Category with this name already exists" });
    }

    // Check slug
    if (slug) {
      const existingSlug = await Category.findOne({ slug });

      if (existingSlug) {
        return res.status(400).json({ error: "Slug already exists" });
      }
    }

    // Icon/Image Upload
    const imageFiles = req.files?.images || [];

    const uploadedImages = imageFiles.map((file, idx) => ({
      url: file.path,
      publicId: file.filename,
      isFeatured: idx === 0,
      order: idx,
    }));

    // Banner Uploads
    const bannerFiles = req.files?.banners || [];

    const uploadedBanners = bannerFiles.map((file, idx) => ({
      url: file.path,
      publicId: file.filename,
      order: idx,
    }));

    // Main Icon
    const iconValue = uploadedImages.length
      ? uploadedImages[0].url
      : icon || "🗂️";

    // Create Category
    const category = await Category.create({
      brand: brand?.trim() || "Tescon",
      name,
      slug: slug || undefined,
      description: description || "",
      parent_id: parent_id || null,
      is_active: status === "active",
      icon: iconValue,
      images: uploadedImages,
      bannerImages: uploadedBanners,
      subcategories: subcategories ? JSON.parse(subcategories) : [],
    });

    res.status(201).json({
      message: "Category created successfully",
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
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      brand,
      name,
      slug,
      description,
      parent_id,
      status,
      icon,
      subcategories,
      existing_banners,
      removed_banners,
    } = req.body;

    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        error: "Category not found",
      });
    }

    // Check duplicate name
    if (name && name !== category.name) {
      const existingName = await Category.findOne({
        name,
        _id: { $ne: id },
      });

      if (existingName) {
        return res.status(400).json({
          error: "Category name already exists",
        });
      }
    }

    // Check duplicate slug
    if (slug && slug !== category.slug) {
      const existingSlug = await Category.findOne({
        slug,
        _id: { $ne: id },
      });

      if (existingSlug) {
        return res.status(400).json({
          error: "Slug already exists",
        });
      }
    }

    // =========================
    // ICON
    // =========================

    let finalIcon = category.icon;

    const iconFile = req.files?.icon_image?.[0];

    if (iconFile) {
      finalIcon = iconFile.path;
    } else if (icon && icon !== "image") {
      finalIcon = icon;
    }

    // =========================
    // EXISTING BANNERS
    // =========================

    let existingBannerList = [];

    try {
      existingBannerList = JSON.parse(existing_banners || "[]");
    } catch (err) {
      existingBannerList = [];
    }

    // =========================
    // REMOVED BANNERS
    // =========================

    let removedBannerList = [];

    try {
      removedBannerList = JSON.parse(removed_banners || "[]");
    } catch (err) {
      removedBannerList = [];
    }

    // Delete removed files physically
    for (const removedUrl of removedBannerList) {
      try {
        const banner = category.bannerImages.find((b) => b.url === removedUrl);

        if (banner?.publicId) {
          // cloudinary delete here if needed
        }
      } catch (err) {
        console.log(err);
      }
    }

    // =========================
    // NEW BANNERS
    // =========================

    const bannerFiles = req.files?.banners || [];

    const newBanners = bannerFiles.map((file, idx) => ({
      url: file.path,
      publicId: file.filename,
      order: idx,
    }));

    // Keep old banners that still exist
    const keptBanners = category.bannerImages.filter((banner) =>
      existingBannerList.includes(banner.url),
    );

    // Final banners
    const finalBanners = [...keptBanners, ...newBanners];

    // =========================
    // SUBCATEGORIES
    // =========================

    let parsedSubcategories = category.subcategories;

    try {
      parsedSubcategories = subcategories
        ? JSON.parse(subcategories)
        : category.subcategories;
    } catch (err) {
      parsedSubcategories = category.subcategories;
    }

    // =========================
    // UPDATE
    // =========================

    category.brand = brand?.trim() || category.brand;
    category.name = name?.trim() || category.name;

    category.slug = slug || category.slug;

    category.description = description ?? category.description;

    category.parent_id = parent_id || null;

    category.is_active =
      status !== undefined ? status === "active" : category.is_active;

    category.icon = finalIcon;

    category.bannerImages = finalBanners;

    category.subcategories = parsedSubcategories;

    await category.save();

    res.status(200).json({
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log("Attempting to delete category with ID:", id); // Debug log

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    // Check if category has children
    // const children = await Category.find({ parent_id: id });
    // if (children.length > 0) {
    //   return res.status(400).json({
    //     error:
    //       "Cannot delete category with subcategories. Move or delete children first.",
    //   });
    // }

    const deleted = await Category.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ message: "Category Deleted Successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
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
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleStatus,
  getCategoryStats,
  getDashboardData,
  getCategoryByBrand,
};
