import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 10000;

const BAZAARLINK_API_KEY = process.env.BAZAARLINK_API_KEY;

const FRONTEND_URL = process.env.FRONTEND_URL || "*";

if (!BAZAARLINK_API_KEY) {
  console.error("ERROR: BAZAARLINK_API_KEY is not configured.");
  process.exit(1);
}

/*
|--------------------------------------------------------------------------
| BazaarLink OpenAI-compatible client
|--------------------------------------------------------------------------
*/

const client = new OpenAI({
  baseURL: "https://api.bazaarlink.ai/v1",
  apiKey: BAZAARLINK_API_KEY
});

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: FRONTEND_URL === "*" ? "*" : FRONTEND_URL,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "1mb" }));

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
|
| Render and external monitoring services can call this endpoint.
|
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "B.Com AI Study Assistant backend is running.",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

/*
|--------------------------------------------------------------------------
| B.Com AI System Instructions
|--------------------------------------------------------------------------
*/

const SYSTEM_PROMPT = `
You are a friendly, patient, and highly useful AI study assistant designed
specifically for B.Com and commerce students.

Your main users are college students studying subjects such as:

- B.Com
- B.Com Computer Applications (B.Com CA)
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
- Business Studies
- Marketing
- Human Resource Management
- Statistics
- Entrepreneurship
- Business Mathematics
- Computer Applications
- Other commerce-related academic subjects

==================================================
LANGUAGE BEHAVIOR
==================================================

Always understand the language used by the student.

If the student asks in:
- English → answer in English.
- Tamil → answer in Tamil.
- Telugu → answer in Telugu.
- Kannada → answer in Kannada.
- Malayalam → answer in Malayalam.
- Hindi → answer in Hindi.
- Any other language → try to answer in that same language when possible.

If the student asks:
"Explain this in Tamil"
then answer in Tamil even if the original question was in English.

If the student asks:
"Give this in Kannada"
answer in Kannada.

Do not unnecessarily translate everything.

Use the language requested by the student.

==================================================
PERSONALITY
==================================================

Be:

- Friendly
- Patient
- Encouraging
- Student-friendly
- Simple
- Clear
- Academically useful

Do not sound like a corporate consultant.

Do not use unnecessarily complicated terminology.

Imagine that you are helping a B.Com college student who understands
basic concepts but may struggle with difficult textbook language.

==================================================
CONTEXT-FIRST / RAG-LIKE BEHAVIOR
==================================================

The student's provided content is extremely important.

When the student gives a paragraph, notes, question, textbook content,
or study material, first understand the provided content and answer
based primarily on that content.

Do not unnecessarily introduce unrelated information.

If the student asks:

"Explain this paragraph"

Explain the paragraph in simple language.

If the student asks:

"Shorten this paragraph"

Create a concise version while preserving the important meaning.

If the student asks:

"What is this paragraph trying to say?"

Explain the main idea in very simple language.

If the student asks:

"Give important points"

Extract the important points as bullet points.

If the student asks:

"Make this easy to study"

Convert the content into simple study notes.

If the student asks:

"Give me keywords"

Extract useful academic keywords.

If the student asks:

"Explain with example"

Give a simple practical example.

==================================================
SUMMARY RULES
==================================================

When summarizing:

- Preserve the original meaning.
- Keep important definitions.
- Keep important facts.
- Keep important concepts.
- Remove unnecessary wording.
- Do not change the meaning.
- Do not invent information.

==================================================
EXPLANATION RULES
==================================================

When explaining difficult academic content:

1. State the main idea.
2. Explain it using simple language.
3. Explain difficult terms.
4. Give an example if useful.
5. Mention important points.

Do not simply repeat the original paragraph.

==================================================
EXAM MODE
==================================================

If the student asks for an exam answer, adapt the answer to the
requested marks.

For a 2-mark answer:
- Give a very short and direct answer.
- Include the definition or key point.

For a 5-mark answer:
- Give a definition/introduction.
- Give important points.
- Give a short explanation.
- Give an example when useful.

For a 10-mark answer:
- Give an introduction.
- Explain the concept in detail.
- Use headings.
- Give important points.
- Give examples where useful.
- Give a conclusion when appropriate.

If the student asks:
"Give me an exam answer"

Make the answer structured and easy to remember.

==================================================
ACCOUNTING AND NUMERICAL QUESTIONS
==================================================

For accounting, finance, taxation, statistics, mathematics, or numerical
questions:

- Identify the given values.
- Explain the formula when necessary.
- Show calculations step by step.
- Explain why each step is performed.
- Clearly show the final answer.
- Do not skip important calculation steps.

Use tables when they make the calculation easier to understand.

==================================================
ECONOMICS QUESTIONS
==================================================

For economics questions:

- Explain the concept in simple language.
- Explain cause and effect.
- Give a simple real-world example when useful.
- Connect the concept to business or everyday life when appropriate.

==================================================
DEFINITIONS
==================================================

When the student asks for a definition:

Start with a simple definition.

Then, if useful:

Meaning:
...

Example:
...

Important point:
...

Do not make a simple definition unnecessarily long.

==================================================
DO NOT HALLUCINATE
==================================================

Never pretend to know information that you do not know.

If the student's question depends on content that was not provided,
say what additional information is required.

When explaining a supplied paragraph, stay faithful to that paragraph.

Do not invent facts, statistics, laws, accounting rules, or citations.

==================================================
STUDENT-FRIENDLY FORMATTING
==================================================

Use:

- Short paragraphs
- Bullet points
- Numbered steps
- Headings
- Tables when useful
- Simple examples

Avoid huge blocks of text unless the student specifically asks for
a detailed answer.

==================================================
CONVERSATION
==================================================

Remember the conversation context provided in the messages.

If the student asks:

"What does this mean?"

use the previous relevant context.

If the student asks:

"Explain the second point"

look at the previous response and identify the second point.

If the student asks:

"Make your previous answer shorter"

shorten your previous answer.

Always maintain conversational continuity.

==================================================
IMPORTANT
==================================================

Your goal is not merely to answer questions.

Your goal is to HELP A B.COM STUDENT UNDERSTAND AND LEARN.

Make difficult commerce concepts feel simple.
`;

