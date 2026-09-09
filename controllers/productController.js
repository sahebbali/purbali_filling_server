import Product from "../models/productModel.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";
import Discount from "./../models/discountModel.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildFilter = (query) => {
  const filter = {};

  if (query.search) {
    filter.$text = { $search: query.search };
  }
  if (query.category) filter.category = query.category;
  if (query.is_active !== undefined)
    filter.is_active = query.is_active === "true";
  if (query.tag) filter.tags = query.tag;

  // Price range
  if (query.minPrice || query.maxPrice) {
    filter.regularPrice = {};
    if (query.minPrice) filter.regularPrice.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.regularPrice.$lte = Number(query.maxPrice);
  }

  // Stock status
  if (query.stockStatus === "out_of_stock") filter.stockQuantity = 0;
  if (query.stockStatus === "low_stock") {
    filter.$expr = { $lte: ["$stockQuantity", "$lowStockThreshold"] };
    filter.stockQuantity = { $gt: 0 };
  }
  if (query.stockStatus === "in_stock") {
    filter.$expr = { $gt: ["$stockQuantity", "$lowStockThreshold"] };
  }

  return filter;
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/products
 * List products with filtering, sorting, pagination
 */
export const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      status,
      stockStatus,
    } = req.query;

    const query = {};

    // 🔍 Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    // 📂 Category
    if (category) {
      query.category = category; // must be ObjectId
    }

    // 📊 Status
    if (status) {
      query.is_active = status === "active";
    }

    // 📦 Stock Status
    if (stockStatus === "in") {
      query.stockQuantity = { $gt: 10 };
    }
    if (stockStatus === "low") {
      query.stockQuantity = { $gt: 0, $lte: 10 };
    }
    if (stockStatus === "out") {
      query.stockQuantity = 0;
    }

    const products = await Product.find(query)
      .populate("category", "name")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};
/**
 * GET /api/products/:id
 * Single product by Mongo _id  OR  slug
 */
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log("Received id for getProduct:", id);
    const filter = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
    // console.log("Filter for getProduct:", filter);

    const product = await Product.findOne(filter)
      .populate("category", "name slug")
      .lean({ virtuals: true });

    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/products
 * Create product. Images via multipart/form-data (field: "images").
 * Other fields sent as JSON in "data" field OR as flat form fields.
 */
