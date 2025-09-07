import { Router } from "express";

import { getAppVersion } from "../controller/appContoller.js";

const router = Router();
router.get("/latest-version", getAppVersion);

export default router;
