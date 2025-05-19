import { ai } from "@/lib/ai";
import { fb } from "@/lib/fb";
import { db } from "@/lib/prisma";
import { Router } from "express";

const webhook = Router();

webhook.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === String(process.env.FACEBOOK_VERIFY_TOKEN)
  ) {
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

      const page = await db.facebookPage.findFirst({
        where: {
          idFromProvider: String(entry.id),
        },
      });

      if (!page) {
        console.log("page not found");
        return;
      }

      if (messageText) {
        console.log(`📩 Message from ${senderId}: ${messageText}`);

        // save chat
        await db.chat.create({
          data: {
            from: "USER",
            message: messageText,
            facebookPageId: page.id,
          },
        });

        const chats = await db.chat.findMany({
          where: {
            facebookPageId: page.id,
          },
          orderBy: {
            createdAt: "asc", // last created last
          },
        });

        const prompt = `
        You are an AI assistant for a Facebook page ${page.name}. Do not disclose that you are an ai assistant. Take the role of ${page.name} and answer the user's message. Make the tone as natural and friendly as possible. The page is ${page.categories[0]}. 
The user name is ${event.sender.name}.

You need to sell the product available on the page. The products are PC, Mouse and Keyboard.

        `;

        const reply = await ai.chat(
          chats.map((chat) => ({
            role:
              chat.from === "USER" ? ("user" as const) : ("assistant" as const),
            content: chat.message,
            refusal: null,
          })),
          prompt
        );

        if (!reply) {
          console.log("no reply");
          return;
        }

        await fb.sendMessage(senderId, reply, page?.accessToken);

        await db.chat.create({
          data: {
            from: "FACEBOOK_PAGE",
            message: reply,
            facebookPageId: page.id,
          },
        });
      }
    });

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

export { webhook };
