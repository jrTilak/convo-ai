import passport from "passport";
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions,
} from "passport-jwt";
import { Strategy as FacebookStrategy, Profile } from "passport-facebook";
import { config } from "dotenv";
import { db } from "@/lib/prisma";
import { fb } from "@/lib/fb";
import { log } from "@/lib/log"; // <-- Add this import

config();

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: String(process.env.JWT_SECRET),
};

type JWTPayload = {
  id: string;
  email: string;
};

passport.use(
  new JwtStrategy(opts, (payload: JWTPayload, done) => {
    log.info("JWT strategy invoked", { payload }); // <-- Add log
    const user = db.user.findUnique({
      where: {
        id: payload.id,
        email: payload.email,
      },
    });
    if (user) {
      log.info("User found for JWT", { user }); // <-- Add log
      return done(null, user);
    }
    log.warn("No user found for JWT", { payload }); // <-- Add log
    return done(null, false);
  })
);

passport.use(
  new FacebookStrategy(
    {
      clientID: String(process.env.FACEBOOK_APP_ID),
      clientSecret: String(process.env.FACEBOOK_APP_SECRET),
      callbackURL: String(process.env.FACEBOOK_CALLBACK_URL),
      profileFields: ["id", "displayName", "emails"],
    },
    async (accessToken, refreshToken, profile: Profile, done) => {
      log.info(
        "Facebook strategy invoked",
        { profile },
        { accessToken },
        {
          refreshToken,
        }
      );
      if (!profile.emails?.[0].value) {
        log.warn("No email in Facebook profile", { profile });
        return done(null, false);
      }

      const longLikedTokens = await fb.getLongLivedToken(accessToken);

      if (!longLikedTokens) {
        log.error("Failed to get long-lived Facebook token", { accessToken });
        return done(null, false);
      }

      try {
        const user = await db.user.upsert({
          where: {
            email: profile.emails?.[0].value,
          },
          update: {
            name: profile.displayName,
            updatedAt: new Date(),
            oauthCredentials: {
              update: {
                accessToken: longLikedTokens.accessToken,
                refreshToken: "",
                updatedAt: new Date(),
                expiresAt: new Date(
                  Date.now() + longLikedTokens.expiresIn * 1000
                ),
              },
            },
          },
          create: {
            name: profile.displayName,
            email: String(profile.emails?.[0].value),
            createdAt: new Date(),
            updatedAt: new Date(),
            oauthCredentials: {
              create: {
                provider: "FACEBOOK",
                accessToken: longLikedTokens.accessToken,
                refreshToken: "",
                userIdFromProvider: profile.id,
                scope: [
                  "email",
                  "public_profile",
                  "pages_show_list",
                  "pages_manage_metadata",
                  "pages_messaging",
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
                expiresAt: new Date(
                  Date.now() + longLikedTokens.expiresIn * 1000
                ),
              },
            },
          },
          select: {
            id: true,
            oauthCredentials: {
              select: {
                id: true,
              },
            },
          },
        });

        await db.user.update({
          where: {
            id: user.id,
          },
          data: {
            oauthCredentialsId: user.oauthCredentials?.id,
          },
        });

        // update the oauthCredentials

        log.info("User upserted via Facebook", { user });

        return done(null, user);
      } catch (error) {
        log.error("Error during Facebook upsert", { error });
        return done(error, false);
      }
    }
  )
);

export default passport;
