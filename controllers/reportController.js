import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";

// ── Helper: date range boundaries ────────────────────────────────────────────
function getDateRange(range) {
  const now = new Date();

  switch (range) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "yesterday": {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: now };
    }
    default: {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/summary?range=today|yesterday|week|month|year
//
// Returns all KPI counts for the dashboard stat cards
// ─────────────────────────────────────────────────────────────────────────────
export const getSummary = async (req, res) => {
  try {
    const { range = "today", lowStockThreshold = 10 } = req.query;
    const threshold = parseInt(lowStockThreshold, 10);

    const { start: todayStart, end: todayEnd } = getDateRange("today");
    const { start: monthStart } = getDateRange("month");
    const { start: rangeStart, end: rangeEnd } = getDateRange(range);

    const [
      todaySalesResult,
      monthlyRevenueResult,
      totalProfitResult,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      processingOrders,
      shippedOrders,
      lowStockCount,
      totalOrders,
    ] = await Promise.all([
      // Today's sales — sum of total for non-cancelled orders today
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart, $lte: todayEnd },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } },
        },
      ]),

      // Monthly revenue — all orders this month
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart },
            status: { $ne: "cancelled" },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),

      // Total profit this month — revenue minus estimated COGS
      // Profit = total - subtotal * costRatio (use product.cost / regularPrice)
      // Simplified: profit ≈ total - shipping - tax - (subtotal * 0.40)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalProfit" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Order status counts (all-time for the KPI cards)
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "delivered" }),
      Order.countDocuments({ status: "cancelled" }),
      Order.countDocuments({ status: "processing" }),
      Order.countDocuments({ status: "shipped" }),

      // Low stock products
      Product.countDocuments({
        isActive: true,
        stockQuantity: { $lte: threshold },
      }),

      // Total orders ever
      Order.countDocuments(),
    ]);

    const todaySales = todaySalesResult[0]?.total || 0;
    const todayOrderCount = todaySalesResult[0]?.count || 0;
    const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;
    const totalProfit = totalProfitResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        todaySales: parseFloat(todaySales.toFixed(2)),
        todayOrderCount,
        monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        processingOrders,
        shippedOrders,
        lowStockProducts: lowStockCount,
        totalOrders,
      },
    });
  } catch (err) {
    console.error("getSummary error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch summary",
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/sales-chart?range=week|month|year
//
// Returns labels + revenue + order counts for the bar chart
// ─────────────────────────────────────────────────────────────────────────────
export const getSalesChart = async (req, res) => {
  try {
    const { range = "week" } = req.query;

    let groupBy, labelFormat, dateStart;
    const now = new Date();

    if (range === "week") {
      // Last 7 days — group by day-of-week
      dateStart = new Date(now);
      dateStart.setDate(dateStart.getDate() - 6);
      dateStart.setHours(0, 0, 0, 0);
      groupBy = { $dayOfMonth: "$createdAt" };
      labelFormat = "day";
    } else if (range === "month") {
      // Current month — group by week number
      dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
      groupBy = { $week: "$createdAt" };
      labelFormat = "week";
    } else if (range === "year") {
      // Current year — group by month
      dateStart = new Date(now.getFullYear(), 0, 1);
      groupBy = { $month: "$createdAt" };
      labelFormat = "month";
    }

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: dateStart },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: {
            period: groupBy,
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
          date: { $min: "$createdAt" },
        },
      },
      { $sort: { date: 1 } },
    ];

    const raw = await Order.aggregate(pipeline);

    // Build full period labels filling in zeros for missing days/weeks/months
    let labels = [];
    let revenue = [];
    let orders = [];

    if (range === "week") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayOfMonth = d.getDate();
        const match = raw.find(
          (r) => r._id.day === dayOfMonth && r._id.month === d.getMonth() + 1,
        );
        labels.push(days[d.getDay()]);
        revenue.push(parseFloat((match?.revenue || 0).toFixed(2)));
        orders.push(match?.orders || 0);
      }
    } else if (range === "month") {
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      const weeksInMonth = Math.ceil(daysInMonth / 7);
      for (let w = 1; w <= weeksInMonth; w++) {
        labels.push(`Wk ${w}`);
        const weekStart = (w - 1) * 7 + 1;
        const weekEnd = Math.min(w * 7, daysInMonth);
        const weekRevenue = raw
          .filter(
            (r) =>
              r._id.day >= weekStart &&
              r._id.day <= weekEnd &&
              r._id.month === now.getMonth() + 1,
          )
          .reduce((s, r) => s + r.revenue, 0);
        const weekOrders = raw
          .filter(
            (r) =>
              r._id.day >= weekStart &&
              r._id.day <= weekEnd &&
              r._id.month === now.getMonth() + 1,
          )
          .reduce((s, r) => s + r.orders, 0);
        revenue.push(parseFloat(weekRevenue.toFixed(2)));
        orders.push(weekOrders);
      }
    } else if (range === "year") {
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      for (let m = 1; m <= 12; m++) {
        labels.push(monthNames[m - 1]);
        const match = raw.find((r) => r._id.period === m);
        revenue.push(parseFloat((match?.revenue || 0).toFixed(2)));
        orders.push(match?.orders || 0);
      }
    }

    res.json({ success: true, data: { labels, revenue, orders } });
  } catch (err) {
    console.error("getSalesChart error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chart data",
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/order-history
//   ?status=all|pending|delivered|cancelled|processing|shipped
//   &page=1
//   &limit=10
//   &search=customerName|orderId
//   &startDate=YYYY-MM-DD
//   &endDate=YYYY-MM-DD
//   &sortBy=createdAt|total
//   &sortOrder=desc|asc
//
// Returns paginated, filterable order list
// ─────────────────────────────────────────────────────────────────────────────
export const getOrderHistory = async (req, res) => {
  try {
    const {
      status = "all",
      page = 1,
      limit = 10,
      search = "",
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build match filter
    const match = {};

    if (status !== "all") {
      match.status = status;
    }

    // Enhanced search: supports Order ID, Customer Name, Customer Email, AND Product Names
    if (search && search.trim()) {
      const searchRegex = { $regex: search, $options: "i" };
      match.$or = [
        { orderId: searchRegex },
        { "customer.name": searchRegex },
        { "customer.email": searchRegex },
        // Search within items array for product names
        { "items.name": searchRegex },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        match.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    // Handle sorting for nested fields
    let sortField = sortBy;
    if (sortBy === "customer.name") {
      sortField = "customer.name";
    }

    const sortDir = sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: sortDir };

    // Execute queries with aggregation pipeline for better performance
    const [orders, total] = await Promise.all([
      Order.find(match)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select(
          "orderId customer items itemsCount subtotal shipping tax total discount status paymentStatus payment shippingAddress timeline coupons notes createdAt",
        )
        .lean(),
      Order.countDocuments(match),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (err) {
    console.error("getOrderHistory error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/low-stock?threshold=10&category=&page=1&limit=20
//
// Returns products at or below stock threshold
// ─────────────────────────────────────────────────────────────────────────────
export const getLowStock = async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const match = {
      isActive: true,

      // 🔥 CORE LOGIC
      $expr: {
        $lte: ["$stockQuantity", "$lowStockThreshold"],
      },
    };

    if (category) {
      match.category = { $regex: category, $options: "i" };
    }

    const [products, total] = await Promise.all([
      Product.find(match)
        .sort({ stockQuantity: 1 })
        .skip(skip)
        .limit(limitNum)
        .select(
          "name brand slug category subcategory stockQuantity lowStockThreshold regularPrice cost thumbnail isInStock colors sizes",
        )
        .lean(),

      Product.countDocuments(match),
    ]);

    const enriched = products.map((p) => ({
      ...p,
      urgency:
        p.stockQuantity === 0
          ? "out_of_stock"
          : p.stockQuantity <= 2
          ? "critical"
          : "low",
    }));

    res.json({
      success: true,
      data: {
        products: enriched,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("getLowStock error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch low stock",
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/top-products?limit=5&range=month
//
// Returns best-selling products by quantity sold
// ─────────────────────────────────────────────────────────────────────────────
export const getTopProducts = async (req, res) => {
  try {
    const { limit = 5, range = "month" } = req.query;
    const { start } = getDateRange(range);

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: start },
          status: { $ne: "cancelled" },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.sku",
          name: { $first: "$items.name" },
          image: { $first: "$items.image" },
          totalQty: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: parseInt(limit, 10) },
    ];

    const products = await Order.aggregate(pipeline);

    res.json({ success: true, data: { products } });
  } catch (err) {
    console.error("getTopProducts error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top products",
      error: err.message,
    });
  }
};

export default {
  getSummary,
  getSalesChart,
  getOrderHistory,
  getLowStock,
  getTopProducts,
};
