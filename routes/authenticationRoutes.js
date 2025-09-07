import { Router } from "express";
import {
  emailVerificationOTPSend,
  login,
  requestPasswordReset,
  resetPassword,
  signUp,
  submitOTP,
} from "../controller/authController.js";
import {
  validateLogin,
  validateSignUp,
} from "../middlewhere/validateMiddleware.js";
import { protect } from "../middlewhere/authMiddleware.js";

const router = Router();

router.post("/signup", validateSignUp, signUp);
router.post("/login", validateLogin, login);
router.post("/password-reset-req", requestPasswordReset);
router.post("/submitOTP", submitOTP);
router.post("/verify-Email-otp", emailVerificationOTPSend);

router.post("/reset-password", resetPassword);

export default router;
