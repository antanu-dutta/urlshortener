import argon2 from "argon2";
import {
  checkUserExists,
  clearUserSession,
  createAccessToken,
  createRefreshToken,
  createSession,
  createUser,
  findUserById,
  generateRandomToken,
  insertVerifyEmailToken,
  createVerificationLink,
  verifyEmailToken,
} from "../services/auth.service.js";
import {
  loginUserSchema,
  registerUserSchema,
} from "../validators/auth.validator.js";
import { getAllLinks } from "../services/url.services.js";
import { sendMail } from "../lib/nodemailer.js";

/* ------------------------------------------------------------------
   CONFIG
-------------------------------------------------------------------*/

// cookie config (✅ DRY)
const BASE_COOKIE_CONFIG = {
  httpOnly: true,
  // eslint-disable-next-line no-undef
  secure: process.env.NODE_ENV === "production", // only secure in prod
};

// ✅ helper for session + tokens + cookies
const issueTokensAndSetCookies = async (res, user, sessionId) => {
  const access_token = createAccessToken({
    userId: user.id,
    name: user.name,
    email: user.email,
    sessionId,
  });

  const refresh_token = createRefreshToken(sessionId);

  res.cookie("access_token", access_token, {
    ...BASE_COOKIE_CONFIG,
    maxAge: 15 * 60 * 1000, // 15 min
  });

  res.cookie("refresh_token", refresh_token, {
    ...BASE_COOKIE_CONFIG,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/* ------------------------------------------------------------------
   AUTH VIEWS
-------------------------------------------------------------------*/

export const getLoginPage = (req, res) => {
  if (req.user) return res.redirect("/");
  return res.render("login", { errors: req.flash("errors") });
};

export const getRegistrationPage = (req, res) => {
  if (req.user) return res.redirect("/");
  return res.render("registration", { errors: req.flash("errors") });
};

export const getProfilePage = async (req, res) => {
  try {
    const user = await findUserById(req.user?.userId);
    if (!user) return res.redirect("/auth/login");

    const totalLinks = await getAllLinks(user.id);

    res.render("profile", {
      title: "User Profile",
      user: {
        name: user.name,
        email: user.email,
        isValid: user.isEmailValid,
        date: new Date(user.createAt).toLocaleDateString(),
        totalLinks: totalLinks.length,
      },
    });
  } catch (error) {
    console.error("error rendering profile page", error.message);
  }
};

export const getVerifyEmailPage = (req, res) => {
  try {
    if (!req.user?.email) return res.redirect("/login");
    res.render("verifyEmail", {
      email: req.user.email,
      success: req.flash("success"),
      errors: req.flash("errors"),
      verificationLink: "/",
    });
  } catch (error) {
    console.error("error rendering verify email page", error.message);
  }
};

/* ------------------------------------------------------------------
   REGISTER + LOGIN
-------------------------------------------------------------------*/

export const postRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { data, error } = registerUserSchema.safeParse({
      name,
      email,
      password,
    });

    if (error) {
      req.flash("errors", error.issues?.[0].message);
      return res.redirect("/auth/registration");
    }

    const [existingUser] = await checkUserExists(data.email);
    if (existingUser) {
      req.flash("errors", "User already exists");
      return res.redirect("/auth/registration");
    }

    const hashedPassword = await argon2.hash(data.password);
    const user = await createUser({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    });

    const session = await createSession({
      userId: user.id,
      ip: req.clientIp,
      userAgent: req.headers["user-agent"],
    });

    await issueTokensAndSetCookies(
      res,
      { id: user.id, name: data.name, email: data.email },
      session.id
    );
    res.redirect("/");
  } catch (error) {
    console.error("error registering user:", error.message);
    res.redirect("/auth/registration");
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = loginUserSchema.safeParse({ email });

    if (error) {
      req.flash("errors", error.issues?.[0].message);
      return res.redirect("/auth/login");
    }

    const [user] = await checkUserExists(data.email);
    if (!user) {
      req.flash("errors", "Invalid email or password");
      return res.redirect("/auth/login");
    }

    const isMatched = await argon2.verify(user.password, password);
    if (!isMatched) {
      req.flash("errors", "Invalid email or password");
      return res.redirect("/auth/login");
    }

    const session = await createSession({
      userId: user.id,
      ip: req.clientIp,
      userAgent: req.headers["user-agent"],
    });

    await issueTokensAndSetCookies(res, user, session.id);
    res.redirect("/");
  } catch (error) {
    console.error("error logging user:", error.message);
    res.redirect("/auth/login");
  }
};

/* ------------------------------------------------------------------
   EMAIL VERIFICATION
-------------------------------------------------------------------*/

export const sendVerificationMail = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/");

    const user = await findUserById(req.user?.userId);
    if (!user || user.isEmailValid) {
      return res.redirect("/");
    }

    const randomToken = generateRandomToken();
    await insertVerifyEmailToken({ userId: user.id, randomToken });

    const verificationLink = createVerificationLink(randomToken, user.email);

    const messageInfo = {
      email: user.email,
      subject: "Click the link below to verify your email",
      html: `
    <p>Your verification token: <b>${randomToken}</b></p>
    <form action="${verificationLink}" method="POST">
      <input type="hidden" name="token" value="${randomToken}" />
      <input type="hidden" name="email" value="${encodeURIComponent(
        user.email
      )}" />
      <button type="submit" 
        style="background:#4CAF50;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;">
        Verify My Email
      </button>
    </form>
  `,
    };

    const verifyUrl = await sendMail(messageInfo);

    if (verifyUrl) {
      console.log("Verification email sent successfully:", verifyUrl);
      req.flash("success", "Email verification link sent successfully");
    } else {
      req.flash("errors", "Email verification link could not be sent");
    }

    return res.render("verifyEmail", {
      email: user.email,
      success: req.flash("success"),
      errors: req.flash("errors"),
      verificationLink,
    });
  } catch (error) {
    console.error("Error sending verification mail:", error.message);
    req.flash(
      "errors",
      "Something went wrong while sending verification email"
    );
    return res.redirect("/");
  }
};

// ✅ works for both link click and manual token entry
export const postVerifyEmail = async (req, res) => {
  try {
    // from query (link) OR from form body (manual entry)
    const token = req.query.token || req.body.token;
    const email = req.query.email || req.user.email;

    if (!token || !email) return res.redirect("/auth/profile");

    const decodedEmail = decodeURIComponent(email);
    const [user] = await checkUserExists(decodedEmail);
    if (!user) {
      req.flash("errors", "Invalid email address");
      return res.redirect("/auth/profile");
    }

    const isVerified = await verifyEmailToken(user.id, token);

    if (isVerified?.success) {
      req.flash("success", "Email verified successfully");
    } else {
      req.flash("errors", isVerified?.message || "Invalid or expired token");
    }

    res.redirect("/auth/profile");
  } catch (error) {
    console.error("error verifying email", error.message);
    req.flash("errors", "Something went wrong while verifying email");
    res.redirect("/auth/profile");
  }
};

/* ------------------------------------------------------------------
   LOGOUT
-------------------------------------------------------------------*/

export const getMe = (req, res) => {
  if (!req.user) return res.send("Not logged in");
  return res.send(`hey ${req.user.name} - ${req.user.email}`);
};

export const logoutUser = async (req, res) => {
  if (req.user?.sessionId) {
    await clearUserSession(req.user.sessionId);
  }
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.redirect("/auth/login");
};
