import { Router } from "express";
import { auth } from "./auth";
import { webhook } from "./webhook";

const router = Router();

router.use("/auth", auth);
router.use("/webhook", webhook);

export { router };
