import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_POSITION_LENGTH = 100;
const MAX_INDUSTRY_LENGTH = 100;
const MAX_LEVEL_LENGTH = 50;
const VALID_LEVELS = ["junior", "middle", "senior", "lead", "entry", "intern", "expert"];

// Validate and sanitize string input
function validateString(input: unknown, maxLength: number, fieldName: string): string {
  if (typeof input !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  const trimmed = input.trim();
  if (trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength);
  }
  return trimmed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!rawBody || typeof rawBody !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = rawBody as Record<string, unknown>;

    // Validate position (required)
    let position: string;
    try {
      position = validateString(body.position, MAX_POSITION_LENGTH, "position");
      if (position.length === 0) {
        return new Response(
          JSON.stringify({ error: "Position is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (validationError) {
      return new Response(
        JSON.stringify({ error: validationError instanceof Error ? validationError.message : "Position validation failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate optional fields
    const industry = body.industry ? validateString(body.industry, MAX_INDUSTRY_LENGTH, "industry") : "";
    const level = body.level ? validateString(body.level, MAX_LEVEL_LENGTH, "level") : "mid";

    // Validate level is reasonable
    const normalizedLevel = level.toLowerCase();
    if (level && !VALID_LEVELS.includes(normalizedLevel)) {
      console.log(`Custom level provided: ${level}`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating competency model for: ${position}, ${industry || 'general'}, ${level}`);

    const systemPrompt = `Ти експерт з HR та оцінки персоналу. Створюєш моделі компетенцій для різних позицій.
Відповідай ТІЛЬКИ валідним JSON без додаткового тексту.

Структура відповіді:
{
  "name": "Назва моделі українською",
  "description": "Опис моделі українською",
  "competencies": [
    {
      "name": "Назва компетенції",
      "description": "Опис компетенції",
      "category": "Технічні навички|Soft Skills|Лідерство|Комунікація|Аналітика|Управління",
      "weight": 1-10,
      "criteria": [
        {
          "level": 1,
          "description": "Опис початкового рівня",
          "indicators": ["індикатор 1", "індикатор 2"]
        },
        {
          "level": 2,
          "description": "Опис базового рівня",
          "indicators": ["індикатор 1", "індикатор 2"]
        },
        {
          "level": 3,
          "description": "Опис середнього рівня",
          "indicators": ["індикатор 1", "індикатор 2"]
        },
        {
          "level": 4,
          "description": "Опис просунутого рівня",
          "indicators": ["індикатор 1", "індикатор 2"]
        },
        {
          "level": 5,
          "description": "Опис експертного рівня",
          "indicators": ["індикатор 1", "індикатор 2"]
        }
      ]
    }
  ]
}

Створи 5-7 релевантних компетенцій з урахуванням специфіки позиції та галузі.`;

    const userPrompt = `Створи модель компетенцій для позиції: ${position}
${industry ? `Галузь: ${industry}` : ''}
${level ? `Рівень: ${level}` : 'Рівень: Middle'}

Врахуй специфіку позиції та створи збалансовану модель з технічними та soft skills.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Перевищено ліміт запитів. Спробуйте пізніше." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Необхідно поповнити баланс." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const model = JSON.parse(jsonStr);

    console.log(`Generated model with ${model.competencies?.length || 0} competencies`);

    return new Response(
      JSON.stringify(model),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating competency model:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
