"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { useCart } from "../menu/CartContext";

import { createClient } from "../../../../lib/supabase/client";

import { useRestaurantTheme } from "../RestaurantThemeContext";

import AuroraCheckout from "./AuroraCheckout";

type Restaurant = {
  id: number;
  name: string;
  table_count: number | null;
};

type RestaurantTable = {
  id: number;
  table_number: number | string;
  public_token: string;
  is_active: boolean;
};

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const slug =
    params.slug as string;

  const {
    items,
    total,
    clearCart,
  } = useCart();

  // Aurora renk temalarında yeni sipariş onayı ekranı kullanılır.
  const isAurora = Boolean(
    useRestaurantTheme()?.auroraPalette
  );

  /*
   * =====================================================
   * QR / NFC TOKEN
   * =====================================================
   *
   * Örnek:
   *
   * ?masa=e630722f-3ed7-4b2d-b118-237051b9055a
   *
   * Bu değer masa numarası değildir.
   *
   * restaurant_tables.public_token
   * değeridir.
   */

  const tableTokenFromUrl =
    searchParams
      .get("masa")
      ?.trim() || "";

  const [
    restaurant,
    setRestaurant,
  ] =
    useState<Restaurant | null>(
      null
    );

  const [
    table,
    setTable,
  ] =
    useState<RestaurantTable | null>(
      null
    );

  const [
    customerName,
    setCustomerName,
  ] =
    useState("");

  const [
    tableNumber,
    setTableNumber,
  ] =
    useState("");

  const [
    tableLocked,
    setTableLocked,
  ] =
    useState(false);

  const [
    note,
    setNote,
  ] =
    useState("");

  const [
    loadingRestaurant,
    setLoadingRestaurant,
  ] =
    useState(true);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    serviceRequestLoading,
    setServiceRequestLoading,
  ] =
    useState(false);

  const [
    serviceRequestMessage,
    setServiceRequestMessage,
  ] =
    useState("");

  /*
   * =====================================================
   * RESTORAN + MASA YÜKLE
   * =====================================================
   */

  useEffect(() => {
    let cancelled = false;

    async function loadRestaurant() {
      try {
        setLoadingRestaurant(
          true
        );

        setError("");

        const supabase =
          createClient();

        /*
         * =================================================
         * RESTORANI BUL
         * =================================================
         */

        const {
          data: restaurantData,
          error:
            restaurantError,
        } =
          await supabase
            .from(
              "restaurants"
            )
            .select(
              "id, name, table_count"
            )
            .eq(
              "slug",
              slug
            )
            .single();

        if (cancelled) {
          return;
        }

        if (
          restaurantError ||
          !restaurantData
        ) {
          console.error(
            "Restaurant error:",
            restaurantError
          );

          setError(
            "İşletme bilgileri yüklenemedi."
          );

          setLoadingRestaurant(
            false
          );

          return;
        }

        setRestaurant(
          restaurantData
        );

        /*
         * =================================================
         * TOKEN BELİRLE
         * =================================================
         *
         * Öncelik:
         *
         * 1. URL
         * 2. localStorage
         */

        let tableToken =
          tableTokenFromUrl;

        if (!tableToken) {
          tableToken =
            localStorage.getItem(
              "ozt_table_token"
            )?.trim() || "";
        }

        /*
         * =================================================
         * QR / NFC TOKEN VAR
         * =================================================
         */

        if (tableToken) {
          const {
            data: tableData,
            error:
              tableError,
          } =
            /*
             * Token mutlaka mevcut restoran ile birlikte
             * veritabanı fonksiyonunda doğrulanıyor. Masa
             * tablosu herkese açık okunamaz.
             */
            await supabase.rpc(
              "get_public_table",
              {
                p_restaurant_id:
                  restaurantData.id,
                p_public_token:
                  tableToken,
              }
            );

          if (cancelled) {
            return;
          }

          if (tableError) {
            console.error(
              "Table token error:",
              tableError
            );
          }

          /*
           * =================================================
           * TOKEN GEÇERLİ
           * =================================================
           */

          if (tableData) {
            const realTableNumber =
              String(
                tableData.table_number
              );

            setTable(
              tableData
            );

            setTableNumber(
              realTableNumber
            );

            /*
             * Masa artık kilitli.
             */

            setTableLocked(
              true
            );

            /*
             * Tokenı kaydet.
             */

            localStorage.setItem(
              "ozt_table_token",
              tableData.public_token
            );

            /*
             * Eski hatalı kayıt varsa temizle.
             */

            localStorage.removeItem(
              "ozt_table_number"
            );

            console.log(
              "QR/NFC masa bulundu:",
              {
                restaurantId:
                  restaurantData.id,
                tableId:
                  tableData.id,
                tableNumber:
                  tableData.table_number,
                token:
                  tableData.public_token,
              }
            );
          } else {
            /*
             * =================================================
             * TOKEN GEÇERSİZ
             * =================================================
             */

            if (
              tableTokenFromUrl
            ) {
              setError(
                "Bu QR/NFC masa kodu geçersiz veya pasif."
              );

              setTable(
                null
              );

              setTableLocked(
                false
              );

              setTableNumber(
                ""
              );

              localStorage.removeItem(
                "ozt_table_token"
              );
            }
          }
        } else {
          /*
           * =================================================
           * QR / NFC YOK
           * =================================================
           *
           * Sipariş yalnızca masadaki QR/NFC koduyla verilebilir;
           * uzaktan sahte siparişi önlemek için elle masa seçimi yok.
           */

          setTable(
            null
          );

          setTableLocked(
            false
          );

          setTableNumber(
            ""
          );
        }

        setLoadingRestaurant(
          false
        );
      } catch (err) {
        console.error(
          "Load restaurant error:",
          err
        );

        if (!cancelled) {
          setError(
            "İşletme bilgileri yüklenemedi."
          );

          setLoadingRestaurant(
            false
          );
        }
      }
    }

    loadRestaurant();

    return () => {
      cancelled = true;
    };
  }, [
    slug,
    tableTokenFromUrl,
  ]);

  /*
   * =====================================================
   * GARSON ÇAĞIR
   * =====================================================
   */

  async function handleServiceRequest() {
    setServiceRequestMessage("");

    if (!restaurant) {
      setServiceRequestMessage(
        "İşletme bilgileri bulunamadı."
      );
      return;
    }

    if (!table) {
      setServiceRequestMessage(
        "Garson çağırmak için önce geçerli bir masa seçin."
      );
      return;
    }

    if (!table.is_active) {
      setServiceRequestMessage(
        "Bu masa şu anda aktif değil."
      );
      return;
    }

    setServiceRequestLoading(true);

    try {
      const supabase = createClient();

      const { error: requestError } =
        await supabase.rpc(
          "create_table_service_request",
          {
            p_restaurant_id: restaurant.id,
            p_public_token: table.public_token,
            p_request_type: "garson",
          }
        );

      if (requestError) {
        console.error(
          "Garson çağırma hatası:",
          requestError
        );

        setServiceRequestMessage(
          `HATA: ${requestError.message}`
        );

        return;
      }

      setServiceRequestMessage(
        `🔔 Garson çağrınız gönderildi. Masa ${table.table_number}.`
      );
    } catch (err) {
      console.error(
        "Garson çağırma beklenmeyen hata:",
        err
      );

      setServiceRequestMessage(
        "Garson çağrısı gönderilemedi. Lütfen tekrar deneyin."
      );
    } finally {
      setServiceRequestLoading(false);
    }
  }

  /*
   * =====================================================
   * SİPARİŞ GÖNDER
   * =====================================================
   */

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    /*
     * =================================================
     * SEPET
     * =================================================
     */

    if (items.length === 0) {
      setError(
        "Sepetiniz boş."
      );

      return;
    }

    /*
     * =================================================
     * RESTORAN
     * =================================================
     */

    if (!restaurant) {
      setError(
        "İşletme bilgileri bulunamadı."
      );

      return;
    }

    /*
     * =================================================
     * MASA
     * =================================================
     */

    /*
     * Sipariş yalnızca QR/NFC ile doğrulanmış masadan verilir.
     * Masa kodu, fiyatlar ve toplam veritabanı fonksiyonunda
     * yeniden doğrulanır / hesaplanır.
     */

    if (!table?.public_token) {
      setError(
        "Sipariş vermek için masanızdaki QR kodu okutun veya NFC etiketine dokunun."
      );

      return;
    }

    const supabase =
      createClient();

    /*
     * =================================================
     * ARTIK SİPARİŞ OLUŞTUR
     * =================================================
     */

    setLoading(
      true
    );

    try {
      /*
       * =================================================
       * ANA SİPARİŞ + AÇIK MASA OTURUMU
       * =================================================
       *
       * create_table_order masa kodunu doğrular, açık masa
       * oturumunu bağlar. Ürün adı, fiyat ve toplam ürün
       * tablosundan hesaplanır; buradan yalnızca ürün ve adet
       * gönderilir.
       */

      const orderItems = items.map((item) => ({
        product_id: item.id,
        quantity: Number(item.quantity),
      }));

      const {
        data: orderId,
        error: orderError,
      } = await supabase.rpc(
        "create_table_order",
        {
          p_restaurant_id: restaurant.id,
          p_public_token: table.public_token,
          p_customer_name: customerName.trim() || null,
          p_note: note.trim() || null,
          p_payment_method: "cash",
          p_items: orderItems,
        }
      );

      const order = orderId
        ? { id: Number(orderId) }
        : null;

      if (orderError || !order) {
        console.error("Order RPC error:", orderError);

        setError(
          "Sipariş oluşturulamadı: " +
            (orderError?.message || "Bilinmeyen hata")
        );

        setLoading(false);
        return;
      }

      /*
       * =================================================
       * BAŞARILI
       * =================================================
       */

      /*
       * Sepeti temizle.
       */

      /*
       * Yükleniyor durumu bilerek kapatılmıyor: takip ekranına
       * geçilene kadar düğme "gönderiliyor" olarak kalır ve
       * boşalan sepet ekranı görünmez.
       */

      clearCart();

      /*
       * Sipariş takip ekranı.
       */

      try {
        const token =
          table?.public_token ||
          tableTokenFromUrl ||
          localStorage.getItem("ozt_table_token") ||
          "";

        if (token) {
          localStorage.setItem(
            `ozt_last_order_${slug}_${token}`,
            String(order.id)
          );
        }
      } catch (storageError) {
        console.warn("Son sipariş localStorage'a kaydedilemedi:", storageError);
      }

      router.push(
        `/restoran/${slug}/siparis/takip/${order.id}?masa=${encodeURIComponent(
          table?.public_token ||
          tableTokenFromUrl ||
          ""
        )}`
      );
    } catch (err) {
      console.error(
        "Submit error:",
        err
      );

      setError(
        "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
      );

      setLoading(
        false
      );
    }
  }

  /*
   * =====================================================
   * AURORA
   * =====================================================
   */

  if (isAurora) {
    return (
      <AuroraCheckout
        slug={slug}
        loadingRestaurant={loadingRestaurant}
        tableNumber={tableLocked ? tableNumber : ""}
        tableToken={
          table?.public_token ||
          tableTokenFromUrl
        }
        items={items}
        total={total}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        note={note}
        onNoteChange={setNote}
        error={error}
        submitting={loading}
        onSubmit={handleSubmit}
      />
    );
  }

  /*
   * =====================================================
   * YÜKLENİYOR
   * =====================================================
   */

  if (
    loadingRestaurant
  ) {
    return (
      <main className="restaurant-page">
        <section className="hero">
          <h1>
            Sipariş Ver
          </h1>

          <p>
            Masa bilgileri
            kontrol ediliyor...
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
      {/* HEADER */}

      <section className="hero">
        <h1>
          Sipariş Ver
        </h1>

        <p>
          Sipariş bilgilerinizi girin.
        </p>
      </section>

      {/* SİPARİŞ */}

      <section className="order-section">
        <h2>
          Sipariş Özeti
        </h2>

        {/* ÜRÜNLER */}

        <div className="order-items">
          {items.map(
            (item) => (
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
                    {Number(
                      item.price
                    ).toLocaleString(
                      "tr-TR"
                    )}{" "}
                    TL
                  </span>
                </div>

                <strong>
                  {(
                    Number(
                      item.price
                    ) *
                    item.quantity
                  ).toLocaleString(
                    "tr-TR"
                  )}{" "}
                  TL
                </strong>
              </div>
            )
          )}
        </div>

        {/* TOPLAM */}

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

        {/* GARSON ÇAĞIR */}

        {table && (
          <div
            className="aurora-waiter-card"
            style={{
              marginBottom: "18px",
              padding: "16px",
              border: "1px solid #eadfca",
              borderRadius: "14px",
              background: "#fffaf0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>🔔 Garson Çağır</strong>
                <p
                  style={{
                    margin: "5px 0 0",
                    fontSize: "12px",
                    color: "#777",
                  }}
                >
                  Masa {table.table_number} için garson çağırabilirsiniz.
                </p>
              </div>

              <button
                type="button"
                onClick={handleServiceRequest}
                disabled={
                  serviceRequestLoading ||
                  !table.is_active
                }
                className="aurora-waiter-button"
                style={{
                  border: "none",
                  borderRadius: "10px",
                  padding: "11px 16px",
                  background: serviceRequestLoading
                    ? "#b9b0a0"
                    : "#171717",
                  color: "white",
                  fontWeight: 700,
                  cursor: serviceRequestLoading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {serviceRequestLoading
                  ? "Çağrılıyor..."
                  : "🔔 Garson Çağır"}
              </button>
            </div>

            {serviceRequestMessage && (
              <p
                className="aurora-waiter-message"
                style={{
                  margin: "10px 0 0",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: serviceRequestMessage.startsWith("🔔")
                    ? "#2e7d32"
                    : "#b42318",
                }}
              >
                {serviceRequestMessage}
              </p>
            )}
          </div>
        )}

        {/* FORM */}

        <form
          onSubmit={
            handleSubmit
          }
        >
          {/* MASA */}

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
                <input
                  type="text"
                  value="Masa doğrulanmadı"
                  readOnly
                  aria-label="Masa doğrulanmadı"
                />

                <small>
                  📍 Sipariş vermek için masanızdaki QR kodu okutun
                  veya NFC etiketine telefonunuzu yaklaştırın.
                </small>
              </>
            )}
          </label>

          {/* İSİM */}

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

          {/* NOT */}

          <label>
            Sipariş Notu

            <textarea
              value={
                note
              }
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

          {/* HATA */}

          {error && (
            <p className="login-error">
              ❌ {error}
            </p>
          )}

          {/* GÖNDER */}

          <button
            type="submit"
            disabled={
              loading ||
              items.length === 0 ||
              !tableNumber
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