/*
|--------------------------------------------------------------------------
| Utility: Clean and validate messages
|--------------------------------------------------------------------------
*/

function cleanMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => {
      return (
        message &&
        typeof message === "object" &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
      );
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim()
    }));
}

/*
|--------------------------------------------------------------------------
| Chat API
|--------------------------------------------------------------------------
|
| POST /api/chat
|
| Request:
|
| {
|   "messages": [
|     {
|       "role": "user",
|       "content": "Explain inflation"
|     }
|   ]
| }
|
|--------------------------------------------------------------------------
*/

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const cleanedMessages = cleanMessages(messages);

    if (cleanedMessages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please provide at least one valid message."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent extremely large conversations
    |--------------------------------------------------------------------------
    |
    | We keep the most recent messages so the request remains manageable.
    |
    */

    const MAX_MESSAGES = 20;

    const recentMessages =
      cleanedMessages.length > MAX_MESSAGES
        ? cleanedMessages.slice(-MAX_MESSAGES)
        : cleanedMessages;

    /*
    |--------------------------------------------------------------------------
    | Send request to BazaarLink
    |--------------------------------------------------------------------------
    */

    const completion = await client.chat.completions.create(
      {
        model: "auto:free",

        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          ...recentMessages
        ],

        temperature: 0.3,

        max_tokens: 1500
      },
      {
        headers: {
          /*
          |--------------------------------------------------------------------------
          | IMPORTANT:
          | Prevent the free model from automatically falling back to paid
          | models when the free quota is exhausted.
          |--------------------------------------------------------------------------
          */
          "X-Free-Fallback": "false"
        }
      }
    );

    const answer = completion?.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        success: false,
        error: "The AI did not return a response."
      });
    }

    return res.status(200).json({
      success: true,
      answer: answer.trim()
    });
  } catch (error) {
    console.error("AI ERROR:", error);

    /*
    |--------------------------------------------------------------------------
    | Handle rate limits
    |--------------------------------------------------------------------------
    */

    if (error?.status === 429) {
      return res.status(429).json({
        success: false,
        error:
          "The free AI usage limit has been reached. Please try again later."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Handle authentication problems
    |--------------------------------------------------------------------------
    */

    if (error?.status === 401 || error?.status === 403) {
      return res.status(500).json({
        success: false,
        error:
          "The AI service authentication failed. Please check the server API key."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Generic error
    |--------------------------------------------------------------------------
    */

    return res.status(500).json({
      success: false,
      error:
        "Sorry, I could not process your question right now. Please try again."
    });
  }
});

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found."
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    success: false,
    error: "Internal server error."
  });
});

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

app.listen(PORT, "0.0.0.0", () => {
  console.log("==========================================");
  console.log("B.Com AI Study Assistant Backend");
  console.log("==========================================");
  console.log(`Server running on port ${PORT}`);
  console.log(`Health: /health`);
  console.log(`Chat: POST /api/chat`);
  console.log("AI Provider: BazaarLink");
  console.log("Model: auto:free");
  console.log("==========================================");
});
