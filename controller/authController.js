import UserModel from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import PostModel from "../models/PostModel.js";
import cloudinary from "../configs/cloudinary.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import OTPModel from "../models/OTPModel.js";
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export const signUp = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword ,instlledVersion} = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "Please fill in all required fields." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await UserModel.create({
      fullName,
      email,
      password: hashedPassword,
      instlledVersion:instlledVersion
    });

    res.status(201).json({
      message: "User registered successfully",
      token: generateToken(newUser._id),
      loginType: "normal",

      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, idToken, loginType, fullName } = req.body;

    if (loginType === "google" && idToken) {
      const user = await UserModel.find({ email });
      if (user.length > 0) {
        return res.status(200).json({
          message: "Login successful",
          token: generateToken(user[0]._id),
          loginType: "google",

          user: {
            id: user[0]._id,
            fullName: user[0].fullName,
            email: user[0].email,
          },
        });
      }
      if (user.length === 0) {
        const newUser = await UserModel.create({
          fullName,
          email,
          password: "googleOauth",
        });
        return res.status(201).json({
          message: "User registered successfully",
          token: generateToken(newUser._id),
          loginType: "google",
          user: {
            id: newUser._id,
            fullName: newUser.fullName,
            email: newUser.email,
          },
        });
      }
    } else {
      const user = await UserModel.findOne({ email });
      if (!user)
        return res.status(400).json({ message: "Invalid email or password" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid email or password" });

      res.status(200).json({
        message: "Login successful",
        token: generateToken(user._id),
        loginType: "normal",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 1. Request OTP
export const requestPasswordReset = async (req, res) => {
  try {
    const { email, isPasswordReset = true } = req.body;

    // find user
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    // save OTP and expiry
    user.resetPasswordToken = hashedOtp;
    user.resetPasswordExpire = Date.now() + 1000 * 60 * 15; // 15 min
    await user.save();

    // send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"LifeVault Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Password Reset OTP - LifeVault",
      text: `Hello,

We received a request to reset your password. 
Your OTP for password reset is: ${otp}

⚠️ This code will expire in 15 minutes. 
If you did not request this, you can safely ignore this email.

Thanks,  
The LifeVault Team`,
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: #4a90e2; color: white; padding: 16px; text-align: center; font-size: 20px; font-weight: bold;">
        LifeVault Password Reset
      </div>
      <div style="padding: 20px; color: #333; line-height: 1.6;">
        <p>Hello,</p>
        <p>We received a request to reset your password. Use the OTP below to proceed:</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="display: inline-block; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #4a90e2; padding: 12px 24px; border: 2px dashed #4a90e2; border-radius: 6px;">
            ${otp}
          </span>
        </div>
        <p><b>Note:</b> This OTP will expire in <strong>15 minutes</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p style="margin-top: 30px;">Thanks,<br/>The <strong>LifeVault</strong> Team</p>
      </div>
      <div style="background: #f8f8f8; padding: 12px; text-align: center; font-size: 12px; color: #888;">
        © ${new Date().getFullYear()} LifeVault. All rights reserved.
      </div>
    </div>
  `,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const emailVerificationOTPSend = async (req, res) => {
  try {
    const { email } = req.body;

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // set expiry for 15 minutes
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

    // upsert OTP document
    await OTPModel.findOneAndUpdate(
      { email },
      { otp, expiresAt, verified: false },
      { upsert: true, new: true }
    );

    // send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"LifeVault Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Email Verification OTP - LifeVault",
      text: `Hello,

Your OTP for email verification is: ${otp}

⚠️ This code will expire in 15 minutes. 
If you did not request this, you can safely ignore this email.

Thanks,  
The LifeVault Team`,
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: #4a90e2; color: white; padding: 16px; text-align: center; font-size: 20px; font-weight: bold;">
        LifeVault Email Verification
      </div>
      <div style="padding: 20px; color: #333; line-height: 1.6;">
        <p>Hello,</p>
        <p>Use the OTP below to verify your email address:</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="display: inline-block; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #4a90e2; padding: 12px 24px; border: 2px dashed #4a90e2; border-radius: 6px;">
            ${otp}
          </span>
        </div>
        <p><b>Note:</b> This OTP will expire in <strong>15 minutes</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p style="margin-top: 30px;">Thanks,<br/>The <strong>LifeVault</strong> Team</p>
      </div>
      <div style="background: #f8f8f8; padding: 12px; text-align: center; font-size: 12px; color: #888;">
        © ${new Date().getFullYear()} LifeVault. All rights reserved.
      </div>
    </div>
  `,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// 2. Submit OTP (verify & return temporary token)
export const submitOTP = async (req, res) => {
  try {
    const { email, otp, isPasswordResetOTP } = req.body;
    
    if (isPasswordResetOTP) {
      const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

      // find user with valid OTP
      const user = await UserModel.findOne({
        email,
        resetPasswordToken: hashedOtp,
        resetPasswordExpire: { $gt: Date.now() },
      });

      if (!user)
        return res.status(400).json({ message: "Invalid or expired OTP" });

      // generate a one-time reset token (JWT or random string)
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // save reset token in DB
      user.resetPasswordToken = hashedResetToken;
      user.resetPasswordExpire = Date.now() + 1000 * 60 * 15;
      await user.save();

      res.json({
        message: "OTP verified successfully",
        resetToken, // send back to frontend for next step
      });
    } else {
      // Email verification OTP
      if (!otp) {
        return res.status(400).json({ message: "Please send otp" });
      }
      if (!email) {
        return res.status(400).json({ message: "Please send email as well" });
      }

      // Find OTP document
      const otpDoc = await OTPModel.findOne({ email, verified: false });

      if (!otpDoc || otpDoc.otp !== otp || otpDoc.expiresAt < new Date()) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Mark as verified
      otpDoc.verified = true;
      await otpDoc.save();

      res.json({ message: "Email verified successfully",verified:true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken)
      return res.status(400).json({ message: "Token is required" });

    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // find user
    const user = await UserModel.findOne({
      resetPasswordToken: hashedResetToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    // update password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User Id is required" });
    }

    // 1. Find all posts by the user
    const posts = await PostModel.find({ userId });

    // 2. Delete all associated files from Cloudinary
    for (const post of posts) {
      if (post.files && post.files.length > 0) {
        for (const file of post.files) {
          try {
            if (file.public_id) {
              await cloudinary.uploader.destroy(file.public_id, {
                resource_type: file.resource_type || "image", // fallback
              });
            }
          } catch (err) {
            console.error("Cloudinary delete error:", err);
          }
        }
      }
    }

    // 3. Delete posts from MongoDB
    await PostModel.deleteMany({ userId });

    // 4. Remove deleted posts from any user's favourites
    await UserModel.updateMany(
      {},
      { $pull: { favourites: { $in: posts.map((p) => p._id) } } }
    );

    // 5. Delete the user account
    await UserModel.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User account and all related posts/files deleted successfully",
    });
  } catch (error) {
    console.error("Account Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const UpdateProfile = async (req, res) => {
  try {
    const { fullName, email, userId } = req.body;

    // 1. Find user
    if (!userId) {
      return res.status(404).json({ message: "Please send userId as well" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (fullName && fullName.length < 3) {
      return res
        .status(400)
        .json({ message: "Fullname must be at least 2 characters long." });
    }
    const user = await UserModel.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const emailExist = await UserModel.findOne({ email });

    if (emailExist && email !== user.email) {
      return res.status(404).json({ message: "Email already exist" });
    }

    user.fullName = fullName || user.fullName;
    user.email = email || user.email;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        loginType: "normal",
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
