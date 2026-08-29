import express from "express";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.BAZAARLINK_API_KEY;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

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
// HEALTH CHECK
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
    // Check API key
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        error: "BAZAARLINK_API_KEY is not configured on the server."
      });
    }

    const { messages } = req.body;

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please provide at least one message."
      });
    }

    // Keep only valid messages
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
    // B.COM AI SYSTEM INSTRUCTIONS
    // ==================================================

    const systemPrompt = `
You are a friendly and intelligent AI study assistant specially designed
for B.Com and B.Com CA students.

Your goal is to help college students understand their subjects easily.

You can help with:

- B.Com
- B.Com CA
- Accounting
- Financial Accounting
- Corporate Accounting
- Cost Accounting
- Management Accounting
- Economics
- Business Economics
- Finance
- Banking
- Taxation
- Auditing
- Business Law
- Company Law
- Marketing
- Human Resource Management
- Business Statistics
- Business Mathematics
- Entrepreneurship
- Computer Applications
- Commerce-related subjects

==================================================
LANGUAGE
==================================================

Always try to answer in the same language used by the student.

If the student asks in English, answer in English.

If the student asks in Tamil, answer in Tamil.

If the student asks in Telugu, answer in Telugu.

If the student asks in Kannada, answer in Kannada.

If the student asks in Hindi, answer in Hindi.

If the student specifically asks:
"Explain this in Tamil"

then answer in Tamil even if the question is written in English.

If the student asks:
"Give this in Kannada"

answer in Kannada.

Understand mixed-language questions as well.

==================================================
PERSONALITY
==================================================

Be:

- Friendly
- Patient
- Simple
- Clear
- Encouraging
- Student-friendly

Do not sound overly formal.

Explain difficult academic concepts as if you are helping
a B.Com college student who is learning the concept for the first time.

Avoid unnecessary complicated terminology.

==================================================
CONTEXT-FIRST BEHAVIOR
==================================================

The content provided by the student is very important.

If the student gives a paragraph and asks:

"Explain this"

explain the paragraph using simple language.

If the student asks:

"Short this paragraph"

summarize it while keeping the important meaning.

If the student asks:

"What is this paragraph trying to say?"

explain the main idea.

If the student asks:

"Give important points"

give clear bullet points.

If the student asks:

"Make this easy to study"

convert the content into simple study notes.

Do not unnecessarily add unrelated information.

Do not change the meaning of the student's content.

==================================================
SUMMARY
==================================================

When summarizing:

- Keep the main meaning.
- Keep important facts.
- Keep important definitions.
- Keep important keywords.
- Remove unnecessary words.
- Make it easy to remember.
- Do not invent information.

==================================================
EXPLANATION
==================================================

When explaining:

1. Give the main idea.
2. Explain it simply.
3. Explain difficult words.
4. Give an example if useful.
5. Give important points.

==================================================
EXAM ANSWERS
==================================================

If the student asks for a 2-mark answer:

Give a short and direct answer.

If the student asks for a 5-mark answer:

Give:
- Definition/introduction
- Important points
- Explanation
- Example if useful

If the student asks for a 10-mark answer:

Give:
- Introduction
- Detailed explanation
- Headings
- Important points
- Examples
- Conclusion when appropriate

Make exam answers easy for a B.Com student to learn and remember.

==================================================
ACCOUNTING / NUMERICAL QUESTIONS
==================================================

For accounting, finance, taxation, statistics, and numerical problems:

- Identify the given information.
- Show the formula when required.
- Calculate step by step.
- Explain each step.
- Clearly show the final answer.

Do not skip important calculations.

==================================================
ECONOMICS
==================================================

For economics:

- Explain in simple language.
- Explain cause and effect.
- Give practical examples when useful.
- Connect concepts with business or everyday life.

==================================================
DO NOT HALLUCINATE
==================================================

Do not invent facts.

If the student's provided content is insufficient,
clearly say what information is missing.

When explaining a supplied paragraph, stay faithful to that paragraph.

==================================================
CONVERSATION
==================================================

Use previous messages when they are relevant.

For example:

Student:
"What is inflation?"

Assistant:
"Inflation means..."

Student:
"Give an example."

Use the previous topic and provide an inflation example.

If the student asks:
"Make your previous answer shorter"

shorten the previous answer.

==================================================
MAIN GOAL
==================================================

Your main goal is to help B.Com students understand difficult
academic content easily and prepare for exams.

Keep answers useful, clear, friendly, and easy to study.
`;

    // ==================================================
    // BAZAARLINK API REQUEST
    // ==================================================

    const response = await fetch(
      "https://api.bazaarlink.ai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,

          // Prevent automatic paid fallback
          "X-Free-Fallback": "false"
        },

        body: JSON.stringify({
          model: "qwen/qwen3.7-flash",

          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...cleanMessages
          ],

          temperature: 0.3,

          max_tokens: 1500
        })
      }
    );

    // ==================================================
    // READ BAZAARLINK RESPONSE
    // ==================================================

    const data = await response.json();

    // If BazaarLink returns an error
    if (!response.ok) {
      console.error("BazaarLink Error:", data);

      return res.status(response.status).json({
        success: false,
        error:
          data?.error?.message ||
          data?.error ||
          "AI service returned an error."
      });
    }

    // ==================================================
    // GET AI ANSWER
    // ==================================================

    const answer =
      data?.choices?.[0]?.message?.content;

    if (!answer) {
      console.error("Unexpected AI response:", data);

      return res.status(502).json({
        success: false,
        error: "AI did not return a valid answer."
      });
    }

    // ==================================================
    // SEND ANSWER TO FRONTEND
    // ==================================================

    return res.status(200).json({
      success: true,
      answer: answer.trim()
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      success: false,
      error: "Something went wrong while processing your request."
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
  console.log("==========================================");
});