export const createProduct = async (req, res) => {
  try {
    // Parse body – support both JSON body and multipart form fields
    let body = req.body;

    if (typeof body.data === "string") {
      body = JSON.parse(body.data);
    }

    // Parse array/object fields that may arrive as strings from formData
    const arrayFields = [
      "tags",
      "features",
      "colors",
      "sizes",
      "trustBadges",
      "metaKeywords",
    ];
    const objectFields = ["shipping", "specifications"];

    arrayFields.forEach((key) => {
      if (typeof body[key] === "string") {
        try {
          body[key] = JSON.parse(body[key]);
        } catch {
          body[key] = body[key].split(",").map((s) => s.trim());
        }
      }
    });

    objectFields.forEach((key) => {
      if (typeof body[key] === "string") {
        try {
          body[key] = JSON.parse(body[key]);
        } catch {
          body[key] = {};
        }
      }
    });

    // Handle boolean fields
    const booleanFields = [
      "isActive",
      "isFeatured",
      "isNewArrival",
      "isBestSeller",
    ];
    booleanFields.forEach((field) => {
      if (body[field] === "true" || body[field] === true) {
        body[field] = true;
      } else if (body[field] === "false" || body[field] === false) {
        body[field] = false;
      }
    });

    // Handle numeric fields
    const numericFields = [
      "regularPrice",
      "originalPrice",
      "cost",
      "stockQuantity",
      "lowStockThreshold",
    ];
    numericFields.forEach((field) => {
      if (body[field]) {
        body[field] = Number(body[field]);
      }
    });

    // Process media files (images)
    const mediaFiles = [];
    const colorImagesMap = new Map(); // Store color images by index

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        // Check if this is a color image (starts with color_images_)
        if (file.fieldname && file.fieldname.startsWith("color_images_")) {
          const colorIndex = parseInt(file.fieldname.split("_")[2]);
          if (!colorImagesMap.has(colorIndex)) {
            colorImagesMap.set(colorIndex, []);
          }
          colorImagesMap.get(colorIndex).push({
            url: file.path,
            publicId: file.filename,
            alt: "",
            order: colorImagesMap.get(colorIndex).length,
          });
        }
        // Regular media images
        else if (file.fieldname === "media") {
          mediaFiles.push({
            id: Date.now() + mediaFiles.length,
            alt: "",
            src: file.path,
            publicId: file.filename,
            order: mediaFiles.length,
          });
        }
      });
    }

    // Associate color images with their respective colors
    let colors = body.colors || [];
    if (colorImagesMap.size > 0) {
      colors = colors.map((color, idx) => ({
        ...color,
        images: colorImagesMap.get(idx) || color.images || [],
      }));
    }

    // Process specifications if provided
    let specifications = body.specifications || {};
    if (body.sizes && body.sizes.length > 0) {
      // Build specifications for each size variant
      body.sizes.forEach((size) => {
        if (size.id) {
          specifications[size.id] = {
            volume: size.volume || "",
            capacity: size.capacity || "",
            weight: size.weight || "",
            external: size.external || size.dims || "",
            internal: size.internal || "",
            handle: size.handle || "",
            warranty: body.warranty || "",
          };
        }
      });
    }

    // Set thumbnail
    let thumbnail = body.thumbnail;
    if (!thumbnail && mediaFiles.length > 0) {
      thumbnail = mediaFiles[0].src;
    }

    // Calculate discount percentage
    let discountPercentage = 0;
    if (
      body.originalPrice &&
      body.regularPrice &&
      body.originalPrice > body.regularPrice
    ) {
      discountPercentage = Math.round(
        ((body.originalPrice - body.regularPrice) / body.originalPrice) * 100,
      );
    }

    // Generate slug if not provided
    let slug = body.slug;
    if (!slug && body.name) {
      slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    // Create product data object
    const productData = {
      // Basic Info
      name: body.name,
      brand: body.brand || "Tescon",
      slug: slug,
      description: body.description,
      category: body.category,
      subcategory: body.subCategory || "",

      // Breadcrumbs (auto-generated)
      breadcrumbs: [
        { label: "Shop", href: "/shop", order: 0 },
        { label: "Products", href: "/shop/products", order: 1 },
        { label: body.category, href: `/shop/${slug}`, order: 2 },
        { label: body.name, href: "#", order: 3 },
      ],

      // Pricing
      regularPrice: body.regularPrice,
      originalPrice: body.originalPrice || null,
      discountPercentage: discountPercentage,
      cost: body.cost || null,

      // Variants
      colors: colors,
      sizes: body.sizes || [],

      // Features
      features: body.features || [],

      // Specifications
      specifications: specifications,

      // Media
      media: mediaFiles,
      thumbnail: thumbnail,

      // Trust Badges
      trustBadges: body.trustBadges || [],

      // Shipping
      shipping: {
        badge: body.shipping?.badge || "",
        timeframe: body.shipping?.timeframe || "",
        freeShipping: body.shipping?.freeShipping || false,
        shippingWeight: body.shipping?.shippingWeight || null,
      },

      // Inventory
      stockQuantity: body.stockQuantity || 0,
      lowStockThreshold: body.lowStockThreshold || 5,
      isInStock: (body.stockQuantity || 0) > 0,

      // SEO
      metaTitle: body.metaTitle || body.name,
      metaDescription:
        body.metaDescription || body.description?.substring(0, 160),
      metaKeywords: body.metaKeywords || [],
      tags: body.tags || [],

      // Status
      isActive: body.isActive !== undefined ? body.isActive : true,
      isFeatured: body.isFeatured || false,
      isNewArrival: body.isNewArrival || false,
      isBestSeller: body.isBestSeller || false,

      // Additional Info
      warranty: body.warranty || "",
      returnPolicy: body.returnPolicy || "30-day return policy",

      // Sales tracking
      totalSales: 0,
      views: 0,
    };

    // Validate required fields
    if (!productData.name) {
      return res
        .status(400)
        .json({ success: false, message: "Product name is required" });
    }
    if (!productData.brand) {
      return res
        .status(400)
        .json({ success: false, message: "Brand is required" });
    }
    if (!productData.category) {
      return res
        .status(400)
        .json({ success: false, message: "Category is required" });
    }
    if (!productData.regularPrice) {
      return res
        .status(400)
        .json({ success: false, message: "Regular price is required" });
    }

    // Create product in database
    const product = await Product.create(productData);

    // Populate category reference
    await product.populate("category", "name slug");

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (err) {
    console.error("Create product error:", err);

    // Handle duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists. Please use a unique ${field}.`,
      });
    }

    // Handle validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || "Failed to create product",
    });
  }
};

