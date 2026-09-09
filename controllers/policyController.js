import Policy from "./../models/policyModel.js";
// ── Helpers ───────────────────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const getPolicy = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category && req.query.category !== "all") {
    filter.category = req.query.category;
  }

  const policy = await Policy.find(filter).sort({ order: 1, createdAt: 1 });

  res.json({
    success: true,
    count: policy.length,
    data: policy,
  });
});

export const getPolicyById = asyncHandler(async (req, res) => {
  const policy = await Policy.findById(req.params.id);
  if (!policy) {
    return res
      .status(404)
      .json({ success: false, message: "Policy not found" });
  }
  res.json({ success: true, data: policy });
});

export const createPolicy = asyncHandler(async (req, res) => {
  const { name, category, description, order } = req.body;

  const policy = await Policy.create({
    name,
    category: category || "general",
    description: description || "",
    order: order || 0,
  });

  res.status(201).json({ success: true, data: policy });
});

export const updatePolicy = asyncHandler(async (req, res) => {
  const { name, category, description, order, isActive } = req.body;

  const policy = await Policy.findByIdAndUpdate(
    req.params.id,
    { name, category, description, order, isActive },
    { new: true, runValidators: true },
  );

  if (!policy) {
    return res
      .status(404)
      .json({ success: false, message: "Policy not found" });
  }

  res.json({ success: true, data: policy });
});

export const deletePolicy = asyncHandler(async (req, res) => {
  const policy = await Policy.findByIdAndDelete(req.params.id);
  if (!policy) {
    return res
      .status(404)
      .json({ success: false, message: "Policy not found" });
  }
  res.json({ success: true, message: "Policy deleted successfully" });
});

// ── Items (sub-documents) ─────────────────────────────────────────────────────

export const getItems = asyncHandler(async (req, res) => {
  const policy = await Policy.findById(req.params.id);
  if (!policy) {
    return res
      .status(404)
      .json({ success: false, message: "Policy not found" });
  }
  res.json({ success: true, count: policy.items.length, data: policy.items });
});

/**
 * POST /api/sections/:id/items
 * Add an item to a section
 */
export const addItem = asyncHandler(async (req, res) => {
  const { text, order } = req.body;
  if (!text || !text.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Rule text is required" });
  }

  const policy = await Policy.findById(req.params.id);
  if (!policy) {
    return res
      .status(404)
      .json({ success: false, message: "Policy not found" });
  }

  policy.items.push({
    text: text.trim(),
    order: order ?? policy.items.length,
  });
  await policy.save();

  const newItem = policy.items[policy.items.length - 1];
  res.status(201).json({ success: true, data: newItem, policy });
});

export const updateItem = asyncHandler(async (req, res) => {
  const { text, order } = req.body;

  const policy = await Policy.findById(req.params.policyId);
  if (!policy) {
    return res
      .status(404)
      .json({ success: false, message: "Policy not found" });
  }

  const item = policy.items.id(req.params.itemId);
  if (!item) {
    return res.status(404).json({ success: false, message: "Item not found" });
  }

  if (text !== undefined) item.text = text.trim();
  if (order !== undefined) item.order = order;

  await policy.save();
  res.json({ success: true, data: item, policy });
});

export const deleteItem = asyncHandler(async (req, res) => {
  const policy = await Policy.findById(req.params.policyId);
  if (!policy) {
    return res
      .status(404)
      .json({ success: false, message: "Policy not found" });
  }

  const item = policy.items.id(req.params.itemId);
  if (!item) {
    return res.status(404).json({ success: false, message: "Item not found" });
  }

  item.deleteOne();
  await policy.save();

  res.json({ success: true, message: "Item deleted successfully", policy });
});

/**
 * POST /api/sections/seed
 * Seed initial policy data (dev only)
 */
export const seedData = async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res
      .status(403)
      .json({ success: false, message: "Seeding not allowed in production" });
  }

  await Policy.deleteMany({});

  const seed = [
    {
      name: "Return / Replacement Policy",
      category: "return",
      order: 1,
      description:
        "Under the following conditions, a customer is eligible for a return:",
      items: [
        {
          text: "The item needs to be unused and unopened in its original condition.",
          order: 1,
        },
        {
          text: "The item's packaging/box or seal must be unbroken. Do not accept the delivery if the package appears to be tampered with.",
          order: 2,
        },
        {
          text: "A return is not applicable if the product details page indicates that it is non-returnable.",
          order: 3,
        },
        {
          text: "A return is not applicable for customized product, or other heat-sensitive and refrigerated goods.",
          order: 4,
        },
        {
          text: "If the item received is damaged, defective, incorrect, or missing and meets the above conditions, you can request a return by contacting our customer service team within 7 days of delivery.",
          order: 5,
        },
        {
          text: "After raising an issue, customers will get the replaced product in approximately 24 to 48 hours inside Dhaka, and 5 to 7 days outside Dhaka approximately.",
          order: 6,
        },
      ],
    },
    {
      name: "Refund Policy",
      category: "refund",
      order: 2,
      description: "Customers may request a refund for the following reasons:",
      items: [
        {
          text: "If the product arrives damaged, defective, incorrect, wrongly priced, or incomplete, they may request a refund.",
          order: 1,
        },
        {
          text: "Their refund will be processed within 1 to 7 working days if eligible. In exceptional cases, the processing time may take longer.",
          order: 2,
        },
        {
          text: "If a product is missing from the parcel for a paid order, then the customers will get an instant refund after raising the issue.",
          order: 3,
        },
        {
          text: "Refunds will be credited to their Tescon wallet. They will have the option to withdraw the amount using their preferred payment method.",
          order: 4,
        },
      ],
    },
    {
      name: "Claim Policy",
      category: "claim",
      order: 3,
      description: "",
      items: [
        {
          text: "To claim any return/replacement or refund customers need to present an unboxing video as proof of evidence of their claim.",
          order: 1,
        },
      ],
    },
  ];

  const policy = await Policy.insertMany(seed);
  res.status(201).json({
    success: true,
    message: "Database seeded.",
    count: policy.length,
    data: policy,
  });
};
