import { Account as accountsData } from "../data/Account.js";
import Account from "../models/accountInfo.js";

export const seedAccounts = async () => {
  try {
    console.log("MongoDB connected");

    // Clear existing accounts
    await Account.deleteMany({});

    // Insert accounts data
    const insertedAccounts = await Account.insertMany(accountsData);

    console.log(`${insertedAccounts.length} accounts inserted successfully`);
  } catch (error) {
    console.error("Seed error:", error);
  }
};

seedAccounts();
