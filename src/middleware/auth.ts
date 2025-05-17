import passport from "@/config/passport";

export const protect = () => {
  return passport.authenticate("jwt", { session: false });
};
