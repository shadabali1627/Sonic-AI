import { ModelRouter } from "@/lib/guardrails/model-router";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export class ChatService {
  constructor() {}

  /**
   * Describes the uploaded image using gemini-2.5-flash (with a fallback to gemini-2.0-flash).
   */
  private async describeImageWithGemini(imageBytes: Buffer): Promise<string> {
    const activeModel = ModelRouter.route('', true, 'auto');
    try {
      const model = genAI.getGenerativeModel({ model: activeModel.modelId });
      const result = await model.generateContent([
        {
          inlineData: {
            data: imageBytes.toString("base64"),
            mimeType: "image/jpeg"
          }
        },
        "Describe this image in detail."
      ]);
      return result.response.text();
    } catch (error) {
      console.error("Failed to describe image with primary model:", error);
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: activeModel.modelId });
        const result = await fallbackModel.generateContent([
          {
            inlineData: {
              data: imageBytes.toString("base64"),
              mimeType: "image/jpeg"
            }
          },
          "Describe this image in detail."
        ]);
        return result.response.text();
      } catch (fallbackError) {
        console.error("Fallback vision description failed:", fallbackError);
        return "An uploaded image (unable to generate description).";
      }
    }
  }

  async *generateResponse(
    message: string,
    imageBytes?: Buffer,
    history: { role: string; content: string }[] = [],
    routedModel?: any
  ): AsyncGenerator<string, void, unknown> {
    const systemInstruction = `You are Sonic AI, a professional, friendly, and helpful AI assistant.
Always provide direct, concise, and accurate answers to the user's queries.
Format your responses using clean, standard Markdown with clear headings, bullet points, and short paragraphs for readability.`;

    const activeModel = routedModel || ModelRouter.route(message, !!imageBytes, 'auto');

    let promptMessage = message;
    if (imageBytes) {
      try {
        const imageDescription = await this.describeImageWithGemini(imageBytes);
        promptMessage = `[Image Description: ${imageDescription}]\n\n${message}`;
      } catch (err) {
        console.error("Error generating image description:", err);
      }
    }

    let primaryFailed = false;
    let yieldedAny = false;

    // Primary streaming logic using Gemma via Gemini API
    try {
      const model = genAI.getGenerativeModel({
        model: activeModel.modelId,
      });

      const formattedHistory = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // Inject system instruction for Gemma
      if (formattedHistory.length > 0) {
        formattedHistory[0].parts[0].text = `[System Instructions: ${systemInstruction}]\n\n${formattedHistory[0].parts[0].text}`;
      } else {
        promptMessage = `[System Instructions: ${systemInstruction}]\n\n${promptMessage}`;
      }

      const chat = model.startChat({
        history: formattedHistory
      });

      const resultStream = await chat.sendMessageStream(promptMessage);
      for await (const chunk of resultStream.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
          yieldedAny = true;
        }
      }
    } catch (error) {
      console.error("Gemini primary generation failed. Initiating fallback...", error);
      primaryFailed = true;
    }

    // Fallback: retry with the same model
    if (primaryFailed) {
      try {
        const model = genAI.getGenerativeModel({
          model: activeModel.modelId,
        });

        const formattedHistory = history.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

        if (formattedHistory.length > 0) {
          formattedHistory[0].parts[0].text = `[System Instructions: ${systemInstruction}]\n\n${formattedHistory[0].parts[0].text}`;
        } else {
          promptMessage = `[System Instructions: ${systemInstruction}]\n\n${promptMessage}`;
        }

        const chat = model.startChat({
          history: formattedHistory
        });

        const resultStream = await chat.sendMessageStream(promptMessage);
        for await (const chunk of resultStream.stream) {
          const text = chunk.text();
          if (text) {
            yield text;
            yieldedAny = true;
          }
        }
      } catch (fallbackError) {
        console.error("Gemini fallback failed:", fallbackError);
        if (!yieldedAny) {
          yield "I apologize, but I'm currently unable to connect to the AI service. Please try again in a moment.";
        }
      }
    }
  }
}
