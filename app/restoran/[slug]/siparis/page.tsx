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

type PaymentMethod = "cash" | "card" | "online";

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
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<PaymentMethod>("cash");

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
            await supabase
              .from(
                "restaurant_tables"
              )
              .select(
                "id, table_number, public_token, is_active"
              )
              /*
               * EN ÖNEMLİ KISIM:
               *
               * Token mutlaka mevcut
               * restoran ile birlikte
               * kontrol ediliyor.
               */
              .eq(
                "restaurant_id",
                restaurantData.id
              )
              .eq(
                "public_token",
                tableToken
              )
              .eq(
                "is_active",
                true
              )
              .maybeSingle();

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
           * Manuel masa seçimi kullanılabilir.
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
   * MANUEL MASA SEÇİMİ
   * =====================================================
   */

  async function handleManualTableChange(
    value: string
  ) {
    setTableNumber(
      value
    );

    setTable(
      null
    );

    if (!value) {
      return;
    }

    if (!restaurant) {
      return;
    }

    const supabase =
      createClient();

    const {
      data,
      error: tableError,
    } =
      await supabase
        .from(
          "restaurant_tables"
        )
        .select(
          "id, table_number, public_token, is_active"
        )
        .eq(
          "restaurant_id",
          restaurant.id
        )
        .eq(
          "table_number",
          Number(value)
        )
        .eq(
          "is_active",
          true
        )
        .maybeSingle();

    if (tableError) {
      console.error(
        "Manual table error:",
        tableError
      );

      setError(
        "Masa bilgisi alınamadı."
      );

      return;
    }

    if (!data) {
      setError(
        "Seçilen masa aktif değil veya bulunamadı."
      );

      setTableNumber(
        ""
      );

      return;
    }

    setError("");

    setTable(
      data
    );
  }

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
        await supabase
          .from("service_requests")
          .insert({
            restaurant_id: restaurant.id,
            table_id: table.id,
            request_type: "garson",
            status: "pending",
          });

      if (requestError) {
        console.error(
          "Garson çağırma hatası:",
          requestError
        );

        setServiceRequestMessage(
          "Garson çağrısı gönderilemedi. Lütfen tekrar deneyin."
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

    if (!tableNumber.trim()) {
      setError(
        "Lütfen masa numaranızı seçin."
      );

      return;
    }

    /*
     * =================================================
     * ÖDEME YÖNTEMİ
     * =================================================
     */

    if (!paymentMethod) {
      setError(
        "Lütfen ödeme yönteminizi seçin."
      );

      return;
    }

    /*
     * =================================================
     * TABLE ID KONTROLÜ
     * =================================================
     *
     * Artık sipariş mutlaka gerçek
     * restaurant_tables kaydına bağlanıyor.
     */

    let verifiedTable =
      table;

    const supabase =
      createClient();

    /*
     * QR/NFC kullanıldıysa token ile
     * tekrar doğrula.
     */

    const tableToken =
      tableTokenFromUrl ||
      localStorage.getItem(
        "ozt_table_token"
      )?.trim() ||
      "";

    if (tableToken) {
      const {
        data: tokenTable,
        error:
          tokenTableError,
      } =
        await supabase
          .from(
            "restaurant_tables"
          )
          .select(
            "id, table_number, public_token, is_active"
          )
          .eq(
            "restaurant_id",
            restaurant.id
          )
          .eq(
            "public_token",
            tableToken
          )
          .eq(
            "is_active",
            true
          )
          .maybeSingle();

      if (
        tokenTableError
      ) {
        console.error(
          "Final table verification error:",
          tokenTableError
        );

        setError(
          "Masa doğrulaması yapılamadı."
        );

        return;
      }

      if (!tokenTable) {
        setError(
          "QR/NFC masa kodu geçersiz veya pasif."
        );

        return;
      }

      /*
       * URL tokenı ile masa numarası
       * birbiriyle uyuşuyor mu?
       */

      if (
        String(
          tokenTable.table_number
        ) !==
        String(
          tableNumber
        )
      ) {
        setError(
          "Masa doğrulaması başarısız."
        );

        return;
      }

      verifiedTable =
        tokenTable;
    } else {
      /*
       * Manuel seçimde gerçek masa kaydı
       * bulunmak zorunda.
       */

      if (
        !verifiedTable ||
        String(
          verifiedTable.table_number
        ) !==
          String(
            tableNumber
          )
      ) {
        const {
          data: manualTable,
          error:
            manualTableError,
        } =
          await supabase
            .from(
              "restaurant_tables"
            )
            .select(
              "id, table_number, public_token, is_active"
            )
            .eq(
              "restaurant_id",
              restaurant.id
            )
            .eq(
              "table_number",
              Number(
                tableNumber
              )
            )
            .eq(
              "is_active",
              true
            )
            .maybeSingle();

        if (
          manualTableError ||
          !manualTable
        ) {
          setError(
            "Seçilen masa aktif değil veya bulunamadı."
          );

          return;
        }

        verifiedTable =
          manualTable;
      }
    }

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
       * ANA SİPARİŞ
       * =================================================
       */

      const {
        data: order,
        error: orderError,
      } =
        await supabase
          .from("orders")
          .insert({
            restaurant_id:
              restaurant.id,

            /*
             * GERÇEK MASA ID
             */

            table_id:
              verifiedTable.id,

            /*
             * GERÇEK MASA NUMARASI
             */

            table_number:
              String(
                verifiedTable.table_number
              ),

            customer_name:
              customerName.trim() ||
              null,

            note:
              note.trim() ||
              null,

            total_amount:
              total,

            /*
             * ÖDEME BİLGİLERİ
             *
             * cash   = Nakit
             * card   = Kart / POS
             * online = Online ödeme
             */

            payment_method:
              paymentMethod,

            payment_status:
              "unpaid",

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

        setLoading(
          false
        );

        return;
      }

      /*
       * =================================================
       * SİPARİŞ ÜRÜNLERİ
       * =================================================
       */

      const orderItems =
        items.map(
          (item) => ({
            order_id:
              order.id,

            product_id:
              item.id,

            product_name:
              item.name,

            price:
              Number(
                item.price
              ),

            quantity:
              item.quantity,
          })
        );

      const {
        error:
          orderItemsError,
      } =
        await supabase
          .from(
            "order_items"
          )
          .insert(
            orderItems
          );

      if (
        orderItemsError
      ) {
        console.error(
          "Order items error:",
          orderItemsError
        );

        /*
         * Ana siparişi de geri almaya çalış.
         */

        await supabase
          .from("orders")
          .delete()
          .eq(
            "id",
            order.id
          );

        setError(
          "Sipariş ürünleri kaydedilemedi: " +
            orderItemsError.message
        );

        setLoading(
          false
        );

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

      clearCart();

      setLoading(
        false
      );

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
            "ozt_last_order_${slug}_${token}",
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
   * MASA SAYISI
   * =====================================================
   */

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
                <select
                  value={
                    tableNumber
                  }
                  onChange={(
                    event
                  ) =>
                    handleManualTableChange(
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Masa seçin
                  </option>

                  {tables.map(
                    (tableItem) => (
                      <option
                        key={
                          tableItem
                        }
                        value={String(
                          tableItem
                        )}
                      >
                        Masa{" "}
                        {
                          tableItem
                        }
                      </option>
                    )
                  )}
                </select>

                <small>
                  Lütfen bulunduğunuz masayı seçin.
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

          {/* ÖDEME YÖNTEMİ */}

          <label>
            Ödeme Yöntemi

            <select
              value={
                paymentMethod
              }
              onChange={(
                event
              ) =>
                setPaymentMethod(
                  event.target.value as PaymentMethod
                )
              }
              required
            >
              <option value="cash">
                💵 Nakit
              </option>

              <option value="card">
                💳 Kart / POS
              </option>

              <option value="online">
                🌐 Online Ödeme
              </option>
            </select>

            <small>
              Ödeme yönteminizi seçin.
              Online ödeme seçeneği şimdilik
              siparişe ödeme yöntemi olarak kaydedilir;
              gerçek online tahsilat için ödeme sağlayıcısı
              entegrasyonu ayrıca yapılacaktır.
            </small>
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