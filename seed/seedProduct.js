import Product from "../models/productModel.js";

/**
 * featureSchema expects: { icon, text, order }
 * Usage: toFeatures(["RFID Blocking", "Slim profile"])
 */
const toFeatures = (arr) =>
  arr.map((text, i) => ({ icon: "", text, order: i }));

/**
 * trustBadgeSchema expects: { icon, label, order }
 * Usage: toTrustBadges([{ icon: "🛡️", label: "RFID Safe" }])
 */
const toTrustBadges = (arr) =>
  arr.map(({ icon, label }, i) => ({ icon, label, order: i }));

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA — every field maps 1-to-1 with productSchema
// ─────────────────────────────────────────────────────────────────────────────
// const products = [
//   // ── 1. APEX SLIM SLEEVE ──────────────────────────────────────────────────
//   {
//     name: "Apex Slim Sleeve",
//     brand: "Bellroy",
//     slug: "apex-slim-sleeve",
//     description:
//       "An ultra-slim card sleeve that fits 6–8 cards and folded bills. Built with RFID-blocking leather so your data stays yours.",
//     category: "Wallets",
//     subcategory: "Card Sleeves",
//     regularPrice: 89,
//     originalPrice: 129,
//     cost: 35,

//     colors: [
//       {
//         id: "raven",
//         label: "Raven",
//         hex: "#000000",
//         price: 89,
//         sku: "WXSA-RVN-301",
//         stockQuantity: 120,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WXSA-RVN-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WXSA-RVN-301-main",
//             alt: "Apex Slim Sleeve Raven",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/WXSA-RVN-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WXSA-RVN-301-inside",
//             alt: "Apex Slim Sleeve Raven inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "indigo",
//         label: "Indigo",
//         hex: "#293580",
//         price: 89,
//         sku: "WXSA-IND-301",
//         stockQuantity: 80,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WXSA-IND-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WXSA-IND-301-main",
//             alt: "Apex Slim Sleeve Indigo",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/WXSA-IND-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WXSA-IND-301-inside",
//             alt: "Apex Slim Sleeve Indigo inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "everglade",
//         label: "Everglade",
//         hex: "#5D736F",
//         price: 89,
//         sku: "WXSA-EGD-301",
//         stockQuantity: 95,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WXSA-EGD-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WXSA-EGD-301-main",
//             alt: "Apex Slim Sleeve Everglade",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/WXSA-EGD-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WXSA-EGD-301-inside",
//             alt: "Apex Slim Sleeve Everglade inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "espresso",
//         label: "Espresso",
//         hex: "#311612",
//         price: 129,
//         sku: "WXSA-ESP-301",
//         stockQuantity: 60,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WXSA-ESP-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WXSA-ESP-301-main",
//             alt: "Apex Slim Sleeve Espresso",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/WXSA-ESP-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WXSA-ESP-301-inside",
//             alt: "Apex Slim Sleeve Espresso inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//     ],

//     sizes: [
//       {
//         id: "standard",
//         label: "Standard",
//         dims: "250×150×80mm",
//         price: 89,
//         sku: "ETKA-STD-002",
//         stockQuantity: 305,
//         weight: "250g",
//         volume: "3L",
//         capacity: "Toiletries, tech, travel essentials",
//         external: "250×150×80mm",
//         internal: "Water-resistant lining",
//         handle: "Carry handle + hanging hook",
//         isActive: true,
//       },
//     ],

//     features: toFeatures([
//       "RFID blocking leather",
//       "Holds 6–8 cards + folded bills",
//       "Quick-access fan pull",
//       "Ultra-slim 6mm profile",
//     ]),

//     specifications: {
//       default: {
//         volume: "",
//         capacity: "6–8 cards + folded bills",
//         weight: "30g",
//         external: "96×65×6mm",
//         internal: "",
//         handle: "",
//         warranty: "3-year warranty",
//         material: "Premium leather",
//         origin: "Designed in Australia",
//       },
//     },

//     media: [
//       {
//         id: 1,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WXSA-EGD-301/0?auto=format&fit=max&w=800",
//         publicId: "products/WXSA-EGD-301-hero",
//         alt: "Apex Slim Sleeve hero",
//         isThumbnail: false,
//         order: 0,
//       },
//       {
//         id: 2,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/WXSA-EGD-301/0?auto=format&fit=max&w=800",
//         publicId: "products/WXSA-EGD-301-open",
//         alt: "Apex Slim Sleeve open view",
//         isThumbnail: false,
//         order: 1,
//       },
//     ],

//     thumbnail:
//       "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WXSA-EGD-301/0?auto=format&fit=max&w=480",

//     trustBadges: toTrustBadges([
//       { icon: "🛡️", label: "RFID Safe" },
//       { icon: "✅", label: "3-Year Warranty" },
//       { icon: "🚚", label: "Free Shipping over $50" },
//     ]),

//     shipping: {
//       badge: "Free Shipping",
//       timeframe: "3–5 business days",
//       freeShipping: true,
//       shippingWeight: 0.05,
//     },

//     stockQuantity: 355,
//     lowStockThreshold: 10,
//     tags: ["wallet", "slim", "rfid", "card sleeve", "leather"],
//     isActive: true,
//     isFeatured: true,
//     isNewArrival: false,
//     isBestSeller: true,
//     warranty: "3-year warranty",
//     returnPolicy: "30-day return policy",
//     metaTitle: "Apex Slim Sleeve – RFID Card Wallet | Bellroy",
//     metaDescription:
//       "Ultra-slim RFID-blocking card sleeve for 6–8 cards and folded bills. Available in 4 premium leather colors.",
//     metaKeywords: ["slim wallet", "rfid wallet", "card sleeve", "bellroy"],
//   },

