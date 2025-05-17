import { Router } from "express";
import passport from "@/config/passport";
import jwt from "jsonwebtoken";
import { protect } from "@/middleware/auth";

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

auth.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false, failureRedirect: "/" }),
  (req, res) => {
    const user = req.user as {
      id: string;
      email: string;
    };

    if (!user) {
      res.status(401).json({
        message: "Unauthorized",
      });
    } else {
      const token = jwt.sign(
        { id: user.id, email: user.email },
        String(process.env.JWT_SECRET),
        { expiresIn: "1m" }
      );

      res.json({
        message: "Login successful",
        bearer: token,
      });
    }
  }
);

auth.get("/me", protect(), (req, res) => {
  res.json(req.user);
});

export { auth };
