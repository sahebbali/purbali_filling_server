import User from "../models/userModel.js";

// Get all customers (with pagination, filtering, sorting)
export const getAllCustomers = async (req, res) => {
  // console.log("hello customer");
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    // console.log(req.query);

    // Build filter
    const filter = { role: "user" }; // Only get regular users as customers

    // Search by name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status === "active") {
      filter.is_active = true;
    }
    if (status === "inactive") {
      filter.is_active = false;
    }
    if (status === "blocked") {
      filter.isBlock = true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute queries
    const [customers, total] = await Promise.all([
      User.find(filter)
        .select("-password") // Exclude password field
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    // Transform customer data to match frontend expectations
    const transformedCustomers = customers.map((customer) => ({
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      avatar: null,
      joinedDate: customer.createdAt.toISOString().split("T")[0],
      totalOrders: 0, // Will be populated from Order model
      totalSpent: 0, // Will be populated from Order model
      lastOrderDate: null, // Will be populated from Order model
      status: customer.is_active ? "active" : "inactive",
      addresses: customer.addresses || [],
      orders: [], // Will be populated when needed
      activities: [], // Will be populated from activity log model
    }));

    res.json({
      success: true,
      data: transformedCustomers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

// Get single customer by ID
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await User.findById(id).select("-password");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Transform to match frontend expectations
    const transformedCustomer = {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      avatar: null,
      joinedDate: customer.createdAt.toISOString().split("T")[0],
      totalOrders: 0,
      totalSpent: 0,
      lastOrderDate: null,
      status: customer.is_active ? "active" : "inactive",
      addresses: customer.addresses || [],
      orders: [],
      activities: [],
    };

    res.json({
      success: true,
      data: transformedCustomer,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer details",
      error: error.message,
    });
  }
};

// Create new customer
export const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, status, addresses } = req.body;
    console.log("Creating customer with data:", req.body);

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Generate random password for new customer

    const newCustomer = new User({
      name,
      email,
      phone: phone || "",
      password: phone || "111111", // Will be hashed by pre-save middleware
      is_active: status === "active",
      role: "user",
      addresses: addresses || [],
      likeMedia: "system",
    });

    await newCustomer.save();

    // Don't send password back to client

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message,
    });
  }
};
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, status, addresses } = req.body;

    // console.log("Updating customer with data:", req.body);

    // 1. Check user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3. Update fields
    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.is_active = status === "active";

    // 4. Update addresses (replace পুরো array)
    if (addresses && Array.isArray(addresses)) {
      user.addresses = addresses;
    }

    // 5. Save updated user
    await user.save();

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer",
      error: error.message,
    });
  }
};

// Update customer

// Update customer status only
export const updateCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedCustomer = await User.findByIdAndUpdate(
      id,
      { is_active: status === "active" },
      { new: true },
    ).select("-password");

    if (!updatedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      message: `Customer ${
        status === "active" ? "activated" : "deactivated"
      } successfully`,
      data: {
        id: updatedCustomer._id,
        status: updatedCustomer.is_active ? "active" : "inactive",
      },
    });
  } catch (error) {
    console.error("Error updating customer status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer status",
      error: error.message,
    });
  }
};

// Delete customer (soft delete or permanent delete)
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    if (permanent === "true") {
      // Permanent delete
      const deletedCustomer = await User.findByIdAndDelete(id);
      if (!deletedCustomer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }
      res.json({
        success: true,
        message: "Customer permanently deleted",
      });
    } else {
      // Soft delete - just deactivate
      const updatedCustomer = await User.findByIdAndUpdate(
        id,
        { is_active: false },
        { new: true },
      );
      if (!updatedCustomer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }
      res.json({
        success: true,
        message: "Customer deactivated successfully",
      });
    }
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
      error: error.message,
    });
  }
};

// Send email to customer (mock endpoint)
export const sendEmailToCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message, type = "notification" } = req.body;

    // Check if customer exists
    const customer = await User.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Here you would integrate with your email service (Nodemailer, SendGrid, etc.)
    // For now, we'll just log and return success
    console.log(`Email sent to ${customer.email}:`, { subject, message, type });

    // Store email in customer's activity if you have an activity model
    // await Activity.create({
    //   customerId: id,
    //   type: 'email',
    //   description: `Email sent: ${subject}`,
    //   metadata: { subject, message, type }
    // });

    res.json({
      success: true,
      message: "Email sent successfully",
      data: {
        to: customer.email,
        subject,
        type,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
};

// Get customer statistics
export const getCustomerStats = async (req, res) => {
  try {
    const [totalCustomers, activeCustomers, inactiveCustomers] =
      await Promise.all([
        User.countDocuments({ role: "user" }),
        User.countDocuments({ role: "user", is_active: true }),
        User.countDocuments({ role: "user", is_active: false }),
      ]);

    res.json({
      success: true,
      data: {
        total: totalCustomers,
        active: activeCustomers,
        inactive: inactiveCustomers,
      },
    });
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer statistics",
      error: error.message,
    });
  }
};

export default {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomerStatus,
  deleteCustomer,
  sendEmailToCustomer,
  getCustomerStats,
  updateCustomer,
};
