import { Router } from "express";
import {
  addAddress,
  getUserAddress,
} from "../controllers/address.controller.js"
import { verifyJWT, verifyRoles } from "../middleware/auth.middleware.js"
import { validate } from "../Schemas/validate.js";
import { addAddressSchema } from "../Schemas/address.schema.js";


const router = Router()

router.use(verifyJWT)

router.route("/create").post(verifyRoles(["admin","seller"]),validate(addAddressSchema),addAddress)
router.route("/my/:addressId").get(getUserAddress)

export default router
