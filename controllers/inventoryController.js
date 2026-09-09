import Product from "../models/productModel.js";

const getAllInventory = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status } = req.query;
    // console.log("Query Params:", req.query);

    const query = {};

    // 🔍 Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    // 📂 Category
    // if (category) {
    //   query.category = category; // must be ObjectId
    // }

    // 📊 Status
    // if (status) {
    //   query.is_active = status === "active";
    // }

    // 📦 Stock Status
    // if (stockStatus === "in") {
    //   query.stockQuantity = { $gt: 10 };
    // }
    // if (stockStatus === "low") {
    //   query.stockQuantity = { $gt: 0, $lte: 10 };
    // }
    // if (stockStatus === "out") {
    //   query.stockQuantity = 0;
    // }

    const products = await Product.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    // console.log("Query:", query);
    // console.log("Products Found:", products.length);
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

const getInventoryById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("name");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};
const updateStockInventory = async (req, res) => {
  try {
    const { productId, quantity, reason, note } = req.body;
    // console.log("Update Stock Payload:", req.body);

    // 🔍 Validation
    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "productId, quantity and type are required",
      });
    }

    const qty = Number(quantity);

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number",
      });
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { $inc: { stockQuantity: qty } },
      { $set: { updatedAt: new Date(), reason, note } },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ❌ Prevent negative stock
    if (product.stockQuantity < 0) {
      // rollback
      await Product.findByIdAndUpdate(productId, {
        $inc: { stockQuantity: qty },
      });

      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    // 🧾 Optional: Save inventory history
    // await Inventory.create({
    //   product: productId,
    //   quantity: qty,
    //   type,
    //   reason,
    // });

    res.json({
      success: true,
      message: `Stock updated successfully`,
      product,
    });
  } catch (err) {
    console.error("Stock Update Error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export default {
  getAllInventory,
  getInventoryById,
  updateStockInventory,
};