//   // ── 2. HIDE & SEEK WALLET ────────────────────────────────────────────────
//   {
//     name: "Hide & Seek Wallet",
//     brand: "Bellroy",
//     slug: "hide-and-seek-wallet",
//     description:
//       "A bifold wallet with a hidden coin compartment. Holds 5–12+ cards, flat bills, and coins while staying surprisingly slim.",
//     category: "Wallets",
//     subcategory: "Bifold Wallets",
//     regularPrice: 69,
//     originalPrice: 89,
//     cost: 28,

//     colors: [
//       {
//         id: "black",
//         label: "Black",
//         hex: "#363636",
//         price: 69,
//         sku: "WHSD-BLK-301",
//         stockQuantity: 200,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WHSD-BLK-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WHSD-BLK-301-main",
//             alt: "Hide & Seek Wallet Black",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/WHSD-BLK-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WHSD-BLK-301-inside",
//             alt: "Hide & Seek Wallet Black inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "navy",
//         label: "Navy",
//         hex: "#212E41",
//         price: 69,
//         sku: "WHSD-NAV-301",
//         stockQuantity: 140,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WHSD-NAV-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WHSD-NAV-301-main",
//             alt: "Hide & Seek Wallet Navy",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/WHSD-NAV-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WHSD-NAV-301-inside",
//             alt: "Hide & Seek Wallet Navy inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "everglade",
//         label: "Everglade",
//         hex: "#5D736F",
//         price: 69,
//         sku: "WHSD-EGD-301",
//         stockQuantity: 90,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WHSD-EGD-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WHSD-EGD-301-main",
//             alt: "Hide & Seek Wallet Everglade",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/WHSD-EGD-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WHSD-EGD-301-inside",
//             alt: "Hide & Seek Wallet Everglade inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "caramel",
//         label: "Caramel",
//         hex: "#B2591B",
//         price: 89,
//         sku: "WHSD-CAR-301",
//         stockQuantity: 55,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WHSD-CAR-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WHSD-CAR-301-main",
//             alt: "Hide & Seek Wallet Caramel",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/WHSD-CAR-301/0?auto=format&fit=max&w=480",
//             publicId: "products/WHSD-CAR-301-inside",
//             alt: "Hide & Seek Wallet Caramel inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//     ],

//     sizes: [
//       {
//         id: "standard",
//         label: "Standard",
//         dims: "250×150×80mm",
//         price: 89,
//         sku: "ETKA-STD-003",
//         stockQuantity: 305,
//         weight: "250g",
//         volume: "3L",
//         capacity: "Toiletries, tech, travel essentials",
//         external: "250×150×80mm",
//         internal: "Water-resistant lining",
//         handle: "Carry handle + hanging hook",
//         isActive: true,
//       },
//     ],

//     features: toFeatures([
//       "RFID blocking leather",
//       "Hidden coin compartment",
//       "Holds 5–12+ cards",
//       "Quick-pull tab for fast access",
//       "Flat bill slot",
//     ]),

//     specifications: {
//       default: {
//         volume: "",
//         capacity: "5–12+ cards, flat bills, coins",
//         weight: "58g",
//         external: "98×90×10mm",
//         internal: "",
//         handle: "",
//         warranty: "3-year warranty",
//         material: "Premium leather",
//         origin: "Designed in Australia",
//       },
//     },

//     media: [
//       {
//         id: 1,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WHSD-BLK-301/0?auto=format&fit=max&w=800",
//         publicId: "products/WHSD-BLK-301-hero",
//         alt: "Hide & Seek Wallet hero",
//         isThumbnail: false,
//         order: 0,
//       },
//       {
//         id: 2,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/WHSD-BLK-301/0?auto=format&fit=max&w=800",
//         publicId: "products/WHSD-BLK-301-open",
//         alt: "Hide & Seek Wallet open",
//         isThumbnail: false,
//         order: 1,
//       },
//     ],

//     thumbnail:
//       "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WHSD-BLK-301/0?auto=format&fit=max&w=480",

//     trustBadges: toTrustBadges([
//       { icon: "🛡️", label: "RFID Safe" },
//       { icon: "✅", label: "3-Year Warranty" },
//       { icon: "🚚", label: "Free Shipping over $50" },
//     ]),

//     shipping: {
//       badge: "Free Shipping",
//       timeframe: "3–5 business days",
//       freeShipping: true,
//       shippingWeight: 0.09,
//     },

//     stockQuantity: 485,
//     lowStockThreshold: 15,
//     tags: ["wallet", "bifold", "coin pocket", "rfid", "leather"],
//     isActive: true,
//     isFeatured: true,
//     isNewArrival: false,
//     isBestSeller: true,
//     warranty: "3-year warranty",
//     returnPolicy: "30-day return policy",
//     metaTitle: "Hide & Seek Wallet – Bifold with Coin Pocket | Bellroy",
//     metaDescription:
//       "Slim bifold wallet with a hidden coin pocket. Holds 5–12+ cards and flat bills with RFID protection.",
//     metaKeywords: ["bifold wallet", "coin wallet", "rfid", "bellroy"],
//   },

//   // ── 3. LITE BACKPACK ─────────────────────────────────────────────────────
//   {
//     name: "Lite Backpack",
//     brand: "Bellroy",
//     slug: "lite-backpack",
//     description:
//       "A lightweight daily backpack for a 14″ laptop and all your essentials. Made from recycled woven nylon with a water-resistant finish.",
//     category: "Bags",
//     subcategory: "Backpacks",
//     regularPrice: 179,
//     originalPrice: 219,
//     cost: 75,

