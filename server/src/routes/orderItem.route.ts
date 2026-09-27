import { Router } from "express";
import {
    getOrderItemsByOrderId
}from "../controllers/orderItem.controller.js"
import {verifyJWT} from "../middleware/auth.middleware.js"

const router=Router()

router.use(verifyJWT)

router.route("/:orderId").get(getOrderItemsByOrderId)

export default router