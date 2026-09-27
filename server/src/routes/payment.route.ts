import express from "express";
import {
  createPaymentSession,
  getPaymentById,
} from "../controllers/payment.controller.js";
import { verifyJWT, verifyRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT)

router.route("/create-payment-intent/:orderId",).post(createPaymentSession);
router.route("/:paymentId").get(verifyRoles(["admin","seller"]),getPaymentById)
// router.route("/payment/my").get(/getUserPayment)

export default router;
