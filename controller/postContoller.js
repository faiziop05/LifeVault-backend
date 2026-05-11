import cloudinary from "../configs/cloudinary.js";
import PostModel from "../models/PostModel.js";

const generateThumbnailUrl = (
  publicId,
  resourceType,
  deliveryType = "authenticated"
) => {
  // Special case for videos: request a JPG frame
  if (resourceType === "video") {
    return cloudinary.url(publicId, {
      resource_type: "video",
      type: deliveryType,
      secure: true,
      sign_url: true,
      format: "jpg", // 🔥 force image output
      transformation: [{ crop: "fill", gravity: "auto" }, { quality: "auto" }],
    });
  }

  // Default (images stay as images)
  return cloudinary.url(publicId, {
    resource_type: "image",
    type: deliveryType,
    secure: true,
    sign_url: true,
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "auto" },
      { quality: "auto" },
    ],
  });
};

export const getSignature = (req, res) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    // Prepare parameters to sign
    const paramsToSign = {
      folder: "posts",
      timestamp,
      type: "authenticated",
    };

    // Generate signature
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    // Respond with the signature and other necessary details
    res.json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error("Error generating signature:", error);
    res.status(500).json({ error: "Failed to generate upload signature" });
  }
};

export const newPost = async (req, res) => {
  try {
    const {
      userId,
      caption,
      date,
      contentType,
      mood,
      backgroundColor,
      tags,
      location,
      media,
    } = req.body;

    // Validate required fields
    if (!userId || !date || !contentType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, date, contentType",
      });
    }

    // Parse JSON fields only if they exist
    let parsedTags;
    let parsedLocation;
    let parsedMedia;

    try {
      if (tags) parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
      if (location)
        parsedLocation =
          typeof location === "string" ? JSON.parse(location) : location;
      if (media)
        parsedMedia = typeof media === "string" ? JSON.parse(media) : media;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON in one or more fields",
      });
    }

    // Build post object dynamically to avoid empty arrays/objects
    const postData = {
      userId,
      caption: caption || undefined,
      date,
      contentType,
      mood: mood || undefined,
      backgroundColor: backgroundColor || undefined,
      tags:undefined,
      location:undefined
    };
    // console.log(parsedLocation);

    if (parsedMedia && parsedMedia.length > 0) postData.files = parsedMedia;
    if (parsedTags && parsedTags.length > 0) postData.tags = parsedTags;
    if (parsedLocation && Object.keys(parsedLocation).length > 0) postData.location = parsedLocation; // assign only if it has keys

    const post = await PostModel.create(postData);
    // Create post

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating post",
      error: error.message,
    });
  }
};

