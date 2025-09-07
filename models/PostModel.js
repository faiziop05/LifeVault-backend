import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      trim: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    contentType: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },

    mood: {
      type: String,
    },
    favourite: {
      type: Boolean,
    },
    location: [
      {
        country: String,
        latitude: Number,
        longitude: Number,
        name: String,
      },
    ],
    backgroundColor: {
      type: String,
    },
    tags: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
      },
    ],
    files: {
      type: [
        {
          name: { type: String, required: true }, // File name
          type: { type: String, required: true }, // MIME type
          public_id: { type: String, required: false }, // Cloudinary URL (after upload)
          resource_type: { type: String, required: false }, // Cloudinary URL (after upload)
          delivery_type: { type: String, required: false }, // Cloudinary URL (after upload)
        },
      ],
      required: false, // files can be empty
      default: undefined,
    },
  },
  { timestamps: true }
);

// ✅ First create the model, then export it
const PostModel = mongoose.model("Post", postSchema);
export default PostModel;
