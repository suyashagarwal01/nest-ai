import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// In-memory rate limiter: 28 RPM cap (under 30 RPM free limit)
const RPM_LIMIT = 28;
const requestTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
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
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY not configured" }),
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

    const userPrompt = `Categorize this webpage.

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

    const groqBody = JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a bookmark categorization assistant. Respond with only valid JSON, no markdown fences or explanation.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 256,
      response_format: { type: "json_object" },
    });

    // Retry once on transient server errors (NOT 429)
    let groqResponse: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      groqResponse = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: groqBody,
      });
      if (groqResponse.ok) break;
      const status = groqResponse.status;
      if (attempt === 0 && (status === 500 || status === 502 || status === 503)) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      break;
    }

    if (!groqResponse || !groqResponse.ok) {
      const errText = groqResponse ? await groqResponse.text() : "no response";
      const groqStatus = groqResponse?.status ?? 0;
      console.error(`Groq API error (${groqStatus}):`, errText);
      const responseStatus = groqStatus === 429 ? 429 : 502;
      return new Response(
        JSON.stringify({ error: `Groq API error (${groqStatus})`, detail: errText.slice(0, 200) }),
        {
          status: responseStatus,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const groqData = await groqResponse.json();
    const rawText = groqData?.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response (tolerate markdown fences just in case)
    const jsonStr = rawText
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    if (!jsonStr) {
      console.error("Empty response from Groq. Full response:", JSON.stringify(groqData).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Empty Groq response" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error("groq-tagger error:", msg);
    return new Response(
      JSON.stringify({ error: "Internal error", detail: msg }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
