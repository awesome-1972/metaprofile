import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_STRING_LENGTH = 100;
const VALID_LEVELS = ["Junior", "Middle", "Senior", "Lead", "Entry", "Intern"];

// Validate and sanitize string input
function validateString(input: unknown, maxLength: number, fieldName: string): string {
  if (typeof input !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
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

    // Validate inputs
    let role: string;
    let level: string;
    let area: string;

    try {
      role = validateString(body.role, MAX_STRING_LENGTH, "role");
      level = validateString(body.level, MAX_STRING_LENGTH, "level");
      area = validateString(body.area, MAX_STRING_LENGTH, "area");
    } catch (validationError) {
      return new Response(
        JSON.stringify({ error: validationError instanceof Error ? validationError.message : "Validation failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate level is one of expected values (case-insensitive)
    const normalizedLevel = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
    if (!VALID_LEVELS.includes(normalizedLevel)) {
      // Allow custom levels but log them
      console.log(`Custom level provided: ${level}`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Ти експерт з кар'єрного розвитку та освіти в Україні. Твоя задача - рекомендувати реальні онлайн-курси для професійного розвитку.

Формат відповіді - строго JSON масив курсів без додаткового тексту:
[
  {
    "title": "Назва курсу українською",
    "platform": "Coursera/Udemy/LinkedIn Learning/Prometheus/інша платформа",
    "duration": "X тижнів",
    "type": "Тип курсу (Базовий/Просунутий/Практика/Soft skills/Менеджмент/Лідерство)",
    "url": "https://посилання-на-курс",
    "rating": 4.5,
    "students": "10K+"
  }
]

Правила:
1. Рекомендуй 3-4 курси
2. Курси мають бути реальними та актуальними
3. Включай курси з різних платформ
4. Враховуй рівень кар'єри (Junior/Middle/Senior/Lead)
5. Додавай курси українських платформ (Prometheus, Projector) де можливо
6. Курси мають логічно готувати до наступного кар'єрного рівня`;

    const userPrompt = `Рекомендуй курси для:
- Професія: ${role}
- Поточний рівень: ${level}
- Сфера: ${area}

Курси мають допомогти перейти на наступний кар'єрний рівень.`;

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
          JSON.stringify({ error: "Перевищено ліміт запитів, спробуйте пізніше." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Потрібне поповнення балансу." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Extract JSON from response
    let courses = [];
    try {
      // Try to parse the content directly or extract JSON from markdown code block
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        courses = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse courses:", parseError);
      courses = [];
    }

    return new Response(
      JSON.stringify({ courses }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in recommend-courses:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
