import { GoogleGenerativeAI } from "@google/generative-ai";
import { ModelRouter } from "@/lib/guardrails/model-router";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export class ChatService {
  private textModel: any;
  private visionModel: any;

  constructor() {
    // Declared but currently unused (routing to OpenRouter instead)
    this.textModel = genAI.getGenerativeModel({ 
      model: "gemma-4-31b-it",
    });
    this.visionModel = genAI.getGenerativeModel({ 
      model: "gemma-4-31b-it", 
    });
  }

  async *generateResponse(
    message: string,
    imageBytes?: Buffer,
    history: { role: string; content: string }[] = [],
    routedModel?: any
  ): AsyncGenerator<string, void, unknown> {
    const systemInstruction = `You are Sonic AI, a professional voice-first AI assistant. You are communicating with a user on a narrow mobile interface. You must respond with extreme brevity, keeping all responses under three sentences and getting to the point immediately. You must write in a single, cohesive paragraph without any bullet points, numbered lists, double line breaks, or filler introductory phrases. Ensure your response is highly conversational and easy to read aloud by a text-to-speech engine. Do not include any internal reasoning, draft plans, outlines, or planning steps. Output only the direct conversational response to the user.`;

    const activeModel = routedModel || ModelRouter.route(message, !!imageBytes, 'auto');

    // 1. Gemini Provider Streaming
    if (activeModel.provider === 'gemini') {
      try {
        const client = new GoogleGenerativeAI(activeModel.apiKey);
        const model = client.getGenerativeModel({
          model: activeModel.modelId,
          systemInstruction: systemInstruction
        });

        const contents: any[] = [];
        for (const msg of history) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }

        const currentParts: any[] = [];
        if (imageBytes) {
          currentParts.push({
            inlineData: {
              data: imageBytes.toString("base64"),
              mimeType: "image/jpeg"
            }
          });
        }
        currentParts.push({ text: message });

        contents.push({
          role: 'user',
          parts: currentParts
        });

        const result = await model.generateContentStream({
          contents
        });

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            yield text;
          }
        }
      } catch (error) {
        console.error("Gemini Generation error:", error);
        yield "I apologize, but I'm currently unable to connect to the Gemini service. Please try again in a moment.";
      }
      return;
    }

    // 2. OpenRouter Provider Streaming
    const messages = [
      { role: "system", content: systemInstruction },
      ...history.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${activeModel.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Sonic AI"
        },
        body: JSON.stringify({
          model: activeModel.modelId,
          messages: messages,
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenRouter API error:", errText);
        yield "I apologize, but I'm currently unable to connect to the AI service. Please try again in a moment.";
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield "Error reading stream.";
        return;
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;
          if (cleanLine === "data: [DONE]") continue;

          if (cleanLine.startsWith("data: ")) {
            const dataStr = cleanLine.slice(6);
            try {
              const data = JSON.parse(dataStr);
              const text = data.choices?.[0]?.delta?.content;
              if (text) {
                yield text;
              }
            } catch (e) {
              console.error("Error parsing stream line:", cleanLine, e);
            }
          }
        }
      }
    } catch (error) {
      console.error("AI Generation error:", error);
      yield "I apologize, but I'm currently unable to connect to the AI service. Please try again in a moment.";
    }
  }
}

