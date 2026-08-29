import express from "express";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.BAZAARLINK_API_KEY;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ======================================================
// REMOVE MARKDOWN FORMATTING
// ======================================================

function cleanAIResponse(text) {
  if (!text || typeof text !== "string") {
    return "";
  }

  let cleaned = text;

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");

  // Remove bold and italic markers
  cleaned = cleaned.replace(/\*\*\*(.*?)\*\*\*/g, "$1");
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*(.*?)\*/g, "$1");

  // Remove heading markers
  cleaned = cleaned.replace(/^#{1,6}\s*/gm, "");

  // Remove inline code markers
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Remove Markdown links but keep the text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, "");

  // Clean excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "B.Com AI Chatbot Backend is running!",
    status: "online",
    endpoints: {
      health: "/health",
      chat: "POST /api/chat"
    }
  });
});

// ======================================================
// HEALTH
// ======================================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

// ======================================================
// CHAT
// ======================================================

app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        error: "BAZAARLINK_API_KEY is not configured."
      });
    }

    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please provide at least one message."
      });
    }

    const cleanMessages = messages
      .filter(
        (message) =>
          message &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim() !== ""
      )
      .slice(-20)
      .map((message) => ({
        role: message.role,
        content: message.content.trim()
      }));

    if (cleanMessages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid messages were provided."
      });
    }

    // ==================================================
    // B.COM AI INSTRUCTIONS
    // ==================================================

    const systemPrompt = `
You are a friendly AI study assistant specially designed for B.Com
and B.Com CA college students.

You help students with:

Accounting
Financial Accounting
Corporate Accounting
Cost Accounting
Management Accounting
Economics
Business Economics
Finance
Banking
Taxation
Auditing
Business Law
Company Law
Marketing
Human Resource Management
Business Statistics
Business Mathematics
Entrepreneurship
Computer Applications
and other Commerce subjects.

IMPORTANT LANGUAGE RULE:

Always answer in the language requested by the student.

English question -> English answer.

Tamil question -> Tamil answer.

Telugu question -> Telugu answer.

Kannada question -> Kannada answer.

Hindi question -> Hindi answer.

If the student explicitly says:
"Explain this in Tamil"
then answer completely in Tamil.

If the student explicitly says:
"Explain this in Kannada"
then answer completely in Kannada.

Understand mixed-language questions too.

IMPORTANT:

The student's provided paragraph, question, or study material
is the most important context.

If the student says:

"Explain this paragraph"

explain the given paragraph in simple language.

If the student says:

"Short this paragraph"

make it shorter while preserving the important meaning.

If the student says:

"Give important points"

give clear points.

If the student says:

"Explain this for my exam"

give an exam-friendly explanation.

If the student asks for a 2-mark answer,
give a short direct answer.

If the student asks for a 5-mark answer,
give a structured answer with important points.

If the student asks for a 10-mark answer,
give a detailed structured answer.

For accounting and numerical problems:
show the calculation step by step.

For economics:
explain concepts using simple language and practical examples.

Be friendly, patient, simple, and encouraging.

Do not use unnecessarily complicated terminology.

Do not invent facts.

Do not change the meaning of the student's provided content.

VERY IMPORTANT OUTPUT RULE:

Return ONLY plain text.

DO NOT use Markdown.

DO NOT use:
**bold**
*italic*
# headings
## headings
### headings
backticks
Markdown tables
Markdown links

Do not put stars around words.

Use simple plain-text headings if needed.

For example:

Definition:
Inflation means...

Important points:
1. ...
2. ...
3. ...

Use normal numbers and bullet points only.

Do not output Markdown formatting characters.
`;

    // ==================================================
    // BAZAARLINK
    // ==================================================

    const response = await fetch(
      "https://api.bazaarlink.ai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,

          // Never automatically switch to paid usage
          "X-Free-Fallback": "false"
        },

        body: JSON.stringify({
          model: "auto:free",

          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...cleanMessages
          ],

          temperature: 0.2,

          max_tokens: 1500
        })
      }
    );

    // ==================================================
    // READ RESPONSE
    // ==================================================

    const data = await response.json();

    // Log actual BazaarLink response for debugging
    console.log("BazaarLink HTTP Status:", response.status);
    console.log("BazaarLink Response:", JSON.stringify(data, null, 2));

    // ==================================================
    // BAZAARLINK ERROR
    // ==================================================

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error:
          data?.error?.message ||
          data?.error ||
          "BazaarLink returned an error."
      });
    }

    // ==================================================
    // GET AI RESPONSE
    // ==================================================

    let answer = data?.choices?.[0]?.message?.content;

    // Some providers can return content in another form.
    if (Array.isArray(answer)) {
      answer = answer
        .map((item) => {
          if (typeof item === "string") return item;
          return item?.text || "";
        })
        .join("");
    }

    if (typeof answer !== "string" || answer.trim() === "") {
      console.error(
        "AI response did not contain normal text:",
        JSON.stringify(data, null, 2)
      );

      return res.status(502).json({
        success: false,
        error:
          "The AI service did not return a readable answer. Please try again."
      });
    }

    // ==================================================
    // CLEAN MARKDOWN
    // ==================================================

    answer = cleanAIResponse(answer);

    // ==================================================
    // FINAL RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,
      answer
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      success: false,
      error:
        "Something went wrong while connecting to the AI service."
    });
  }
});

// ======================================================
// 404
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found."
  });
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("==========================================");
  console.log("B.Com AI Chatbot Backend");
  console.log("==========================================");
  console.log(`Server running on port ${PORT}`);
  console.log("Home: /");
  console.log("Health: /health");
  console.log("Chat: POST /api/chat");
  console.log("Model: auto:free");
  console.log("==========================================");
});
