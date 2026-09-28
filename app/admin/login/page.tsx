"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import AdminIcon from "../AdminIcon";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("E-posta adresi zorunludur.");
      return;
    }

    if (!password) {
      setError("Şifre zorunludur.");
      return;
    }

    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        console.error(
          "Giriş hatası:",
          loginError
        );

        setError(
          "E-posta veya şifre hatalı."
        );

        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (loginError) {
      console.error(
        "Beklenmeyen giriş hatası:",
        loginError
      );

      setError(
        "Giriş sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
      );
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
          <h2>Restoranınız tek ekranda.</h2>
          <p>Siparişler, masalar, menü ve ödemeler; mutfaktan kasaya aynı panelde.</p>
        </div>
        <ul className="adm-auth-points">
          <li><AdminIcon name="orders" size={16} /> Masadan gelen siparişler anlık düşer</li>
          <li><AdminIcon name="qr" size={16} /> Her masa için QR ve NFC</li>
          <li><AdminIcon name="chart" size={16} /> Günlük ciro ve yorumlar</li>
        </ul>
      </aside>

      <section className="adm-auth-form">
        <form className="adm-auth-card" onSubmit={handleLogin} noValidate>
          <span className="adm-logo-mark" style={{ color: "var(--a-ink)" }}>
            <span>O</span>
            İşletme paneli
          </span>

          <h1>Giriş yapın</h1>
          <p>İşletmenize ait e-posta ve şifre ile devam edin.</p>

          <div className="adm-field">
            <label className="adm-label" htmlFor="giris-eposta">E-posta</label>
            <input
              id="giris-eposta"
              className="adm-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ornek@restoran.com"
              autoComplete="email"
              inputMode="email"
              required
            />
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor="giris-sifre">Şifre</label>
            <input
              id="giris-sifre"
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
