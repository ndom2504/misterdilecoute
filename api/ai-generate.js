/**
 * Vercel Serverless Function
 * POST /api/ai-generate
 * Body: { prompt: string, type?: string, category?: string, sujet?: string }
 * Env: OPENAI_API_KEY (required), OPENAI_MODEL (optional), ALLOWED_ORIGINS (optional)
 */

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function setCors(req, res) {
  const origin = req.headers.origin;
  const allowed = parseAllowedOrigins();

  if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (!allowed.length || allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    // Origin non autorisée: on ne renvoie pas d'entête permissive.
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function safeJsonParse(maybeString) {
  if (maybeString == null) return null;
  if (typeof maybeString === "object") return maybeString;
  try {
    return JSON.parse(maybeString);
  } catch {
    return null;
  }
}

function extractJsonObject(text) {
  const match = String(text || "").match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      endpoint: "/api/ai-generate",
      usage: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          prompt: "string (required)",
          type: "audio|ecrit|video (optional)",
          category: "string (optional)",
          sujet: "string (optional)",
        },
      },
      note:
        "Ouvrir cette URL dans un navigateur fait un GET. Pour générer, envoyez un POST JSON (c'est ce que fait l'admin).",
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed", allowed: ["GET", "POST", "OPTIONS"] });
    return;
  }

  const body = safeJsonParse(req.body) || {};
  const prompt = body.prompt;
  const type = body.type || "";
  const category = body.category || "";

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
    return;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Tu es un assistant qui répond STRICTEMENT en JSON quand on te le demande. Pas de markdown.",
          },
          {
            role: "user",
            content:
              `${prompt}\n\n(Contexte: type=${type || ""}, categorie=${category || ""})`,
          },
        ],
        temperature: 0.7,
        max_tokens: 220,
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const msg = data?.error?.message || data?.message || `Upstream HTTP ${upstream.status}`;
      res.status(502).json({ error: msg });
      return;
    }

    const text = data?.choices?.[0]?.message?.content || "";
    const obj = extractJsonObject(text);

    if (!obj || (typeof obj !== "object")) {
      res.status(502).json({ error: "Invalid AI response format" });
      return;
    }

    res.status(200).json({
      titre: obj.titre || "",
      description: obj.description || "",
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
};
