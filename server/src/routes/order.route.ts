import { Router } from "express";
import {
    userCheckout,
    cancelOrder,
    getOrderById,
    getUserOrder
}from "../controllers/order.controller.js"
import {verifyJWT} from "../middleware/auth.middleware.js"


const router=Router()

router.use(verifyJWT)

router.route("/checkout/:cartId/:addressId").post(userCheckout)
router.route("/my").get(getUserOrder)
router.route("/:orderId").get(getOrderById)
router.route("/cancel/:orderId").get(cancelOrder)

export default router