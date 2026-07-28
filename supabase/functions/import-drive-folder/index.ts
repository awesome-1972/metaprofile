// supabase/functions/import-drive-folder/index.ts
//
// Metaprofile ATS — Edge Function: import-drive-folder.
//
// Реєструє у vacancy_files всі файли з переданої папки Google Drive за один
// виклик (замість ручного додавання по одному). Drive — сховище, Postgres —
// джерело правди (метадані + лінк). Дедуп за drive_file_id у межах вакансії.
//
// ── AUTH-КОНТРАКТ (дзеркалить fetch-meet-transcript/index.ts) ──────────────
//   • service_role client — RLS bypass ЛИШЕ всередині цієї функції (запис
//     vacancy_files, читання vacancies.tenant_id).
//   • Викликач верифікується через supabase.auth.getUser(jwt) — НІКОЛИ з body.
//   • Доступ на ЗАПИС — RPC mp_can_edit_vacancy(vacancy_id), мірор RLS
//     vacancy_files_insert. Read-only грант не імпортує файли.
//   • Drive API викликається з імперсонацією ВИКЛИКАЧА (domain-wide delegation):
//     папка має бути доступна саме тому, хто запускає імпорт (типово — файли
//     у спільному Workspace-домені metavision.ua).
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid, category: string, folder_url_or_id: string,
//          map_subfolders?: boolean (default true) }
//     folder_url_or_id — повний лінк виду
//       https://drive.google.com/drive/folders/<FOLDER_ID> (з ?usp=... тощо),
//       або сам <FOLDER_ID>.
//     map_subfolders — якщо true (типово), обхід РЕКУРСИВНИЙ углиб по підпапках,
//       і кожен файл лягає в категорію за назвою його підпапки
//       (Long List→long_list, CVs→cvs, Reports→reports…); нерозпізнані підпапки
//       і файли в корені → category (fallback). Якщо false — усі файли пласко
//       в передану category.
//     Дії:
//       1. mp_can_edit_vacancy(vacancy_id).
//       2. Витяг folderId; читання vacancies.tenant_id (для явного stamp).
//       3. getGoogleAccessToken(callerEmail, [drive.readonly]).
//       4. Рекурсивний обхід папки (BFS, пагінація) — файли з категорією за
//          назвою батьківської підпапки.
//       5. Дедуп проти наявних drive_file_id вакансії → insert нових.
//     200 { ok: true, added: number, skipped: number, total: number,
//           folders_scanned: number }
//
//   401 unauthorized · 403 forbidden · 404 vacancy_not_found ·
//   422 invalid_body|invalid_vacancy_id|invalid_folder|invalid_category ·
//   429 rate_limited · 502 google_error · 500 server_error
//
// Deploy:  supabase functions deploy import-drive-folder
// Secrets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY
//          (auto-provisioned); GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY;
//          ALLOWED_ORIGIN (опційно).
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
// drive.readonly — читання метаданих файлів у папці. Той самий scope уже на
// domain-wide delegation (див. _shared/google-auth.ts).
const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const FOLDER_MIME = "application/vnd.google-apps.folder";
const MAX_FILES = 2000; // запобіжник від нескінченного обходу
const MAX_FOLDERS = 200; // запобіжник рекурсії (кількість відвіданих папок)
const MAX_DEPTH = 6;

// Мапінг назви підпапки Drive → категорія vacancy_files. Дзеркалить
// FILE_CATEGORIES у src/hooks/ats/use-vacancy-files.ts (folder → key). Матч —
// за нормалізованою назвою (lowercase, trim), точний або за включенням аліасу.
const FOLDER_CATEGORY_ALIASES: Array<{ key: string; aliases: string[] }> = [
  { key: "long_list", aliases: ["long list", "longlist", "лонг-лист", "лонг лист"] },
  { key: "cvs", aliases: ["cvs", "cv", "резюме", "resume"] },
  { key: "competency_matrix", aliases: ["competency matrix", "матриця компетенцій", "матриця", "competencies"] },
  { key: "reports", aliases: ["reports", "report", "звіти", "звіт"] },
  { key: "presentation", aliases: ["presentation to client", "presentation", "презентація", "презентація клієнту"] },
  { key: "contracts", aliases: ["contracts", "contract", "договори", "договір"] },
  { key: "from_client", aliases: ["from client", "від клієнта"] },
  { key: "voice_to_text", aliases: ["voice-to-text", "voice to text", "транскрипти", "транскрипт", "transcripts"] },
];

