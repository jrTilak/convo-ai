import { fb } from "@/lib/fb";
import { db } from "@/lib/prisma";
import { Router } from "express";

const webhook = Router();

webhook.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === String(process.env.VERIFY_TOKEN)) {
    console.log("✅ Facebook webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

webhook.post("/", async (req, res) => {
  const body = req.body;

  console.log("body", body);

  if (body.object === "page") {
    body.entry.forEach(async (entry: any) => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;
      const messageText = event.message?.text;

      const pageAccessToken = await db.facebookPage.findFirst({
        where: {
          idFromProvider: String(entry.id),
        },
      });

      if (!pageAccessToken) {
        console.log("pageAccessToken not found");
        return;
      }

      if (messageText) {
        console.log(`📩 Message from ${senderId}: ${messageText}`);

        const response = `Thanks for your message: "${messageText}"`;

        await fb.sendMessage(senderId, response, pageAccessToken?.accessToken);
      }
    });

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

export { webhook };
