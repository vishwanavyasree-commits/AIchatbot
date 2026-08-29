import express from "express";
import cors from "cors";

const app = express();

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.BAZAARLINK_API_KEY;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ============================================================
// B.COM AI SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `
You are a friendly, patient, and intelligent AI study assistant
specially designed for B.Com and B.Com CA college students.

Your purpose is to help students understand Commerce subjects in
simple, clear, student-friendly language.

You can help with:

- B.Com
- B.Com CA
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
- General Commerce subjects

============================================================
LANGUAGE RULE
============================================================

Always answer in the language requested by the student.

If the student asks in English, answer in English.

If the student asks in Tamil, answer in Tamil.

If the student asks in Telugu, answer in Telugu.

If the student asks in Kannada, answer in Kannada.

If the student asks in Hindi, answer in Hindi.

If the student asks in Malayalam, answer in Malayalam.

If the student specifically requests a language, always follow it.

For example:

"Explain this in Tamil"
-> Give the complete answer in Tamil.

"Explain this in Kannada"
-> Give the complete answer in Kannada.

"Translate this to Telugu"
-> Give the answer in Telugu.

The user may also use mixed languages.
Understand the meaning and respond appropriately.

============================================================
PERSONALITY
============================================================

Be:

- Friendly
- Patient
- Encouraging
- Simple
- Clear
- Helpful
- Student-friendly

Imagine that you are personally helping a B.Com college student
who is studying a topic for the first time.

Do not make explanations unnecessarily complicated.

Avoid unnecessary technical terminology.

============================================================
CONTEXT-FIRST BEHAVIOR
============================================================

Always pay close attention to the content provided by the student.

If the student gives a large paragraph and asks:

"Explain this"

Explain the meaning of that paragraph in simple language.

If the student asks:

"Short this paragraph"

Make the paragraph shorter while preserving its important meaning.

If the student asks:

"What is this paragraph trying to say?"

Explain the main idea in very simple language.

If the student asks:

"Give important points"

Extract the important points.

If the student asks:

"Make this easy to study"

Convert the provided content into simple study notes.

If the student asks:

"Give keywords"

Extract important academic keywords.

If the student asks:

"Explain with an example"

Give a simple example related to the topic.

Do not unnecessarily add unrelated information.

Do not change the meaning of the student's provided content.

============================================================
SUMMARY RULE
============================================================

When summarizing a paragraph:

- Preserve the original meaning.
- Keep important concepts.
- Keep important facts.
- Keep important definitions.
- Keep important keywords.
- Remove unnecessary words.
- Make it easy to study.
- Do not invent information.

============================================================
EXPLANATION RULE
============================================================

When explaining difficult content:

1. Give the main idea.
2. Explain it in simple language.
3. Explain difficult terms.
4. Give a simple example when useful.
5. Give important points.

Do not simply repeat the student's paragraph.

============================================================
EXAM MODE
============================================================

If the student asks for a 2-mark answer:

Give a short and direct answer containing the key definition
or important point.

If the student asks for a 5-mark answer:

Give:

Definition or introduction
Important points
Simple explanation
Example when useful

If the student asks for a 10-mark answer:

Give:

Introduction
Detailed explanation
Important points
Examples when useful
Conclusion when appropriate

Make exam answers easy for B.Com students to understand,
learn, and remember.

============================================================
ACCOUNTING AND NUMERICAL QUESTIONS
============================================================

For Accounting, Finance, Taxation, Statistics, Mathematics,
or other numerical questions:

- Identify the given information.
- Mention the formula when required.
- Show calculations step by step.
- Explain each calculation.
- Clearly show the final answer.
- Do not skip important calculation steps.

============================================================
ECONOMICS QUESTIONS
============================================================

For Economics questions:

- Explain the concept in simple language.
- Explain cause and effect.
- Give practical examples when useful.
- Connect concepts with business or everyday life when appropriate.

============================================================
DEFINITIONS
============================================================

When the student asks for a definition:

Start with a simple definition.

Then provide an explanation if useful.

Example:

Definition:
Inflation is a continuous increase in the general price level
of goods and services.

Simple meaning:
Prices increase and the purchasing power of money decreases.

