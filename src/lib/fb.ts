import axios from "axios";
import { log } from "./log";

type LongLivedTokenResponse = {
  accessToken: string;
  expiresIn: number;
};

class Fb {
  appId: string;
  appSecret: string;

  constructor() {
    this.appSecret = String(process.env.FACEBOOK_APP_SECRET);
    this.appId = String(process.env.FACEBOOK_APP_ID);
  }

  async getLongLivedToken(
    shortLivedToken: string
  ): Promise<LongLivedTokenResponse | null> {
    try {
      const response = await axios.get(
        "https://graph.facebook.com/v22.0/oauth/access_token",
        {
          params: {
            grant_type: "fb_exchange_token",
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: shortLivedToken,
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error: any) {
      log.error("Failed to get long-lived token:");
      log.error(error);
      return null;
    }
  }
  async sendMessage(recipientId: string, text: string, accessToken: string) {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v22.0/me/messages`,
        {
          recipient: { id: recipientId },
          message: { text },
        },
        {
          params: {
            access_token: accessToken,
          },
        }
      );

      console.log("✅ Message sent:", response.data);
    } catch (error: any) {
      console.error(
        "❌ Failed to send message:",
        error.response?.data || error.message
      );
    }
  }

  async getFacebookPages(userAccessToken: string) {
    try {
      const res = await axios.get(
        `https://graph.facebook.com/v22.0/me/accounts`,
        {
          params: {
            access_token: userAccessToken,
          },
        }
      );

      const pages = res.data.data;

      if (!pages || pages.length === 0) {
        console.log("No pages found for this user.");
        return [];
      }

      const data = pages.map((page: any) => ({
        idFromProvider: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category,
      })) as {
        idFromProvider: string;
        name: string;
        accessToken: string;
        category: string;
      }[];

      return data;
    } catch (err: any) {
      console.error(
        "❌ Error fetching pages:",
        err.response?.data || err.message
      );
      return [];
    }
  }

  async subscribePageToWebhook(pageId: string, pageAccessToken: string) {
    try {
      const res = await axios.post(
        `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps`,
        null,
        {
          params: {
            access_token: pageAccessToken,
            subscribed_fields: "messages,messaging_postbacks",
          },
        }
      );

      console.log(`✅ Subscribed Page ID: ${pageId}`, res.data);
      return true;
    } catch (err: any) {
      console.error(
        `❌ Failed to subscribe Page ID: ${pageId}:`,
        err.response?.data || err.message
      );
      return false;
    }
  }
}

const fb = new Fb();
export { fb };
