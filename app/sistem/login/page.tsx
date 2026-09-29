"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import AdminIcon from "../../admin/AdminIcon";

export default function SystemLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("E-posta ve şifre zorunludur.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: loginError,
      } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (loginError || !user) {
        setError("E-posta veya şifre hatalı.");
        return;
      }

      // Yalnızca sistem sahibi hesapları bu panele girebilir.
      const { data: systemAdmin, error: systemAdminError } = await supabase
        .from("system_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (systemAdminError || !systemAdmin) {
        await supabase.auth.signOut();
        setError("Bu hesap sistem sahibi hesabı değil. Restoran yöneticileri /admin adresinden girer.");
        return;
      }

      router.replace("/sistem");
      router.refresh();
    } catch (loginError) {
      console.error("Sistem girişi hatası:", loginError);
      setError("Giriş sırasında beklenmeyen bir hata oluştu. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="adm-auth">
      <aside className="adm-auth-art" aria-hidden="true">
        <span className="adm-logo-mark">
          <span>O</span>
          OZT DIGITAL
        </span>
        <div>
          <h2>Tüm restoranlar tek panelde.</h2>
          <p>İşletmeleri açın, paketleri yönetin, yönetici hesaplarını tek yerden kontrol edin.</p>
        </div>
        <ul className="adm-auth-points">
          <li><AdminIcon name="store" size={16} /> Premium ve sadece menü restoranları</li>
          <li><AdminIcon name="card" size={16} /> Abonelik ve paket takibi</li>
          <li><AdminIcon name="lock" size={16} /> Yönetici giriş bilgileri</li>
        </ul>
      </aside>

      <section className="adm-auth-form">
        <form className="adm-auth-card" onSubmit={handleLogin} noValidate>
          <span className="adm-logo-mark" style={{ color: "var(--a-ink)" }}>
            <span>O</span>
            Sistem paneli
          </span>

          <h1>Sistem sahibi girişi</h1>
          <p>Bu alan yalnızca sistem yöneticisine özeldir.</p>

          <div className="adm-field">
            <label className="adm-label" htmlFor="sistem-eposta">E-posta</label>
            <input
              id="sistem-eposta"
              className="adm-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ornek@oztdigital.com.tr"
              autoComplete="email"
              inputMode="email"
              required
            />
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor="sistem-sifre">Şifre</label>
            <input
              id="sistem-sifre"
              className="adm-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Şifreniz"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="adm-alert adm-alert-error" role="alert" style={{ margin: 0 }}>
              <AdminIcon name="alert" size={16} />
              {error}
            </p>
          )}

          <button type="submit" className="adm-btn adm-btn-primary adm-btn-lg adm-btn-block" disabled={loading}>
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
            {!loading && <AdminIcon name="arrowRight" size={17} />}
          </button>
        </form>
      </section>
    </main>
  );
}
