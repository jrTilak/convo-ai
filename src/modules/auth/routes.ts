import { Router } from "express";
import passport from "@/config/passport";
import jwt from "jsonwebtoken";

const auth = Router();

auth.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: [
      "email",
      "public_profile",
      "pages_show_list",
      "pages_manage_metadata",
      "pages_messaging",
    ],
  })
);

// GET /auth/facebook/callback — handle Facebook response
auth.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false, failureRedirect: "/" }),
  (req, res) => {
    // @ts-ignore
    const user = req.user;

    console.log(user);

    res.json({ user });
  }
);

export { auth };
