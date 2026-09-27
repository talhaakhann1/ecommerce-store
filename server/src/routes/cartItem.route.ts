import { Router } from "express";
import {
    addItemsToCart,
    removeItemFromCart
}from "../controllers/cartItem.controller.js"
import {verifyJWT} from "../middleware/auth.middleware.js"

const router=Router()

router.use(verifyJWT)

router.route("/add/:productId").post(addItemsToCart)
router.route("/remove/:productId/:cartId").delete(removeItemFromCart)

export default router