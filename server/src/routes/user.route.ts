import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    updateUserProfile,
    assignRole
}from "../controllers/user.controller.js"
import {verifyJWT, verifyRoles} from "../middleware/auth.middleware.js"
import {upload} from "../middleware/multer.middleware.js"
import { loginLimiter } from "../middleware/rateLimit.middleware.js";
import { signInSchema, signUpSchema } from "../Schemas/user.schema.js";
import { validate } from "../Schemas/validate.js";

const router = Router()

router.route("/register").post(validate(signUpSchema),registerUser)

// secure routes

router.route("/login").post(loginLimiter,validate(signInSchema),loginUser)
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
// router.post("/forgot-password", forgotPassword);
// router.post("/reset-password/:token", resetPassword);
// router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/get-user").get(verifyJWT,getCurrentUser)
// router.route("/update-account").post(verifyJWT,updateAccountDetails)
router.route("/update-avatar").post(verifyJWT,upload.single("avatar"),updateUserProfile)
router.route('/update-role/:userId').patch(verifyJWT,verifyRoles(["admin"]),assignRole)
// router
//   .route("/update-profile")
//   .patch(
//     verifyJWT,
//     upload.single("avatar"),
//     validate(updateUserProfileSchema),
//     updateUserProfile
//   );
// router.route("/:userId").get(verifyJWT,setRoleAsSeller)


export default router