//     colors: [
//       {
//         id: "ash",
//         label: "Ash",
//         hex: "#B4AFA5",
//         price: 179,
//         sku: "BLPA-ASH-241",
//         stockQuantity: 60,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/BLPA-ASH-241/0?auto=format&fit=max&w=480",
//             publicId: "products/BLPA-ASH-241-main",
//             alt: "Lite Backpack Ash",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/BLPA-ASH-241/0?auto=format&fit=max&w=480",
//             publicId: "products/BLPA-ASH-241-inside",
//             alt: "Lite Backpack Ash inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "river",
//         label: "River",
//         hex: "#465A6E",
//         price: 179,
//         sku: "BLPA-RIV-241",
//         stockQuantity: 45,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/BLPA-RIV-241/0?auto=format&fit=max&w=480",
//             publicId: "products/BLPA-RIV-241-main",
//             alt: "Lite Backpack River",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/BLPA-RIV-241/0?auto=format&fit=max&w=480",
//             publicId: "products/BLPA-RIV-241-inside",
//             alt: "Lite Backpack River inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "clay",
//         label: "Clay",
//         hex: "#A06E55",
//         price: 219,
//         sku: "BLPA-CLY-241",
//         stockQuantity: 30,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/BLPA-CLY-241/0?auto=format&fit=max&w=480",
//             publicId: "products/BLPA-CLY-241-main",
//             alt: "Lite Backpack Clay",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/BLPA-CLY-241/0?auto=format&fit=max&w=480",
//             publicId: "products/BLPA-CLY-241-inside",
//             alt: "Lite Backpack Clay inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "black",
//         label: "Black",
//         hex: "#1E1E1E",
//         price: 179,
//         sku: "BLPA-BLK-241",
//         stockQuantity: 80,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/BLPA-BLK-241/0?auto=format&fit=max&w=480",
//             publicId: "products/BLPA-BLK-241-main",
//             alt: "Lite Backpack Black",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/BLPA-BLK-241/0?auto=format&fit=max&w=480",
//             publicId: "products/BLPA-BLK-241-inside",
//             alt: "Lite Backpack Black inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//     ],

//     sizes: [
//       {
//         id: "one_size",
//         label: "One Size",
//         dims: "420×290×130mm",
//         price: 179,
//         sku: "BLPA-OS-241",
//         stockQuantity: 215,
//         weight: "470g",
//         volume: "20L",
//         capacity: "14″ laptop + daily essentials",
//         external: "420×290×130mm",
//         internal: "Padded laptop sleeve + main compartment",
//         handle: "Top grab handle + padded shoulder straps",
//         isActive: true,
//       },
//     ],

//     features: toFeatures([
//       "Water-resistant recycled woven nylon",
//       "Padded 14″ laptop sleeve",
//       "External zip pocket",
//       "Adjustable sternum strap",
//       "Luggage pass-through sleeve",
//       "Padded back panel and shoulder straps",
//     ]),

//     specifications: {
//       one_size: {
//         volume: "20L",
//         capacity: "14″ laptop + daily essentials",
//         weight: "470g",
//         external: "420×290×130mm",
//         internal: "Padded laptop sleeve + main compartment",
//         handle: "Top grab handle",
//         warranty: "3-year warranty",
//         material: "Recycled woven nylon",
//         origin: "Designed in Australia",
//       },
//     },

//     media: [
//       {
//         id: 1,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/BLPA-ASH-241/0?auto=format&fit=max&w=800",
//         publicId: "products/BLPA-ASH-241-hero",
//         alt: "Lite Backpack hero",
//         isThumbnail: false,
//         order: 0,
//       },
//       {
//         id: 2,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/BLPA-ASH-241/0?auto=format&fit=max&w=800",
//         publicId: "products/BLPA-ASH-241-inside",
//         alt: "Lite Backpack interior",
//         isThumbnail: false,
//         order: 1,
//       },
//     ],

//     thumbnail:
//       "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/BLPA-ASH-241/0?auto=format&fit=max&w=480",

//     trustBadges: toTrustBadges([
//       { icon: "💧", label: "Water Resistant" },
//       { icon: "♻️", label: "Recycled Materials" },
//       { icon: "✅", label: "3-Year Warranty" },
//       { icon: "🚚", label: "Free Shipping over $50" },
//     ]),

//     shipping: {
//       badge: "Free Shipping",
//       timeframe: "3–5 business days",
//       freeShipping: true,
//       shippingWeight: 0.6,
//     },

//     stockQuantity: 215,
//     lowStockThreshold: 10,
//     tags: ["backpack", "laptop bag", "lightweight", "daily", "recycled"],
//     isActive: true,
//     isFeatured: true,
//     isNewArrival: false,
//     isBestSeller: false,
//     warranty: "3-year warranty",
//     returnPolicy: "30-day return policy",
//     metaTitle: "Lite Backpack – Lightweight 20L Laptop Bag | Bellroy",
//     metaDescription:
//       "A water-resistant 20L backpack for a 14″ laptop, made from recycled nylon. Perfect for daily commutes.",
//     metaKeywords: ["backpack", "laptop bag", "bellroy", "lightweight"],
//   },

//   // ── 4. ELEMENTS TRAVEL KIT ───────────────────────────────────────────────
//   {
//     name: "Elements Travel Kit",
//     brand: "Bellroy",
//     slug: "elements-travel-kit",
//     description:
//       "A versatile travel organizer for toiletries, tech, and travel essentials. Water-resistant lining, lay-flat access, and TSA-friendly layout.",
//     category: "Travel",
//     subcategory: "Travel Kits",
//     regularPrice: 89,
//     originalPrice: 119,
//     cost: 38,

