import OpenAI from "openai";

class AI {
  private _client: OpenAI;

  constructor() {
    this._client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async chat(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    prompt: string
  ) {
    try {
      const response = await this._client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: prompt,
          },
          ...messages,
        ],
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

export const ai = new AI();
