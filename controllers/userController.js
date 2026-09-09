import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import bcrypt from "bcryptjs";

export const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      addresses,
      agreeToTerms,
      newsletter,
    } = req.body;
    // console.log("Create User Request Body:", req.body);

    // 🔹 Required fields validation
    if (!name || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // 🔹 Terms agreement check
    if (!agreeToTerms) {
      return res.status(400).json({
        success: false,
        message: "You must agree to terms and conditions",
      });
    }

    // 🔹 Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // 🔹 Phone validation (basic)
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    // 🔹 Password match check
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // 🔹 Password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // 🔹 Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // 🔹 Create user
    const newUser = await User.create({
      name, // map frontend -> DB
      email,
      phone,
      address: addresses,
      password,
      newsletter,
    });

    // 🔹 Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse,
    });
  } catch (error) {
    console.error("Create User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get a single user by ID
export const getUserById = async (req, res) => {
  try {
    const requester = req.auth?.email;

    if (!requester) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Run queries in parallel for better performance
    const [user, orders, totalOrders, deliveredOrders, cancelledOrders] =
      await Promise.all([
        User.findOne({ email: requester }).select("-password").lean(),

        Order.find({ "customer.email": requester })
          .sort({ createdAt: -1 }) // latest first
          .limit(3)
          .select("_id  orderId createdAt total status items")
          .lean(),
        Order.countDocuments({ "customer.email": requester }),
        Order.countDocuments({
          "customer.email": requester,
          status: "delivered",
        }),
        Order.countDocuments({
          "customer.email": requester,
          status: "cancelled",
        }),
      ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const formattedOrders = orders.map((order) => ({
      id: order.orderId,
      date: order.createdAt,
      total: order.total,
      status: order.status,
      items: order.items?.length || 0,
    }));

    // Attach computed field safely
    const response = {
      ...user,
      Orders: formattedOrders,
      totalOrders: totalOrders || 0,
      deliveredOrders: deliveredOrders || 0,
      cancelledOrders: cancelledOrders || 0,
    };

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching user:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Update a user
export const updateUser = async (req, res) => {
  try {
    console.log("Update User Request Body:", req.body);
    const requester = req.auth.email;
    console.log("Requester Email:", requester);
    console.log("body:", req.body);
    const user = await User.findOne({ email: requester });
    if (!user) return res.status(404).json({ message: "User not found" });
    const updatedUser = await User.findOneAndUpdate(
      { email: requester },
      req.body,
      {
        new: true,
      },
    );
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// Update a user
export const deleteUserAddress = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Address ID is required" });
    }

    const requester = req.auth?.email;
    if (!requester) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: requester },
      { $pull: { addresses: { _id: id } } },
      { new: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Address deleted successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error deleting user address:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message, // optional, useful for debugging
    });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const requester = req.auth?.email;
    if (!requester) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // 🔹 Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // 🔹 Find user
    const user = await User.findOne({ email: requester });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔹 Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // 🔹 Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 🔹 Update password
    user.password = newPassword; // This will trigger the pre-save hook to hash it
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Update Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export const updateUserPreferences = async (req, res) => {
  try {
    const requester = req.auth?.email;
    if (!requester) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { newsletter, emailNotifications, smsAlerts } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { email: requester },
      {
        $set: {
          ...(newsletter !== undefined && { newsletter }),
          ...(emailNotifications !== undefined && { emailNotifications }),
          ...(smsAlerts !== undefined && { smsAlerts }),
        },
      },
      { new: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update Preferences Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
export default {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUserAddress,
  updatePassword,
  deleteUser,
  updateUserPreferences,
};
