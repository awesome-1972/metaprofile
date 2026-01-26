import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, action } = await req.json() as { 
      context: InterviewContext; 
      action: "ask_question" | "respond_to_answer" | "evaluate_star" | "generate_report";
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
