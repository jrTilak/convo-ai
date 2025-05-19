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
      const refined = [
        {
          role: "system",
          content: prompt,
        },
        ...messages,
      ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

      console.log(refined);

      const response = await this._client.chat.completions.create({
        model: "gpt-4-turbo",
        messages: refined,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

export const ai = new AI();