//     colors: [
//       {
//         id: "navy",
//         label: "Navy",
//         hex: "#212E41",
//         price: 89,
//         sku: "ETKA-NAV-227",
//         stockQuantity: 110,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/ETKA-NAV-227/0?auto=format&fit=max&w=480",
//             publicId: "products/ETKA-NAV-227-main",
//             alt: "Elements Travel Kit Navy",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/ETKA-NAV-227/0?auto=format&fit=max&w=480",
//             publicId: "products/ETKA-NAV-227-inside",
//             alt: "Elements Travel Kit Navy inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "slate",
//         label: "Slate",
//         hex: "#5B5F69",
//         price: 89,
//         sku: "ETKA-SLT-230",
//         stockQuantity: 75,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/ETKA-SLT-230/0?auto=format&fit=max&w=480",
//             publicId: "products/ETKA-SLT-230-main",
//             alt: "Elements Travel Kit Slate",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/ETKA-SLT-230/0?auto=format&fit=max&w=480",
//             publicId: "products/ETKA-SLT-230-inside",
//             alt: "Elements Travel Kit Slate inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "black",
//         label: "Black",
//         hex: "#1E1E1E",
//         price: 89,
//         sku: "ETKA-BLK-227",
//         stockQuantity: 120,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/ETKA-BLK-227/0?auto=format&fit=max&w=480",
//             publicId: "products/ETKA-BLK-227-main",
//             alt: "Elements Travel Kit Black",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/ETKA-BLK-227/0?auto=format&fit=max&w=480",
//             publicId: "products/ETKA-BLK-227-inside",
//             alt: "Elements Travel Kit Black inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//     ],

//     sizes: [
//       {
//         id: "standard",
//         label: "Standard",
//         dims: "250×150×80mm",
//         price: 89,
//         sku: "ETKA-STD-004",
//         stockQuantity: 305,
//         weight: "250g",
//         volume: "3L",
//         capacity: "Toiletries, tech, travel essentials",
//         external: "250×150×80mm",
//         internal: "Water-resistant lining",
//         handle: "Carry handle + hanging hook",
//         isActive: true,
//       },
//     ],

//     features: toFeatures([
//       "Water-resistant lining",
//       "Lay-flat access for easy packing",
//       "Integrated mirror",
//       "Multiple internal pockets",
//       "TSA-friendly layout",
//       "Hanging hook for on-the-go use",
//     ]),

//     specifications: {
//       standard: {
//         volume: "3L",
//         capacity: "Toiletries, tech, travel essentials",
//         weight: "250g",
//         external: "250×150×80mm",
//         internal: "Water-resistant lining",
//         handle: "Carry handle + hanging hook",
//         warranty: "3-year warranty",
//         material: "Recycled nylon",
//         origin: "Designed in Australia",
//       },
//     },

//     media: [
//       {
//         id: 1,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/ETKA-NAV-227/0?auto=format&fit=max&w=800",
//         publicId: "products/ETKA-NAV-227-hero",
//         alt: "Elements Travel Kit hero",
//         isThumbnail: false,
//         order: 0,
//       },
//       {
//         id: 2,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/ETKA-NAV-227/0?auto=format&fit=max&w=800",
//         publicId: "products/ETKA-NAV-227-open",
//         alt: "Elements Travel Kit open",
//         isThumbnail: false,
//         order: 1,
//       },
//     ],

//     thumbnail:
//       "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/ETKA-NAV-227/0?auto=format&fit=max&w=480",

//     trustBadges: toTrustBadges([
//       { icon: "💧", label: "Water Resistant Lining" },
//       { icon: "✅", label: "3-Year Warranty" },
//       { icon: "🚚", label: "Free Shipping over $50" },
//     ]),

//     shipping: {
//       badge: "Free Shipping",
//       timeframe: "3–5 business days",
//       freeShipping: true,
//       shippingWeight: 0.28,
//     },

//     stockQuantity: 305,
//     lowStockThreshold: 10,
//     tags: ["travel kit", "toiletry bag", "travel organizer", "dopp kit"],
//     isActive: true,
//     isFeatured: false,
//     isNewArrival: false,
//     isBestSeller: false,
//     warranty: "3-year warranty",
//     returnPolicy: "30-day return policy",
//     metaTitle: "Elements Travel Kit – Toiletry & Tech Organizer | Bellroy",
//     metaDescription:
//       "Water-resistant travel kit for toiletries, tech, and travel essentials. TSA-friendly lay-flat access.",
//     metaKeywords: ["travel kit", "toiletry bag", "bellroy", "dopp kit"],
//   },

//   // ── 5. POD JACKET PRO ────────────────────────────────────────────────────
//   {
//     name: "Pod Jacket Pro",
//     brand: "Bellroy",
//     slug: "pod-jacket-pro",
//     description:
//       "A premium leather case for AirPods Pro 3. Scratch protection and a refined look while keeping wireless charging fully functional.",
//     category: "Accessories",
//     subcategory: "AirPods Cases",
//     regularPrice: 39,
//     originalPrice: 39,
//     cost: 14,

//     colors: [
//       {
//         id: "black",
//         label: "Black",
//         hex: "#363636",
//         price: 39,
//         sku: "TPPE-BLK-134",
//         stockQuantity: 180,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/TPPE-BLK-134/0?auto=format&fit=max&w=480",
//             publicId: "products/TPPE-BLK-134-main",
//             alt: "Pod Jacket Pro Black",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/TPPE-BLK-134/0?auto=format&fit=max&w=480",
//             publicId: "products/TPPE-BLK-134-inside",
//             alt: "Pod Jacket Pro Black inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "terracotta",
//         label: "Terracotta",
//         hex: "#BC7049",
//         price: 39,
//         sku: "TPPE-TER-133",
//         stockQuantity: 120,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/TPPE-TER-133/0?auto=format&fit=max&w=480",
//             publicId: "products/TPPE-TER-133-main",
//             alt: "Pod Jacket Pro Terracotta",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/TPPE-TER-133/0?auto=format&fit=max&w=480",
//             publicId: "products/TPPE-TER-133-inside",
//             alt: "Pod Jacket Pro Terracotta inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//     ],

