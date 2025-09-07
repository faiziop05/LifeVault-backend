import { Router } from "express";
import { protect } from "../middlewhere/authMiddleware.js";

const router = Router();

// Example protected route
router.get("/profile", protect, (req, res) => {
  res.json({ message: "Profile data", user: req.user });
});

export default router;
