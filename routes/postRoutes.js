import { Router } from "express";
const router = Router();

import {
  deletePost,
  getFavoutitesByUser,
  getPosts,
  getSearchSuggestions,
  getSignature,
  handleFavourite,
  newPost,
} from "../controller/postContoller.js";
import upload from "../middlewhere/upload.js";
import { protect } from "../middlewhere/authMiddleware.js";
import { deleteAccount, UpdateProfile } from "../controller/authController.js";

router.post("/create-post", protect, upload.array("files"), newPost);
router.post("/get-posts", protect, getPosts);
router.post("/get-search-suggestions", protect, getSearchSuggestions);
router.delete("/delete-post", protect, deletePost);
router.put("/handle-favourite", protect, handleFavourite);
router.post("/get-favourites-by-id", getFavoutitesByUser);
router.post("/delete-account", protect, deleteAccount);
router.post("/update-profile", protect, UpdateProfile);
router.get("/get-signature", getSignature);

export default router;
