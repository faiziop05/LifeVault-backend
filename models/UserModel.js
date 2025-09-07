import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    favourites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post", 
      },
    ],
    instlledVersion:{
      type:String,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// ✅ First create the model, then export it
const UserModel = mongoose.model("User", userSchema);
export default UserModel;
