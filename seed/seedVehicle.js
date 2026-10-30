import vehicleData from "../data/vehicelData.js";

import Vehicle from "../models/vehicleModel.js";

export const seedVehicle = async () => {
  try {
    console.log("Seeding Purbali Vehicle data...");

    // Clear existing vehicles
    await Vehicle.deleteMany({});

    // Insert rates data
    const insertedRates = await Vehicle.insertMany(vehicleData);

    console.log(`${insertedRates.length} rates inserted successfully`);
  } catch (error) {
    console.error("Seed error:", error);
  }
};

// seedVehicle();
