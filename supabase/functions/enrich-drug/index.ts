import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { drug_name } = await req.json();
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
            content: "You are a pharmacology expert. Return accurate drug information using medical terminology. When given a drug name or active ingredient, provide ALL known brand names for that drug."
          },
          {
            role: "user",
            content: `Provide information for the drug "${drug_name}". I need: all known brand names (as an array), the active ingredient (generic name), drug group/class, common indications/uses, and major contraindications.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_drug_info",
              description: "Return structured drug information with multiple brand names",
              parameters: {
                type: "object",
                properties: {
                  brand_names: {
                    type: "array",
                    items: { type: "string" },
                    description: "All known brand/trade names for this drug"
                  },
                  brand_name: { type: "string", description: "The most common brand/trade name" },
                  active_ingredient: { type: "string", description: "The generic/active ingredient name" },
                  drug_group: { type: "string", description: "Pharmacological class or drug group" },
                  indications: { type: "string", description: "Common indications/uses, comma-separated" },
                  contraindications: { type: "string", description: "Major contraindications, comma-separated" }
                },
                required: ["brand_names", "brand_name", "active_ingredient", "drug_group", "indications", "contraindications"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_drug_info" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const drugInfo = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(drugInfo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-drug error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