//     sizes: [
//       {
//         id: "standard",
//         label: "Standard",
//         dims: "250×150×80mm",
//         price: 89,
//         sku: "ETKA-STD-005",
//         stockQuantity: 305,
//         weight: "250g",
//         volume: "3L",
//         capacity: "Toiletries, tech, travel essentials",
//         external: "250×150×80mm",
//         internal: "Water-resistant lining",
//         handle: "Carry handle + hanging hook",
//         isActive: true,
//       },
//     ],

//     features: toFeatures([
//       "Full wireless charging compatibility",
//       "Premium leather exterior",
//       "Scratch and scuff protection",
//       "Carabiner loop for clipping on",
//     ]),

//     specifications: {
//       default: {
//         volume: "",
//         capacity: "AirPods Pro 3 case",
//         weight: "18g",
//         external: "66×50×28mm",
//         internal: "",
//         handle: "Carabiner loop",
//         warranty: "1-year warranty",
//         material: "Premium leather",
//         origin: "Designed in Australia",
//       },
//     },

//     media: [
//       {
//         id: 1,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/TPPE-TER-133/0?auto=format&fit=max&w=800",
//         publicId: "products/TPPE-TER-133-hero",
//         alt: "Pod Jacket Pro hero",
//         isThumbnail: false,
//         order: 0,
//       },
//       {
//         id: 2,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/TPPE-TER-133/0?auto=format&fit=max&w=800",
//         publicId: "products/TPPE-TER-133-open",
//         alt: "Pod Jacket Pro open",
//         isThumbnail: false,
//         order: 1,
//       },
//     ],

//     thumbnail:
//       "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/TPPE-TER-133/0?auto=format&fit=max&w=480",

//     trustBadges: toTrustBadges([
//       { icon: "⚡", label: "Wireless Charging Compatible" },
//       { icon: "✅", label: "1-Year Warranty" },
//     ]),

//     shipping: {
//       badge: "",
//       timeframe: "3–5 business days",
//       freeShipping: false,
//       shippingWeight: 0.03,
//     },

//     stockQuantity: 300,
//     lowStockThreshold: 20,
//     tags: ["airpods case", "leather case", "airpods pro 3", "accessories"],
//     isActive: true,
//     isFeatured: false,
//     isNewArrival: true,
//     isBestSeller: false,
//     warranty: "1-year warranty",
//     returnPolicy: "30-day return policy",
//     metaTitle: "Pod Jacket Pro – AirPods Pro 3 Leather Case | Bellroy",
//     metaDescription:
//       "Premium leather case for AirPods Pro 3. Wireless charging compatible. Black and Terracotta.",
//     metaKeywords: ["airpods case", "leather", "bellroy", "airpods pro 3"],
//   },

//   // ── 6. PHONE CASE – 3 CARD (iPhone 17 series) ───────────────────────────
//   {
//     name: "Phone Case – 3 Card",
//     brand: "Bellroy",
//     slug: "phone-case-3-card",
//     description:
//       "A sleek leather wallet case for iPhone 17 series. Holds up to 3 cards while keeping your phone slim and fully protected.",
//     category: "Phone Cases",
//     subcategory: "iPhone Cases",
//     regularPrice: 49,
//     originalPrice: 79,
//     cost: 20,

//     colors: [
//       {
//         id: "black",
//         label: "Black",
//         hex: "#363636",
//         price: 49,
//         sku: "PTXJ-BLK-133",
//         stockQuantity: 150,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/PTXJ-BLK-133/0?auto=format&fit=max&w=480",
//             publicId: "products/PTXJ-BLK-133-main",
//             alt: "Phone Case 3 Card Black",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/PTXJ-BLK-133/0?auto=format&fit=max&w=480",
//             publicId: "products/PTXJ-BLK-133-inside",
//             alt: "Phone Case 3 Card Black inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "nightsky",
//         label: "Nightsky",
//         hex: "#212E41",
//         price: 49,
//         sku: "PTXJ-NSK-133",
//         stockQuantity: 100,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/PTXJ-NSK-133/0?auto=format&fit=max&w=480",
//             publicId: "products/PTXJ-NSK-133-main",
//             alt: "Phone Case 3 Card Nightsky",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/PTXJ-NSK-133/0?auto=format&fit=max&w=480",
//             publicId: "products/PTXJ-NSK-133-inside",
//             alt: "Phone Case 3 Card Nightsky inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//       {
//         id: "sienna",
//         label: "Sienna",
//         hex: "#933B1F",
//         price: 79,
//         sku: "PTXJ-SEN-133",
//         stockQuantity: 65,
//         isActive: true,
//         images: [
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/PTXJ-SEN-133/0?auto=format&fit=max&w=480",
//             publicId: "products/PTXJ-SEN-133-main",
//             alt: "Phone Case 3 Card Sienna",
//             isFeatured: true,
//             order: 0,
//           },
//           {
//             url: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/PTXJ-SEN-133/0?auto=format&fit=max&w=480",
//             publicId: "products/PTXJ-SEN-133-inside",
//             alt: "Phone Case 3 Card Sienna inside",
//             isFeatured: false,
//             order: 1,
//           },
//         ],
//       },
//     ],

