// supabase/functions/create-vacancy-folders/index.ts
//
// Metaprofile ATS — Фаза 3, крок 3 — Edge Function: create-vacancy-folders.
//
// Створює в Google Drive структуру папок під вакансію (ідемпотентно):
//   MetaVision ATS → <Клієнт> → <Проєкт> → <Вакансія> → 8 підпапок-категорій
//   (Long List, CVs, Competency Matrix, Reports, Presentation to Client,
//    Contracts, From Client, Voice-to-Text).
// Назви підпапок збігаються з мапінгом import-drive-folder, тож подальший
// імпорт коректно розкладає файли. ID/лінки зберігаються на вакансії
// (drive_folder_id / drive_folder_link / drive_folders). Повторний виклик —
// no-op (find-or-create за назвою+батьком).
//
// ── AUTH-КОНТРАКТ (мирор import-drive-folder) ──────────────────────────────
//   • verify_jwt=true; getUser(jwt); scope mp_can_edit_vacancy під JWT викликача.
//   • Drive API — імперсонація ВИКЛИКАЧА (domain-wide delegation, scope `drive`).
//   • Запис у vacancies — service_role.
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid }
//   200 { ok:true, vacancy_folder_id, vacancy_folder_link,
//         folders: { <category_key>: { id, link } } }
//   401/403/404/422/429/502(google_error)/500
//
// Deploy:  supabase functions deploy create-vacancy-folders
// Scopes:  domain-wide delegation має включати https://www.googleapis.com/auth/drive
// config:  verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getGoogleAccessToken, GoogleAuthError } from "../_shared/google-auth.ts";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];
const FOLDER_MIME = "application/vnd.google-apps.folder";
const ROOT_NAME = "MetaVision ATS";

// Підпапки-категорії (key ↔ назва папки). Дзеркалить FILE_CATEGORIES.folder і
// FOLDER_CATEGORY_ALIASES в import-drive-folder.
const CATEGORY_FOLDERS: Array<{ key: string; name: string }> = [
  { key: "long_list", name: "Long List" },
  { key: "cvs", name: "CVs" },
  { key: "competency_matrix", name: "Competency Matrix" },
  { key: "reports", name: "Reports" },
  { key: "presentation", name: "Presentation to Client" },
  { key: "contracts", name: "Contracts" },
  { key: "from_client", name: "From Client" },
  { key: "voice_to_text", name: "Voice-to-Text" },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now - b.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  b.count += 1;
  return b.count > RATE_LIMIT_MAX;
}

