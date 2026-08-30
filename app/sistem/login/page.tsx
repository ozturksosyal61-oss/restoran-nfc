"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

export default function SystemLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const supabase = createClient();

    // ============================================================
    // GİRİŞ
    // ============================================================

    const {
      data: { user },
      error: loginError,
    } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError || !user) {
      setError(
        "E-posta veya şifre hatalı."
      );

      setLoading(false);
      return;
    }

    // ============================================================
    // SİSTEM SAHİBİ KONTROLÜ
    // ============================================================

    const {
      data: systemAdmin,
      error: systemAdminError,
    } = await supabase
      .from("system_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      systemAdminError ||
      !systemAdmin
    ) {
      await supabase.auth.signOut();

      setError(
        "Bu hesap sistem sahibi hesabı değil."
      );

      setLoading(false);
      return;
    }

    // ============================================================
    // BAŞARILI
    // ============================================================

    router.replace("/sistem");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f1ed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          border: "1px solid #e5e0d7",
          borderRadius: "22px",
          padding: "35px",
          boxShadow:
            "0 20px 50px rgba(0,0,0,.08)",
        }}
      >
        {/* LOGO */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "3px",
              color: "#111",
              marginBottom: "8px",
            }}
          >
            OZT DIGITAL MENU
          </div>

          <div
            style={{
              fontSize: "11px",
              color: "#b47d00",
              fontWeight: 800,
              letterSpacing: "1px",
            }}
          >
            SİSTEM SAHİBİ
          </div>
        </div>

        {/* BAŞLIK */}

        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 900,
              color: "#171717",
            }}
          >
            Hoş geldiniz
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              color: "#777",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            Sistem sahibi paneline erişmek
            için giriş yapın.
          </p>
        </div>

        {/* FORM */}

        <form onSubmit={handleLogin}>
          {/* EMAIL */}

          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontSize: "12px",
              fontWeight: 800,
              color: "#333",
            }}
          >
            E-posta
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="E-posta adresiniz"
            autoComplete="email"
            required
            style={{
              width: "100%",
              height: "48px",
              padding: "0 14px",
              borderRadius: "11px",
              border: "1px solid #ddd8ce",
              outline: "none",
              fontSize: "14px",
              marginBottom: "16px",
              boxSizing: "border-box",
            }}
          />

          {/* ŞİFRE */}

          <label
            style={{
              display: "block",
              marginBottom: "7px",
              fontSize: "12px",
              fontWeight: 800,
              color: "#333",
            }}
          >
            Şifre
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Şifreniz"
            autoComplete="current-password"
            required
            style={{
              width: "100%",
              height: "48px",
              padding: "0 14px",
              borderRadius: "11px",
              border: "1px solid #ddd8ce",
              outline: "none",
              fontSize: "14px",
              marginBottom: "18px",
              boxSizing: "border-box",
            }}
          />

          {/* HATA */}

          {error && (
            <div
              style={{
                background: "#fff1f0",
                border:
                  "1px solid #f0c5c1",
                color: "#b33d35",
                padding: "12px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "16px",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* BUTON */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "48px",
              border: "none",
              borderRadius: "11px",
              background: "#151515",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 900,
              cursor: loading
                ? "not-allowed"
                : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Giriş yapılıyor..."
              : "🔐 Sistem Sahibine Giriş Yap"}
          </button>
        </form>

        {/* ALT BİLGİ */}

        <div
          style={{
            marginTop: "22px",
            paddingTop: "18px",
            borderTop:
              "1px solid #eeeae3",
            textAlign: "center",
            color: "#999",
            fontSize: "11px",
            lineHeight: 1.5,
          }}
        >
          Bu alan yalnızca sistem yöneticisine
          özeldir.
        </div>
      </div>
    </main>
  );
}