//     sizes: [
//       {
//         id: "iphone17",
//         label: "iPhone 17",
//         dims: "150×75×10mm",
//         price: 49,
//         sku: "PTXJ-IP17",
//         stockQuantity: 200,
//         weight: "55g",
//         volume: "",
//         capacity: "Up to 3 cards",
//         external: "150×75×10mm",
//         internal: "",
//         handle: "",
//         isActive: true,
//       },
//       {
//         id: "iphone17_plus",
//         label: "iPhone 17 Plus",
//         dims: "161×78×10mm",
//         price: 59,
//         sku: "PTXJ-IP17P",
//         stockQuantity: 115,
//         weight: "65g",
//         volume: "",
//         capacity: "Up to 3 cards",
//         external: "161×78×10mm",
//         internal: "",
//         handle: "",
//         isActive: true,
//       },
//       {
//         id: "iphone17_pro",
//         label: "iPhone 17 Pro",
//         dims: "150×72×10mm",
//         price: 59,
//         sku: "PTXJ-IP17PR",
//         stockQuantity: 130,
//         weight: "57g",
//         volume: "",
//         capacity: "Up to 3 cards",
//         external: "150×72×10mm",
//         internal: "",
//         handle: "",
//         isActive: true,
//       },
//       {
//         id: "iphone17_pro_max",
//         label: "iPhone 17 Pro Max",
//         dims: "163×77×10mm",
//         price: 79,
//         sku: "PTXJ-IP17PM",
//         stockQuantity: 90,
//         weight: "70g",
//         volume: "",
//         capacity: "Up to 3 cards",
//         external: "163×77×10mm",
//         internal: "",
//         handle: "",
//         isActive: true,
//       },
//     ],

const PRODUCTS = [
  {
    id: 1,
    name: "Leather Pixel Case",
    brand: "Bellroy",
    category: "pixel",
    badge: "For Pixel 10 series",
    badgeStyle: "teal",
    slug: "leather-pixel-case",
    description: "Slim protection for your Google Pixel",
    regularPrice: 59,
    originalPrice: 79,

    sizes: [
      {
        id: "pixel-10",
        label: "Pixel 10",
        dims: "6.1 inch",
        price: 59,
        sku: "PCX-P10-BLK",
        stockQuantity: 45,
      },
      {
        id: "pixel-10-pro",
        label: "Pixel 10 Pro",
        dims: "6.7 inch",
        price: 69,
        sku: "PCX-P10P-BLK",
        stockQuantity: 30,
      },
    ],

    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#363636",
        selected: false,
        price: 59,
        sku: "PCX-BLK-101",
        stockQuantity: 60,
      },
      {
        id: "sapphire",
        label: "Sapphire",
        hex: "#486FB0",
        selected: false,
        price: 59,
        sku: "PCX-SAP-101",
        stockQuantity: 35,
      },
      {
        id: "sienna",
        label: "Sienna",
        hex: "#933B1F",
        selected: true,
        price: 59,
        sku: "PCX-SEN-101",
        stockQuantity: 20,
      },
    ],

    imgSrc:
      "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/PCFN-SEN-133/0?auto=format&fit=max&w=320",

    imgInside:
      "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/PCFN-SEN-133/0?auto=format&fit=max&w=320",
  },

  {
    id: 2,
    name: "Pod Jacket Pro",
    brand: "Bellroy",
    category: "accessories",
    slug: "pod-jacket-pro",
    badge: null,
    description: "AirPods Pro protective leather case",
    regularPrice: 39,
    originalPrice: 49,

    sizes: [
      {
        id: "airpods-pro-2",
        label: "AirPods Pro 2",
        dims: "Standard",
        price: 39,
        sku: "PJP-APP2-BLK",
        stockQuantity: 50,
      },
    ],

    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#363636",
        selected: true,
        price: 39,
        sku: "PJP-BLK-201",
        stockQuantity: 50,
      },
      {
        id: "terracotta",
        label: "Terracotta",
        hex: "#BC7049",
        selected: false,
        price: 39,
        sku: "PJP-TER-201",
        stockQuantity: 28,
      },
    ],

    imgSrc:
      "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/TPPE-BLK-134/0?auto=format&fit=max&w=320",

    imgInside:
      "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/TPPE-BLK-134/0?auto=format&fit=max&w=320",
  },

  {
    id: 3,
    name: "Tech Kit",
    brand: "Bellroy",
    category: "accessories",
    slug: "tech-kit",
    badge: null,
    description: "Organized storage for chargers, cables and tech gear",
    regularPrice: 59,
    originalPrice: 79,

    sizes: [
      {
        id: "compact",
        label: "Compact",
        dims: "210×130×70mm",
        price: 49,
        sku: "ETKA-CPT-301",
        stockQuantity: 42,
      },
      {
        id: "standard",
        label: "Standard",
        dims: "250×150×80mm",
        price: 59,
        sku: "ETKA-STD-301",
        stockQuantity: 75,
      },
    ],

    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#363636",
        selected: false,
        price: 59,
        sku: "ETKA-BLK-301",
        stockQuantity: 40,
      },
      {
        id: "slate",
        label: "Slate",
        hex: "#5B5B58",
        selected: true,
        price: 59,
        sku: "ETKA-SLT-301",
        stockQuantity: 75,
      },
      {
        id: "navy",
        label: "Navy",
        hex: "#212E41",
        selected: false,
        price: 59,
        sku: "ETKA-NAV-301",
        stockQuantity: 30,
      },
      {
        id: "bronze",
        label: "Bronze",
        hex: "#B45628",
        selected: false,
        price: 59,
        sku: "ETKA-BRZ-301",
        stockQuantity: 15,
      },
    ],

    imgSrc:
      "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/ETKA-SLT-230/0?auto=format&fit=max&w=320",

    imgInside:
      "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/ETKA-SLT-230/0?auto=format&fit=max&w=320",
  },

  {
    id: 4,
    name: "Laptop Sleeve",
    brand: "Bellroy",
    category: "accessories",
    slug: "laptop-sleeve",
    badge: null,
    description: "Slim, padded sleeve for daily laptop protection",
    regularPrice: 55,
    originalPrice: 69,

    sizes: [
      {
        id: "14-inch",
        label: '14"',
        dims: "14 inch laptop",
        price: 55,
        sku: "LPS-14-SLT",
        stockQuantity: 30,
      },
      {
        id: "16-inch",
        label: '16"',
        dims: "16 inch laptop",
        price: 65,
        sku: "LPS-16-SLT",
        stockQuantity: 20,
      },
    ],

    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#363636",
        selected: false,
        price: 55,
        sku: "LPS-BLK-401",
        stockQuantity: 25,
      },
      {
        id: "slate",
        label: "Slate",
        hex: "#5B5B58",
        selected: true,
        price: 55,
        sku: "LPS-SLT-401",
        stockQuantity: 30,
      },
      {
        id: "bronze",
        label: "Bronze",
        hex: "#B45628",
        selected: false,
        price: 55,
        sku: "LPS-BRZ-401",
        stockQuantity: 15,
      },
    ],

    imgSrc:
      "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/DLSC-SLT-230/0?auto=format&fit=max&w=320",

    imgInside:
      "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/DLSC-SLT-230/0?auto=format&fit=max&w=320",
  },

  {
    id: 5,
    name: "Apex Slim Sleeve",
    brand: "Bellroy",
    category: "wallets",
    slug: "apex-slim-sleeve",
    badge: "RFID Safe",
    badgeStyle: "dark",
    description: "Ultra slim wallet with RFID blocking protection",
    regularPrice: 89,
    originalPrice: 129,

    sizes: [
      {
        id: "standard",
        label: "Standard",
        dims: "96×65×6mm",
        price: 89,
        sku: "WXSA-STD-501",
        stockQuantity: 120,
      },
    ],

    colors: [
      {
        id: "raven",
        label: "Raven",
        hex: "#000000",
        selected: false,
        price: 89,
        sku: "WXSA-RVN-501",
        stockQuantity: 50,
      },
      {
        id: "indigo",
        label: "Indigo",
        hex: "#293580",
        selected: false,
        price: 89,
        sku: "WXSA-IND-501",
        stockQuantity: 35,
      },
      {
        id: "everglade",
        label: "Everglade",
        hex: "#5D736F",
        selected: true,
        price: 89,
        sku: "WXSA-EGD-501",
        stockQuantity: 60,
      },
      {
        id: "espresso",
        label: "Espresso",
        hex: "#311612",
        selected: false,
        price: 129,
        sku: "WXSA-ESP-501",
        stockQuantity: 20,
      },
    ],

    imgSrc:
      "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/WXSA-EGD-301/0?auto=format&fit=max&w=320",

    imgInside:
      "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/WXSA-EGD-301/0?auto=format&fit=max&w=320",
  },
];

