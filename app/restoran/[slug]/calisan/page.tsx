"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Employee = {
  id: number;
  restaurant_id: number;
  name: string;
  role: string | null;
  phone: string | null;
  is_active: boolean;
};

type Restaurant = {
  id: number;
  name: string;
  logo_url: string | null;
  description: string | null;
};

export default function EmployeeRatingPage() {
  const params = useParams();

  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : "";

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [selectedEmployee, setSelectedEmployee] =
    useState("");

  const [rating, setRating] =
    useState(0);

  const [comment, setComment] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    async function loadData() {
      if (!slug) {
        return;
      }

      setLoading(true);
      setError("");

      const supabase = createClient();

      try {
        /*
         * =================================================
         * RESTORANI BUL
         * =================================================
         */

        const {
          data: restaurantData,
          error: restaurantError,
        } = await supabase
          .from("restaurants")
          .select(
            "id, name, logo_url, description"
          )
          .eq("slug", slug)
          .single();

        if (
          restaurantError ||
          !restaurantData
        ) {
          console.error(
            "Restaurant error:",
            restaurantError
          );

          setError(
            "İşletme bulunamadı."
          );

          setLoading(false);
          return;
        }

        setRestaurant(
          restaurantData
        );

        /*
         * =================================================
         * ÇALIŞANLARI BUL
         * =================================================
         */

        const {
          data: employeeData,
          error: employeeError,
        } = await supabase
          .from("employees")
          .select(
            `
              id,
              restaurant_id,
              name,
              role,
              phone,
              is_active
            `
          )
          .eq(
            "restaurant_id",
            restaurantData.id
          )
          .eq(
            "is_active",
            true
          )
          .order(
            "name",
            {
              ascending: true,
            }
          );

        if (employeeError) {
          console.error(
            "Employee error:",
            employeeError
          );

          setError(
            "Çalışanlar yüklenemedi."
          );

          setLoading(false);
          return;
        }

        setEmployees(
          employeeData ?? []
        );

        setLoading(false);
      } catch (err) {
        console.error(err);

        setError(
          "Bilgiler yüklenirken bir hata oluştu."
        );

        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  /*
   * =====================================================
   * DEĞERLENDİRME GÖNDER
   * =====================================================
   */

  async function handleSubmit() {
    setError("");
    setSuccess(false);

    if (!selectedEmployee) {
      setError(
        "Lütfen bir çalışan seçiniz."
      );
      return;
    }

    if (rating < 1 || rating > 5) {
      setError(
        "Lütfen 1 ile 5 arasında puan veriniz."
      );
      return;
    }

    if (!restaurant) {
      setError(
        "İşletme bilgileri bulunamadı."
      );
      return;
    }

    const selected =
      employees.find(
        (employee) =>
          String(employee.id) ===
          selectedEmployee
      );

    if (!selected) {
      setError(
        "Seçilen çalışan bulunamadı."
      );
      return;
    }

    const supabase = createClient();

    /*
     * -----------------------------------------------------
     * ÖNEMLİ:
     *
     * Şu an reviews tablosunda employee_id kolonu
     * bulunmadığı için çalışanı review kaydına
     * yazamıyoruz.
     *
     * Önce reviews tablosuna employee_id eklememiz
     * gerekiyor.
     * -----------------------------------------------------
     */

    const {
      error: reviewError,
    } = await supabase
      .from("reviews")
      .insert({
        restaurant_id:
          restaurant.id,

        customer_name:
          null,

        rating,

        comment:
          `[Çalışan: ${selected.name}] ${
            comment.trim()
          }`.trim(),

        is_visible:
          true,
      });

    if (reviewError) {
      console.error(
        "Review error:",
        reviewError
      );

      setError(
        "Değerlendirme gönderilemedi: " +
          reviewError.message
      );

      return;
    }

    setSuccess(true);

    setSelectedEmployee("");
    setRating(0);
    setComment("");
  }

  /*
   * =====================================================
   * YÜKLENİYOR
   * =====================================================
   */

  if (loading) {
    return (
      <main className="restaurant-page">
        <section className="hero">
          <div className="logo">
            OZT
          </div>

          <h1>
            Çalışanı Değerlendir
          </h1>

          <p>
            Bilgiler yükleniyor...
          </p>
        </section>
      </main>
    );
  }

  /*
   * =====================================================
   * HATA
   * =====================================================
   */

  if (error && !restaurant) {
    return (
      <main className="restaurant-page">
        <section className="hero">
          <div className="logo">
            OZT
          </div>

          <h1>
            Bir hata oluştu
          </h1>

          <p>
            {error}
          </p>
        </section>
      </main>
    );
  }

  /*
   * =====================================================
   * EKRAN
   * =====================================================
   */

  return (
    <main className="restaurant-page">

      {/* HERO */}

      <section className="hero">

        {restaurant?.logo_url ? (
          <img
            src={restaurant.logo_url}
            alt={`${restaurant.name} logosu`}
            className="restaurant-logo"
          />
        ) : (
          <div className="logo">
            OZT
          </div>
        )}

        <h1>
          {restaurant?.name}
        </h1>

        <p>
          Çalışanı Değerlendir
        </p>

      </section>

      {/* DEĞERLENDİRME */}

      <section
        className="rating-section"
        style={{
          width: "100%",
          maxWidth: "520px",
          margin: "0 auto",
          padding:
            "24px 16px 50px",
          boxSizing:
            "border-box",
        }}
      >

        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #eeeeee",
            borderRadius: "20px",
            padding: "22px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >

          {/* BAŞLIK */}

          <div
            style={{
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "2px",
                color: "#d99b00",
                marginBottom: "6px",
              }}
            >
              MÜŞTERİ MEMNUNİYETİ
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "25px",
                fontWeight: 800,
              }}
            >
              Deneyiminizi paylaşın
            </h2>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#777",
                fontSize: "14px",
              }}
            >
              Size hizmet veren çalışanı
              seçerek değerlendirebilirsiniz.
            </p>
          </div>

          {/* ÇALIŞAN */}

          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            Çalışan Seç
          </label>

          <select
            value={selectedEmployee}
            onChange={(e) =>
              setSelectedEmployee(
                e.target.value
              )
            }
            style={{
              width: "100%",
              height: "50px",
              padding:
                "0 14px",
              borderRadius: "12px",
              border:
                "1px solid #dddddd",
              background:
                "#ffffff",
              fontSize: "15px",
              outline: "none",
              boxSizing:
                "border-box",
            }}
          >
            <option value="">
              Çalışan seçiniz
            </option>

            {employees.map(
              (employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.name}
                  {employee.role
                    ? ` — ${employee.role}`
                    : ""}
                </option>
              )
            )}
          </select>

          {/* ÇALIŞAN YOK */}

          {employees.length === 0 && (
            <p
              style={{
                marginTop: "10px",
                color: "#888",
                fontSize: "13px",
              }}
            >
              Şu anda değerlendirilebilecek
              aktif çalışan bulunmuyor.
            </p>
          )}

          {/* PUAN */}

          <h2
            style={{
              marginTop: "26px",
              marginBottom: "10px",
              fontSize: "17px",
            }}
          >
            Puanınız
          </h2>

          <div
            style={{
              display: "flex",
              gap: "6px",
            }}
          >
            {[1, 2, 3, 4, 5].map(
              (star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() =>
                    setRating(star)
                  }
                  aria-label={`${star} yıldız`}
                  style={{
                    border: "none",
                    background:
                      "transparent",
                    cursor:
                      "pointer",
                    fontSize:
                      "38px",
                    lineHeight: 1,
                    padding: "3px",
                    color:
                      star <= rating
                        ? "#e0a000"
                        : "#d7d7d7",
                  }}
                >
                  ★
                </button>
              )
            )}
          </div>

          <p
            style={{
              marginTop: "8px",
              color: "#777",
              fontSize: "13px",
            }}
          >
            {rating === 0
              ? "Puan vermek için yıldız seçin."
              : `Seçilen puan: ${rating} / 5`}
          </p>

          {/* YORUM */}

          <h2
            style={{
              marginTop: "22px",
              marginBottom: "10px",
              fontSize: "17px",
            }}
          >
            Yorumunuz
          </h2>

          <textarea
            value={comment}
            onChange={(e) =>
              setComment(
                e.target.value
              )
            }
            placeholder="Deneyiminizi paylaşabilirsiniz..."
            rows={5}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border:
                "1px solid #dddddd",
              resize: "vertical",
              fontSize: "14px",
              boxSizing:
                "border-box",
              outline: "none",
            }}
          />

          {/* HATA */}

          {error && (
            <div
              style={{
                marginTop: "14px",
                padding: "12px 14px",
                borderRadius: "10px",
                background:
                  "#fff1f1",
                color: "#c62828",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {/* BAŞARILI */}

          {success && (
            <div
              style={{
                marginTop: "14px",
                padding: "14px",
                borderRadius: "12px",
                background:
                  "#effaf1",
                color: "#237a36",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              ✓ Değerlendirmeniz
              başarıyla gönderildi.
              Teşekkür ederiz!
            </div>
          )}

          {/* GÖNDER */}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              employees.length === 0
            }
            style={{
              width: "100%",
              height: "52px",
              marginTop: "18px",
              border: "none",
              borderRadius: "13px",
              background:
                employees.length === 0
                  ? "#cccccc"
                  : "#111111",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 800,
              cursor:
                employees.length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Değerlendirmeyi Gönder
          </button>

        </div>

      </section>

    </main>
  );
}