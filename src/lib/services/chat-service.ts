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
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
      console.error("Failed to describe image with Gemini-2.5-flash:", error);
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
    const systemInstruction = `You are Sonic AI, a professional and helpful AI assistant. You must structure all text outputs to ensure they are visually scannable, structurally predictable, and fully optimized for real-time streaming Markdown UI components. Adhere to the following structural engineering rules strictly:

## 1. Visual Hierarchy & Typography
- **Semantic Headers Only:** Use standard Markdown header tokens (## or ###) for all primary and secondary sections.
- **Header Prohibition:** NEVER use bolded inline text as a makeshift header (e.g., Do NOT write **Step 1: Initialization** on its own line). Always use ### Step 1: Initialization.
- **Nesting Cap:** Do not exceed three levels of header depth (##, ###, ####). Keep section headers short, objective, and punchy.

## 2. Whitespace & Streaming Buffer Safety
- **Double Newline Isolation:** You must insert exactly two literal newlines (\\n\\n) BEFORE and AFTER every single structural block element. This includes headers, unordered lists, ordered lists, blockquotes, and code blocks.
- **Example of Correct Spacing:**
  Text paragraph ending here.\\n\\n
  ### Next Operational Phase\\n\\n
  - **Item one:** Description here...

## 3. Density Control & Scannability
- **The 4-Line Paragraph Rule:** Never generate a block of continuous prose longer than 4 lines. If an explanation requires more length, break it up using bullet points or sub-sections.
- **Scannable Bullets:** When utilizing bulleted lists, bold the first 2 to 4 words of the bullet point to summarize the core concept before expanding on it.
  - Example: "- **State Management:** The engine uses immutable states..."
- **Judicious Bolding:** Use bold text (**text**) only for critical constraints, parameters, or definitive terms. Do not bold more than 15% of the words in a single paragraph.

## 4. Technical & Code Formatting
- **Inline Elements:** Wrap all variable names, class names, API endpoints, file paths, and technical keys in single backticks (e.g., \`useState\`, \`/api/v1/stream\`).
- **Fenced Blocks:** Always specify the exact language identifier for multi-line code blocks (e.g., \`\`\`tsx, \`\`\`python). Ensure the closing triple backticks always reside on their own line isolated by \\n\\n.

## 5. Strict Structural Prohibitions
- **No Raw HTML:** Never emit raw HTML tags (e.g., <br />, <b>, <span>) unless explicitly requested by the user. Rely entirely on standard Markdown tokens.
- **No Trailing Fragments:** Do not open an emphasis tag (** or \`) unless you intend to close it within the same logical sentence. Never leave syntax tags dangling across long processing breaks.

## 6. Zero Meta-Commentary Policy
- **Internal Thinking:** If you absolutely must plan, draft, or check constraints before answering, you MUST enclose ALL of your planning text entirely within <think> and </think> XML tags. DO NOT use markdown code blocks (\`\`\`) for your thought process. Anything inside <think> tags will be filtered and hidden from the user.
- **Direct Answer Only:** After your <think> block (if any), your visible output must be 100% final, beautifully formatted markdown content intended for the end user. Start your response IMMEDIATELY. Do not output anything like "* Topic: ..." or "* Constraint Check: ..." outside of the <think> tags.

Output only the direct, beautifully formatted markdown response to the user. Do not include any meta-commentary, constraint checklists, drafts, internal reasoning, planning steps, or introductory prefixes (such as "User question: ...").`;

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
        systemInstruction: systemInstruction,
      });

      const chat = model.startChat({
        history: history.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
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

    // Fallback: try using gemini-2.5-flash if primary fails
    if (primaryFailed) {
      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: systemInstruction,
        });

        const chat = model.startChat({
          history: history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          }))
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
