import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  message: string;
  employee: {
    name: string;
    position: string;
    role: "manager" | "buddy" | "colleague";
    personality: string;
    communicationStyle: string;
  };
  company: {
    name: string;
    industry: string;
    culture: {
      values: string[];
      mission: string;
      atmosphere: string;
    };
  };
  context?: {
    currentTask?: string;
    currentMeeting?: string;
    completedTasks?: number;
    totalTasks?: number;
  };
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, employee, company, context, conversationHistory = [] }: ChatRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const roleDescriptions = {
      manager: "керівник стажера, відповідальний за розподіл задач, контроль виконання та загальний розвиток",
      buddy: "наставник-buddy стажера, неформальний помічник який допомагає адаптуватися та відповідає на всі питання",
      colleague: "колега стажера, який працює поруч і може поділитися досвідом та допомогти з технічними питаннями"
    };

    const contextInfo = context ? `
Поточний контекст:
${context.currentTask ? `- Стажер зараз працює над: ${context.currentTask}` : ""}
${context.currentMeeting ? `- Після зустрічі: ${context.currentMeeting}` : ""}
${context.completedTasks !== undefined ? `- Виконано ${context.completedTasks} з ${context.totalTasks} завдань` : ""}
` : "";

    const systemPrompt = `Ти ${employee.name}, ${employee.position} в компанії ${company.name} (${company.industry}).

Твоя роль: ${roleDescriptions[employee.role]}

Твоя особистість: ${employee.personality}
Стиль спілкування: ${employee.communicationStyle}

Корпоративна культура ${company.name}:
- Цінності: ${company.culture.values.join(", ")}
- Місія: ${company.culture.mission}
- Атмосфера: ${company.culture.atmosphere}

${contextInfo}

ПРАВИЛА:
1. Відповідай ТІЛЬКИ українською мовою
2. Відповідай коротко (2-4 речення), як у реальному робочому чаті
3. Використовуй свій стиль спілкування та особистість
4. Дотримуйся цінностей компанії у своїх відповідях
5. Якщо питання стосується роботи - давай конкретні поради
6. Будь природним, як справжній колега на роботі
7. Можеш використовувати емодзі помірно, якщо це відповідає твоєму стилю
8. Якщо це buddy - будь більш неформальним і підтримуючим
9. Якщо це manager - будь професійним але доброзичливим
10. Якщо це colleague - будь дружнім та готовим допомогти`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user", content: message }
    ];

    console.log(`Chat with ${employee.name} (${employee.role}) at ${company.name}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Перевищено ліміт запитів. Зачекайте хвилинку." }),
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
    const reply = data.choices?.[0]?.message?.content || "Вибачте, я не зміг відповісти. Спробуйте ще раз.";

    console.log(`Reply from ${employee.name}: ${reply.substring(0, 50)}...`);

    return new Response(
      JSON.stringify({ reply, employeeName: employee.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in chat-with-colleague:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
