import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  sessionsTable,
  usersTable,
  verifyEmailsTokenTable,
} from "../drizzle/schema.js";
import jwt from "jsonwebtoken";

// ? function for creating user
export const createUser = async (user) => {
  try {
    const [result] = await db.insert(usersTable).values(user).$returningId();
    return result;
  } catch (error) {
    console.error(error.message);
  }
};

// ? function for checking if user already exists or not
export const checkUserExists = async (email) => {
  try {
    return await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
  } catch (error) {
    console.error(error.message);
  }
};

export const createSession = async ({ userId, ip, userAgent }) => {
  try {
    const [result] = await db
      .insert(sessionsTable)
      .values({ userId, ip, userAgent })
      .$returningId();
    return result;
  } catch (error) {
    console.error("error creating session", error.message);
  }
};

// ? function for generating json access_token
export const createAccessToken = (userInfo) => {
  // eslint-disable-next-line no-undef
  return jwt.sign(userInfo, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

export const createRefreshToken = (sessionId) => {
  // eslint-disable-next-line no-undef
  return jwt.sign({ sessionId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// ? function for verifying json web token
export const verifyJwtToken = (token) => {
  // eslint-disable-next-line no-undef
  return jwt.verify(token, process.env.JWT_SECRET);
};

// findSessionById
export const findSessionById = async (sessionId) => {
  try {
    const [result] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId));
    return result;
  } catch (error) {
    console.error("error finding session by id", error.message);
  }
};

// findUserById
export const findUserById = async (userId) => {
  try {
    const [result] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    return result;
  } catch (error) {
    console.error("error finding user by id", error.message);
  }
};

// function for verifying refresh token
export const verifyRefreshToken = async (token) => {
  try {
    const decoded = verifyJwtToken(token);
    const currentSession = await findSessionById(decoded.sessionId);
    if (!currentSession) {
      throw new Error("Invalid Session");
    }
    const user = await findUserById(currentSession.userId);
    if (!user) {
      throw new Error("Invalid User");
    }
    const userInfo = {
      userId: user.id,
      name: user.name,
      email: user.email,
      sessionId: currentSession.id,
    };
    const new_access_token = createAccessToken(userInfo);
    const new_refresh_token = createRefreshToken(currentSession.id);

    return { new_access_token, new_refresh_token, user: userInfo };
  } catch (error) {
    console.error("error verifying refresh token", error.message);
  }
};

// clearUserSession
export const clearUserSession = async (sessionId) => {
  try {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  } catch (error) {
    console.error("error clearing user session", error.message);
  }
};

// generateRandomToken
export const generateRandomToken = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

// insertVerifyEmailToken
export const insertVerifyEmailToken = async ({ userId, randomToken }) => {
  await db.transaction(async (tx) => {
    try {
      // 1. Delete expired tokens
      await tx
        .delete(verifyEmailsTokenTable)
        .where(lt(verifyEmailsTokenTable.expiresAt, sql`CURRENT_TIMESTAMP`));

      await clearVerifyEmailTokens(userId);

      // 2. Insert new token (ensure `token` is a string!)
      await tx.insert(verifyEmailsTokenTable).values({
        userId: Number(userId), // make sure it's an integer
        token: String(randomToken), // make sure it's a string (like "12345678")
      });
    } catch (error) {
      console.error("error inserting verify email token:", error.message);
    }
  });
};

// createVerificationLink

export const createVerificationLink = (token, email) => {
  const encodedEmail = encodeURIComponent(email);
  // eslint-disable-next-line no-undef
  return `${process.env.FRONTEND_URL}/auth/verify-email?token=${token}&email=${encodedEmail}`;
};
// Example usage

export const clearVerifyEmailTokens = async (userId) => {
  try {
    await db
      .delete(verifyEmailsTokenTable)
      .where(eq(verifyEmailsTokenTable.userId, userId));
  } catch (error) {
    console.error("error clearing verify email tokens:", error.message);
  }
};

// findEmailValidByUserId
export const verifyEmailToken = async (userId, token) => {
  try {
    // find token for this user that is not expired
    const [result] = await db
      .select()
      .from(verifyEmailsTokenTable)
      .where(
        and(
          eq(verifyEmailsTokenTable.userId, userId),
          eq(verifyEmailsTokenTable.token, token),
          gt(verifyEmailsTokenTable.expiresAt, sql`CURRENT_TIMESTAMP`)
        )
      );

    if (!result) {
      return { success: false, message: "Invalid or expired token" };
    }

    // update user table
    await db
      .update(usersTable)
      .set({ isEmailValid: true })
      .where(eq(usersTable.id, userId));

    await clearVerifyEmailTokens(userId);

    return { success: true, message: "Email verified successfully" };
  } catch (error) {
    console.error("error verifying email token:", error.message);
    return { success: false, message: "Server error" };
  }
};