/**
 * PUT /api/products/:id
 * Full update (non-image fields). Send JSON body.
 */
export const updateProduct = async (req, res) => {
  try {
    // Parse body – support both JSON body and multipart form fields
    let body = req.body;
    const id = body.id;

    if (typeof body.data === "string") {
      body = JSON.parse(body.data);
    }

    // Parse array/object fields that may arrive as strings from formData
    const arrayFields = [
      "tags",
      "features",
      "colors",
      "sizes",
      "trustBadges",
      "metaKeywords",
    ];
    const objectFields = ["shipping", "specifications"];

    arrayFields.forEach((key) => {
      if (typeof body[key] === "string") {
        try {
          body[key] = JSON.parse(body[key]);
        } catch {
          body[key] = body[key].split(",").map((s) => s.trim());
        }
      }
    });

    objectFields.forEach((key) => {
      if (typeof body[key] === "string") {
        try {
          body[key] = JSON.parse(body[key]);
        } catch {
          body[key] = {};
        }
      }
    });

    // Handle boolean fields
    const booleanFields = [
      "isActive",
      "isFeatured",
      "isNewArrival",
      "isBestSeller",
    ];
    booleanFields.forEach((field) => {
      if (body[field] === "true" || body[field] === true) {
        body[field] = true;
      } else if (body[field] === "false" || body[field] === false) {
        body[field] = false;
      }
    });

    // Handle numeric fields
    const numericFields = [
      "regularPrice",
      "originalPrice",
      "cost",
      "stockQuantity",
      "lowStockThreshold",
    ];
    numericFields.forEach((field) => {
      if (body[field]) {
        body[field] = Number(body[field]);
      }
    });

    // Find existing product
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Process new media files
    const existingMedia = existingProduct.media || [];
    const newMediaFiles = [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "media") {
          newMediaFiles.push({
            id: Date.now() + newMediaFiles.length,
            alt: "",
            src: file.path,
            publicId: file.filename,
            order: existingMedia.length + newMediaFiles.length,
          });
        }
      });
    }

    // Combine existing and new media
    const mediaFiles = [...existingMedia, ...newMediaFiles];

    // Set thumbnail
    let thumbnail = body.thumbnail;
    if (!thumbnail && mediaFiles.length > 0) {
      thumbnail = mediaFiles[0].src;
    }

    // Calculate discount percentage
    let discountPercentage = 0;
    if (
      body.originalPrice &&
      body.regularPrice &&
      body.originalPrice > body.regularPrice
    ) {
      discountPercentage = Math.round(
        ((body.originalPrice - body.regularPrice) / body.originalPrice) * 100,
      );
    }

    // FIXED: Handle slug properly - only update if explicitly provided
    let updateData = {
      // Basic Info
      name: body.name || existingProduct.name,
      brand: body.brand || existingProduct.brand,
      // REMOVED slug from here - we'll handle it separately
      description: body.description || existingProduct.description,
      category: body.category || existingProduct.category,
      subcategory: body.subCategory || existingProduct.subcategory,

      // Pricing
      regularPrice: body.regularPrice || existingProduct.regularPrice,
      originalPrice: body.originalPrice || existingProduct.originalPrice,
      discountPercentage: discountPercentage,
      cost: body.cost || existingProduct.cost,

      // Variants
      colors: body.colors || existingProduct.colors,
      sizes: body.sizes || existingProduct.sizes,

      // Features
      features: body.features || existingProduct.features,

      // Specifications
      specifications: body.specifications || existingProduct.specifications,

      // Media
      media: mediaFiles,
      thumbnail: thumbnail || existingProduct.thumbnail,

      // Trust Badges
      trustBadges: body.trustBadges || existingProduct.trustBadges,

      // Shipping
      shipping: {
        ...existingProduct.shipping,
        ...body.shipping,
      },

      // Inventory
      stockQuantity:
        body.stockQuantity !== undefined
          ? body.stockQuantity
          : existingProduct.stockQuantity,
      lowStockThreshold:
        body.lowStockThreshold || existingProduct.lowStockThreshold,
      isInStock:
        (body.stockQuantity !== undefined
          ? body.stockQuantity
          : existingProduct.stockQuantity) > 0,

      // SEO
      metaTitle: body.metaTitle || existingProduct.metaTitle,
      metaDescription: body.metaDescription || existingProduct.metaDescription,
      metaKeywords: body.metaKeywords || existingProduct.metaKeywords,
      tags: body.tags || existingProduct.tags,

      // Status
      isActive:
        body.isActive !== undefined ? body.isActive : existingProduct.isActive,
      isFeatured:
        body.isFeatured !== undefined
          ? body.isFeatured
          : existingProduct.isFeatured,
      isNewArrival:
        body.isNewArrival !== undefined
          ? body.isNewArrival
          : existingProduct.isNewArrival,
      isBestSeller:
        body.isBestSeller !== undefined
          ? body.isBestSeller
          : existingProduct.isBestSeller,

      // Additional Info
      warranty: body.warranty || existingProduct.warranty,
      returnPolicy: body.returnPolicy || existingProduct.returnPolicy,
    };

    // Handle slug separately with proper duplicate checking
    if (body.slug) {
      // console.log("Slug provided:", body.slug);
      // If slug is explicitly provided, check if it's unique
      if (body.slug !== existingProduct.slug) {
        // console.log("Slug is unique");
        const slugExists = await Product.findOne({
          slug: body.slug,
          _id: { $ne: id },
        });
        // console.log("Slug exists:", slugExists);

        // if (slugExists) {
        //   console.log("Slug already exists");
        //   return res.status(409).json({
        //     success: false,
        //     message: `Slug "${body.slug}" already exists. Please use a unique slug.`,
        //   });
        // }
        // updateData.slug = body.slug;
      }
    } else if (body.name && body.name !== existingProduct.name) {
      // console.log("Name changed ");
      // Only auto-generate slug if name changed AND no slug provided
      const generatedSlug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Check if generated slug conflicts with another product
      const slugExists = await Product.findOne({
        slug: generatedSlug,
        _id: { $ne: id },
      });

      if (slugExists) {
        // Append a number to make it unique
        let counter = 1;
        let uniqueSlug = generatedSlug;
        while (await Product.findOne({ slug: uniqueSlug, _id: { $ne: id } })) {
          uniqueSlug = `${generatedSlug}-${counter}`;
          counter++;
        }
        updateData.slug = uniqueSlug;
      } else {
        updateData.slug = generatedSlug;
      }
    }
    // If neither condition is met, keep the existing slug (don't include it in updateData)

    // console.log({ updateData });
    // Update product in database
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    // await updatedProduct.populate("category", "name slug");

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (err) {
    console.error("Update product error:", err);

    // Handle duplicate key error
    if (err.code === 11000) {
      console.log("Duplicate key error");
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists. Please use a unique ${field}.`,
      });
    }

    // Handle validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || "Failed to update product",
    });
  }
};
/**
 * DELETE /api/products/:id
 * Delete product and all its Cloudinary images
 */
export const deleteProduct = async (req, res) => {
  try {
    // console.log("Deleting product with id:", req.params.id);
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Remove all images from Cloudinary
    await Promise.all(
      product.images.map((img) => deleteFromCloudinary(img.publicId)),
    );

    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Image sub-resource controllers ──────────────────────────────────────────

/**
 * POST /api/products/:id/images
 * Upload one or more images to an existing product.
 * multipart/form-data field: "images"
 */
export const addImages = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    if (!req.files?.length) {
      return res
        .status(400)
        .json({ success: false, message: "No images provided" });
    }

    const totalAfter = product.images.length + req.files.length;
    if (totalAfter > 20) {
      // Delete the just-uploaded extras from Cloudinary to avoid orphans
      await Promise.all(req.files.map((f) => deleteFromCloudinary(f.filename)));
      return res.status(400).json({
        success: false,
        message: `Cannot exceed 20 images. Current: ${product.images.length}, uploading: ${req.files.length}`,
      });
    }

    const newImages = req.files.map((file, idx) => ({
      url: file.path,
      publicId: file.filename,
      isFeatured: false,
      order: product.images.length + idx,
    }));

    // Auto-feature if product had no images
    if (product.images.length === 0 && newImages.length > 0) {
      newImages[0].isFeatured = true;
    }

    product.images.push(...newImages);
    await product.save();
    await product.populate("category", "name slug");

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/products/:id/images/:imageId
 * Remove a single image from a product
 */
export const removeImage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const imgIndex = product.images.findIndex(
      (img) => img._id.toString() === req.params.imageId,
    );
    if (imgIndex === -1)
      return res
        .status(404)
        .json({ success: false, message: "Image not found" });

    const [removed] = product.images.splice(imgIndex, 1);
    await deleteFromCloudinary(removed.publicId);

    // If removed image was featured, promote next available
    if (removed.isFeatured && product.images.length > 0) {
      product.images[0].isFeatured = true;
    }

    await product.save();
    await product.populate("category", "name slug");

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/products/:id/images/:imageId/featured
 * Set an image as the featured image for the product
 */
export const setFeaturedImage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    let found = false;
    product.images.forEach((img) => {
      if (img._id.toString() === req.params.imageId) {
        img.isFeatured = true;
        found = true;
      } else {
        img.isFeatured = false;
      }
    });

    if (!found)
      return res
        .status(404)
        .json({ success: false, message: "Image not found" });

    await product.save();
    await product.populate("category", "name slug");

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/products/:id/images/reorder
 * Body: { order: ["imageId1", "imageId2", ...] }
 * Re-order images by providing a sorted list of image _ids
 */
export const reorderImages = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        message: "`order` must be an array of image ids",
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const imageMap = new Map(
      product.images.map((img) => [img._id.toString(), img]),
    );

    const reordered = order
      .map((imgId, idx) => {
        const img = imageMap.get(imgId);
        if (img) img.order = idx;
        return img;
      })
      .filter(Boolean);

    if (reordered.length !== product.images.length) {
      return res.status(400).json({
        success: false,
        message: "Image id list does not match product images",
      });
    }

    product.images = reordered;
    await product.save();
    await product.populate("category", "name slug");

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/products/:id/toggle-status
 * Toggle is_active
 */
export const toggleStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    product.is_active = !product.is_active;
    await product.save();

    res.status(200).json({
      success: true,
      data: { _id: product._id, is_active: product.is_active },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllProductsUser = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = "",
      selectedCats,
      selectedColors,
      selectedFeats,
      sortBy = "newest",
      minPrice,
      maxPrice,
      stockStatus,
    } = req.query;

    const query = {
      isActive: true,
    };

    // SEARCH
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    console.log("Query Params:", req.query);
    // CATEGORY
    if (selectedCats) {
      query.category = {
        $in: selectedCats.split(","),
      };
    }

    // COLORS
    if (selectedColors) {
      query["colors.label"] = {
        $in: selectedColors.split(","),
      };
    }

    // FEATURES
    if (selectedFeats) {
      const feats = selectedFeats.split(",");

      query.$or = [
        { "features.text": { $in: feats } },
        { tags: { $in: feats } },
      ];
    }

    // PRICE
    if (minPrice || maxPrice) {
      query.regularPrice = {};

      if (minPrice) {
        query.regularPrice.$gte = Number(minPrice);
      }

      if (maxPrice) {
        query.regularPrice.$lte = Number(maxPrice);
      }
    }

    // STOCK
    if (stockStatus === "in") {
      query.stockQuantity = { $gt: 10 };
    } else if (stockStatus === "low") {
      query.stockQuantity = { $gt: 0, $lte: 10 };
    } else if (stockStatus === "out") {
      query.stockQuantity = 0;
    }

    // SORT
    let sortQuery = { createdAt: -1 };

    switch (sortBy) {
      case "price_asc":
        sortQuery = { regularPrice: 1 };
        break;

      case "price_desc":
        sortQuery = { regularPrice: -1 };
        break;

      case "oldest":
        sortQuery = { createdAt: 1 };
        break;

      case "popular":
        sortQuery = { totalSales: -1 };
        break;

      case "rating":
        sortQuery = { rating: -1 };
        break;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Product.countDocuments(query),
    ]);

    const productIds = products.map((p) => p._id);

    // ACTIVE DISCOUNTS
    const discounts = await Discount.find({
      productId: { $in: productIds },
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).lean();

    const discountMap = new Map();

    discounts.forEach((discount) => {
      discountMap.set(discount.productId.toString(), discount);
    });

    // CLEAN PRODUCTS
    const cleanedProducts = products.map((product) => {
      const discount = discountMap.get(product._id.toString());

      let discountData = null;

      if (discount) {
        let finalPrice = product.originalPrice;
        let savedAmount = 0;
        let savedPercentage = 0;

        if (discount.discountType === "percentage") {
          savedAmount = (product.originalPrice * discount.discountAmount) / 100;

          finalPrice -= savedAmount;

          savedPercentage = discount.discountAmount;
        }

        if (discount.discountType === "fixed") {
          savedAmount = Math.min(
            discount.discountAmount,
            product.originalPrice,
          );

          finalPrice -= savedAmount;

          savedPercentage = (savedAmount / product.originalPrice) * 100;
        }

        discountData = {
          type: discount.discountType,
          amount: discount.discountAmount,
          finalPrice: Number(finalPrice.toFixed(2)),
          savedAmount: Number(savedAmount.toFixed(2)),
          savedPercentage: Math.round(savedPercentage),
          startDate: discount.startDate,
          endDate: discount.endDate,
        };
      }

      return {
        _id: product._id,
        name: product.name,
        brand: product.brand,
        slug: product.slug,
        description: product.description,

        category: product.category,
        subcategory: product.subcategory,

        regularPrice: product.regularPrice,
        originalPrice: product.originalPrice,

        colors: product.colors,
        sizes: product.sizes,

        features: product.features,
        specifications: product.specifications,

        media: product.media,
        thumbnail: product.thumbnail,

        isInStock: product.isInStock,

        hasDiscount: !!discount,
        discount: discountData,
      };
    });

    res.json({
      success: true,
      data: cleanedProducts,

      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getAllProductsUser error:", err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
