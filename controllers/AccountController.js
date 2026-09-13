import Account from "../models/accountInfo.js";

export const getAccountsNumbers = async (req, res) => {
  try {
    const accounts = await Account.find(
      {},
      {
        ac_no: 1,
        name: 1,
        _id: 0,
      },
    ).sort({
      _id: 1,
    });

    res.status(200).json({
      count: accounts.length,
      accounts: accounts.map((account) => ({
        ac_no: account.ac_no,
        name: account.name,
      })),
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch account numbers",
      details: err.message,
    });
  }
};

export const getTagsByAccountNumber = async (req, res) => {
  try {
    const account = await Account.findOne({
      ac_no: req.params.ac_no,
    });

    if (!account) {
      return res.status(404).json({
        error: `No account found with ac_no "${req.params.ac_no}"`,
      });
    }

    const tagSet = new Set();

    account.lines?.forEach((line) => {
      if (line.unit) {
        tagSet.add(line.unit);
      }

      if (Array.isArray(line.tags)) {
        line.tags.forEach((tag) => {
          if (tag) {
            tagSet.add(tag);
          }
        });
      }
    });

    res.status(200).json({
      ac_no: account.ac_no,
      name: account.name,
      tags: Array.from(tagSet),
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch tags",
      details: err.message,
    });
  }
};