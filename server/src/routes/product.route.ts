import { Router } from "express";
import {
  addProduct,
  getAllProducts,
  updateProductDetails,
  removingDiscountedPrice,
  deleteProduct,
  applyingDiscountedPrice,
  getSellerProducts,
  getProductById,
  getProductByCategory,
} from "../controllers/product.controller.js";
import { verifyJWT, verifyRoles } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { validate } from "../Schemas/validate.js";
import { addProductSchema,updateProductSchema } from "../Schemas/product.schema.js";

const router = Router();

router
  .route("/add")
  .post(verifyJWT,verifyRoles(["admin","seller"]), upload.array("images", 5),validate(addProductSchema), addProduct);

router.route("/category/:categoryId").get(getProductByCategory);

router.route("/").get(getAllProducts);

router
  .route("/:productId")
  .post(verifyJWT,verifyRoles(["admin","seller"]),validate(updateProductSchema), updateProductDetails);
router
  .route("/:productId")
  .delete(verifyJWT,verifyRoles(["admin","seller"]), deleteProduct);
router
  .route("/apply/discount/:productId/:discountPercentage")
  .get(verifyJWT,verifyRoles(["admin","seller"]), applyingDiscountedPrice);
router
  .route("/remove/discount/:productId")
  .get(verifyJWT,verifyRoles(["admin","seller"]), removingDiscountedPrice);
router.route("/seller").get(verifyJWT,verifyRoles(["admin","seller"]), getSellerProducts);
router.route("/:productId").get(getProductById);

export default router;
