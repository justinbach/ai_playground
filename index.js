import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";

dotenv.config();

const app = express();

// CORS allowlist from env (comma-separated). Example: https://yourapp.com,https://www.yourapp.com
const allowlist = (process.env.ORIGIN_ALLOWLIST || "http://localhost:5173,http://localhost:3000").split(",").map(s => s.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests with no origin (curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowlist.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["POST"],
  })
);

// Security headers
app.use(helmet());

// Parse JSON with a small limit to prevent abuse
app.use(express.json({ limit: "10kb" }));

// Basic IP rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Optional server-side API key check (set SERVER_API_KEY to enable)
app.use((req, res, next) => {
  const serverKey = process.env.SERVER_API_KEY;
  if (!serverKey) return next();
  const auth = req.get("authorization") || req.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== serverKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

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
