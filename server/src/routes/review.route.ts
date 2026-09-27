import {
    createReview,
    deleteReview,
    getProductReviews
} from "../controllers/review.controller.js"
import {verifyJWT} from "../middleware/auth.middleware.js"
import { Router } from "express"

const router=Router()


router.route("/create/:productId").post(verifyJWT,createReview)
router.route("/:reviewId")
.delete(verifyJWT,deleteReview)
router.route("/:productId/").get(getProductReviews)

export default router
