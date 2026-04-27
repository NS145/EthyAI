import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a misinformation detection AI. Analyze the given text for indicators of misinformation.

Return a JSON response using the tool provided with:
- score: 0-100 truth probability (100 = fully authentic, 0 = definite misinformation)
- summary: Brief explanation of your assessment
- indicators: Array of objects with { text: string (word or phrase), weight: number (-1 to 1, positive = suspicious, negative = trustworthy) }
- features: Array of objects with { name: string, value: number (-1 to 1) } for these categories: Sensationalism, Source credibility, Factual consistency, Emotional language, Citation density, Temporal accuracy
- verdict: "authentic" | "suspicious" | "misinformation"
- evidence: Array of 3-5 objects with { title: string (descriptive title of the real article or fact-check), source: string (organization name), url: string (REAL working URL to a specific relevant article, fact-check, or news report — use actual known URLs from Reuters, AP News, BBC, Snopes, PolitiFact, FactCheck.org, etc. that would cover this topic), similarity: number (0-1 relevance score), verdict: "supports" | "contradicts" | "neutral" }

IMPORTANT for evidence: Return REAL, relevant URLs to actual news articles, fact-checks, or reports that are directly related to the claims in the text. Construct Google News search URLs if you cannot identify specific articles: use format https://news.google.com/search?q=ENCODED_QUERY. Every URL must be relevant to the specific content being analyzed.

Consider: sensationalist language, unverified claims, emotional manipulation, logical fallacies, lack of sources, clickbait patterns.`,
          },
          { role: "user", content: text },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_misinformation",
              description: "Return structured misinformation analysis results",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "Truth probability 0-100" },
                  summary: { type: "string" },
                  verdict: { type: "string", enum: ["authentic", "suspicious", "misinformation"] },
                  indicators: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        weight: { type: "number" },
                      },
                      required: ["text", "weight"],
                    },
                  },
                  features: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        value: { type: "number" },
                      },
                      required: ["name", "value"],
                    },
                  },
                  evidence: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        source: { type: "string" },
                        url: { type: "string" },
                        similarity: { type: "number" },
                        verdict: { type: "string", enum: ["supports", "contradicts", "neutral"] },
                      },
                      required: ["title", "source", "url", "similarity", "verdict"],
                    },
                  },
                },
                required: ["score", "summary", "verdict", "indicators", "features", "evidence"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_misinformation" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-text error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
