import express from "express";
import {
  bulkCreateVehicles,
  createVehicle,
  deleteVehicle,
  getVehicle,
  getVehicleByIdOrNo,
  getVehicles,
  updateVehicle,
} from "../../controllers/Vehiclecontroller.js";

const router = express.Router();

router.get("/vehicles", getVehicles);
router.post("/vehicles", createVehicle);
router.post("/vehicles/bulk", bulkCreateVehicles); // must stay above "/:id"
router.get("/vehicles/:id", getVehicle);
router.put("/vehicles/:id", updateVehicle);
router.delete("/vehicles/:id", deleteVehicle);
router.get("/get-vehicles-by-car-no", getVehicleByIdOrNo);
export default router;
