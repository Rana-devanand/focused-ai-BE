import bcrypt from "bcrypt";
import dayjs from "dayjs";
import { type Request } from "express";
import createError from "http-errors";
import jwt from "jsonwebtoken";
import passport from "passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { type IUser } from "../../user/user.dto";
import * as userService from "../../user/user.service";
import { supabaseAdmin } from "./supabase.admin";

export const isValidPassword = async function (
  value: string,
  password: string,
) {
  const compare = await bcrypt.compare(value, password);
  return compare;
};

export const getUserByEmail = async (email: string) => {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      "id,  name, email,image, password, role, provider, created_at,updated_at",
    )
    .eq("email", email)
    .single();
  if (error) return null;
  return data;
};

export const getUserById = async (id: string) => {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id, name, email,image, role, provider, created_at,updated_at")
    .eq("id", id)
    .single();
  return data;
};

export const initPassport = () => {
  // JWT Strategy for protected routes
  passport.use(
    new Strategy(
      {
        secretOrKey: process.env.JWT_SECRET,
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      },
      async (token: { user: Request["user"] }, done) => {
        try {
          done(null, token.user);
        } catch (error) {
          done(error);
        }
      },
    ),
  );

  // Local Strategy for login
  passport.use(
    "login",
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          console.log("Login attempt for email:", email);
          const user = await getUserByEmail(email);

          if (!user) {
            console.log("User not found for email:", email);
            return done(createError(401, "Invalid email or password"), false);
          }

          console.log("User found:", {
            id: user.id,
            email: user.email,
            hasPassword: !!user.password,
          });

          if (!user.password) {
            console.log("User has no password set");
            return done(createError(401, "Invalid email or password"), false);
          }

          const isMatch = await isValidPassword(password, user.password);
          console.log("Password match result:", isMatch);

          if (!isMatch)
            return done(createError(401, "Invalid email or password"), false);

          delete (user as any).password;

          return done(null, user);
        } catch (err: any) {
          console.error("Login error:", err);
          return done(createError(500, err.message));
        }
      },
    ),
  );
};
export const createUserTokens = (user: Omit<IUser, "password">) => {
  const jwtSecret = process.env.JWT_SECRET ?? "";
  const accessToken = jwt.sign({ ...user }, jwtSecret, {
    expiresIn: (process.env.ACCESS_TOKEN_EXPIRY ??
      "30m") as jwt.SignOptions["expiresIn"],
  });
  const refreshToken = jwt.sign({ ...user }, jwtSecret, {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRY ??
      "2d") as jwt.SignOptions["expiresIn"],
  });
  return { accessToken, refreshToken };
};

export const decodeToken = (token: string) => {
  // const jwtSecret = process.env.JWT_SECRET ?? "";
  const decode = jwt.decode(token) as jwt.JwtPayload;
  const expired = dayjs.unix(decode.exp!).isBefore(dayjs());
  return { ...decode, expired } as IUser & {
    iat: number;
    exp: number;
    expired: boolean;
  };
};

export const verifyToken = (token: string) => {
  const jwtSecret = process.env.JWT_SECRET ?? "";
  const decode = jwt.verify(token, jwtSecret);
  return decode as IUser;
};
