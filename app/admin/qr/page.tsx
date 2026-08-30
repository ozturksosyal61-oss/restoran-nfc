import Link from "next/link";
import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import NfcUrlActions from "./NfcUrlActions";

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
      <main className="admin-page">
        <section className="admin-header">
          <Link href="/admin">← Admin Paneli</Link>

          <h1>QR Kod Yönetimi</h1>

          <p>İşletme bağlantısı bulunamadı.</p>
        </section>
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
      <main className="admin-page">
        <section className="admin-header">
          <Link href="/admin">← Admin Paneli</Link>

          <h1>QR Kod Yönetimi</h1>

          <p>İşletme bilgileri bulunamadı.</p>
        </section>
      </main>
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  /*
    =====================================================
    GENEL QR
    =====================================================
  */

  const restaurantUrl =
    `${baseUrl}/restoran/${restaurant.slug}`;

  const generalQrCode = await QRCode.toDataURL(
    restaurantUrl,
    {
      width: 500,
      margin: 2,
      errorCorrectionLevel: "H",
    }
  );

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

  return (
    <main className="admin-page">

      {/* HEADER */}

      <section className="admin-header">

        <Link href="/admin">
          ← Admin Paneli
        </Link>

        <h1>QR Kod Yönetimi</h1>

        <p>
          İşletmenizin genel QR kodunu veya
          masa bazlı QR kodlarını oluşturabilirsiniz.
        </p>

      </section>


      {/* =================================================
          GENEL QR
          ================================================= */}

      <section
        style={{
          maxWidth: "700px",
          margin: "30px auto",
        }}
      >

        <div
          style={{
            background: "#fff",
            borderRadius: "24px",
            padding: "35px",
            boxShadow:
              "0 15px 40px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >

          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={`${restaurant.name} logosu`}
              style={{
                width: "90px",
                height: "90px",
                objectFit: "contain",
                borderRadius: "18px",
                marginBottom: "18px",
              }}
            />
          ) : (
            <div
              style={{
                width: "90px",
                height: "90px",
                margin: "0 auto 18px",
                borderRadius: "18px",
                background: "#111",
                color: "#d4a017",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: 900,
              }}
            >
              OZT
            </div>
          )}

          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "28px",
              fontWeight: 900,
            }}
          >
            {restaurant.name}
          </h2>

          <p
            style={{
              margin: "0 0 25px",
              color: "#777",
              fontSize: "14px",
            }}
          >
            Genel Dijital Menü QR Kodu
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "25px",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "18px",
                borderRadius: "20px",
                border: "1px solid #eee",
              }}
            >
              <img
                src={generalQrCode}
                alt={`${restaurant.name} QR kodu`}
                style={{
                  width: "300px",
                  height: "300px",
                  display: "block",
                }}
              />
            </div>
          </div>

          <div
            style={{
              background: "#f7f5f0",
              borderRadius: "12px",
              padding: "12px 15px",
              marginBottom: "20px",
              wordBreak: "break-all",
              fontSize: "12px",
              color: "#666",
            }}
          >
            {restaurantUrl}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >

            <a
              href={restaurantUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "12px 18px",
                borderRadius: "10px",
                background: "#111",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              👁️ Sayfayı Gör
            </a>

            <a
              href={generalQrCode}
              download={`${restaurant.slug}-genel-qr.png`}
              style={{
                padding: "12px 18px",
                borderRadius: "10px",
                background: "#d4a017",
                color: "#111",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              📥 QR Kodunu İndir
            </a>

          </div>

        </div>

      </section>


      {/* =================================================
          QR / NFC ÖZETİ
          ================================================= */}

      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto 24px",
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e1d7",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <div style={{ fontSize: "20px", marginBottom: "7px" }}>
            🪑
          </div>
          <div
            style={{
              color: "#888",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            TOPLAM MASA
          </div>
          <strong style={{ fontSize: "24px" }}>
            {tableQrs.length}
          </strong>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e1d7",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <div style={{ fontSize: "20px", marginBottom: "7px" }}>
            🟢
          </div>
          <div
            style={{
              color: "#888",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            AKTİF MASA
          </div>
          <strong style={{ fontSize: "24px" }}>
            {tableQrs.filter((table) => table.isActive).length}
          </strong>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e1d7",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <div style={{ fontSize: "20px", marginBottom: "7px" }}>
            ⚪
          </div>
          <div
            style={{
              color: "#888",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            PASİF MASA
          </div>
          <strong style={{ fontSize: "24px" }}>
            {tableQrs.filter((table) => !table.isActive).length}
          </strong>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e1d7",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <div style={{ fontSize: "20px", marginBottom: "7px" }}>
            📱
          </div>
          <div
            style={{
              color: "#888",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            QR HAZIR
          </div>
          <strong style={{ fontSize: "24px" }}>
            {tableQrs.length}
          </strong>
        </div>
      </section>

      {/* =================================================
          MASA QR'LARI
          ================================================= */}

      <section
        style={{
          maxWidth: "1100px",
          margin: "40px auto",
        }}
      >

        <div
          style={{
            marginBottom: "20px",
          }}
        >

          <span
            style={{
              color: "#c8941d",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "2px",
            }}
          >
            MASA YÖNETİMİ
          </span>

          <h2
            style={{
              margin: "5px 0",
              fontSize: "28px",
            }}
          >
            Masa QR Kodları
          </h2>

          <p
            style={{
              color: "#777",
              fontSize: "13px",
            }}
          >
            Her masanın QR kodunu ayrı ayrı indirip
            masalara yerleştirebilirsiniz.
          </p>

        </div>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "20px",
          }}
        >

          {tableQrs.map((table) => (

            <div
              key={table.tableNumber}
              style={{
                background: "#fff",
                borderRadius: "20px",
                padding: "22px",
                boxShadow:
                  "0 10px 30px rgba(0,0,0,0.06)",
                textAlign: "center",
              }}
            >

              <h3
                style={{
                  margin: "0 0 15px",
                  fontSize: "22px",
                }}
              >
                🪑 Masa {table.tableNumber}
              </h3>
              <div
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "15px",
    padding: "6px 10px",
    borderRadius: "999px",
    background: table.isActive
      ? "#eaf8ef"
      : "#fcebea",
    color: table.isActive
      ? "#16803c"
      : "#b42318",
    fontSize: "11px",
    fontWeight: 800,
  }}
>
  <span>
    {table.isActive ? "●" : "●"}
  </span>

  {table.isActive
    ? " AKTİF"
    : " PASİF"}
</div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "15px",
                }}
              >

                <div
                  style={{
                    padding: "10px",
                    border: "1px solid #eee",
                    borderRadius: "14px",
                  }}
                >

                  <img
                    src={table.qrCode}
                    alt={`Masa ${table.tableNumber} QR kodu`}
                    style={{
                      width: "190px",
                      height: "190px",
                      display: "block",
                    }}
                  />

                </div>

              </div>

              <p
                style={{
                  fontSize: "11px",
                  color: "#888",
                  wordBreak: "break-all",
                  marginBottom: "15px",
                }}
              >
                {table.tableUrl}
              </p>

              <a
                href={table.qrCode}
                download={`${restaurant.slug}-masa-${table.tableNumber}-qr.png`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "11px 16px",
                  borderRadius: "10px",
                  background: "#d4a017",
                  color: "#111",
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: "12px",
                  width: "100%",
                }}
              >
                📥 Masa {table.tableNumber} QR İndir
              </a>
              <div
  style={{
    marginTop: "14px",
    paddingTop: "14px",
    borderTop: "1px solid #eee",
    textAlign: "left",
  }}
>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "7px",
      marginBottom: "6px",
    }}
  >
    <span style={{ fontSize: "17px" }}>
      📲
    </span>

    <strong
      style={{
        fontSize: "13px",
        color: "#222",
      }}
    >
      NFC Kart
    </strong>
  </div>

  <p
    style={{
      margin: "0 0 8px",
      fontSize: "11px",
      color: "#777",
      lineHeight: 1.5,
    }}
  >
    Bu bağlantıyı NFC kartına URL olarak
    yazabilirsiniz.
  </p>

  <div
    style={{
      background: "#f7f5f0",
      borderRadius: "10px",
      padding: "9px 10px",
      fontSize: "10px",
      color: "#666",
      wordBreak: "break-all",
      lineHeight: 1.45,
    }}
  >
    {table.tableUrl}
  </div>

  <NfcUrlActions
    url={table.tableUrl}
  />
</div>

            </div>

          ))}

        </div>

      </section>


      {/* BİLGİ */}

      <section
        style={{
          maxWidth: "700px",
          margin: "0 auto 50px",
        }}
      >

        <div
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "22px",
            border: "1px solid #eee",
          }}
        >

          <h3
            style={{
              marginTop: 0,
            }}
          >
            📱 Sistem Nasıl Çalışır?
          </h3>

          <ol
            style={{
              color: "#666",
              lineHeight: 1.8,
              fontSize: "13px",
            }}
          >

            <li>
              Örneğin Masa 5 QR kodunu Masa 5'e koyarsınız.
            </li>

            <li>
              Müşteri QR kodu telefonuyla okutur.
            </li>

            <li>
              Masa 5'in dijital menüsü açılır.
            </li>

            <li>
              Müşteri sipariş verirken masa numarası
              otomatik olarak Masa 5 olur.
            </li>

            <li>
              Admin panelindeki siparişte
              <strong> Masa 5 </strong>
              görünür.
            </li>

          </ol>

        </div>

      </section>

    </main>
  );
}
