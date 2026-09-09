import mongoose from "mongoose";
let isConnected = false;

export const connA = async () => {
  if (isConnected) return mongoose;

  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log("MongoDB connected");
    return db;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};
