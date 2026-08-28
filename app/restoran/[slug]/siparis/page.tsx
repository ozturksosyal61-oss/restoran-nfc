"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "../menu/CartContext";
import { createClient } from "../../../../lib/supabase/client";

type Restaurant = {
  id: number;
  name: string;
  table_count: number | null;
};

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = params.slug as string;
  const tableToken = searchParams.get("masa");

  const { items, total } = useCart();

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [customerName, setCustomerName] =
    useState("");

  const [tableNumber, setTableNumber] =
    useState("");

  const [tableLocked, setTableLocked] =
    useState(false);

  const [note, setNote] =
    useState("");

  const [loadingRestaurant, setLoadingRestaurant] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =====================================================
     RESTORANI GETİR
     ===================================================== */

  useEffect(() => {
    async function loadRestaurant() {
      try {
        const supabase = createClient();

        const {
          data,
          error,
        } = await supabase
          .from("restaurants")
          .select(
            "id, name, table_count"
          )
          .eq("slug", slug)
          .single();

        if (error || !data) {
          console.error(
            "Restaurant error:",
            error
          );

          setError(
            "İşletme bilgileri yüklenemedi."
          );

          setLoadingRestaurant(false);
          return;
        }

        setRestaurant(data);

        /*
         * =================================================
         * QR / NFC MASA KONTROLÜ
         *
         * QR veya NFC bağlantısı şu şekilde olacak:
         * /restoran/ozt-kafe/siparis?masa=PUBLIC_TOKEN
         *
         * Token geçerliyse müşterinin masası otomatik
         * belirlenir ve masa seçmesi gerekmez.
         * =================================================
         */
        if (tableToken) {
          const {
            data: table,
            error: tableError,
          } = await supabase
            .from("restaurant_tables")
            .select("id, table_number, public_token, is_active")
            .eq("restaurant_id", data.id)
            .eq("public_token", tableToken)
            .eq("is_active", true)
            .maybeSingle();

          if (tableError) {
            console.error(
              "Table token error:",
              tableError
            );
          }

          if (table) {
            setTableNumber(
              String(table.table_number)
            );
            setTableLocked(true);
          } else {
            setError(
              "Bu QR/NFC masa kodu geçersiz veya pasif."
            );
          }
        }

        setLoadingRestaurant(false);
      } catch (error) {
        console.error(error);

        setError(
          "İşletme bilgileri yüklenemedi."
        );

        setLoadingRestaurant(false);
      }
    }

    loadRestaurant();
  }, [slug, tableToken]);

  /* =====================================================
     SİPARİŞ GÖNDER
     ===================================================== */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!tableNumber.trim()) {
      setError(
        "Lütfen masa numaranızı seçin."
      );
      return;
    }

    if (items.length === 0) {
      setError(
        "Sepetiniz boş."
      );
      return;
    }

    if (!restaurant) {
      setError(
        "İşletme bilgileri bulunamadı."
      );
      return;
    }

    setLoading(true);

    try {
      const supabase =
        createClient();

      /* =================================================
         ANA SİPARİŞ
         ================================================= */

      const {
        data: order,
        error: orderError,
      } =
        await supabase
          .from("orders")
          .insert({
            restaurant_id:
              restaurant.id,

            customer_name:
              customerName.trim() ||
              null,

            table_number:
              tableNumber.trim(),

            note:
              note.trim() ||
              null,

            total_amount:
              total,

            status:
              "pending",
          })
          .select("id")
          .single();

      if (
        orderError ||
        !order
      ) {
        console.error(
          "Order error:",
          orderError
        );

        setError(
          "Sipariş oluşturulamadı: " +
            (
              orderError?.message ||
              "Bilinmeyen hata"
            )
        );

        setLoading(false);
        return;
      }

      /* =================================================
         SİPARİŞ ÜRÜNLERİ
         ================================================= */

      const orderItems =
        items.map((item) => ({
          order_id:
            order.id,

          product_id:
            item.id,

          product_name:
            item.name,

          price:
            item.price,

          quantity:
            item.quantity,
        }));

      const {
        error:
          orderItemsError,
      } =
        await supabase
          .from("order_items")
          .insert(
            orderItems
          );

      if (orderItemsError) {
        console.error(
          "Order items error:",
          orderItemsError
        );

        setError(
          "Sipariş ürünleri kaydedilemedi: " +
            orderItemsError.message
        );

        setLoading(false);
        return;
      }

      /* =================================================
         BAŞARILI
         ================================================= */

      setLoading(false);

      alert(
        `✅ Siparişiniz başarıyla oluşturuldu!\n\nSipariş No: ${order.id}`
      );

      router.push(
        `/restoran/${slug}/siparis/takip/${order.id}`
      );

    } catch (error) {
      console.error(error);

      setError(
        "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
      );

      setLoading(false);
    }
  }

  /* =====================================================
     YÜKLENİYOR
     ===================================================== */

  if (loadingRestaurant) {
    return (
      <main className="restaurant-page">

        <section className="hero">
          <h1>
            Sipariş Ver
          </h1>

          <p>
            İşletme bilgileri yükleniyor...
          </p>
        </section>

      </main>
    );
  }

  /* =====================================================
     MASA SAYISI
     ===================================================== */

  const tableCount =
    restaurant?.table_count ??
    20;

  const tables =
    Array.from(
      {
        length:
          Math.max(
            1,
            tableCount
          ),
      },
      (_, index) =>
        index + 1
    );

  /* =====================================================
     EKRAN
     ===================================================== */

  return (
    <main className="restaurant-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <section className="hero">

        <h1>
          Sipariş Ver
        </h1>

        <p>
          Sipariş bilgilerinizi girin.
        </p>

      </section>


      {/* =================================================
          SİPARİŞ BÖLÜMÜ
          ================================================= */}

      <section className="order-section">

        <h2>
          Sipariş Özeti
        </h2>


        {/* =================================================
            ÜRÜNLER
            ================================================= */}

        <div className="order-items">

          {items.map((item) => (

            <div
              className="order-item"
              key={item.id}
            >

              <div>

                <strong>
                  {item.name}
                </strong>

                <span>
                  {item.quantity} ×{" "}
                  {item.price} TL
                </span>

              </div>

              <strong>
                {(
                  item.price *
                  item.quantity
                ).toLocaleString(
                  "tr-TR"
                )}{" "}
                TL
              </strong>

            </div>

          ))}

        </div>


        {/* =================================================
            TOPLAM
            ================================================= */}

        <div className="order-total">

          <span>
            Toplam
          </span>

          <strong>
            {total.toLocaleString(
              "tr-TR"
            )}{" "}
            TL
          </strong>

        </div>


        {/* =================================================
            FORM
            ================================================= */}

        <form
          onSubmit={
            handleSubmit
          }
        >

          {/* =================================================
              MASA
              ================================================= */}

          <label>

            Masa Numaranız

            {tableLocked ? (
              <>
                <input
                  type="text"
                  value={`Masa ${tableNumber}`}
                  readOnly
                  aria-label="Otomatik belirlenen masa"
                />

                <small>
                  📍 QR/NFC üzerinden masanız otomatik belirlendi.
                </small>
              </>
            ) : (
              <>
                <select
                  value={
                    tableNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setTableNumber(
                      event.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Masa seçin
                  </option>

                  {tables.map(
                    (table) => (

                      <option
                        key={table}
                        value={table}
                      >
                        Masa {table}
                      </option>

                    )
                  )}

                </select>

                <small>
                  Lütfen bulunduğunuz
                  masayı seçin.
                </small>
              </>
            )}

          </label>


          {/* =================================================
              İSİM
              ================================================= */}

          <label>

            Adınız

            <input
              type="text"
              value={
                customerName
              }
              onChange={(
                event
              ) =>
                setCustomerName(
                  event.target.value
                )
              }
              placeholder="İsteğe bağlı"
            />

          </label>


          {/* =================================================
              NOT
              ================================================= */}

          <label>

            Sipariş Notu

            <textarea
              value={note}
              onChange={(
                event
              ) =>
                setNote(
                  event.target.value
                )
              }
              placeholder="Örn. Soğansız olsun."
            />

          </label>


          {/* =================================================
              HATA
              ================================================= */}

          {error && (

            <p className="login-error">
              ❌ {error}
            </p>

          )}


          {/* =================================================
              GÖNDER
              ================================================= */}

          <button
            type="submit"
            disabled={
              loading ||
              items.length === 0
            }
            className="submit-button"
          >

            {loading
              ? "Sipariş Gönderiliyor..."
              : "Siparişi Onayla"}

          </button>

        </form>

      </section>

    </main>
  );
}