/** Категорія за назвою підпапки; null — якщо не розпізнано (→ fallback). */
function categoryForFolderName(name: string | null): string | null {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  for (const { key, aliases } of FOLDER_CATEGORY_ALIASES) {
    if (aliases.some((a) => n === a || n.includes(a))) return key;
  }
  return null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

/** Витягує Drive folder ID з URL (/folders/<id>, ?id=<id>) або повертає голий ID. */
function extractFolderId(input: string): string | null {
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam) return idParam[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  return null;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
}
interface DriveListResponse {
  files?: DriveFile[];
  nextPageToken?: string;
  error?: { message?: string; status?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- 1. Верифікація JWT ---------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);
    if (!caller.email) {
      return json({ error: "server_error", detail: "caller has no email in auth.users" }, 500);
    }
    if (isRateLimited(caller.id)) return json({ error: "rate_limited" }, 429);

    // --- 2. Parse body ---------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }
    const vacancyId = body.vacancy_id;
    if (!isUuid(vacancyId)) return json({ error: "invalid_vacancy_id" }, 422);
    // Категорія за замовчуванням для файлів у корені / нерозпізнаних підпапках.
    // Не обовʼязкова: підпапки розкладаються по категоріях автоматично, тож
    // fallback типово 'other'.
    const fallbackCategory =
      typeof body.category === "string" && body.category.trim() ? body.category.trim() : "other";
    const folderInput = body.folder_url_or_id;
    if (typeof folderInput !== "string" || !folderInput.trim()) return json({ error: "invalid_folder" }, 422);
    const rootFolderId = extractFolderId(folderInput);
    if (!rootFolderId) return json({ error: "invalid_folder" }, 422);
    // map_subfolders типово true: провалюватись у підпапки й розкладати по
    // категоріях за їхніми назвами.
    const mapSubfolders = body.map_subfolders !== false;

    // --- 3. Guard: право редагувати вакансію -----------------------------
    const { data: canEdit, error: editErr } = await supabaseAuth.rpc("mp_can_edit_vacancy", {
      p_vacancy_id: vacancyId,
    });
    if (editErr) {
      console.error("import-drive-folder mp_can_edit_vacancy error:", editErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!canEdit) return json({ error: "forbidden" }, 403);

    // Вакансія + tenant_id (явний stamp при вставці service_role).
    const { data: vacancy, error: vacErr } = await supabase
      .from("vacancies")
      .select("id, tenant_id")
      .eq("id", vacancyId)
      .maybeSingle();
    if (vacErr) {
      console.error("import-drive-folder vacancy lookup error:", vacErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!vacancy) return json({ error: "vacancy_not_found" }, 404);
    const tenantId = (vacancy as unknown as { tenant_id: string | null }).tenant_id;

    // --- 4. Google Drive API: список файлів у папці ----------------------
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken(caller.email, DRIVE_SCOPES);
    } catch (err) {
      const detail = err instanceof GoogleAuthError ? err.message : (err as Error).message;
      console.error("import-drive-folder getGoogleAccessToken error:", detail);
      return json({ error: "google_error", detail }, 502);
    }

    // Кожен зібраний файл несе свою категорію (за назвою батьківської підпапки).
    const collected: Array<DriveFile & { category: string }> = [];
    // BFS-черга папок: root (без назви → fallback), далі підпапки з їхніми назвами.
    const queue: Array<{ id: string; name: string | null; depth: number }> = [
      { id: rootFolderId, name: null, depth: 0 },
    ];
    let foldersScanned = 0;
    let googleFail: { detail: string } | null = null;

    outer: while (queue.length > 0 && foldersScanned < MAX_FOLDERS && collected.length < MAX_FILES) {
      const current = queue.shift()!;
      foldersScanned += 1;
      // Категорія для файлів цієї папки: за назвою підпапки, інакше fallback.
      const folderCategory =
        (mapSubfolders ? categoryForFolderName(current.name) : null) ?? fallbackCategory;

      let pageToken: string | undefined = undefined;
      do {
        const params = new URLSearchParams({
          q: `'${current.id}' in parents and trashed = false`,
          fields: "nextPageToken, files(id, name, mimeType, webViewLink, size)",
          pageSize: "200",
          supportsAllDrives: "true",
          includeItemsFromAllDrives: "true",
          orderBy: "folder,name",
        });
        if (pageToken) params.set("pageToken", pageToken);

        let driveResp: Response;
        try {
          driveResp = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } catch (err) {
          console.error("import-drive-folder Drive fetch error:", (err as Error).message);
          googleFail = { detail: "Не вдалося звʼязатися з Google Drive API" };
          break outer;
        }

        let listResp: DriveListResponse;
        try {
          listResp = await driveResp.json();
        } catch {
          googleFail = { detail: `Drive API повернув невалідний JSON (HTTP ${driveResp.status})` };
          break outer;
        }
        if (!driveResp.ok) {
          let detail = listResp.error?.message || `HTTP ${driveResp.status}`;
          if (driveResp.status === 401 || driveResp.status === 403) {
            detail +=
              " — перевірте domain-wide delegation (scope drive.readonly) і що ви маєте доступ до цієї папки у Workspace.";
          }
          if (driveResp.status === 404) detail += " — папку не знайдено (перевірте посилання).";
          console.error("import-drive-folder Drive API error:", detail);
          googleFail = { detail };
          break outer;
        }

        for (const f of listResp.files ?? []) {
          if (f.mimeType === FOLDER_MIME) {
            // Підпапка → у чергу (лише якщо розкладаємо й не перевищено глибину).
            if (mapSubfolders && current.depth + 1 <= MAX_DEPTH) {
              queue.push({ id: f.id, name: f.name, depth: current.depth + 1 });
            }
            continue;
          }
          collected.push({ ...f, category: folderCategory });
          if (collected.length >= MAX_FILES) break;
        }
        pageToken = listResp.nextPageToken;
      } while (pageToken && collected.length < MAX_FILES);
    }

    if (googleFail) return json({ error: "google_error", detail: googleFail.detail }, 502);

    const total = collected.length;

    // --- 5. Дедуп проти наявних drive_file_id + insert нових -------------
    const { data: existing, error: existErr } = await supabase
      .from("vacancy_files")
      .select("drive_file_id")
      .eq("vacancy_id", vacancyId)
      .not("drive_file_id", "is", null);
    if (existErr) {
      console.error("import-drive-folder existing lookup error:", existErr.message);
      return json({ error: "server_error" }, 500);
    }
    const existingIds = new Set((existing ?? []).map((r) => r.drive_file_id as string));

    const rows = collected
      .filter((f) => !existingIds.has(f.id))
      .map((f) => ({
        vacancy_id: vacancyId,
        tenant_id: tenantId,
        category: f.category,
        name: f.name,
        drive_file_id: f.id,
        web_view_link: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
        mime_type: f.mimeType,
        size_bytes: f.size ? Number(f.size) : null,
        uploaded_by: caller.id,
      }));

    let added = 0;
    if (rows.length > 0) {
      const { error: insErr, count } = await supabase
        .from("vacancy_files")
        .insert(rows, { count: "exact" });
      if (insErr) {
        console.error("import-drive-folder insert error:", insErr.message);
        return json({ error: "server_error", detail: insErr.message }, 500);
      }
      added = count ?? rows.length;
    }

    return json({ ok: true, added, skipped: total - added, total, folders_scanned: foldersScanned });
  } catch (error) {
    console.error("import-drive-folder unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
