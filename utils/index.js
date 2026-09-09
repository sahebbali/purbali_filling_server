import User from "../models/userModel.js";
import Product from "../models/productModel.js";

// Update User Orders
export const updateUserTotalOrder = async (email, count = 1) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        $inc: {
          totalOrders: Number(count),
          completedOrders: Number(count),
        },
      },
      { new: true },
    );

    if (!updatedUser) {
      console.log("User not found");
      return null;
    }

    return updatedUser;
  } catch (error) {
    console.error("Update user order error:", error.message);
    throw error;
  }
};
export const updateUserAddress = async (email, shippingAddress) => {
  console.log("Updating user address for:", email);
  try {
    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        $push: {
          addresses: shippingAddress,
        },
      },
      { new: true },
    );

    if (!updatedUser) {
      console.log("User not found");
      return null;
    }

    return updatedUser;
  } catch (error) {
    console.error("Update user order error:", error.message);
    throw error;
  }
};

// Update Product Stock
export const updateStockQuantity = async (id, count = 1, type = "minus") => {
  try {
    const quantity = type === "add" ? Number(count) : -Number(count);

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id },
      {
        $inc: {
          stockQuantity: quantity,
          completedOrders: Number(count),
        },
      },
      { new: true },
    );

    if (!updatedProduct) {
      console.log("Product not found");
      return null;
    }

    return updatedProduct;
  } catch (error) {
    console.error("Update stock error:", error.message);
    throw error;
  }
};

export default {
  updateUserTotalOrder,
  updateStockQuantity,
  updateUserAddress,
};
