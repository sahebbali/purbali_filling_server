import jwt from "jsonwebtoken";
import { verify_jwt } from "../utils/generateToken.js";
import User from "../models/userModel.js";

export const verifyJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // 2. Format: "Bearer TOKEN"
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    const token = parts[1]; // ✅ Extract real token

    // console.log("Received token:", token); // Debug log
    // 3. Verify token
    const decoded = verify_jwt(token);

    // console.log("Decoded token:", decoded);

    if (!decoded.status) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // 4. Attach user data
    req.auth = decoded.data;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
export const verifyAdmin = async (req, res, next) => {
  try {
    const requester = req.auth.email;
    // console.log("Requester ID from token:", requester); // Debug log
    const requesterAccount = await User.findOne({
      $or: [{ userId: requester }, { email: requester }],
    });
    if (requesterAccount?.role === "admin") {
      next();
    } else {
      return res.status(401).send({
        error: {
          message: "Not authorized, token failed",
        },
      });
    }
  } catch (e) {
    return res.status(401).send({
      error: {
        message: e.message,
      },
    });
  }
};
export const verifyUser = async (req, res, next) => {
  try {
    const requester = req.auth.email;
    console.log("Requester ID from user token:", requester); // Debug log
    const requesterAccount = await User.findOne({
      $or: [{ userId: requester }, { email: requester }],
    });
    if (requesterAccount?.role === "user") {
      next();
    } else {
      return res.status(401).send({
        error: {
          message: "Not authorized, token failed",
        },
      });
    }
  } catch (e) {
    return res.status(401).send({
      error: {
        message: e.message,
      },
    });
  }
};
export const authMiddleware = async (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ message: "Token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
