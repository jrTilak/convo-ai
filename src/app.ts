import { config } from "dotenv";
import express from "express";
import { router } from "./modules";
import passport from "@/config/passport";

config();

const app = express();

// logs a message to the console when a request is made to the server
app.use((req, _res, next) => {
  console.log(`Request made to ${req.url}`);
  next();
});

app.use(express.json());
app.use(passport.initialize());

app.get("/", (_req, res) => {
  res.send("Hello, world!");
});

app.use("/api/v1", router);

export { app };
