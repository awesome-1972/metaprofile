import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_STRING_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_CONVERSATION_HISTORY = 50;
const VALID_ACTIONS = ["ask_question", "respond_to_answer", "evaluate_star", "generate_report"];

interface InterviewMessage {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
}

interface InterviewContext {
  interviewerName: string;
  interviewerRole: string;
  interviewerPersonality: string;
  companyName: string;
  positionTitle: string;
  currentQuestion: string;
  questionType: string;
  competencyTargeted: string;
  conversationHistory: InterviewMessage[];
  candidateAnswer?: string;
  isFollowUp?: boolean;
}

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

// Validate context object
function validateContext(ctx: unknown): InterviewContext {
  if (!ctx || typeof ctx !== "object") {
    throw new Error("Context is required");
  }

  const context = ctx as Record<string, unknown>;

  // Validate and limit conversation history
  let conversationHistory: InterviewMessage[] = [];
  if (Array.isArray(context.conversationHistory)) {
    conversationHistory = context.conversationHistory
      .slice(-MAX_CONVERSATION_HISTORY)
      .filter((msg): msg is InterviewMessage => 
        msg && typeof msg === "object" && 
        (msg.role === "interviewer" || msg.role === "candidate") && 
        typeof msg.content === "string"
      )
      .map(msg => ({
        role: msg.role,
        content: msg.content.substring(0, MAX_MESSAGE_LENGTH),
        timestamp: typeof msg.timestamp === "string" ? msg.timestamp : new Date().toISOString()
      }));
  }

  return {
    interviewerName: validateString(context.interviewerName || "Interviewer", MAX_STRING_LENGTH, "interviewerName"),
    interviewerRole: validateString(context.interviewerRole || "", MAX_STRING_LENGTH, "interviewerRole"),
    interviewerPersonality: validateString(context.interviewerPersonality || "", MAX_STRING_LENGTH, "interviewerPersonality"),
    companyName: validateString(context.companyName || "", MAX_STRING_LENGTH, "companyName"),
    positionTitle: validateString(context.positionTitle || "", MAX_STRING_LENGTH, "positionTitle"),
    currentQuestion: validateString(context.currentQuestion || "", MAX_MESSAGE_LENGTH, "currentQuestion"),
    questionType: validateString(context.questionType || "", MAX_STRING_LENGTH, "questionType"),
    competencyTargeted: validateString(context.competencyTargeted || "", MAX_STRING_LENGTH, "competencyTargeted"),
    conversationHistory,
    candidateAnswer: context.candidateAnswer ? validateString(context.candidateAnswer, MAX_MESSAGE_LENGTH, "candidateAnswer") : undefined,
    isFollowUp: Boolean(context.isFollowUp),
  };
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

    // Validate action
    const action = validateString(body.action, 50, "action");
    if (!VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate context
    let context: InterviewContext;
    try {
      context = validateContext(body.context);
    } catch (validationError) {
      return new Response(
        JSON.stringify({ error: validationError instanceof Error ? validationError.message : "Context validation failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "ask_question") {
      systemPrompt = `Ти ${context.interviewerName}, ${context.interviewerRole} в компанії ${context.companyName}.
Твоя особистість: ${context.interviewerPersonality}

Ти проводиш співбесіду на позицію: ${context.positionTitle}
Поточне питання для кандидата: ${context.currentQuestion}
Тип питання: ${context.questionType}
Компетенція, що перевіряється: ${context.competencyTargeted}

Задай це питання природно, можеш додати короткий контекст або вступ, якщо це доречно.
Говори українською. Будь професійним, але дружнім.
Відповідь має бути лише текстом питання інтерв'юера, без додаткових позначень.`;

      userPrompt = `Задай питання кандидату${context.isFollowUp ? " (це уточнююче питання)" : ""}.
${context.conversationHistory.length > 0 ? `\nПопередня розмова:\n${context.conversationHistory.map(m => `${m.role === 'interviewer' ? context.interviewerName : 'Кандидат'}: ${m.content}`).join('\n')}` : ''}`;
    } 
    else if (action === "respond_to_answer") {
      systemPrompt = `Ти ${context.interviewerName}, ${context.interviewerRole} в компанії ${context.companyName}.
Твоя особистість: ${context.interviewerPersonality}

Ти проводиш співбесіду на позицію: ${context.positionTitle}
Попереднє питання: ${context.currentQuestion}
Відповідь кандидата: ${context.candidateAnswer}

Відреагуй на відповідь кандидата:
1. Можеш задати уточнююче питання, якщо відповідь неповна
2. Можеш похвалити хорошу відповідь
3. Можеш перейти до наступного питання
4. Не розкривай свою оцінку відповіді

Говори українською. Будь професійним.
Відповідь має бути лише текстом інтерв'юера.`;

      userPrompt = `Відреагуй на відповідь кандидата.
Розмова досі:
${context.conversationHistory.map(m => `${m.role === 'interviewer' ? context.interviewerName : 'Кандидат'}: ${m.content}`).join('\n')}`;
    }
    else if (action === "evaluate_star") {
      systemPrompt = `Ти експерт з оцінки кандидатів за методологією STAR (Situation, Task, Action, Result).

Проаналізуй відповідь кандидата на поведінкове питання та оціни наявність кожного елемента STAR.

Відповідай JSON у форматі:
{
  "situationScore": 0-100,
  "situationFeedback": "короткий коментар",
  "taskScore": 0-100,
  "taskFeedback": "короткий коментар",
  "actionScore": 0-100,
  "actionFeedback": "короткий коментар",
  "resultScore": 0-100,
  "resultFeedback": "короткий коментар",
  "overallFeedback": "загальний коментар щодо якості відповіді",
  "competencyIndicators": ["виявлені індикатори компетенції"]
}`;

      userPrompt = `Питання: ${context.currentQuestion}
Компетенція: ${context.competencyTargeted}
Відповідь кандидата: ${context.candidateAnswer}

Оціни цю відповідь за STAR.`;
    }
    else if (action === "generate_report") {
      systemPrompt = `Ти експерт HR-аналітик. Створи детальний звіт за результатами співбесіди.

Відповідай JSON у форматі:
{
  "overallScore": 0-100,
  "recommendation": "strong_hire" | "hire" | "maybe" | "no_hire",
  "recommendationRationale": "детальне обґрунтування рекомендації",
  "strengths": ["сильні сторони кандидата"],
  "weaknesses": ["зони для розвитку"],
  "cultureFit": 0-100,
  "technicalFit": 0-100,
  "softSkillsFit": 0-100,
  "developmentSuggestions": ["рекомендації для розвитку"],
  "summary": "короткий підсумок співбесіди"
}`;

      userPrompt = `Позиція: ${context.positionTitle}
Компанія: ${context.companyName}

Розмова під час співбесіди:
${context.conversationHistory.map(m => `${m.role === 'interviewer' ? 'Інтерв\'юер' : 'Кандидат'}: ${m.content}`).join('\n')}

Створи детальний звіт.`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
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
      if (response.status === 402 || response.status === 529) {
        return new Response(
          JSON.stringify({ error: "Необхідно поповнити баланс." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error("Anthropic API error");
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // For evaluate and report actions, parse JSON
    if (action === "evaluate_star" || action === "generate_report") {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      try {
        const parsed = JSON.parse(jsonStr);
        return new Response(
          JSON.stringify({ result: parsed }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({ result: content }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ message: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in interview function:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