/** Екранує ' у назві для Drive query. */
function esc(name: string): string {
  return name.replace(/'/g, "\\'");
}

interface DriveFolder {
  id: string;
  webViewLink?: string;
}

/** Знаходить папку за назвою+батьком або створює нову. Ідемпотентно. */
async function findOrCreateFolder(token: string, name: string, parentId: string): Promise<DriveFolder> {
  const q = `name = '${esc(name)}' and '${parentId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`;
  const params = new URLSearchParams({
    q,
    fields: "files(id, webViewLink)",
    pageSize: "1",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const searchResp = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!searchResp.ok) {
    const t = await searchResp.text().catch(() => "");
    throw new DriveError(`пошук папки "${name}" HTTP ${searchResp.status}: ${t.slice(0, 200)}`, searchResp.status);
  }
  const found = (await searchResp.json()) as { files?: DriveFolder[] };
  if (found.files && found.files[0]) return found.files[0];

  const createResp = await fetch(
    `https://www.googleapis.com/drive/v3/files?fields=id,webViewLink&supportsAllDrives=true`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
    },
  );
  if (!createResp.ok) {
    const t = await createResp.text().catch(() => "");
    throw new DriveError(`створення папки "${name}" HTTP ${createResp.status}: ${t.slice(0, 200)}`, createResp.status);
  }
  return (await createResp.json()) as DriveFolder;
}

class DriveError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // --- 1. Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);
    if (!caller.email) return json({ error: "server_error", detail: "caller has no email" }, 500);
    if (isRateLimited(caller.id)) return json({ error: "rate_limited" }, 429);
    const asCaller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });

    // --- 2. Body + scope ---
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const vacancyId = body.vacancy_id;
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);

    const { data: canEdit, error: editErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
    if (editErr) { console.error("create-vacancy-folders scope error:", editErr.message); return json({ error: "server_error" }, 500); }
    if (!canEdit) return json({ error: "forbidden" }, 403);

    // --- 3. Вакансія → проєкт → клієнт (назви для папок) ---
    const { data: vacancy, error: vacErr } = await admin
      .from("vacancies")
      .select("id, title, hiring_project:hiring_projects(name, client:clients(name))")
      .eq("id", vacancyId)
      .maybeSingle();
    if (vacErr) { console.error("create-vacancy-folders vacancy error:", vacErr.message); return json({ error: "server_error" }, 500); }
    if (!vacancy) return json({ error: "vacancy_not_found" }, 404);

    const vac = vacancy as unknown as {
      title: string;
      hiring_project: { name: string; client: { name: string } | null } | null;
    };
    const clientName = vac.hiring_project?.client?.name || "Без клієнта";
    const projectName = vac.hiring_project?.name || "Без проєкту";
    const vacancyName = vac.title || "Вакансія";

    // --- 4. Drive: побудова ієрархії (ідемпотентно) ---
    let token: string;
    try {
      token = await getGoogleAccessToken(caller.email, DRIVE_SCOPES);
    } catch (err) {
      const detail = err instanceof GoogleAuthError ? err.message : (err as Error).message;
      console.error("create-vacancy-folders token error:", detail);
      return json({ error: "google_error", detail }, 502);
    }

    try {
      const root = await findOrCreateFolder(token, ROOT_NAME, "root");
      const clientFolder = await findOrCreateFolder(token, clientName, root.id);
      const projectFolder = await findOrCreateFolder(token, projectName, clientFolder.id);
      const vacancyFolder = await findOrCreateFolder(token, vacancyName, projectFolder.id);

      const folders: Record<string, { id: string; link: string }> = {
        _root: { id: root.id, link: root.webViewLink ?? "" },
        _client: { id: clientFolder.id, link: clientFolder.webViewLink ?? "" },
        _project: { id: projectFolder.id, link: projectFolder.webViewLink ?? "" },
      };
      for (const cat of CATEGORY_FOLDERS) {
        const f = await findOrCreateFolder(token, cat.name, vacancyFolder.id);
        folders[cat.key] = { id: f.id, link: f.webViewLink ?? `https://drive.google.com/drive/folders/${f.id}` };
      }

      const vacancyLink = vacancyFolder.webViewLink ?? `https://drive.google.com/drive/folders/${vacancyFolder.id}`;

      // --- 5. Зберегти на вакансії (service_role) ---
      const { error: updErr } = await admin
        .from("vacancies")
        .update({ drive_folder_id: vacancyFolder.id, drive_folder_link: vacancyLink, drive_folders: folders })
        .eq("id", vacancyId);
      if (updErr) { console.error("create-vacancy-folders update error:", updErr.message); return json({ error: "server_error", detail: updErr.message }, 500); }

      return json({
        ok: true,
        vacancy_folder_id: vacancyFolder.id,
        vacancy_folder_link: vacancyLink,
        folders,
      });
    } catch (err) {
      if (err instanceof DriveError) {
        let detail = err.message;
        if (err.status === 401 || err.status === 403) {
          detail += " — перевірте, що domain-wide delegation має scope https://www.googleapis.com/auth/drive.";
        }
        console.error("create-vacancy-folders drive error:", detail);
        return json({ error: "google_error", detail }, 502);
      }
      throw err;
    }
  } catch (error) {
    console.error("create-vacancy-folders unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
