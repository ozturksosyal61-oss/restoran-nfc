"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { createClient } from "../../../lib/supabase/client";
import NfcWriter from "./NfcWriter";
import AdminIcon from "../AdminIcon";
import { SITE_URL } from "../../../lib/site";

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

const APP_URL = SITE_URL;
  
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
     * https://restoran-nfc.vercel.app
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
      <main className="adm-page">
        <header className="adm-head">
          <div className="adm-head-text">
            <span className="adm-eyebrow">İşletme</span>
            <h1>Masalar</h1>
          </div>
        </header>
        <div className="adm-lock">
          <span className="adm-badge s-accent">
            <AdminIcon name="lock" size={12} /> Yetki gerekli
          </span>
          <h2>Masa yönetimi yetkiniz yok</h2>
          <p>
            Bu hesap masaları yönetemiyor. İşletme yöneticisinden
            <strong> Masalar </strong>
            yetkisini isteyin.
          </p>
        </div>
      </main>
    );
  }

  const activeCount = tables.filter((table) => table.is_active).length;

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">İşletme</span>
          <h1>Masalar</h1>
          <p>
            Her masanın kendine ait QR ve NFC bağlantısı vardır. Müşteri bu
            bağlantıyla sipariş verir, garson çağırır.
          </p>
        </div>
        <div className="adm-head-actions">
          <button
            type="button"
            className="adm-btn"
            onClick={printAllQrs}
            disabled={filteredTables.length === 0}
          >
            <AdminIcon name="download" size={16} />
            Tüm QR&apos;ları yazdır
          </button>
        </div>
      </header>

      {error && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          {error.replace(/^⚠️\s*/, "")}
        </p>
      )}

      {message && (
        <p className="adm-alert adm-alert-ok" role="status">
          <AdminIcon name="check" size={16} />
          {message.replace(/^[✓✅]\s*/, "")}
        </p>
      )}

      <section className="adm-stats" aria-label="Masa özeti">
        <div className="adm-stat">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Toplam masa</span>
            <span className="adm-stat-icon"><AdminIcon name="table" size={16} /></span>
          </div>
          <span className="adm-stat-value">{tables.length}</span>
          <span className="adm-stat-hint">{selectedRestaurant?.name || "İşletme yükleniyor…"}</span>
        </div>
        <div className="adm-stat tone-ok">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Aktif</span>
            <span className="adm-stat-icon"><AdminIcon name="check" size={16} /></span>
          </div>
          <span className="adm-stat-value">{activeCount}</span>
          <span className="adm-stat-hint">Sipariş alabilir</span>
        </div>
        <div className="adm-stat tone-done">
          <div className="adm-stat-top">
            <span className="adm-stat-label">Pasif</span>
            <span className="adm-stat-icon"><AdminIcon name="eyeOff" size={16} /></span>
          </div>
          <span className="adm-stat-value">{tables.length - activeCount}</span>
          <span className="adm-stat-hint">QR kodu çalışmaz</span>
        </div>
      </section>

      {/* ============ MASA EKLE ============ */}
      <section className="adm-card" aria-labelledby="masa-ekle">
        <div className="adm-card-head">
          <div>
            <h2 id="masa-ekle">Masa ekle</h2>
            <p>Tek bir masa ya da bir aralıktaki eksik masaların hepsini ekleyin.</p>
          </div>
        </div>

        <div className="adm-add-grid">
          <form
            className="adm-add"
            onSubmit={(event) => {
              event.preventDefault();
              void createTable();
            }}
          >
            <label className="adm-label" htmlFor="masa-no">Tek masa</label>
            <div className="adm-add-row">
              <input
                id="masa-no"
                className="adm-input"
                type="number"
                min="1"
                inputMode="numeric"
                value={tableNumber}
                onChange={(event) => setTableNumber(event.target.value)}
                placeholder="Masa no, örn. 12"
              />
              <button type="submit" className="adm-btn adm-btn-primary" disabled={loading}>
                <AdminIcon name="plus" size={16} />
                {loading ? "Ekleniyor…" : "Ekle"}
              </button>
            </div>
          </form>

          <form
            className="adm-add"
            onSubmit={(event) => {
              event.preventDefault();
              void createBulkTables();
            }}
          >
            <label className="adm-label" htmlFor="masa-bas">Toplu ekle</label>
            <div className="adm-add-row">
              <input
                id="masa-bas"
                className="adm-input"
                type="number"
                min="1"
                inputMode="numeric"
                value={bulkStart}
                onChange={(event) => setBulkStart(event.target.value)}
                placeholder="1"
                aria-label="Başlangıç masa numarası"
              />
              <span className="adm-muted">–</span>
              <input
                className="adm-input"
                type="number"
                min="1"
                inputMode="numeric"
                value={bulkEnd}
                onChange={(event) => setBulkEnd(event.target.value)}
                placeholder="20"
                aria-label="Bitiş masa numarası"
              />
              <button type="submit" className="adm-btn" disabled={loading}>
                {loading ? "Ekleniyor…" : "Aralığı ekle"}
              </button>
            </div>
            <span className="adm-hint">Var olan masalar atlanır, yalnızca eksikler eklenir.</span>
          </form>
        </div>
      </section>

      {/* ============ MASALAR ============ */}
      <section className="adm-section" aria-labelledby="masa-listesi">
        <div className="adm-section-head">
          <div>
            <h2 id="masa-listesi">Masa kodları</h2>
            <p>QR&apos;ı indirip basabilir ya da NFC etikete yazabilirsiniz.</p>
          </div>
          <label className="adm-input-group" style={{ width: "min(280px, 100%)" }}>
            <AdminIcon name="search" size={16} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Masa ara"
              aria-label="Masa ara"
            />
          </label>
        </div>

        {filteredTables.length === 0 ? (
          <div className="adm-empty">
            <span className="adm-empty-icon"><AdminIcon name="table" /></span>
            <strong>{tables.length === 0 ? "Henüz masa yok" : "Eşleşen masa yok"}</strong>
            <p>
              {tables.length === 0
                ? "Yukarıdan ilk masanızı ekleyin; QR kodu hemen oluşur."
                : "Farklı bir masa numarası deneyin."}
            </p>
          </div>
        ) : (
          <div className="adm-table-grid">
            {filteredTables.map((table) => {
              const qrUrl = getQrUrl(table);
              const deleting = deletingTableId === table.id;

              return (
                <article key={table.id} className={`adm-qr-card ${table.is_active ? "" : "is-off"}`}>
                  <div className="adm-qr-head">
                    <strong>Masa {table.table_number}</strong>
                    <span className={`adm-badge is-dot ${table.is_active ? "s-ok" : "s-delivered"}`}>
                      {table.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </div>

                  <div className="adm-qr-code">
                    {qrUrl ? (
                      <QRCodeCanvas
                        id={`qr-${table.id}`}
                        value={qrUrl}
                        size={164}
                        level="H"
                        includeMargin
                      />
                    ) : (
                      <span className="adm-hint">Restoran adresi bulunamadı.</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="adm-qr-url"
                    onClick={() => copyUrl(table)}
                    disabled={!qrUrl}
                    title="Bağlantıyı kopyala"
                  >
                    <span>{qrUrl || "QR bağlantısı oluşturulamadı"}</span>
                    <AdminIcon name="copy" size={14} />
                  </button>

                  <div className="adm-qr-actions">
                    <button type="button" className="adm-btn adm-btn-sm" onClick={() => downloadQr(table)} disabled={!qrUrl}>
                      <AdminIcon name="download" size={15} />
                      İndir
                    </button>
                    <button type="button" className="adm-btn adm-btn-sm" onClick={() => printTableQr(table)} disabled={!qrUrl}>
                      <AdminIcon name="orders" size={15} />
                      Yazdır
                    </button>
                    <button type="button" className="adm-btn adm-btn-sm" onClick={() => openQrUrl(table)} disabled={!qrUrl}>
                      <AdminIcon name="external" size={15} />
                      Aç
                    </button>
                  </div>

                  <NfcWriter url={qrUrl} tableNumber={table.table_number} />

                  <div className="adm-qr-foot">
                    <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => startEditTable(table)}>
                      <AdminIcon name="edit" size={15} />
                      Numara
                    </button>
                    <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => toggleTable(table)}>
                      <AdminIcon name={table.is_active ? "eyeOff" : "eye"} size={15} />
                      {table.is_active ? "Pasif yap" : "Aktif yap"}
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn-sm adm-btn-ghost adm-text-danger"
                      onClick={() => deleteTable(table)}
                      disabled={deleting}
                      aria-label={`Masa ${table.table_number} sil`}
                    >
                      <AdminIcon name="trash" size={15} />
                      {deleting ? "Siliniyor…" : "Sil"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ============ NUMARA DÜZENLE ============ */}
      {editingTable && (
        <div className="adm-modal-root" role="dialog" aria-modal="true" aria-labelledby="masa-duzenle">
          <button type="button" className="adm-modal-backdrop" aria-label="Kapat" onClick={cancelEditTable} />
          <form
            className="adm-modal"
            onSubmit={(event) => {
              event.preventDefault();
              void saveEditTable();
            }}
          >
            <div>
              <h2 id="masa-duzenle">Masa numarasını değiştir</h2>
              <p className="adm-muted" style={{ margin: "4px 0 0" }}>
                Masa {editingTable.table_number} için yeni numara girin. QR bağlantısı aynı kalır.
              </p>
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="masa-yeni-no">Yeni numara</label>
              <input
                id="masa-yeni-no"
                className="adm-input"
                type="number"
                min="1"
                inputMode="numeric"
                value={editNumber}
                onChange={(event) => setEditNumber(event.target.value)}
                autoFocus
              />
            </div>
            <div className="adm-form-actions">
              <button type="button" className="adm-btn" onClick={cancelEditTable}>Vazgeç</button>
              <button type="submit" className="adm-btn adm-btn-primary" disabled={loading}>
                {loading ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
