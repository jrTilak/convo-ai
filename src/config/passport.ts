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
import { log } from "@/lib/log";
import axios from "axios";

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
  new JwtStrategy(opts, async (payload: JWTPayload, done) => {
    log.info("JWT strategy invoked", { payload });
    const user = await db.user.findUnique({
      where: {
        id: payload.id,
        email: payload.email,
      },
    });
    if (user) {
      log.info("User found for JWT", { user });
      return done(null, user);
    }
    log.warn("No user found for JWT", { payload });
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
      console.log("longLikedTokens", longLikedTokens);
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
                  Date.now() + (longLikedTokens.expiresIn || 0) * 1000
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
                  Date.now() + (longLikedTokens.expiresIn || 0) * 1000
                ),
              },
            },
          },
          select: {
            id: true,
            email: true,
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

        const facebookPages = await fb.getFacebookPages(
          longLikedTokens.accessToken
        );

        await Promise.all(
          facebookPages.map(async (page) => {
            const pageFromDb = await db.facebookPage.upsert({
              where: {
                idFromProvider: page.idFromProvider,
              },
              update: {
                name: page.name,
                accessToken: page.accessToken,
                updatedAt: new Date(),
                categories: [page.category],
              },
              create: {
                name: page.name,
                accessToken: page.accessToken,
                createdAt: new Date(),
                updatedAt: new Date(),
                categories: [page.category],
                idFromProvider: page.idFromProvider,
                user: {
                  connect: {
                    id: user.id,
                  },
                },
              },
            });

            // subscribe to webhook
            const webhookSubscription = await fb.subscribePageToWebhook(
              pageFromDb.idFromProvider,
              pageFromDb.accessToken
            );

            if (!webhookSubscription) {
              log.error("Failed to subscribe page to webhook", {
                page: pageFromDb,
              });
            } else {
              log.info("Subscribed page to webhook", {
                page: pageFromDb,
              });
            }
          })
        );

        return done(null, user);
      } catch (error) {
        log.error("Error during Facebook upsert", { error });
        return done(error, false);
      }
    }
  )
);

export default passport;