//     features: toFeatures([
//       "Holds up to 3 cards",
//       "MagSafe compatible",
//       "Premium leather exterior",
//       "Drop protection",
//       "Easy fan-pull card access",
//     ]),

//     specifications: {
//       iphone17: {
//         volume: "",
//         capacity: "Up to 3 cards",
//         weight: "55g",
//         external: "150×75×10mm",
//         internal: "",
//         handle: "",
//         warranty: "1-year warranty",
//         material: "Premium leather",
//         origin: "Designed in Australia",
//       },
//       iphone17_plus: {
//         volume: "",
//         capacity: "Up to 3 cards",
//         weight: "65g",
//         external: "161×78×10mm",
//         internal: "",
//         handle: "",
//         warranty: "1-year warranty",
//         material: "Premium leather",
//         origin: "Designed in Australia",
//       },
//       iphone17_pro: {
//         volume: "",
//         capacity: "Up to 3 cards",
//         weight: "57g",
//         external: "150×72×10mm",
//         internal: "",
//         handle: "",
//         warranty: "1-year warranty",
//         material: "Premium leather",
//         origin: "Designed in Australia",
//       },
//       iphone17_pro_max: {
//         volume: "",
//         capacity: "Up to 3 cards",
//         weight: "70g",
//         external: "163×77×10mm",
//         internal: "",
//         handle: "",
//         warranty: "1-year warranty",
//         material: "Premium leather",
//         origin: "Designed in Australia",
//       },
//     },

//     media: [
//       {
//         id: 1,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/PTXJ-NSK-133/0?auto=format&fit=max&w=800",
//         publicId: "products/PTXJ-NSK-133-hero",
//         alt: "Phone Case 3 Card hero",
//         isThumbnail: false,
//         order: 0,
//       },
//       {
//         id: 2,
//         src: "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_explode_image/USD/PTXJ-NSK-133/0?auto=format&fit=max&w=800",
//         publicId: "products/PTXJ-NSK-133-open",
//         alt: "Phone Case 3 Card open",
//         isThumbnail: false,
//         order: 1,
//       },
//     ],

//     thumbnail:
//       "https://bellroy-product-images.imgix.net/bellroy_dot_com_range_page_image/USD/PTXJ-NSK-133/0?auto=format&fit=max&w=480",

//     trustBadges: toTrustBadges([
//       { icon: "🔋", label: "MagSafe Compatible" },
//       { icon: "✅", label: "1-Year Warranty" },
//     ]),

//     shipping: {
//       badge: "",
//       timeframe: "3–5 business days",
//       freeShipping: false,
//       shippingWeight: 0.07,
//     },

