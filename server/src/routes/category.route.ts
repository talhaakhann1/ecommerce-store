import { Router } from "express";
import {
  createCategory,
  updateCategory,
  removeCategory,
} from "../controllers/category.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { validate } from "../Schemas/validate.js";
import { addCategorySchema } from "../Schemas/category.schema.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.use(verifyJWT);

router
  .route("/create")
  .post(upload.single("image"), validate(addCategorySchema), createCategory);
router.route("/:categoryId").patch(updateCategory).delete(removeCategory);

export default router;
