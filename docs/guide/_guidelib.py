# Спільна бібліотека для генерації гайдів (CSS + build()).
import base64, os
OUT_DIR = "/sessions/nice-funny-davinci/mnt/metaprofile/docs/guide"
SS = "/sessions/nice-funny-davinci/mnt/outputs"
def img(fn):
    with open(os.path.join(SS, fn), "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()
CSS = """
  @page { size: A4; margin: 18mm 16mm; @bottom-center { content: "MetaProfile · Посібник адміністратора · " counter(page); font-size:9px; color:#8a8f98; } }
  * { box-sizing:border-box; }
  body { font-family:"Segoe UI",Arial,sans-serif; color:#1f2430; line-height:1.55; font-size:12.5px; margin:0; }
  h1 { font-size:26px; color:#3b2fb0; margin:0 0 4px; }
  h2 { font-size:19px; color:#3b2fb0; margin:26px 0 6px; padding-top:8px; border-top:2px solid #eee; }
  h3 { font-size:15px; color:#f97316; margin:18px 0 4px; }
  p { margin:6px 0; } a { color:#4f46e5; }
  .cover { background:linear-gradient(135deg,#3b2fb0,#6d28d9); color:#fff; padding:34px 30px; border-radius:14px; margin-bottom:8px; }
  .cover h1 { color:#fff; font-size:30px; } .cover .sub { opacity:.9; font-size:14px; } .cover .meta { margin-top:14px; font-size:12px; opacity:.85; }
  .lead { font-size:13.5px; color:#333; background:#f6f5ff; border-left:4px solid #6d28d9; padding:10px 14px; border-radius:6px; }
  figure { margin:12px 0 6px; } figure img { width:100%; border:1px solid #d9dce3; border-radius:8px; box-shadow:0 1px 4px rgba(0,0,0,.06); }
  figcaption { font-size:11px; color:#6b7280; margin-top:5px; text-align:center; }
  .callout { background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:10px 14px; margin:10px 0; } .callout b { color:#c2410c; }
  .note { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:9px 13px; margin:10px 0; font-size:12px; }
  ul { margin:6px 0 6px 2px; padding-left:18px; } li { margin:3px 0; }
  .badge { display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; padding:2px 8px; border-radius:20px; vertical-align:middle; }
  .badge.dev { background:#fef3c7; color:#92400e; } .badge.live { background:#dcfce7; color:#166534; }
  .fieldbox { border:1px solid #e5e7eb; border-radius:10px; padding:4px 0; margin:8px 0; }
  .fieldbox .row { display:flex; gap:10px; padding:7px 14px; border-bottom:1px solid #f1f2f5; } .fieldbox .row:last-child { border-bottom:0; }
  .fieldbox .k { flex:0 0 210px; font-weight:600; color:#3b2fb0; } .fieldbox .v { flex:1; color:#374151; }
  .pb { page-break-before:always; }
  @media screen { body { max-width: 980px; margin: 0 auto; padding: 22px 30px; } }
"""
def build(slug, cover_title, cover_sub, body):
    html = f"""<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8">
<title>Посібник адміністратора — {cover_title}</title><style>{CSS}</style></head><body>
<div class="cover"><div class="sub">MetaProfile · Посібник адміністратора</div>
<h1>{cover_title}</h1><div class="sub">{cover_sub}</div>
<div class="meta">Версія 1.0 • Для власника/адміністратора платформи</div></div>
{body}
<p style="margin-top:24px;font-size:11px;color:#9aa0aa;border-top:1px solid #eee;padding-top:8px;">
MetaProfile · Посібник адміністратора · «{cover_title}» · v1.0</p>
</body></html>"""
    with open(os.path.join(OUT_DIR, slug+".html"), "w", encoding="utf-8") as f: f.write(html)
    from weasyprint import HTML as WHTML
    WHTML(string=html, base_url=OUT_DIR).write_pdf(os.path.join(OUT_DIR, slug+".pdf"))
    return f"{slug}.html + {slug}.pdf"