============================================================
DO NOT HALLUCINATE
============================================================

Do not invent facts.

Do not invent statistics.

Do not invent laws.

Do not invent accounting rules.

Do not invent citations.

If the information provided by the student is insufficient,
clearly explain what information is missing.

When explaining a supplied paragraph, remain faithful to the
information in that paragraph.

============================================================
CONVERSATION CONTEXT
============================================================

Use previous conversation messages when they are relevant.

For example:

Student:
What is inflation?

Assistant:
Inflation is...

Student:
Give me an example.

Use the previous topic and give an example of inflation.

If the student asks:

"Make your previous answer shorter"

Shorten the previous answer.

If the student asks:

"Explain the second point"

Look at the previous answer and explain the second point.

============================================================
OUTPUT FORMAT
============================================================

Return clean plain text.

DO NOT use Markdown formatting.

DO NOT use:

**
*
#
##
###
`
// ============================================================
// MARKDOWN CLEANER
// ============================================================

function cleanAIResponse(text) {
    if (!text || typeof text !== "string") {
        return "";
    }

    let result = text;

    // Remove code blocks
    result = result.replace(/```[\s\S]*?```/g, "");

    // Remove bold and italic Markdown
    result = result.replace(/\*\*\*(.*?)\*\*\*/gs, "$1");
    result = result.replace(/\*\*(.*?)\*\*/gs, "$1");
    result = result.replace(/\*(.*?)\*/gs, "$1");

    // Remove heading symbols
    result = result.replace(/^#{1,6}\s*/gm, "");

    // Remove inline code formatting
    result = result.replace(/`([^`]+)`/g, "$1");

    // Convert Markdown links to normal text
    result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // Remove horizontal rules
    result = result.replace(/^[-*_]{3,}\s*$/gm, "");

    // Remove unnecessary spaces
    result = result.replace(/[ \t]+$/gm, "");

    // Remove excessive blank lines
    result = result.replace(/\n{3,}/g, "\n\n");

    return result.trim();
}


// ============================================================
// EXTRACT AI ANSWER
// ============================================================

function extractAIAnswer(data) {
    if (!data) {
        return "";
    }

    // Standard OpenAI-compatible response
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content === "string" && content.trim()) {
        return content;
    }

    // If content is an array
    if (Array.isArray(content)) {
        const text = content
            .map((item) => {
                if (typeof item === "string") {
                    return item;
                }

                if (item && typeof item.text === "string") {
                    return item.text;
                }

                return "";
            })
            .join("");

        if (text.trim()) {
            return text;
        }
    }

    // Alternative output_text format
    if (
        typeof data?.output_text === "string" &&
        data.output_text.trim()
    ) {
        return data.output_text;
    }

    // Alternative output format
    if (Array.isArray(data?.output)) {
        const text = data.output
            .flatMap((item) => item?.content || [])
            .map((item) => item?.text || "")
            .join("");

        if (text.trim()) {
            return text;
        }
    }

    return "";
}


// ============================================================
// HOME ROUTE
// ============================================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "B.Com AI Chatbot Backend is running!",
        status: "online",
        endpoints: {
            health: "GET /health",
            chat: "POST /api/chat"
        }
    });
});


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString()
    });
});


// ============================================================
// AI CHAT ROUTE
// ============================================================

