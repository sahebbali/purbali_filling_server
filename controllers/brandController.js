import Brand from "../models/brandModel.js";
import CarouselManager from "../models/carouselManagerModel.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";

export const createBrand = async (req, res) => {
  try {
    const { name, slug, description, website, country, banners } = req.body;

    // ---- Logo (single image on the brand itself) ----
    const logoFile = req.files?.logoImage?.[0];
    const logoData = logoFile
      ? { url: logoFile.path, public_id: logoFile.filename }
      : null;

    // ---- Banner rows metadata sent as a JSON string from the client ----
    let bannersMeta = [];
    if (banners) {
      try {
        bannersMeta = JSON.parse(banners);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: "Invalid banners payload",
        });
      }
    }

    // Files for ONLY the rows that had a new upload (hasNewImage: true),
    // in the same order those rows appear in bannersMeta
    const bannerFiles = req.files?.bannerImages || [];
    let fileCursor = 0;

    const bannersToSave = bannersMeta
      // skip fully-empty rows (e.g. an "Add Banner" row the user never filled in)
      .filter(
        (b) =>
          b.header ||
          b.subHeader ||
          b.buttonText ||
          b.hasNewImage ||
          b.image?.url,
      )
      .map((b) => {
        let image = b.image?.url ? b.image : null;

        if (b.hasNewImage && bannerFiles[fileCursor]) {
          const file = bannerFiles[fileCursor];
          image = { url: file.path, public_id: file.filename };
          fileCursor += 1;
        }

        return {
          header: b.header || "",
          subHeader: b.subHeader || "",
          buttonText: b.buttonText || "",
          image,
          order: b.order ?? 0,
          isActive: true,
        };
      });

    // ---- Brand uniqueness checks ----
    const existingBrand = await Brand.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingBrand) {
      return res.status(400).json({
        success: false,
        error: "Brand with this name already exists",
      });
    }

    // Generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug && name) {
      finalSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (finalSlug) {
      const existingSlug = await Brand.findOne({ slug: finalSlug });
      if (existingSlug) {
        return res.status(400).json({
          success: false,
          error: "Slug already exists",
        });
      }
    }

    // ---- Create the brand, with banners embedded directly ----
    const brand = await Brand.create({
      name,
      slug: finalSlug,
      description: description || "",
      logo: logoData,
      banners: bannersToSave,
      website: website || "",
      country: country || "",
    });

    res.status(201).json({
      success: true,
      message: "Brand created successfully",
      data: brand,
    });
  } catch (error) {
    console.error("Create brand error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Duplicate key error - Brand name or slug already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
export const getAllBrands = async (req, res) => {
  try {
    const { name } = req.query;

    const filter = name ? { name: { $regex: new RegExp(name, "i") } } : {};

    const brands = await Brand.find(filter)
      .select("-isActive -isFeatured -sortOrder -createdAt -updatedAt -__v")
      .sort({ createdAt: 1 })
      .lean();

    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getAllCarousel = async (req, res) => {
  try {
    const { brand } = req.query;

    if (!brand) {
      return res.status(400).json({
        success: false,
        error: "brand query param is required",
      });
    }

    // Match by slug (exact) or name (case-insensitive), only active brands
    const brandDoc = await Brand.findOne({
      isActive: true,
      $or: [
        { slug: brand.toLowerCase() },
        { name: { $regex: new RegExp(`^${brand}$`, "i") } },
      ],
    })
      .select("name slug banners")
      .lean();

    if (!brandDoc) {
      return res.status(404).json({
        success: false,
        error: "Brand not found",
      });
    }

    // Only active banners, in slide order
    const banners = (brandDoc.banners || [])
      .filter((b) => b.isActive)
      .sort((a, b) => a.order - b.order);

    res.status(200).json({
      success: true,
      data: {
        brand: brandDoc.name,
        slug: brandDoc.slug,
        banners,
      },
    });
  } catch (error) {
    console.error("Get carousel error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
export const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id).lean();

    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }

    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const {
      id,
      name,
      slug,
      description,
      website,
      country,
      isActive,
      isFeatured,
      banners,
      removeLogo, // send "true" from the client if the user removed the logo without picking a new one
    } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: "Brand id is required" });
    }

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({ success: false, error: "Brand not found" });
    }

    // ---- Uniqueness checks (excluding this brand) ----
    if (name && name.toLowerCase() !== brand.name.toLowerCase()) {
      const existingBrand = await Brand.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });
      if (existingBrand) {
        return res.status(400).json({
          success: false,
          error: "Brand with this name already exists",
        });
      }
    }

    let finalSlug = slug;
    if (!finalSlug && name) {
      finalSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    if (finalSlug && finalSlug !== brand.slug) {
      const existingSlug = await Brand.findOne({
        _id: { $ne: id },
        slug: finalSlug,
      });
      if (existingSlug) {
        return res
          .status(400)
          .json({ success: false, error: "Slug already exists" });
      }
    }

    // ---- Logo: replace, remove, or leave as-is ----
    const logoFile = req.files?.logoImage?.[0];
    if (logoFile) {
      if (brand.logo?.public_id) {
        await deleteFromCloudinary(brand.logo.public_id);
      }
      brand.logo = { url: logoFile.path, public_id: logoFile.filename };
    } else if (removeLogo === "true" || removeLogo === true) {
      if (brand.logo?.public_id) {
        await deleteFromCloudinary(brand.logo.public_id);
      }
      brand.logo = { url: "", public_id: "" };
    }

    // ---- Banners: rebuild the array, reusing existing images where the row
    // didn't get a new upload, and cleaning up Cloudinary images that were
    // removed (row deleted, or its image swapped for a new one) ----
    let bannersMeta = [];
    if (banners) {
      try {
        bannersMeta = JSON.parse(banners);
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid banners payload" });
      }
    }

    const bannerFiles = req.files?.bannerImages || [];
    let fileCursor = 0;

    const bannersToSave = bannersMeta
      .filter(
        (b) =>
          b.header ||
          b.subHeader ||
          b.buttonText ||
          b.hasNewImage ||
          b.image?.url,
      )
      .map((b) => {
        let image = b.image?.url ? b.image : null;

        if (b.hasNewImage && bannerFiles[fileCursor]) {
          const file = bannerFiles[fileCursor];
          image = { url: file.path, public_id: file.filename };
          fileCursor += 1;
        }

        return {
          header: b.header || "",
          subHeader: b.subHeader || "",
          buttonText: b.buttonText || "",
          image,
          order: b.order ?? 0,
          isActive: b.isActive !== undefined ? b.isActive : true,
        };
      });

    // Delete Cloudinary images that existed before but aren't kept in the new list
    const oldPublicIds = (brand.banners || [])
      .map((b) => b.image?.public_id)
      .filter(Boolean);
    const keptPublicIds = bannersToSave
      .map((b) => b.image?.public_id)
      .filter(Boolean);
    const removedPublicIds = oldPublicIds.filter(
      (pid) => !keptPublicIds.includes(pid),
    );

    await Promise.all(removedPublicIds.map((pid) => deleteFromCloudinary(pid)));

    brand.banners = bannersToSave;

    // ---- Scalar fields ----
    if (name !== undefined) brand.name = name;
    if (finalSlug !== undefined) brand.slug = finalSlug;
    if (description !== undefined) brand.description = description;
    if (website !== undefined) brand.website = website;
    if (country !== undefined) brand.country = country;
    if (isActive !== undefined)
      brand.isActive = isActive === "true" || isActive === true;
    if (isFeatured !== undefined)
      brand.isFeatured = isFeatured === "true" || isFeatured === true;

    await brand.save();

    res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      data: brand,
    });
  } catch (error) {
    console.error("Update brand error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Duplicate key error - Brand name or slug already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log("Attempting to delete brand with ID:", id); // Debug log

    const deleted = await Brand.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Brand not found" });
    }

    res.json({ message: "Brand Deleted Successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: error.message });
  }
};
