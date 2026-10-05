import Link from "next/link";
import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { readMenuOnly, restaurantMenuPath } from "../../../lib/restaurant-type";
import AdminIcon from "../AdminIcon";
import { SITE_URL } from "../../../lib/site";

export const dynamic = "force-dynamic";

export default async function AdminQRPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .single();

  if (membershipError || !membership) {
    return (
      <main className="adm-page">
        <div className="adm-empty">
          <strong>İşletme bağlantısı bulunamadı.</strong>
        </div>
      </main>
    );
  }

  const { data: restaurant, error: restaurantError } =
    await supabase
      .from("restaurants")
      .select("id, name, slug, logo_url, table_count")
      .eq("id", membership.restaurant_id)
      .single();

  if (restaurantError || !restaurant) {
    return (
      <main className="adm-page">
        <div className="adm-empty">
          <strong>İşletme bilgileri bulunamadı.</strong>
        </div>
      </main>
    );
  }

  const baseUrl = SITE_URL;

  // Sadece menü restoranında masa yok; tek QR doğrudan menüye açılır.
  const menuOnly = await readMenuOnly(supabase, Number(restaurant.id));

  /*
    =====================================================
    GENEL QR
    =====================================================
  */

  const restaurantUrl = menuOnly
    ? `${baseUrl}${restaurantMenuPath(restaurant.slug)}`
    : `${baseUrl}/restoran/${restaurant.slug}`;

  const generalQrCode = await QRCode.toDataURL(
    restaurantUrl,
    {
      width: 500,
      margin: 2,
      errorCorrectionLevel: "H",
    }
  );

  if (menuOnly) {
    return (
      <main className="adm-page">
        <header className="adm-head">
          <div className="adm-head-text">
            <span className="adm-eyebrow">Menü</span>
            <h1>QR kod</h1>
            <p>Tek bir QR kod yeterli. Tüm masalara, vitrine ve broşüre aynı kodu koyabilirsiniz.</p>
          </div>
        </header>

        <section className="adm-card adm-general-qr" aria-labelledby="menu-qr">
          <div className="adm-general-qr-code">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generalQrCode} alt={`${restaurant.name} menü QR kodu`} />
          </div>
          <div className="adm-general-qr-text">
            <span className="adm-badge s-accent">Dijital menü</span>
            <h2 id="menu-qr">{restaurant.name}</h2>
            <p>
              Müşteri kodu okuttuğunda doğrudan menünüz açılır. Menüde yaptığınız
              değişiklikler anında görünür; kodu yeniden basmanız gerekmez.
            </p>
            <code className="adm-code">{restaurantUrl}</code>
            <div className="adm-head-actions">
              <a
                className="adm-btn adm-btn-primary"
                href={generalQrCode}
                download={`${restaurant.slug}-menu-qr.png`}
              >
                <AdminIcon name="download" size={16} />
                QR&apos;ı indir
              </a>
              <a className="adm-btn" href={restaurantUrl} target="_blank" rel="noopener noreferrer">
                <AdminIcon name="external" size={16} />
                Menüyü aç
              </a>
            </div>
          </div>
        </section>

        <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
          <AdminIcon name="info" size={16} />
          NFC etiketi kullanacaksanız etikete bu adresi yazmanız yeterli.
        </p>
      </main>
    );
  }

  /*
    =====================================================
    MASA QR'LARI
    =====================================================
    
    Şimdilik 1-20 arası masa oluşturuyoruz.
    Daha sonra işletme bazında masa sayısını
    dinamik hale getirebiliriz.
  */

 
  const { data: tables, error: tablesError } =
  await supabase
    .from("restaurant_tables")
    .select(
      "id, table_number, public_token, is_active"
    )
    .eq(
      "restaurant_id",
      restaurant.id
    )
    .order(
      "table_number",
      { ascending: true }
    );

if (tablesError) {
  console.error(
    "Masa bilgileri alınamadı:",
    tablesError
  );
}

const tableQrs = await Promise.all(
  (tables || []).map(
    async (table) => {
      const tableUrl =
        `${baseUrl}/restoran/${restaurant.slug}?masa=${table.public_token}`;

      const qrCode =
        await QRCode.toDataURL(
          tableUrl,
          {
            width: 400,
            margin: 2,
            errorCorrectionLevel: "H",
          }
        );

      return {
        id: table.id,
        tableNumber:
          table.table_number,
        publicToken:
          table.public_token,
        isActive:
          table.is_active,
        tableUrl,
        qrCode,
      };
    }
  )
);

  const activeCount = tableQrs.filter((table) => table.isActive).length;

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">İşletme</span>
          <h1>QR ve NFC</h1>
          <p>Genel QR menüyü gösterir; masa QR&apos;ları siparişi o masaya bağlar.</p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn" href="/admin/tables">
            <AdminIcon name="table" size={16} />
            Masaları yönet
          </Link>
        </div>
      </header>

      {/* ============ GENEL QR ============ */}
      <section className="adm-card adm-general-qr" aria-labelledby="genel-qr">
        <div className="adm-general-qr-code">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={generalQrCode} alt={`${restaurant.name} genel menü QR kodu`} />
        </div>
        <div className="adm-general-qr-text">
          <span className="adm-badge s-accent">Genel menü</span>
          <h2 id="genel-qr">{restaurant.name}</h2>
          <p>
            Vitrin, broşür ya da Instagram için. Bu kodla gelen müşteri menüyü görür
            ama sipariş veremez; sipariş için masa QR&apos;ı gerekir.
          </p>
          <code className="adm-code">{restaurantUrl}</code>
          <div className="adm-head-actions">
            <a
              className="adm-btn adm-btn-primary"
              href={generalQrCode}
              download={`${restaurant.slug}-genel-qr.png`}
            >
              <AdminIcon name="download" size={16} />
              QR&apos;ı indir
            </a>
            <a className="adm-btn" href={restaurantUrl} target="_blank" rel="noopener noreferrer">
              <AdminIcon name="external" size={16} />
              Sayfayı aç
            </a>
          </div>
        </div>
      </section>

      {/* ============ MASA QR'LARI ============ */}
      <section className="adm-section" aria-labelledby="masa-qr">
        <div className="adm-section-head">
          <div>
            <h2 id="masa-qr">Masa QR kodları</h2>
            <p>
              {tableQrs.length} masa · {activeCount} aktif. Pasif masaların kodu sipariş almaz.
            </p>
          </div>
        </div>

        {tableQrs.length === 0 ? (
          <div className="adm-empty">
            <span className="adm-empty-icon"><AdminIcon name="qr" /></span>
            <strong>Henüz masa yok</strong>
            <p>Masalar sayfasından masa eklediğinizde her birinin QR kodu burada oluşur.</p>
            <Link className="adm-btn adm-btn-primary" href="/admin/tables">
              <AdminIcon name="plus" size={16} />
              Masa ekle
            </Link>
          </div>
        ) : (
          <div className="adm-qr-gallery">
            {tableQrs.map((table) => (
              <article key={table.id} className={`adm-qr-mini ${table.isActive ? "" : "is-off"}`}>
                <div className="adm-qr-head">
                  <strong>Masa {table.tableNumber}</strong>
                  <span className={`adm-badge is-dot ${table.isActive ? "s-ok" : "s-delivered"}`}>
                    {table.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={table.qrCode} alt={`Masa ${table.tableNumber} QR kodu`} />
                <a
                  className="adm-btn adm-btn-sm adm-btn-block"
                  href={table.qrCode}
                  download={`${restaurant.slug}-masa-${table.tableNumber}-qr.png`}
                >
                  <AdminIcon name="download" size={15} />
                  İndir
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
