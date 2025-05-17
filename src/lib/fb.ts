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
}

const fb = new Fb();
export { fb };
