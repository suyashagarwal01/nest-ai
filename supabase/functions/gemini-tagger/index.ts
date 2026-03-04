import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// In-memory rate limiter: 14 RPM cap (under 15 RPM free limit)
const RPM_LIMIT = 14;
const requestTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  // Remove old timestamps
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }
  return requestTimestamps.length >= RPM_LIMIT;
}

function recordRequest(): void {
  requestTimestamps.push(Date.now());
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_CATEGORIES = new Set([
  "Development", "Design", "News", "Articles", "Education", "Research",
  "Social", "Video", "Audio", "Shopping", "Finance", "Productivity",
  "Reference", "Lifestyle", "Entertainment", "Gaming", "Health",
  "Travel", "Government", "Other",
]);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  if (isRateLimited()) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }),
      {
        status: 429,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const { title, url, description, currentCategory, currentTopics } = body;

    if (!title && !url) {
      return new Response(
        JSON.stringify({ error: "title or url required" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const prompt = `You are a bookmark categorization assistant. Categorize this webpage.

URL: ${url || "N/A"}
Title: ${title || "N/A"}
${description ? `Description: ${description}` : ""}
${currentCategory && currentCategory !== "Other" ? `Current category (may be wrong): ${currentCategory}` : ""}
${currentTopics?.length ? `Current topics: ${currentTopics.join(", ")}` : ""}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "category": "one of: Development, Design, News, Articles, Education, Research, Social, Video, Audio, Shopping, Finance, Productivity, Reference, Lifestyle, Entertainment, Gaming, Health, Travel, Government, Other",
  "topics": ["3-5 short lowercase topic tags"],
  "confidence": 0.8
}`;

    recordRequest();

    const geminiResponse = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", errText);
      return new Response(
        JSON.stringify({ error: "Gemini API error" }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Parse JSON from response (tolerate markdown fences)
    const jsonStr = rawText
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);

    // Validate and sanitize
    const category = VALID_CATEGORIES.has(parsed.category)
      ? parsed.category
      : "Other";
    const topics = Array.isArray(parsed.topics)
      ? parsed.topics
          .filter((t: unknown) => typeof t === "string")
          .map((t: string) => t.toLowerCase().trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.8;

    return new Response(
      JSON.stringify({ category, topics, confidence }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("gemini-tagger error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
