import PurbaliRate from "../models/purbaliRateModel.js";

// Add Rate
export const addRate = async (req, res) => {
  try {
    const { itemId, label, rate } = req.body;

    if (!itemId || !label || rate === undefined) {
      return res.status(400).json({
        success: false,
        message: "Item ID, label and rate are required",
      });
    }

    const existingRate = await PurbaliRate.findOne({ itemId });

    if (existingRate) {
      return res.status(400).json({
        success: false,
        message: "Rate already exists for this item",
      });
    }

    const newRate = await PurbaliRate.create({
      itemId,
      label,
      rate,
    });

    res.status(201).json({
      success: true,
      message: "Rate added successfully",
      data: newRate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Rates
export const getAllRates = async (req, res) => {
  try {
    const rates = await PurbaliRate.find().sort({
      createdAt: 1,
    });

    res.status(200).json({
      success: true,
      data: rates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Rate
export const updateRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { rate, label } = req.body;

    const updatedRate = await PurbaliRate.findByIdAndUpdate(
      id,
      {
        ...(rate !== undefined && { rate }),
        ...(label !== undefined && { label }),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedRate) {
      return res.status(404).json({
        success: false,
        message: "Rate not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Rate updated successfully",
      data: updatedRate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Rate
export const deleteRate = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedRate = await PurbaliRate.findByIdAndDelete(id);

    if (!deletedRate) {
      return res.status(404).json({
        success: false,
        message: "Rate not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Rate deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};