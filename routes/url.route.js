import express from "express";
import {
  getHomePage,
  getReportPage,
  redirectToOriginal,
  createShortUrl,
  updateLink,
  getUpdateLinkPage,
  deleteLink,
} from "../controllers/url.controller.js";

const router = express.Router();

// Routes
router.get("/", getHomePage);
router.get("/report", getReportPage);
// router.get("/links", getAllLinks);
router.get("/:shortCode", redirectToOriginal);
router.post("/shorten", createShortUrl);
router.route("/edit/:id").get(getUpdateLinkPage).post(updateLink);
router.post("/delete/:id", deleteLink);

export default router;
