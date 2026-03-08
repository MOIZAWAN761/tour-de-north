import jwt from "jsonwebtoken";
import { JWT_SECRET,JWT_REFRESH_SECRET } from "../../config/env.js";


const ACCESS_TOKEN_EXPIRES_IN = "30m";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

export const TokenUtil = {
  generateAccessToken(payload) {
    return jwt.sign(payload,JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  },

  generateRefreshToken(payload) {
    return jwt.sign(payload,JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
  },

  verifyAccessToken(token) {
    return jwt.verify(token,JWT_SECRET);
  },

  verifyRefreshToken(token) {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  },
};

