import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/chat", async (req, res) => {
  const { message, messages } = req.body || {};

  let chatMessages;
  if (Array.isArray(messages) && messages.length > 0) {
    chatMessages = messages;
  } else if (typeof message === "string" && message.trim()) {
    chatMessages = [{ role: "user", content: message }];
  } else {
    return res.status(400).json({ error: "Provide either 'message' or 'messages'" });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
    });
    const reply = completion.choices?.[0]?.message?.content ?? "";
    return res.json({ reply });
  } catch (err) {
    console.error("OpenAI error:", err?.response?.data || err.message || err);
    return res.status(500).json({ error: "Failed to get completion" });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
