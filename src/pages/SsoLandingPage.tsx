import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * SSO-приймач (ADR-012, Етап 1). Оболонка studio веде сюди з ?token=<квиток>.
 * Тут: обмінюємо квиток на одноразовий OTP (Edge sso-exchange) і піднімаємо
 * сесію. Будь-яка помилка → звичайний вхід (фолбек), нічого не ламаємо.
 */
export default function SsoLandingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"working" | "error">("working");

  useEffect(() => {
    let active = true;
    (async () => {
      const token = params.get("token");
      const next = params.get("next") || "/ats";
      if (!token) { navigate("/v2/auth", { replace: true }); return; }
      try {
        const { data, error } = await supabase.functions.invoke("sso-exchange", { body: { token } });
        if (!active) return;
        const b = data as { token_hash?: string; verify_type?: string; error?: string } | null;
        if (error || !b?.token_hash) throw new Error(b?.error || "sso_failed");
        const { error: vErr } = await supabase.auth.verifyOtp({
          token_hash: b.token_hash,
          type: (b.verify_type as "email") || "email",
        });
        if (vErr) throw vErr;
        navigate(next, { replace: true });
      } catch {
        if (!active) return;
        // Фолбек: звичайний вхід у ATS.
        setState("error");
        setTimeout(() => navigate("/v2/auth", { replace: true }), 1500);
      }
    })();
    return () => { active = false; };
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20">
      <div className="text-center space-y-2">
        {state === "working" ? (
          <>
            <div className="h-6 w-6 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Вхід у Metaprofile…</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Не вдалося увійти автоматично — відкриваємо звичайний вхід…</p>
        )}
      </div>
    </div>
  );
}
