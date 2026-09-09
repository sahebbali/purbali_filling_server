import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import { sendForgetPasswordEmail } from "../email/sendForgetPasswordEmail.js";
import { verify_jwt } from "../utils/generateToken.js";

const setCors = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // console.log(req.body);

    // 🔹 Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 🔹 Find user
    const user = await User.findOne({ email }).select("+password");
    // console.log("User found:", user);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 🔹 Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    // console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    // 🔹 Generate token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" },
    );

    // 🔹 Remove password
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: userResponse,
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    // console.log(req.body);

    // 🔹 Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email are required",
      });
    }

    // 🔹 Find user
    const user = await User.findOne({ email }).select("+password");
    // console.log("User found:", user);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email",
      });
    }

    // 🔹 Generate token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" },
    );
    await sendForgetPasswordEmail(user.email, user.name, token);
    console.log({ token });

    return res.status(200).json({
      success: true,
      message: "Email Send successful",
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;
    const decoded = verify_jwt(token);
    // console.log("Decoded token:", decoded);

    if (!decoded.status) {
      return res.status(400).json({
        success: false,
        message: decoded.message,
      });
    }
    const email = decoded.data.email;

    // Validation
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide password and confirm password",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Hash the received token

    // Find user with valid token
    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Update password
    user.password = newPassword;
    user.token = token;

    await user.save();

    // Send confirmation email
    // await sendPasswordChangeConfirmation(user.email, user.name);

    return res.status(200).json({
      success: true,
      message:
        "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password. Please try again.",
    });
  }
};

export default { login, forgetPassword, resetPassword };
