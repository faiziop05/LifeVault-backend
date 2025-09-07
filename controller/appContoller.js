import AppModel from "../models/AppModel.js";

export const getAppVersion = async (req, res) => {
  try {
    console.log('asasasasas');

    const date = await AppModel.findOne();
    console.log(date);
    
    if (!date || date === null) return res.status(404).json({ message: "no version found" });

    res.status(200).json({ message: "Success", data: date });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
