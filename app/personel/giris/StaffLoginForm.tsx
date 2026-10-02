"use client";

import { useState, type FormEvent } from "react";
import AdminIcon from "../../admin/AdminIcon";
import { createClient } from "../../../lib/supabase/client";

export default function StaffLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");

    if (!email.trim() || !password) {
      setError("E-posta ve şifrenizi girin.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("E-posta ya da şifre hatalı.");
        return;
      }

      // Hesabın garson / mutfak hesabı olduğu sunucuda doğrulanır.
      const response = await fetch("/api/personel/pano", { cache: "no-store" });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string; message?: string } | null;

      if (result?.ok) {
        window.location.assign("/personel");
        return;
      }

      // İşletme yöneticisi bu sayfadan girerse kendi paneline gider.
      if (result?.reason === "not-staff") {
        window.location.assign("/admin");
        return;
      }

      await supabase.auth.signOut();
      setError(result?.message || "Giriş yapılamadı.");
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="adm-auth stf-auth">
      <section className="adm-auth-form">
        <form className="adm-auth-card" onSubmit={handleLogin} noValidate>
          <span className="adm-logo-mark" style={{ color: "var(--a-ink)" }}>
            <span>O</span>
            Garson ve mutfak
          </span>

          <h1>Personel girişi</h1>
          <p>Yöneticinizin size verdiği e-posta ve şifreyle giriş yapın.</p>

          <div className="adm-field">
            <label className="adm-label" htmlFor="personel-eposta">E-posta</label>
            <input
              id="personel-eposta"
              className="adm-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              inputMode="email"
              required
            />
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor="personel-sifre">Şifre</label>
            <input
              id="personel-sifre"
              className="adm-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
