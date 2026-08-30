"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

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
    <main
      className="login-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        boxSizing: "border-box",
        background:
          "linear-gradient(135deg, #f7f4ee 0%, #eee9df 100%)",
      }}
    >
      <section
        className="login-card"
        style={{
          width: "100%",
          maxWidth: "430px",
          boxSizing: "border-box",
          padding: "32px 28px",
          borderRadius: "22px",
          background: "#fff",
          border: "1px solid #e7e0d5",
          boxShadow:
            "0 20px 55px rgba(0,0,0,.08)",
        }}
      >
        {/* =================================================
            LOGO
        ================================================= */}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <div
            className="logo"
            style={{
              width: "58px",
              height: "58px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px",
              background: "#111",
              color: "#d49a16",
              fontSize: "20px",
              fontWeight: 900,
              letterSpacing: "1px",
              boxShadow:
                "0 10px 25px rgba(0,0,0,.12)",
            }}
          >
            OZT
          </div>
        </div>

        {/* =================================================
            BAŞLIK
        ================================================= */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              marginBottom: "7px",
              color: "#c58d08",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "1.8px",
            }}
          >
            OZT DIGITAL MENU
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "25px",
              lineHeight: 1.2,
              color: "#171717",
            }}
          >
            İşletme Girişi
          </h1>

          <p
            style={{
              margin:
                "9px 0 0",
              color: "#777",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            Yönetim panelinize güvenli şekilde
            giriş yapın.
          </p>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form onSubmit={handleLogin}>
          <label
            htmlFor="email"
            style={{
              display: "block",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#292929",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              E-posta
            </span>

            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ornek@mail.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              disabled={loading}
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                border:
                  "1px solid #d9d4cc",
                borderRadius: "10px",
                background:
                  loading
                    ? "#f5f5f5"
                    : "#fff",
                color: "#171717",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </label>

          <label
            htmlFor="password"
            style={{
              display: "block",
              marginBottom: "18px",
            }}
          >
            <span
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#292929",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              Şifre
            </span>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Şifreniz"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              disabled={loading}
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                border:
                  "1px solid #d9d4cc",
                borderRadius: "10px",
                background:
                  loading
                    ? "#f5f5f5"
                    : "#fff",
                color: "#171717",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </label>

          {/* =================================================
              HATA
          ================================================= */}

          {error && (
            <div
              role="alert"
              style={{
                marginBottom: "17px",
                padding:
                  "12px 14px",
                borderRadius: "10px",
                background: "#fff0f0",
                border:
                  "1px solid #efb1b1",
                color: "#b42318",
                fontSize: "12px",
                fontWeight: 700,
                lineHeight: 1.5,
              }}
            >
              ❌ {error}
            </div>
          )}

          {/* =================================================
              GİRİŞ BUTONU
          ================================================= */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              minHeight: "47px",
              border: "none",
              borderRadius: "11px",
              background: loading
                ? "#999"
                : "#d49a16",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 900,
              cursor: loading
                ? "not-allowed"
                : "pointer",
              boxShadow:
                "0 9px 22px rgba(212,154,22,.20)",
            }}
          >
            {loading
              ? "Giriş yapılıyor..."
              : "Giriş Yap"}
          </button>
        </form>

        {/* =================================================
            ALT BİLGİ
        ================================================= */}

        <div
          style={{
            marginTop: "22px",
            paddingTop: "17px",
            borderTop:
              "1px solid #eee9e1",
            textAlign: "center",
            color: "#999",
            fontSize: "10px",
            lineHeight: 1.5,
          }}
        >
          OZT Digital Menu • İşletme Yönetim
          Sistemi
        </div>
      </section>
    </main>
  );
}
