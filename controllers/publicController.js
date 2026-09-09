import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";

const getAllCategories = async (req, res) => {
  try {
    const brand = req.query.brand;
    // console.log("Fetching all categories...");
    const filter = {
      is_active: true,
      ...(brand && {
        brand: { $regex: new RegExp(`^${brand}$`, "i") },
      }),
    };

    const categories = await Category.find(filter)
      .select("name icon subcategories parent_id level , bannerImages")
      .sort({ created_at: 1 })
      .lean();

    if (categories.length === 0) {
      return res.status(404).json({ message: "No categories found" });
    }

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getAllCategoryTree = async (req, res) => {
  try {
    // console.log("Fetching all categories...");
    const filter = {
      is_active: true,
    };

    const categories = await Category.find(filter)
      .select("name icon subcategories parent_id level , bannerImages")
      .sort({ created_at: 1 })
      .lean();

    if (categories.length === 0) {
      return res.status(404).json({ message: "No categories found" });
    }

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getCategoryByName = async (req, res) => {
  try {
    const { name } = req.params;

    const category = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    })
      .populate("parent", "name")
      .lean();

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const {
      category,
      brand,
      page = 1,
      limit = 20,
      sort = "createdAt",
      order = "desc",
      minPrice,
      maxPrice,
      minRating,
      inStock,
      search,
    } = req.query;

    // ======================================================
    // FILTER
    // ======================================================

    const filter = {
      isActive: true,
    };

    // CATEGORY
    if (category && category.toLowerCase() !== "all") {
      filter.category = {
        $regex: `^${category}$`,
        $options: "i",
      };
    }
    // BRAND
    if (brand && brand.toLowerCase() !== "all") {
      filter.brand = {
        $regex: `^${brand}$`,
        $options: "i",
      };
    }

    // SEARCH
    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          brand: {
            $regex: search,
            $options: "i",
          },
        },
        {
          tags: {
            $in: [new RegExp(search, "i")],
          },
        },
      ];
    }

    // PRICE
    if (minPrice || maxPrice) {
      filter.regularPrice = {};

      if (minPrice) {
        filter.regularPrice.$gte = Number(minPrice);
      }

      if (maxPrice) {
        filter.regularPrice.$lte = Number(maxPrice);
      }
    }

    // RATING
    if (minRating) {
      filter.rating = {
        $gte: Number(minRating),
      };
    }

    // STOCK
    if (inStock === "true") {
      filter.stockQuantity = {
        $gt: 0,
      };
    }

    // ======================================================
    // SORTING
    // ======================================================

    const allowedSortFields = [
      "name",
      "regularPrice",
      "createdAt",
      "rating",
      "totalSales",
    ];

    const sortField = allowedSortFields.includes(sort) ? sort : "createdAt";

    const sortOrder = order === "asc" ? 1 : -1;

    const sortObj = {
      [sortField]: sortOrder,
    };

    // ======================================================
    // PAGINATION
    // ======================================================

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);

    const skip = (pageNum - 1) * limitNum;

    // ======================================================
    // AGGREGATION
    // ======================================================

    const pipeline = [
      {
        $match: filter,
      },

      // ======================================================
      // LOOKUP ACTIVE DISCOUNT
      // ======================================================

      {
        $lookup: {
          from: "discounts",
          let: {
            productId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$productId", "$$productId"],
                    },
                    {
                      $eq: ["$isActive", true],
                    },
                    {
                      $lte: ["$startDate", new Date()],
                    },
                    {
                      $gte: ["$endDate", new Date()],
                    },
                  ],
                },
              },
            },
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $limit: 1,
            },
          ],
          as: "discountInfo",
        },
      },

      // ======================================================
      // FORMAT DISCOUNT
      // ======================================================

      {
        $addFields: {
          discountData: {
            $arrayElemAt: ["$discountInfo", 0],
          },
        },
      },

      {
        $addFields: {
          hasDiscount: {
            $cond: [
              {
                $ifNull: ["$discountData", false],
              },
              true,
              false,
            ],
          },

          discount: {
            $cond: [
              {
                $ifNull: ["$discountData", false],
              },

              {
                type: "$discountData.discountType",

                amount: "$discountData.discountAmount",

                startDate: "$discountData.startDate",

                endDate: "$discountData.endDate",

                finalPrice: {
                  $round: [
                    {
                      $cond: [
                        {
                          $eq: ["$discountData.discountType", "percentage"],
                        },

                        {
                          $subtract: [
                            "$originalPrice",
                            {
                              $multiply: [
                                "$originalPrice",
                                {
                                  $divide: [
                                    "$discountData.discountAmount",
                                    100,
                                  ],
                                },
                              ],
                            },
                          ],
                        },

                        {
                          $max: [
                            0,
                            {
                              $subtract: [
                                "$originalPrice",
                                "$discountData.discountAmount",
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    2,
                  ],
                },

                savedAmount: {
                  $round: [
                    {
                      $cond: [
                        {
                          $eq: ["$discountData.discountType", "percentage"],
                        },

                        {
                          $multiply: [
                            "$originalPrice",
                            {
                              $divide: ["$discountData.discountAmount", 100],
                            },
                          ],
                        },

                        {
                          $min: [
                            "$discountData.discountAmount",
                            "$originalPrice",
                          ],
                        },
                      ],
                    },
                    2,
                  ],
                },

                savedPercentage: {
                  $round: [
                    {
                      $cond: [
                        {
                          $eq: ["$discountData.discountType", "percentage"],
                        },

                        "$discountData.discountAmount",

                        {
                          $multiply: [
                            {
                              $divide: [
                                {
                                  $min: [
                                    "$discountData.discountAmount",
                                    "$originalPrice",
                                  ],
                                },
                                "$originalPrice",
                              ],
                            },
                            100,
                          ],
                        },
                      ],
                    },
                    0,
                  ],
                },
              },

              null,
            ],
          },
        },
      },

      // ======================================================
      // CLEAN RESPONSE
      // ======================================================

      {
        $project: {
          discountInfo: 0,
          discountData: 0,

          __v: 0,
          updatedAt: 0,
          createdAt: 0,

          views: 0,
          totalSales: 0,

          returnPolicy: 0,
          warranty: 0,

          isBestSeller: 0,
          isNewArrival: 0,
          isFeatured: 0,

          metaTitle: 0,
          metaDescription: 0,
          metaKeywords: 0,

          trustBadges: 0,
          shipping: 0,

          rating: 0,
          reviewCount: 0,
          reviews: 0,

          stockQuantity: 0,
          lowStockThreshold: 0,

          tags: 0,
          cost: 0,
        },
      },

      // ======================================================
      // SORT + PAGINATION
      // ======================================================

      {
        $sort: sortObj,
      },

      {
        $skip: skip,
      },

      {
        $limit: limitNum,
      },
    ];

    // ======================================================
    // EXECUTE
    // ======================================================

    const [products, totalItems] = await Promise.all([
      Product.aggregate(pipeline),

      Product.countDocuments(filter),
    ]);

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.status(200).json({
      success: true,

      data: products,

      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum),
        totalItems,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

const getProductList = async (req, res) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      sort = "name",
      order = "asc",
      page = 1,
      limit = 12,
    } = req.query;

    // Build match stage for products
    let productMatch = { isActive: true };

    if (category) {
      productMatch.category = category;
    }

    if (search) {
      productMatch.name = { $regex: search, $options: "i" };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      productMatch.regularPrice = {};
      if (minPrice !== undefined)
        productMatch.regularPrice.$gte = parseFloat(minPrice);
      if (maxPrice !== undefined)
        productMatch.regularPrice.$lte = parseFloat(maxPrice);
    }

    if (minRating) {
      productMatch.rating = { $gte: parseFloat(minRating) };
    }

    if (inStock === "true") {
      productMatch.stockQuantity = { $gt: 0 };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;
    const sortObj = { [sort]: sortOrder };

    // Build aggregation pipeline
    const pipeline = [
      // Match products
      { $match: productMatch },

      // Lookup discounts for this product
      {
        $lookup: {
          from: "discounts", // Your discounts collection name
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$productId", "$$productId"] },
                    { $eq: ["$isActive", true] },
                    { $lte: ["$startDate", new Date()] },
                    { $gte: ["$endDate", new Date()] },
                  ],
                },
              },
            },
            { $limit: 1 }, // Get only the first active discount
          ],
          as: "discount",
        },
      },

      // Add discount fields to product
      {
        $addFields: {
          hasDiscount: { $gt: [{ $size: "$discount" }, 0] },
          discountInfo: {
            $cond: [
              { $gt: [{ $size: "$discount" }, 0] },
              { $arrayElemAt: ["$discount", 0] },
              null,
            ],
          },
          // Calculate discounted price
          finalPrice: {
            $cond: [
              { $gt: [{ $size: "$discount" }, 0] },
              {
                $cond: [
                  {
                    $eq: [
                      { $arrayElemAt: ["$discount.type", 0] },
                      "percentage",
                    ],
                  },
                  {
                    $subtract: [
                      "$originalPrice",
                      {
                        $multiply: [
                          "$originalPrice",
                          {
                            $divide: [
                              { $arrayElemAt: ["$discount.amount", 0] },
                              100,
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    $subtract: [
                      "$originalPrice",
                      { $arrayElemAt: ["$discount.amount", 0] },
                    ],
                  },
                ],
              },
              "$originalPrice",
            ],
          },
        },
      },

      // Remove the temporary discount array
      { $unset: "discount" },

      // Apply sorting
      { $sort: sortObj },

      // Apply pagination
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    // Execute aggregation for products
    const products = await Product.aggregate(pipeline);

    // Get total count (without pagination)
    const totalCount = await Product.countDocuments(productMatch);

    // Get category counts for filters
    const categoryCounts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const categories = categoryCounts.map((cat) => ({
      id: cat._id,
      label: cat._id,
      count: cat.count,
    }));

    // console.log("Categories with counts:", categories);

    res.json({
      success: true,
      data: products,
      totalCount,
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      currentPage: parseInt(page),
      categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const filter = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

    const pipeline = [
      {
        $match: filter,
      },

      // ======================================================
      // LOOKUP DISCOUNT (same as list API)
      // ======================================================
      {
        $lookup: {
          from: "discounts",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$productId", "$$productId"] },
                    { $eq: ["$isActive", true] },
                    { $lte: ["$startDate", new Date()] },
                    { $gte: ["$endDate", new Date()] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "discountInfo",
        },
      },

      // ======================================================
      // FORMAT DISCOUNT
      // ======================================================
      {
        $addFields: {
          discountData: { $arrayElemAt: ["$discountInfo", 0] },
        },
      },

      {
        $addFields: {
          hasDiscount: {
            $cond: [{ $ifNull: ["$discountData", false] }, true, false],
          },

          discount: {
            $cond: [
              { $ifNull: ["$discountData", false] },
              {
                type: "$discountData.discountType",
                amount: "$discountData.discountAmount",
                startDate: "$discountData.startDate",
                endDate: "$discountData.endDate",

                finalPrice: {
                  $round: [
                    {
                      $cond: [
                        { $eq: ["$discountData.discountType", "percentage"] },
                        {
                          $subtract: [
                            "$originalPrice",
                            {
                              $multiply: [
                                "$originalPrice",
                                {
                                  $divide: [
                                    "$discountData.discountAmount",
                                    100,
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          $max: [
                            0,
                            {
                              $subtract: [
                                "$originalPrice",
                                "$discountData.discountAmount",
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    2,
                  ],
                },

                savedAmount: {
                  $round: [
                    {
                      $cond: [
                        { $eq: ["$discountData.discountType", "percentage"] },
                        {
                          $multiply: [
                            "$originalPrice",
                            {
                              $divide: ["$discountData.discountAmount", 100],
                            },
                          ],
                        },
                        {
                          $min: [
                            "$discountData.discountAmount",
                            "$originalPrice",
                          ],
                        },
                      ],
                    },
                    2,
                  ],
                },

                savedPercentage: {
                  $round: [
                    {
                      $cond: [
                        { $eq: ["$discountData.discountType", "percentage"] },
                        "$discountData.discountAmount",
                        {
                          $multiply: [
                            {
                              $divide: [
                                {
                                  $min: [
                                    "$discountData.discountAmount",
                                    "$originalPrice",
                                  ],
                                },
                                "$originalPrice",
                              ],
                            },
                            100,
                          ],
                        },
                      ],
                    },
                    0,
                  ],
                },
              },
              null,
            ],
          },
        },
      },

      // ======================================================
      // CLEAN RESPONSE
      // ======================================================
      {
        $project: {
          discountInfo: 0,
          discountData: 0,
          __v: 0,
        },
      },
    ];

    const product = await Product.aggregate(pipeline);

    if (!product || product.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export default {
  getAllCategories,
  getAllCategoryTree,
  getAllProducts,
  getProductList,
  getProductById,
  getCategoryByName,
};