//     stockQuantity: 535,
//     lowStockThreshold: 15,
//     tags: ["iphone case", "wallet case", "leather", "magsafe", "iphone 17"],
//     isActive: true,
//     isFeatured: true,
//     isNewArrival: true,
//     isBestSeller: false,
//     warranty: "1-year warranty",
//     returnPolicy: "30-day return policy",
//     metaTitle: "Phone Case – 3 Card for iPhone 17 | Bellroy",
//     metaDescription:
//       "Minimalist leather wallet case for iPhone 17 series. Holds 3 cards, MagSafe compatible.",
//     metaKeywords: ["iphone case", "wallet case", "bellroy", "magsafe"],
//   },
// ];

// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from "mongoose";

const generateDiscountPercentage = (regularPrice, originalPrice) => {
  if (!originalPrice || originalPrice <= regularPrice) {
    return 0;
  }

  return Math.round(((originalPrice - regularPrice) / originalPrice) * 100);
};

const generateBreadcrumbs = (product) => {
  return [
    {
      label: "Shop",
      href: "/shop",
      order: 0,
    },
    {
      label: product.category,
      href: `/shop/${product.category?.toLowerCase()}`,
      order: 1,
    },
    {
      label: product.name,
      href: `/product/${product.slug}`,
      order: 2,
    },
  ];
};

const normalizeProduct = (product) => {
  // Normalize colors
  const colors =
    product.colors?.map((color, index) => ({
      ...color,

      id: color.id || color.label?.toLowerCase().replace(/\s+/g, "-"),

      price: color.price || product.regularPrice,

      sku:
        color.sku ||
        `${product.slug}-${color.label}`.toUpperCase().replace(/\s+/g, "-"),

      stockQuantity: color.stockQuantity || 0,

      isActive: color.isActive !== undefined ? color.isActive : true,

      images:
        color.images?.map((image, imageIndex) => ({
          ...image,
          order: image.order ?? imageIndex,
          isFeatured:
            image.isFeatured !== undefined
              ? image.isFeatured
              : imageIndex === 0,
        })) || [],
    })) || [];

  // Normalize sizes
  const sizes =
    product.sizes?.map((size) => ({
      ...size,

      id: size.id || size.label?.toLowerCase().replace(/\s+/g, "-"),

      price: size.price || product.regularPrice,

      sku:
        size.sku ||
        `${product.slug}-${size.label}`.toUpperCase().replace(/\s+/g, "-"),

      stockQuantity: size.stockQuantity || 0,

      isActive: size.isActive !== undefined ? size.isActive : true,
    })) || [];

  // Total stock from variants
  const totalColorStock = colors.reduce(
    (sum, item) => sum + (item.stockQuantity || 0),
    0,
  );

  const totalSizeStock = sizes.reduce(
    (sum, item) => sum + (item.stockQuantity || 0),
    0,
  );

  const calculatedStock =
    totalColorStock || totalSizeStock || product.stockQuantity || 0;

  const discountPercentage = generateDiscountPercentage(
    product.regularPrice,
    product.originalPrice,
  );

  return {
    ...product,

    colors,
    sizes,

    stockQuantity: calculatedStock,

    discountPercentage,

    breadcrumbs: generateBreadcrumbs(product),

    isInStock: calculatedStock > 0,

    lowStockThreshold: product.lowStockThreshold || 5,

    rating: product.rating || 0,

    reviewCount: product.reviewCount || 0,

    reviews: product.reviews || [],

    totalSales: product.totalSales || 0,

    views: product.views || 0,

    isActive: product.isActive !== undefined ? product.isActive : true,

    isFeatured: product.isFeatured !== undefined ? product.isFeatured : false,

    isBestSeller:
      product.isBestSeller !== undefined ? product.isBestSeller : false,

    isNewArrival:
      product.isNewArrival !== undefined ? product.isNewArrival : false,

    createdAt: new Date(),

    updatedAt: new Date(),
  };
};

async function seedProducts() {
  let created = 0;
  let updated = 0;
  let failed = 0;

  try {
    console.log("\n🚀 Starting product seeding...\n");

    for (const product of PRODUCTS) {
      try {
        // Validation
        if (!product.name) {
          throw new Error("Product name is required");
        }

        if (!product.slug) {
          throw new Error(`Slug missing for ${product.name}`);
        }

        if (!product.regularPrice) {
          throw new Error(`Price missing for ${product.name}`);
        }

        const normalizedProduct = normalizeProduct(product);

        const existingProduct = await Product.findOne({
          slug: normalizedProduct.slug,
        });

        if (existingProduct) {
          await Product.updateOne(
            {
              _id: existingProduct._id,
            },
            {
              $set: {
                ...normalizedProduct,
                updatedAt: new Date(),
              },
            },
          );

          console.log(`✏️  Updated : ${normalizedProduct.name}`);

          updated++;
        } else {
          await Product.create([normalizedProduct], {});

          console.log(`✅ Created : ${normalizedProduct.name}`);

          created++;
        }
      } catch (productError) {
        failed++;

        console.error(`❌ Failed : ${product.name}`);

        console.error(`   Reason : ${productError.message}\n`);
      }
    }

    console.log("\n──────────────────────────────");
    console.log("  Product Seeding Complete");
    console.log(`  ✅ Created : ${created}`);
    console.log(`  ✏️ Updated : ${updated}`);
    console.log(`  ❌ Failed  : ${failed}`);
    console.log("──────────────────────────────\n");
  } catch (error) {
    console.error("\n❌ Seeding Transaction Failed");
    console.error(error);
  } finally {
    console.log("\n──────────────────────────────");
    console.log("  Product Seeding Complete");
    console.log(`  ✅ Created : ${created}`);
    console.log(`  ✏️ Updated : ${updated}`);
    console.log(`  ❌ Failed  : ${failed}`);
    console.log("──────────────────────────────\n");
  }
}

export default seedProducts;