app.post("/api/chat", async (req, res) => {

    try {

        // --------------------------------------------------------
        // CHECK API KEY
        // --------------------------------------------------------

        if (!API_KEY) {

            console.error(
                "BAZAARLINK_API_KEY is missing."
            );

            return res.status(500).json({
                success: false,
                error: "BAZAARLINK_API_KEY is not configured on Render."
            });
        }


        // --------------------------------------------------------
        // GET MESSAGES
        // --------------------------------------------------------

        const { messages } = req.body;


        // --------------------------------------------------------
        // VALIDATE MESSAGES
        // --------------------------------------------------------

        if (!Array.isArray(messages)) {

            return res.status(400).json({
                success: false,
                error: "messages must be an array."
            });
        }


        if (messages.length === 0) {

            return res.status(400).json({
                success: false,
                error: "At least one message is required."
            });
        }


        // --------------------------------------------------------
        // CLEAN MESSAGES
        // --------------------------------------------------------

        const cleanMessages = messages
            .filter((message) => {

                return (
                    message &&
                    (
                        message.role === "user" ||
                        message.role === "assistant"
                    ) &&
                    typeof message.content === "string" &&
                    message.content.trim().length > 0
                );

            })
            .slice(-20)
            .map((message) => {

                return {
                    role: message.role,
                    content: message.content.trim()
                };

            });


        if (cleanMessages.length === 0) {

            return res.status(400).json({
                success: false,
                error: "No valid messages were provided."
            });
        }


        // --------------------------------------------------------
        // CALL BAZAARLINK
        // --------------------------------------------------------

        const bazaarResponse = await fetch(
            "https://api.bazaarlink.ai/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`,

                    // Do not automatically use paid fallback
                    "X-Free-Fallback": "false"
                },

                body: JSON.stringify({

                    // Free routing
                    model: "auto:free",

                    messages: [

                        {
                            role: "system",
                            content: SYSTEM_PROMPT
                        },

                        ...cleanMessages

                    ],

                    temperature: 0.2,

                    max_tokens: 1500,

                    // Keep responses simple
                    enable_thinking: false,

                    stream: false

                })
            }
        );


        // --------------------------------------------------------
        // READ RAW RESPONSE
        // --------------------------------------------------------

        const rawResponse = await bazaarResponse.text();


        console.log(
            "BazaarLink Status:",
            bazaarResponse.status
        );


        console.log(
            "BazaarLink Response:",
            rawResponse
        );


        // --------------------------------------------------------
        // PARSE JSON
        // --------------------------------------------------------

        let data;

        try {

            data = JSON.parse(rawResponse);

        } catch (parseError) {

            console.error(
                "BazaarLink returned invalid JSON."
            );

            return res.status(502).json({
                success: false,
                error: "AI service returned an invalid response."
            });
        }


        // --------------------------------------------------------
        // HANDLE BAZAARLINK ERROR
        // --------------------------------------------------------

        if (!bazaarResponse.ok) {

            console.error(
                "BazaarLink API Error:",
                JSON.stringify(data, null, 2)
            );


            let errorMessage =
                "AI service request failed.";


            if (data?.error?.message) {

                errorMessage =
                    data.error.message;

            } else if (typeof data?.error === "string") {

                errorMessage =
                    data.error;
            }


            return res.status(
                bazaarResponse.status
            ).json({

                success: false,

                error: errorMessage

            });
        }


        // --------------------------------------------------------
        // EXTRACT ANSWER
        // --------------------------------------------------------

        let answer =
            extractAIAnswer(data);


        // --------------------------------------------------------
        // CHECK ANSWER
        // --------------------------------------------------------

        if (
            typeof answer !== "string" ||
            answer.trim().length === 0
        ) {

            console.error(
                "No readable AI answer found."
            );

            console.error(
                "Complete BazaarLink response:",
                JSON.stringify(data, null, 2)
            );


            return res.status(502).json({
                success: false,
                error:
                    "The AI service did not return readable text."
            });
        }


        // --------------------------------------------------------
        // CLEAN MARKDOWN
        // --------------------------------------------------------

        answer =
            cleanAIResponse(answer);


        // --------------------------------------------------------
        // SEND RESPONSE
        // --------------------------------------------------------

        return res.status(200).json({

            success: true,

            answer: answer

        });

    }

    catch (error) {

        console.error(
            "Server Error:",
            error
        );


        return res.status(500).json({

            success: false,

            error:
                "Unable to connect to the AI service. Please try again."

        });

    }

});


// ============================================================
// 404 ROUTE
// ============================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        error: "Route not found."

    });

});


// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "============================================"
        );

        console.log(
            "B.Com AI Chatbot Backend"
        );

        console.log(
            "============================================"
        );

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            "Home: /"
        );

        console.log(
            "Health: /health"
        );

        console.log(
            "Chat: POST /api/chat"
        );

        console.log(
            "AI Provider: BazaarLink"
        );

        console.log(
            "Model: auto:free"
        );

        console.log(
            "============================================"
        );

    }
);
