import express from "express";
import customerController from "../../controllers/customerController.js";

const router = express.Router();

router.get("/get-all-customers", customerController.getAllCustomers);
router.get("/get-customer/:id", customerController.getCustomerById);
router.post("/create-customer", customerController.createCustomer);
router.put("/update-customer/:id", customerController.updateCustomer),
  router.put(
    "/update-customer-status/:id",
    customerController.updateCustomerStatus,
  );

router.delete("/delete-customer/:id", customerController.deleteCustomer);
router.post("/send-email", customerController.sendEmailToCustomer);
router.get("/get-customer-stats", customerController.getCustomerStats);

export default router;
