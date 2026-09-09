import Category from "../models/categoryModel.js";

const CATEGORY = [
  { label: "Laptop case", value: "laptop_case" },
  { label: "Phone case", value: "phone_case" },
  { label: "Wallet", value: "wallet" },
  { label: "Passport holder", value: "passport_holder" },
  { label: "Crossbody bag", value: "crossbody_bag" },
  { label: "Backpack", value: "backpack" },
  { label: "Duffel", value: "duffel" },
  { label: "Tote bag", value: "tote_bag" },
  { label: "Messenger", value: "messenger" },
  { label: "Pouches", value: "pouch" },
  { label: "Luggage", value: "luggage" },
  { label: "Folio", value: "folio" },
  { label: "Key holder", value: "key_holder" },
  { label: "Toiletry bag", value: "toiletry_bag" },
  { label: "Tech accessory", value: "tech_accessory" },
  { label: "Bucket Bag", value: "bucket_bag" },
  { label: "Cooler bag", value: "cooler_bag" },
];

const seedCategories = async () => {
  try {
    // Optional: Clear existing categories
    // await Category.deleteMany();

    for (const cat of CATEGORY) {
      // Check if category already exists
      const existingCategory = await Category.findOne({
        slug: cat.value,
      });

      if (!existingCategory) {
        await Category.create({
          name: cat.label,
          description: `Premium ${cat.label.toLowerCase()} - High quality and durable`,
          icon: getIconForCategory(cat.label),
          parent_id: null,
          is_active: true,
          level: 0,
          path: null, // Will be set by pre-save hook
          slug: cat.value,
          meta_title: `${cat.label} - Premium Quality ${cat.label}`,
          meta_description: `Shop our collection of premium ${cat.label.toLowerCase()}s. High quality materials and excellent craftsmanship.`,
          subcategories: [], // Empty array as requested
        });
        console.log(`✅ Created category: ${cat.label}`);
      } else {
        console.log(`⏭️ Category already exists: ${cat.label}`);
      }
    }

    console.log("\n✅ Categories seeded successfully!");
    console.log(`📊 Total categories: ${await Category.countDocuments()}`);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    throw error;
  }
};

// Helper function to get icons for categories
function getIconForCategory(categoryName) {
  const iconMap = {
    "Laptop case": "💻",
    "Phone case": "📱",
    Wallet: "👛",
    "Passport holder": "🛂",
    "Crossbody bag": "👜",
    Backpack: "🎒",
    Duffel: "🧳",
    "Tote bag": "🛍️",
    Messenger: "📬",
    Pouches: "📦",
    Luggage: "🧰",
    Folio: "📁",
    "Key holder": "🔑",
    "Toiletry bag": "🧴",
    "Tech accessory": "🔌",
    "Bucket Bag": "🪣",
    "Cooler bag": "🧊",
  };
  return iconMap[categoryName] || "🛒";
}

export default seedCategories;
