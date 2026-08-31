// parse-resume-self — легкий парсер резюме для self-кабінету кандидата.
// Приймає текст резюме, повертає структуру для автозаповнення профілю.
// Без запису в БД і без ATS-звʼязку (на відміну від parse-resume). Anthropic, як решта AI-edge.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY missing" }, 503);
    const { resume_text } = await req.json();
    if (!resume_text || typeof resume_text !== "string" || resume_text.trim().length < 20)
      return json({ error: "resume_text required" }, 422);

    const system =
      "Ти витягуєш структуру з тексту резюме. Поверни ЛИШЕ валідний JSON без пояснень і без markdown, " +
      "формат: {\"full_name\":string, \"headline\":string, \"location\":string, \"phone\":string, " +
      "\"about\":string, \"skills\":string[]}. headline — посада/спеціалізація. about — короткий підсумок. " +
      "Мову зберігай як у резюме (українською де доречно). Якщо поля немає — порожній рядок або [].";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1500, system,
        messages: [{ role: "user", content: resume_text.slice(0, 20000) }],
      }),
    });
    if (!res.ok) return json({ error: `model ${res.status}: ${await res.text()}` }, 502);
    const data = await res.json();
    let txt: string = data?.content?.[0]?.text ?? "{}";
    txt = txt.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
    if (s >= 0 && e > s) txt = txt.slice(s, e + 1);
    const p = JSON.parse(txt);
    return json({
      full_name: typeof p.full_name === "string" ? p.full_name : "",
      headline: typeof p.headline === "string" ? p.headline : "",
      location: typeof p.location === "string" ? p.location : "",
      phone: typeof p.phone === "string" ? p.phone : "",
      about: typeof p.about === "string" ? p.about : "",
      skills: Array.isArray(p.skills) ? p.skills.filter((x: unknown) => typeof x === "string").slice(0, 40) : [],
    });
  } catch (err) {
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
});
