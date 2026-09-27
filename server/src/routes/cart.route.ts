import { Router } from "express";
import {
    getUserCart
} from "../controllers/cart.controller.js"
import {verifyJWT} from "../middleware/auth.middleware.js"

const router=Router()

router.use(verifyJWT)

router.route("/my").get(getUserCart)

export default router