export const getPosts = async (req, res) => {
  try {
    const {
      userId,
      type,
      startDate,
      endDate,
      singleDate,
      location,
      tags,
      search,
      page = 1,
      limit = 10,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User Id not found" });
    }

    let filter = { userId };

    // Handle type (All means no filter)
    if (type && type !== "All") {
      filter.contentType = type;
    }

    // Handle dates (string comparison "YYYY-MM-DD")
    if (startDate || endDate) {
      filter.date = {};

      let start = startDate ? new Date(startDate) : null;
      let end = endDate ? new Date(endDate) : new Date();

      if (!endDate) {
        end.setDate(end.getDate() + 1); // upcoming date
      }

      const formatDate = (d) => d.toISOString().split("T")[0];

      // If no start date, get earliest from DB
      if (!start) {
        const earliestPost = await PostModel.findOne({ userId })
          .sort({ date: 1 })
          .select("date");
        if (earliestPost) {
          start = new Date(earliestPost.date);
        }
      }

      filter.date.$gte = formatDate(start);
      filter.date.$lte = formatDate(end);
    }

    if (singleDate) {
      const d = new Date(singleDate);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));

      filter.date = {
        $gte: start.toISOString(),
        $lte: end.toISOString(),
      };
    }

    // Location filter
    if (location) {
      filter["location.name"] = { $regex: location, $options: "i" };
    }

    // Tags filter
    if (tags && Array.isArray(tags) && tags.length > 0) {
      filter["tags.name"] = {
        $in: tags.map((tag) => new RegExp(tag.name, "i")),
      };
    }

    // Search filter
    if (search) {
      filter.$or = [
        { caption: { $regex: search, $options: "i" } },
        { "tags.name": { $regex: search, $options: "i" } },
        { date: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await PostModel.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Function to generate Cloudinary URL from public_id
    const generateCloudinaryUrl = (
      publicId,
      resourceType,
      deliveryType = "authenticated"
    ) => {
      return cloudinary.url(publicId, {
        resource_type: resourceType,
        type: deliveryType, // must match upload type
        secure: true,
        sign_url: true,
      });
    };

    // Attach generated URLs to each post’s files
    // Attach generated URLs (main + thumbnail) to each post’s files
    const formattedPosts = posts.map((post) => {
      const filesWithUrls = Array.isArray(post.files)
        ? post.files.map((file) => {
            const fileUrl = generateCloudinaryUrl(
              file.public_id,
              file.resource_type,
              file.delivery_type
            );
            const thumbUrl = generateThumbnailUrl(
              file.public_id,
              file.resource_type,
              file.delivery_type
            );

            return {
              ...(file.toObject?.() ?? file),
              url: fileUrl,
              thumbnail: thumbUrl,
            };
          })
        : []; // no files, empty array

      return {
        ...post.toObject(),
        files: filesWithUrls,
      };
    });

    const total = await PostModel.countDocuments(filter);

    res.json({
      posts: formattedPosts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// controllers/postSearchController.js

export const getSearchSuggestions = async (req, res) => {
  try {
    const { search, userId } = req.body;

    if (!search || !userId) {
      return res.status(400).json({
        success: false,
        message: "Search term and userId are required",
      });
    }

    // Search across caption, tags.name, location.name, mood
    const suggestions = await PostModel.aggregate([
      {
        $match: {
          userId,
          $or: [
            { caption: { $regex: search, $options: "i" } },
            { "location.name": { $regex: search, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          suggestion: "$caption",
          location: "$location.name",
        },
      },
      { $limit: 10 }, // Limit results like YouTube does
    ]);

    // Flatten and remove duplicates
    let flatSuggestions = [];
    suggestions.forEach((item) => {
      if (item.suggestion) flatSuggestions.push(item.suggestion);
      if (item.tags) flatSuggestions.push(...item.tags);
      if (item.location) flatSuggestions.push(...item.location);
      if (item.mood) flatSuggestions.push(item.mood);
    });

    flatSuggestions = [...new Set(flatSuggestions)] // remove duplicates
      .filter(Boolean) // remove null/empty
      .slice(0, 10); // limit to top 10

    res.json({
      success: true,
      suggestions: flatSuggestions,
    });
  } catch (error) {
    console.error("Search suggestion error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { userId, postId } = req.body;

    if (!userId || !postId) {
      return res
        .status(400)
        .json({ message: "User Id or Post Id are not provided" });
    }

    const post = await PostModel.findOne({ _id: postId, userId });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // 2. Delete files from Cloudinary (if any)
    if (post.files && post.files.length > 0) {
      for (const file of post.files) {
        if (file.url) {
          // extract public_id from URL
          // Example Cloudinary URL: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/myimage.jpg
          const parts = file.url.split("/");
          const filename = parts[parts.length - 1]; // e.g. "myimage.jpg"
          const publicId = filename.split(".")[0]; // e.g. "myimage"
          // If you store files in folders, include that too
          // e.g. "folder/myimage"
          const folder =
            parts[parts.length - 2] !== "upload"
              ? parts[parts.length - 2] + "/"
              : "";
          const fullPublicId = folder + publicId;

          try {
            await cloudinary.uploader.destroy(fullPublicId);
          } catch (err) {
            console.error("Cloudinary delete error:", err);
          }
        }
      }
    }

    await PostModel.deleteOne({ _id: postId, userId: userId });
    res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.error("Post Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const handleFavourite = async (req, res) => {
  try {
    const { postId, favourite } = req.body;

    if (!postId || favourite === undefined) {
      return res
        .status(400)
        .json({ message: "Post Id and favourite are required" });
    }

    const post = await PostModel.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.favourite = favourite;
    await post.save();

    res.status(200).json({
      success: true,
      message: "Favourite updated successfully",
      post,
    });
  } catch (error) {
    console.error("Favourites error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getFavoutitesByUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "user Id is required" });
    }

    const posts = await PostModel.find({ userId: userId, favourite: true });

    if (!posts) {
      return res.status(404).json({ message: "Favourite Posts not found" });
    }

    const generateCloudinaryUrl = (
      publicId,
      resourceType,
      deliveryType = "authenticated"
    ) => {
      return cloudinary.url(publicId, {
        resource_type: resourceType,
        type: deliveryType, // must match upload type
        secure: true,
        sign_url: true,
      });
    };

    // Attach generated URLs to each post’s files
    // Attach generated URLs (main + thumbnail) to each post’s files
    const formattedPosts = posts.map((post) => {
      const filesWithUrls = post.files.map((file) => {
        const fileUrl = generateCloudinaryUrl(
          file.public_id,
          file.resource_type,
          file.delivery_type
        );
        const thumbUrl = generateThumbnailUrl(
          file.public_id,
          file.resource_type,
          file.delivery_type
        );

        return {
          ...(file.toObject?.() ?? file),
          url: fileUrl,
          thumbnail: thumbUrl, // 🔥 added here
        };
      });

      return {
        ...post.toObject(),
        files: filesWithUrls,
      };
    });

    res.status(200).json({
      success: true,
      message: "Favourite Fetched successfully",
      posts: formattedPosts,
    });
  } catch (error) {
    console.error("Favourites error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
