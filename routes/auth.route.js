import { Router } from "express";
import {
  login,
  getLoginPage,
  getRegistrationPage,
  postRegister,
  getMe,
  logoutUser,
  getProfilePage,
  getVerifyEmailPage,
  postVerifyEmail,
  sendVerificationMail,
} from "../controllers/auth.controller.js";

const router = Router();

router.route("/registration").get(getRegistrationPage).post(postRegister);
router.route("/login").get(getLoginPage).post(login);
router.route("/me").get(getMe);
router.route("/logout").get(logoutUser);
router.route("/profile").get(getProfilePage);
router.route("/verify-email").get(getVerifyEmailPage).post(postVerifyEmail);
router.route("/send-verification-mail").post(sendVerificationMail);
export default router;
