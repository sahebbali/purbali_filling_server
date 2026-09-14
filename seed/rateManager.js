import { ItemRate } from "../data/Ratemanager.js";
import PurbaliRate from "../models/purbaliRateModel.js";

export const seedRateManager = async () => {
  try {
    console.log("Seeding Purbali rates data...");

    // Clear existing rates
    await PurbaliRate.deleteMany({});

    // Insert rates data
    const insertedRates = await PurbaliRate.insertMany(ItemRate);

    console.log(`${insertedRates.length} rates inserted successfully`);
  } catch (error) {
    console.error("Seed error:", error);
  }
};

// seedRateManager();
