import { RequestHandler } from "express";

/**
 * This file previously contained rate limiting middlewares.
 * All rate limiting functionality has been removed as requested.
 * 
 * The empty functions below serve as placeholders to avoid breaking
 * code in case there are any references we missed.
 */

export const generalLimiter: RequestHandler = (req, res, next) => {
  next();
};

export const authLimiter: RequestHandler = (req, res, next) => {
  next();
};

export const uploadLimiter: RequestHandler = (req, res, next) => {
  next();
};
