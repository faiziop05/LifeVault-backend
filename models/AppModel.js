import mongoose from "mongoose";

const AppSchema = new mongoose.Schema(
  {
    version: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const AppModel = mongoose.model("App", AppSchema);
export default AppModel;
