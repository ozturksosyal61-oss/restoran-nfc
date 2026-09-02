"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { createClient } from "../../../lib/supabase/client";

type Restaurant = {
  id: number;
  name: string;
  slug: string;
};

type RestaurantTable = {
  id: number;
  restaurant_id: number;
  table_number: number;
  public_token: string;
  is_active: boolean;
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.oztdigital.com.tr";

export default function TablesPage() {
  const [restaurants, setRestaurants] =
    useState<Restaurant[]>([]);

  const [selectedRestaurantId, setSelectedRestaurantId] =
    useState("");

  const [tables, setTables] =
    useState<RestaurantTable[]>([]);

  const [tableNumber, setTableNumber] =
    useState("");

  const [bulkStart, setBulkStart] =
    useState("");

  const [bulkEnd, setBulkEnd] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [editingTable, setEditingTable] =
    useState<RestaurantTable | null>(null);

  const [editNumber, setEditNumber] =
    useState("");

  const [deletingTableId, setDeletingTableId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // Kullanıcının masa yönetme yetkisi
  const [canManageTables, setCanManageTables] =
    useState(false);

  /*
   * =====================================================
   * RESTORANLARI GETİR
   * =====================================================
   */

  async function loadRestaurants() {
    setError("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setRestaurants([]);
      setTables([]);
      setSelectedRestaurantId("");
      setCanManageTables(false);
      setError("Oturum bulunamadı.");
      return;
    }

    // Kullanıcının bağlı olduğu işletmeyi bul.
    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("restaurant_users")
      .select("restaurant_id, role, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "İşletme bağlantısı hatası:",
        membershipError
      );

      setRestaurants([]);
      setTables([]);
      setSelectedRestaurantId("");
      setCanManageTables(false);
      setError(
        "İşletme bağlantısı alınamadı: " +
          membershipError.message
      );
      return;
    }

    if (!membership?.restaurant_id) {
      setRestaurants([]);
      setTables([]);
      setSelectedRestaurantId("");
      setCanManageTables(false);
      setError(
        "Hesabınıza bağlı bir işletme bulunamadı."
      );
      return;
    }

    // Yönetici tüm bölümlere erişebilir.
    // Diğer kullanıcılar için yalnızca permissions.tables === true ise
    // masa yönetimine izin verilir.
    const role = String(membership.role || "").toLowerCase();
    const permissions =
      membership.permissions &&
      typeof membership.permissions === "object"
        ? (membership.permissions as Record<string, boolean>)
        : {};

    const hasTablePermission =
      role === "manager" ||
      permissions.tables === true;

    setCanManageTables(hasTablePermission);

    if (!hasTablePermission) {
      setRestaurants([]);
      setTables([]);
      setSelectedRestaurantId("");
      setError("Bu hesabın Masa Yönetimi yetkisi bulunmuyor.");
      return;
    }

    // Sadece kullanıcının bağlı olduğu işletmeyi getir.
    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select("id, name, slug")
      .eq("id", membership.restaurant_id)
      .maybeSingle();

    if (restaurantError) {
      console.error(
        "Restoran bilgisi hatası:",
        restaurantError
      );

      setRestaurants([]);
      setTables([]);
      setSelectedRestaurantId("");
      setCanManageTables(false);
      setError(
        "İşletme bilgisi alınamadı: " +
          restaurantError.message
      );
      return;
    }

    if (!restaurant) {
      setRestaurants([]);
      setTables([]);
      setSelectedRestaurantId("");
      setCanManageTables(false);
      setError("Bağlı işletme bulunamadı.");
      return;
    }

    const list = [restaurant as Restaurant];

    setRestaurants(list);
    setSelectedRestaurantId(String(restaurant.id));
  }

  /*
   * =====================================================
   * MASALARI GETİR
   * =====================================================
   */

  async function loadTables(
    restaurantId: string
  ) {
    if (!canManageTables) {
      setTables([]);
      return;
    }

    if (!restaurantId) {
      setTables([]);
      return;
    }

    const supabase =
      createClient();

    const {
      data,
      error,
    } = await supabase
      .from(
        "restaurant_tables"
      )
      .select(
        "id, restaurant_id, table_number, public_token, is_active"
      )
      .eq(
        "restaurant_id",
        Number(
          restaurantId
        )
      )
      .order(
        "table_number",
        {
          ascending: true,
        }
      );

    if (error) {
      console.error(
        "Masalar yüklenemedi:",
        error
      );

      setError(
        "Masalar yüklenemedi: " +
          error.message
      );

      return;
    }

    setTables(
      data || []
    );
  }

  /*
   * =====================================================
   * İLK YÜKLEME
   * =====================================================
   */

  useEffect(() => {
    loadRestaurants();
  }, []);

  /*
   * =====================================================
   * RESTORAN DEĞİŞİNCE MASALARI GETİR
   * =====================================================
   */

  useEffect(() => {
    if (
      selectedRestaurantId
    ) {
      loadTables(
        selectedRestaurantId
      );
    }
  }, [
    selectedRestaurantId,
    canManageTables,
  ]);

  /*
   * =====================================================
   * MASA OLUŞTUR
   * =====================================================
   */

  async function createTable() {
    if (!canManageTables) {
      setError("Bu işlem için Masa Yönetimi yetkiniz yok.");
      return;
    }

    setMessage("");
    setError("");

    if (
      !selectedRestaurantId
    ) {
      setError(
        "Önce restoran seçin."
      );

      return;
    }

    const number =
      Number(
        tableNumber
      );

    if (
      !Number.isInteger(
        number
      ) ||
      number < 1
    ) {
      setError(
        "Geçerli bir masa numarası girin."
      );

      return;
    }

    const exists =
      tables.some(
        (table) =>
          Number(
            table.table_number
          ) === number
      );

    if (exists) {
      setError(
        `Masa ${number} zaten mevcut.`
      );

      return;
    }

    setLoading(true);

    try {
      const supabase =
        createClient();

      const publicToken =
        crypto.randomUUID();

      const {
        error,
      } = await supabase
        .from(
          "restaurant_tables"
        )
        .insert({
          restaurant_id:
            Number(
              selectedRestaurantId
            ),

          table_number:
            number,

          public_token:
            publicToken,

          is_active:
            true,
        });

      if (error) {
        console.error(
          "Masa oluşturma hatası:",
          error
        );

        setError(
          "Masa oluşturulamadı: " +
            error.message
        );

        return;
      }

      setMessage(
        `✅ Masa ${number} başarıyla oluşturuldu.`
      );

      setTableNumber("");

      await loadTables(
        selectedRestaurantId
      );
    } catch (err) {
      console.error(
        err
      );

      setError(
        "Beklenmeyen bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * MASA PASİF / AKTİF
   * =====================================================
   */

  async function toggleTable(
    table: RestaurantTable
  ) {
    if (!canManageTables) {
      setError("Bu işlem için Masa Yönetimi yetkiniz yok.");
      return;
    }

    setError("");
    setMessage("");

    const supabase =
      createClient();

    const newStatus =
      !table.is_active;

    const {
      data,
      error,
    } = await supabase
      .from(
        "restaurant_tables"
      )
      .update({
        is_active:
          newStatus,
      })
      .eq(
        "id",
        table.id
      )
      .select(
        "id, is_active"
      )
      .maybeSingle();

    if (error) {
      console.error(
        "Masa durum güncelleme hatası:",
        error
      );

      setError(
        "Masa durumu değiştirilemedi: " +
          error.message
      );

      return;
    }

    if (!data) {
      console.error(
        "Masa güncellenemedi. Supabase RLS UPDATE yetkisini kontrol edin."
      );

      setError(
        "Masa durumu değiştirilemedi. Supabase RLS izinlerini kontrol edin."
      );

      return;
    }

    setMessage(
      newStatus
        ? `✅ Masa ${table.table_number} aktif yapıldı.`
        : `✅ Masa ${table.table_number} pasif yapıldı.`
    );

    await loadTables(
      selectedRestaurantId
    );
  }

  /*
   * =====================================================
   * TOPLU MASA OLUŞTUR
   * =====================================================
   */

  async function createBulkTables() {
    if (!canManageTables) {
      setError("Bu işlem için Masa Yönetimi yetkiniz yok.");
      return;
    }

    setMessage("");
    setError("");

    if (!selectedRestaurantId) {
      setError("Önce restoran seçin.");
      return;
    }

    const start = Number(bulkStart);
    const end = Number(bulkEnd);

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1 ||
      end < start
    ) {
      setError("Geçerli bir başlangıç ve bitiş masa numarası girin.");
      return;
    }

    if (end - start + 1 > 100) {
      setError("Tek seferde en fazla 100 masa oluşturabilirsiniz.");
      return;
    }

    const existingNumbers = new Set(
      tables.map((table) => Number(table.table_number))
    );

    const rows = [];

    for (let number = start; number <= end; number++) {
      if (!existingNumbers.has(number)) {
        rows.push({
          restaurant_id: Number(selectedRestaurantId),
          table_number: number,
          public_token: crypto.randomUUID(),
          is_active: true,
        });
      }
    }

    if (rows.length === 0) {
      setError("Bu aralıktaki tüm masalar zaten mevcut.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("restaurant_tables")
        .insert(rows);

      if (error) {
        console.error("Toplu masa oluşturma hatası:", error);
        setError("Masalar oluşturulamadı: " + error.message);
        return;
      }

      setMessage(`✅ ${rows.length} yeni masa oluşturuldu.`);
      setBulkStart("");
      setBulkEnd("");
      await loadTables(selectedRestaurantId);
    } catch (err) {
      console.error(err);
      setError("Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * MASA NUMARASI DÜZENLE
   * =====================================================
   */

  function startEditTable(table: RestaurantTable) {
    setError("");
    setMessage("");
    setEditingTable(table);
    setEditNumber(String(table.table_number));
  }

  function cancelEditTable() {
    setEditingTable(null);
    setEditNumber("");
  }

  async function saveEditTable() {
    if (!canManageTables) {
      setError("Bu işlem için Masa Yönetimi yetkiniz yok.");
      return;
    }

    if (!editingTable) return;

    setError("");
    setMessage("");

    const number = Number(editNumber);

    if (!Number.isInteger(number) || number < 1) {
      setError("Geçerli bir masa numarası girin.");
      return;
    }

    const duplicate = tables.some(
      (table) =>
        table.id !== editingTable.id &&
        Number(table.table_number) === number
    );

    if (duplicate) {
      setError(`Masa ${number} zaten mevcut.`);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("restaurant_tables")
        .update({ table_number: number })
        .eq("id", editingTable.id);

      if (error) {
        console.error("Masa düzenleme hatası:", error);
        setError("Masa düzenlenemedi: " + error.message);
        return;
      }

      setMessage(`✅ Masa ${number} olarak güncellendi.`);
      cancelEditTable();
      await loadTables(selectedRestaurantId);
    } catch (err) {
      console.error(err);
      setError("Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * MASA SİL
   * =====================================================
   */

  async function deleteTable(table: RestaurantTable) {
    if (!canManageTables) {
      setError("Bu işlem için Masa Yönetimi yetkiniz yok.");
      return;
    }

    const confirmed = window.confirm(
      `Masa ${table.table_number} silinsin mi?\n\nBu işlem geri alınamaz.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingTableId(table.id);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("restaurant_tables")
        .delete()
        .eq("id", table.id);

      if (error) {
        console.error("Masa silme hatası:", error);
        setError("Masa silinemedi: " + error.message);
        return;
      }

      setMessage(`✅ Masa ${table.table_number} silindi.`);
      await loadTables(selectedRestaurantId);
    } catch (err) {
      console.error(err);
      setError("Beklenmeyen bir hata oluştu.");
    } finally {
      setDeletingTableId(null);
    }
  }

  /*
   * =====================================================
   * QR LİNKİ
   * =====================================================
   */

  function getQrUrl(
    table: RestaurantTable
  ) {
    const restaurant =
      restaurants.find(
        (item) =>
          item.id ===
          table.restaurant_id
      );

    if (!restaurant) {
      return "";
    }

    if (!restaurant.slug) {
      console.error(
        "Restoran slug bulunamadı:",
        restaurant
      );

      return "";
    }

    /*
     * QR artık restoran isminden slug üretmiyor.
     *
     * Supabase restaurants.slug alanındaki
     * gerçek slug kullanılıyor.
     *
     * Domain:
     * NEXT_PUBLIC_APP_URL
     *
     * yoksa:
     * https://www.oztdigital.com.tr
     */

    const baseUrl =
      APP_URL.replace(
        /\/+$/,
        ""
      );

    return `${baseUrl}/restoran/${encodeURIComponent(
      restaurant.slug
    )}?masa=${encodeURIComponent(
      table.public_token
    )}`;
  }

  /*
   * =====================================================
   * QR İNDİR
   * =====================================================
   */

  function downloadQr(
    table: RestaurantTable
  ) {
    const canvas =
      document.getElementById(
        `qr-${table.id}`
      ) as HTMLCanvasElement | null;

    if (!canvas) {
      setError(
        "QR kodu bulunamadı."
      );

      return;
    }

    const link =
      document.createElement(
        "a"
      );

    link.download =
      `masa-${table.table_number}-qr.png`;

    link.href =
      canvas.toDataURL(
        "image/png"
      );

    link.click();

    setMessage(
      `✅ Masa ${table.table_number} QR kodu indirildi.`
    );
  }

  /*
   * =====================================================
   * URL KOPYALA
   * =====================================================
   */

  async function copyUrl(
    table: RestaurantTable
  ) {
    setError("");
    setMessage("");

    const url =
      getQrUrl(
        table
      );

    if (!url) {
      setError(
        "QR bağlantısı oluşturulamadı."
      );

      return;
    }

    try {
      await navigator.clipboard.writeText(
        url
      );

      setMessage(
        `✅ Masa ${table.table_number} bağlantısı kopyalandı.`
      );
    } catch (err) {
      console.error(
        err
      );

      setError(
        "Bağlantı kopyalanamadı."
      );
    }
  }

  /*
   * =====================================================
   * QR AÇ
   * =====================================================
   */

  function openQrUrl(table: RestaurantTable) {
    const url = getQrUrl(table);

    if (!url) {
      setError("QR bağlantısı oluşturulamadı.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  /*
   * =====================================================
   * QR YAZDIR
   * =====================================================
   */

  function printTableQr(table: RestaurantTable) {
    const canvas = document.getElementById(
      `qr-${table.id}`
    ) as HTMLCanvasElement | null;

    if (!canvas) {
      setError("QR kodu bulunamadı.");
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=500,height=650"
    );

    if (!printWindow) {
      setError("Yazdırma penceresi açılamadı. Tarayıcı açılır penceresine izin verin.");
      return;
    }

    const image = canvas.toDataURL("image/png");

    printWindow.document.write(`
      <!doctype html>
      <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <title>Masa ${table.table_number} QR</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
              text-align: center;
            }
            .card {
              border: 2px solid #111;
              border-radius: 20px;
              padding: 35px;
              width: 330px;
            }
            img {
              width: 270px;
              height: 270px;
            }
            h1 {
              margin: 0 0 20px;
              font-size: 30px;
            }
            p {
              font-size: 12px;
              color: #666;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Masa ${table.table_number}</h1>
            <img src="${image}" alt="Masa ${table.table_number} QR" />
            <p>QR kodu okutarak menüyü açın.</p>
          </div>
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  /*
   * =====================================================
   * TÜM QR'LARI YAZDIR
   * =====================================================
   */

  function printAllQrs() {
    if (filteredTables.length === 0) {
      setError("Yazdırılacak masa bulunamadı.");
      return;
    }

    const cards = filteredTables
      .map((table) => {
        const canvas = document.getElementById(
          `qr-${table.id}`
        ) as HTMLCanvasElement | null;

        if (!canvas) return "";

        return `
          <div class="card">
            <h2>Masa ${table.table_number}</h2>
            <img src="${canvas.toDataURL("image/png")}" />
            <p>QR kodu okutarak menüyü açın.</p>
          </div>
        `;
      })
      .join("");

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=900"
    );

    if (!printWindow) {
      setError("Yazdırma penceresi açılamadı.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <title>Restoran QR Kodları</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 25px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            .card {
              border: 2px solid #111;
              border-radius: 16px;
              padding: 20px;
              text-align: center;
              break-inside: avoid;
            }
            img {
              width: 190px;
              height: 190px;
            }
            h2 { margin: 0 0 12px; }
            p { font-size: 11px; color: #666; }
            @media print {
              body { margin: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${cards}
          </div>
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  /*
   * =====================================================
   * SEÇİLİ RESTORAN
   * =====================================================
   */

  const selectedRestaurant =
    restaurants.find(
      (restaurant) =>
        String(
          restaurant.id
        ) ===
        selectedRestaurantId
    );

  /*
   * =====================================================
   * FİLTRELENMİŞ MASALAR
   * =====================================================
   */

  const filteredTables = tables.filter((table) =>
    String(table.table_number)
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  /*
   * =====================================================
   * EKRAN
   * =====================================================
   */

  if (!canManageTables) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f3ef",
          padding: "30px 16px 60px",
          color: "#171717",
        }}
      >
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              background: "#171717",
              color: "#fff",
              borderRadius: "18px",
              padding: "28px 24px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                color: "#d99b08",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "1.5px",
                marginBottom: "6px",
              }}
            >
              MASA YÖNETİMİ
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "25px",
              }}
            >
              QR / NFC Masa Yönetimi
            </h1>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e7e2da",
              borderRadius: "18px",
              padding: "30px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                margin: "0 auto 15px",
                borderRadius: "50%",
                background: "#fff4e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
              }}
            >
              🔒
            </div>

            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "21px",
              }}
            >
              Erişim Yetkiniz Yok
            </h2>

            <p
              style={{
                margin: 0,
                color: "#777",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              Bu hesabın Masa Yönetimi yetkisi bulunmuyor.
              <br />
              İşletme yöneticisinden <strong>Masalar</strong> yetkisini istemelisiniz.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#f5f3ef",
        padding:
          "30px 16px 60px",
        color:
          "#171717",
      }}
    >
      <div
        style={{
          maxWidth:
            "1000px",
          margin:
            "0 auto",
        }}
      >

        {/* HEADER */}

        <header
          style={{
            background:
              "#171717",
            color:
              "#fff",
            borderRadius:
              "18px",
            padding:
              "28px 24px",
            marginBottom:
              "18px",
          }}
        >
          <div
            style={{
              color:
                "#d99b08",
              fontSize:
                "10px",
              fontWeight:
                800,
              letterSpacing:
                "1.5px",
              marginBottom:
                "6px",
            }}
          >
            MASA YÖNETİMİ
          </div>

          <h1
            style={{
              margin:
                0,
              fontSize:
                "25px",
            }}
          >
            QR / NFC Masa Yönetimi
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              color:
                "#cfcfcf",
              fontSize:
                "12px",
            }}
          >
            Her masa için benzersiz QR
            bağlantısı oluştur.
          </p>

          <a
            href="/admin"
            style={{
              display: "inline-block",
              marginTop: "14px",
              color: "#fff",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 800,
              opacity: 0.78,
            }}
          >
            ← Yönetim Paneline Dön
          </a>
        </header>

        {/* HATA */}

        {error && (
          <div
            style={{
              background:
                "#fff0f0",
              border:
                "1px solid #efb1b1",
              color:
                "#b42318",
              borderRadius:
                "12px",
              padding:
                "12px 15px",
              marginBottom:
                "15px",
              fontSize:
                "13px",
              fontWeight:
                700,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* BAÅARI */}

        {message && (
          <div
            style={{
              background:
                "#effaf2",
              border:
                "1px solid #b7e1c1",
              color:
                "#16733a",
              borderRadius:
                "12px",
              padding:
                "12px 15px",
              marginBottom:
                "15px",
              fontSize:
                "13px",
              fontWeight:
                700,
            }}
          >
            {message}
          </div>
        )}

        {/* RESTORAN */}

        <section
          style={{
            background:
              "#fff",
            borderRadius:
              "18px",
            padding:
              "20px",
            marginBottom:
              "15px",
            border:
              "1px solid #e7e2da",
          }}
        >
          <h3
            style={{
              margin:
                "0 0 10px",
              fontSize:
                "14px",
            }}
          >
            🏢 Restoran
          </h3>

          <div
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "10px",
              background: "#f8f8f8",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            {selectedRestaurant?.name ||
              "İşletme yükleniyor..."}
          </div>

          <small
            style={{
              display: "block",
              marginTop: "8px",
              color: "#888",
            }}
          >
            Bu hesap yalnızca kendi işletmesinin
            masalarını yönetebilir.
          </small>
        </section>

        {/* YENİ MASA */}

        <section
          style={{
            background:
              "#fff",
            borderRadius:
              "18px",
            padding:
              "20px",
            marginBottom:
              "25px",
            border:
              "1px solid #e7e2da",
          }}
        >
          <h3
            style={{
              margin:
                "0 0 12px",
              fontSize:
                "15px",
            }}
          >
            ＋ Yeni Masa Oluştur
          </h3>

          <div
            style={{
              display:
                "flex",
              gap:
                "8px",
              flexWrap:
                "wrap",
            }}
          >
            <input
              type="number"
              min="1"
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
              placeholder="Masa no"
              style={{
                width:
                  "150px",
                padding:
                  "11px",
                border:
                  "1px solid #ddd",
                borderRadius:
                  "10px",
              }}
            />

            <button
              type="button"
              onClick={
                createTable
              }
              disabled={
                loading
              }
              style={{
                padding:
                  "11px 18px",
                border:
                  "none",
                borderRadius:
                  "10px",
                background:
                  "#d99b08",
                color:
                  "#fff",
                fontWeight:
                  800,
                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  loading
                    ? 0.7
                    : 1,
              }}
            >
              {loading
                ? "Oluşturuluyor..."
                : "Masa Oluştur"}
            </button>
          </div>

          <small
            style={{
              display:
                "block",
              marginTop:
                "8px",
              color:
                "#888",
            }}
          >
            Örneğin: 1, 2, 3, 4...
          </small>
        </section>

        {/* TOPLU MASA OLUŞTUR */}

        <section
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "20px",
            marginBottom: "25px",
            border: "1px solid #e7e2da",
          }}
        >
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "15px",
            }}
          >
            ⚡ Toplu Masa Oluştur
          </h3>

          <p
            style={{
              margin: "0 0 14px",
              color: "#888",
              fontSize: "11px",
            }}
          >
            Örneğin 1 - 20 girerek eksik olan masaları tek seferde oluşturabilirsiniz.
          </p>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="number"
              min="1"
              value={bulkStart}
              onChange={(event) =>
                setBulkStart(event.target.value)
              }
              placeholder="Başlangıç"
              style={{ ...smallInputStyle }}
            />

            <input
              type="number"
              min="1"
              value={bulkEnd}
              onChange={(event) =>
                setBulkEnd(event.target.value)
              }
              placeholder="Bitiş"
              style={{ ...smallInputStyle }}
            />

            <button
              type="button"
              onClick={createBulkTables}
              disabled={loading}
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "11px 16px",
                background: "#171717",
                color: "#fff",
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Oluşturuluyor..." : "Toplu Oluştur"}
            </button>
          </div>
        </section>

        {/* MASALAR BAŞLIK */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom:
              "12px",
          }}
        >
          <div>
            <h2
              style={{
                margin:
                  0,
                fontSize:
                  "20px",
              }}
            >
              Masalar
            </h2>

            <small
              style={{
                color:
                  "#888",
              }}
            >
              {
                selectedRestaurant?.name ||
                "Restoran"
              }
            </small>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <strong>{tables.length} masa</strong>

              <span
                style={{
                  padding: "5px 9px",
                  borderRadius: "999px",
                  background: "#effaf2",
                  color: "#16733a",
                  fontSize: "10px",
                  fontWeight: 800,
                }}
              >
                🟢 {tables.filter((table) => table.is_active).length} aktif
              </span>

              <span
                style={{
                  padding: "5px 9px",
                  borderRadius: "999px",
                  background: "#f3f3f3",
                  color: "#777",
                  fontSize: "10px",
                  fontWeight: 800,
                }}
              >
                ⚪ {tables.filter((table) => !table.is_active).length} pasif
              </span>
            </div>

            <button
              type="button"
              onClick={printAllQrs}
              disabled={filteredTables.length === 0}
              style={{
                border: "1px solid #ddd",
                borderRadius: "9px",
                background: "#fff",
                padding: "8px 10px",
                fontSize: "10px",
                fontWeight: 800,
                cursor: filteredTables.length ? "pointer" : "not-allowed",
                opacity: filteredTables.length ? 1 : 0.5,
              }}
            >
              🖨️ Tümünü Yazdır
            </button>
          </div>
        </div>

        {/* ARAMA */}

        <div
          style={{
            marginBottom: "15px",
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="🔎 Masa ara..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              border: "1px solid #ddd",
              borderRadius: "11px",
              background: "#fff",
              outline: "none",
              fontSize: "13px",
            }}
          />
        </div>

        {/* MASA YOK */}

        {filteredTables.length ===
        0 ? (
          <div
            style={{
              background:
                "#fff",
              border:
                "1px solid #e7e2da",
              borderRadius:
                "18px",
              padding:
                "35px",
              textAlign:
                "center",
              color:
                "#888",
            }}
          >
            Henüz masa oluşturulmamış.
          </div>
        ) : (

          /* MASALAR */

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap:
                "15px",
            }}
          >
            {filteredTables.map(
              (
                table
              ) => {
                const qrUrl =
                  getQrUrl(
                    table
                  );

                return (
                  <div
                    key={
                      table.id
                    }
                    style={{
                      background:
                        "#fff",
                      border:
                        "1px solid #e7e2da",
                      borderRadius:
                        "18px",
                      padding:
                        "15px",
                      boxShadow:
                        "0 5px 18px rgba(0,0,0,0.04)",
                    }}
                  >

                    {/* MASA BAÅLIK */}

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        marginBottom:
                          "10px",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            display: "block",
                            fontSize: "17px",
                          }}
                        >
                          🚪 Masa {table.table_number}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: "3px",
                            color: "#999",
                            fontSize: "9px",
                            fontWeight: 700,
                            letterSpacing: "0.5px",
                          }}
                        >
                          QR / NFC MASA BAĞLANTISI
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize:
                            "10px",
                          fontWeight:
                            800,
                          color:
                            table.is_active
                              ? "#16803c"
                              : "#b42318",
                        }}
                      >
                        ●{" "}
                        {
                          table.is_active
                            ? "AKTİF"
                            : "PASİF"
                        }
                      </span>
                    </div>

                    {/* QR */}

                    <div
                      style={{
                        background:
                          "#fafafa",
                        borderRadius:
                          "12px",
                        padding:
                          "15px",
                        display:
                          "flex",
                        justifyContent:
                          "center",
                        marginBottom:
                          "10px",
                      }}
                    >
                      {qrUrl ? (
                        <QRCodeCanvas
                          id={`qr-${table.id}`}
                          value={
                            qrUrl
                          }
                          size={
                            170
                          }
                          level="H"
                          includeMargin
                        />
                      ) : (
                        <div
                          style={{
                            width:
                              "170px",
                            height:
                              "170px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            textAlign:
                              "center",
                            fontSize:
                              "11px",
                            color:
                              "#b42318",
                          }}
                        >
                          Restoran slug
                          bulunamadı.
                        </div>
                      )}
                    </div>

                    {/* URL */}

                    <div
                      style={{
                        background:
                          "#f7f7f7",
                        borderRadius:
                          "8px",
                        padding:
                          "8px",
                        fontSize:
                          "8px",
                        color:
                          "#777",
                        wordBreak:
                          "break-all",
                        marginBottom:
                          "9px",
                      }}
                    >
                      {qrUrl ||
                        "QR bağlantısı oluşturulamadı."}
                    </div>

                    {/* QR BUTONLARI */}

                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(3, 1fr)",
                        gap:
                          "7px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          downloadQr(
                            table
                          )
                        }
                        disabled={
                          !qrUrl
                        }
                        style={{
                          border:
                            "none",
                          borderRadius:
                            "9px",
                          background:
                            "#171717",
                          color:
                            "#fff",
                          padding:
                            "10px",
                          fontSize:
                            "11px",
                          fontWeight:
                            800,
                          cursor:
                            qrUrl
                              ? "pointer"
                              : "not-allowed",
                          opacity:
                            qrUrl
                              ? 1
                              : 0.5,
                        }}
                      >
                        ⬇ QR İndir
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          copyUrl(
                            table
                          )
                        }
                        disabled={
                          !qrUrl
                        }
                        style={{
                          border:
                            "1px solid #ddd",
                          borderRadius:
                            "9px",
                          background:
                            "#fff",
                          padding:
                            "10px",
                          fontSize:
                            "11px",
                          fontWeight:
                            800,
                          cursor:
                            qrUrl
                              ? "pointer"
                              : "not-allowed",
                          opacity:
                            qrUrl
                              ? 1
                              : 0.5,
                        }}
                      >
                        🔗 Kopyala
                      </button>

                      <button
                        type="button"
                        onClick={() => openQrUrl(table)}
                        disabled={!qrUrl}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "9px",
                          background: "#fff",
                          padding: "10px 5px",
                          fontSize: "10px",
                          fontWeight: 800,
                          cursor: qrUrl ? "pointer" : "not-allowed",
                          opacity: qrUrl ? 1 : 0.5,
                        }}
                      >
                        ↗ QR Aç
                      </button>

                      <button
                        type="button"
                        onClick={() => printTableQr(table)}
                        disabled={!qrUrl}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "9px",
                          background: "#fff",
                          padding: "10px 5px",
                          fontSize: "10px",
                          fontWeight: 800,
                          cursor: qrUrl ? "pointer" : "not-allowed",
                          opacity: qrUrl ? 1 : 0.5,
                        }}
                      >
                        🖨️ Yazdır
                      </button>
                    </div>

                    {/* DÜZENLE / SİL */}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "7px",
                        marginTop: "7px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => startEditTable(table)}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "9px",
                          background: "#fff",
                          color: "#333",
                          padding: "10px",
                          fontSize: "11px",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Düzenle
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteTable(table)}
                        disabled={deletingTableId === table.id}
                        style={{
                          border: "none",
                          borderRadius: "9px",
                          background: "#fff0f0",
                          color: "#b42318",
                          padding: "10px",
                          fontSize: "11px",
                          fontWeight: 800,
                          cursor: deletingTableId === table.id ? "not-allowed" : "pointer",
                          opacity: deletingTableId === table.id ? 0.6 : 1,
                        }}
                      >
                        {deletingTableId === table.id ? "Siliniyor..." : "🗑️ Sil"}
                      </button>
                    </div>

                    {/* AKTİF / PASİF */}

                    <button
                      type="button"
                      onClick={() =>
                        toggleTable(
                          table
                        )
                      }
                      style={{
                        width:
                          "100%",
                        marginTop:
                          "7px",
                        border:
                          "none",
                        borderRadius:
                          "9px",
                        background:
                          table.is_active
                            ? "#fff0f0"
                            : "#effaf2",
                        color:
                          table.is_active
                            ? "#c62828"
                            : "#16733a",
                        padding:
                          "10px",
                        fontSize:
                          "11px",
                        fontWeight:
                          800,
                        cursor:
                          "pointer",
                      }}
                    >
                      {table.is_active
                        ? "Masa Pasif Yap"
                        : "Masa Aktif Yap"}
                    </button>

                    {/* TOKEN */}

                    <div
                      style={{
                        marginTop:
                          "8px",
                        color:
                          "#aaa",
                        fontSize:
                          "8px",
                        textAlign:
                          "center",
                        wordBreak:
                          "break-all",
                      }}
                    >
                      Token:{" "}
                      {
                        table.public_token
                      }
                    </div>

                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* DÜZENLEME PENCERESİ */}

      {editingTable && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 99999,
          }}
          onClick={cancelEditTable}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              background: "#fff",
              borderRadius: "18px",
              padding: "22px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              style={{
                margin: "0 0 6px",
                fontSize: "20px",
              }}
            >
              ✏️ Masa Düzenle
            </h2>

            <p
              style={{
                margin: "0 0 16px",
                color: "#777",
                fontSize: "12px",
              }}
            >
              Masa {editingTable.table_number} numarasını değiştirebilirsiniz.
            </p>

            <input
              type="number"
              min="1"
              value={editNumber}
              onChange={(event) => setEditNumber(event.target.value)}
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px",
                border: "1px solid #ddd",
                borderRadius: "10px",
                fontSize: "15px",
                outline: "none",
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                marginTop: "14px",
              }}
            >
              <button
                type="button"
                onClick={cancelEditTable}
                style={{
                  border: "1px solid #ddd",
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={saveEditTable}
                disabled={loading}
                style={{
                  border: "none",
                  background: "#171717",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "12px",
                  fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const smallInputStyle = {
  width: "120px",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  border: "1px solid #ddd",
  borderRadius: "10px",
  background: "#fff",
  fontSize: "13px",
  outline: "none",
};
