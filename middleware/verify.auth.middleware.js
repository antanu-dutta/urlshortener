/* eslint-disable no-unused-vars */
import {
  verifyJwtToken,
  verifyRefreshToken,
} from "../services/auth.service.js";

export const verifyAuthentication = async (req, res, next) => {
  const accessToken = req.cookies.access_token;
  const refreshToken = req.cookies.refresh_token;

  req.user = null; // default

  try {
    // 1. If access token exists → verify it
    if (accessToken) {
      const decodedToken = verifyJwtToken(accessToken);
      if (decodedToken) {
        req.user = decodedToken;
      }
      return next();
    }

    // 2. If no access token but refresh token exists → try refresh
    if (refreshToken) {
      const { new_access_token, new_refresh_token, user } =
        await verifyRefreshToken(refreshToken);
      // Remove sessionId if you don’t want to expose it
      const { sessionId: _unused, ...restUser } = user;
      req.user = restUser;

      // Set fresh cookies
      res.cookie("access_token", new_access_token, {
        httpOnly: true,
        secure: true,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refresh_token", new_refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return next();
    }

    // 3. If no tokens → unauthenticated
    return next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    req.user = null;
    return next();
  }
};
