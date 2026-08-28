import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createServerSupabaseClient } from "../../../lib/supabase-server";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();

  /* =====================================================
     KULLANICI
     ===================================================== */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  /* =====================================================
     RESTORAN BAĞLANTISI
     ===================================================== */

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return (
      <main className="admin-page">
        <section className="admin-header">
          <a href="/admin">
            ← Admin Paneli
          </a>

          <h1>İşletme Ayarları</h1>

          <p>
            İşletme bağlantısı bulunamadı.
          </p>
        </section>
      </main>
    );
  }

  /* =====================================================
     RESTORAN
     ===================================================== */

  const {
    data: restaurant,
    error: restaurantError,
  } = await supabase
    .from("restaurants")
    .select(
      `
      id,
      name,
      slug,
      description,
      instagram_url,
      google_review_url,
      logo_url,
      table_count
      `
    )
    .eq("id", membership.restaurant_id)
    .single();

  if (restaurantError || !restaurant) {
    return (
      <main className="admin-page">
        <section className="admin-header">
          <a href="/admin">
            ← Admin Paneli
          </a>

          <h1>İşletme Ayarları</h1>

          <p>
            İşletme bulunamadı.
          </p>
        </section>
      </main>
    );
  }

  /* =====================================================
     RESTORAN GÜNCELLE
     ===================================================== */

  async function updateRestaurant(formData: FormData) {
    "use server";

    /* ===================================================
       FORM VERİLERİ
       =================================================== */

    const name =
      formData
        .get("name")
        ?.toString()
        .trim() || "";

    const description =
      formData
        .get("description")
        ?.toString()
        .trim() || "";

    const instagramUrl =
      formData
        .get("instagram_url")
        ?.toString()
        .trim() || "";

    const googleReviewUrl =
      formData
        .get("google_review_url")
        ?.toString()
        .trim() || "";

    const logoFile =
      formData.get("logo") as File | null;

    const tableCountValue =
      formData
        .get("table_count")
        ?.toString()
        .trim() || "20";

    const tableCount =
      Number(tableCountValue);

    /* ===================================================
       KONTROLLER
       =================================================== */

    if (!name) {
      throw new Error(
        "İşletme adı zorunludur."
      );
    }

    if (
      !Number.isInteger(tableCount) ||
      tableCount < 1 ||
      tableCount > 500
    ) {
      throw new Error(
        "Masa sayısı 1 ile 500 arasında olmalıdır."
      );
    }

    /* ===================================================
       SUPABASE
       =================================================== */

    const supabase =
      await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/admin/login");
    }

    /* ===================================================
       MEMBERSHIP
       =================================================== */

    const { data: membership } =
      await supabase
        .from("restaurant_users")
        .select("restaurant_id")
        .eq("user_id", user.id)
        .single();

    if (!membership) {
      throw new Error(
        "İşletme bağlantısı bulunamadı."
      );
    }

    /* ===================================================
       MEVCUT RESTORAN
       =================================================== */

    const {
      data: currentRestaurant,
    } = await supabase
      .from("restaurants")
      .select(
        `
        id,
        slug,
        logo_url
        `
      )
      .eq(
        "id",
        membership.restaurant_id
      )
      .single();

    if (!currentRestaurant) {
      throw new Error(
        "İşletme bulunamadı."
      );
    }

    /* ===================================================
       LOGO
       =================================================== */

    let logoUrl =
      currentRestaurant.logo_url ||
      null;

    /* ===================================================
       YENİ LOGO YÜKLE
       =================================================== */

    if (
      logoFile &&
      logoFile.size > 0
    ) {
      /* 5 MB */

      if (
        logoFile.size >
        5 * 1024 * 1024
      ) {
        throw new Error(
          "Logo en fazla 5 MB olabilir."
        );
      }

      /* DOSYA TİPİ */

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          logoFile.type
        )
      ) {
        throw new Error(
          "Logo sadece JPG, PNG veya WEBP olabilir."
        );
      }

      /* UZANTI */

      const fileExtension =
        logoFile.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "png";

      /* DOSYA YOLU */

      const filePath =
        `logos/${membership.restaurant_id}-${Date.now()}.${fileExtension}`;

      /* STORAGE */

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("product-images")
          .upload(
            filePath,
            logoFile,
            {
              upsert: true,
              contentType:
                logoFile.type,
            }
          );

      if (uploadError) {
        throw new Error(
          "Logo yüklenemedi: " +
            uploadError.message
        );
      }

      /* PUBLIC URL */

      const {
        data: {
          publicUrl,
        },
      } =
        supabase.storage
          .from("product-images")
          .getPublicUrl(
            filePath
          );

      logoUrl =
        publicUrl;
    }

    /* ===================================================
       RESTORANI GÜNCELLE
       =================================================== */

    const {
      error: updateError,
    } =
      await supabase
        .from("restaurants")
        .update({
          name,

          description:
            description ||
            null,

          instagram_url:
            instagramUrl ||
            null,

          google_review_url:
            googleReviewUrl ||
            null,

          logo_url:
            logoUrl,

          table_count:
            tableCount,
        })
        .eq(
          "id",
          membership.restaurant_id
        );

    if (updateError) {
      throw new Error(
        "İşletme güncellenemedi: " +
          updateError.message
      );
    }

    /* ===================================================
       CACHE YENİLE
       =================================================== */

    revalidatePath(
      "/admin"
    );

    revalidatePath(
      "/admin/ayarlar"
    );

    revalidatePath(
      `/restoran/${currentRestaurant.slug}`
    );

    revalidatePath(
      `/restoran/${currentRestaurant.slug}/menu`
    );

    /* ===================================================
       GERİ DÖN
       =================================================== */

    redirect(
      "/admin/ayarlar?success=1"
    );
  }

  /* =====================================================
     EKRAN
     ===================================================== */

  return (
    <main className="admin-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <section className="admin-header">

        <a href="/admin">
          ← Admin Paneli
        </a>

        <h1>
          İşletme Ayarları
        </h1>

        <p>
          İşletmenizin müşterilere
          gösterilen bilgilerini
          buradan düzenleyebilirsiniz.
        </p>

      </section>

      {/* =================================================
          FORM
          ================================================= */}

      <section className="admin-form">

        <form
          action={updateRestaurant}
          encType="multipart/form-data"
        >

          {/* =================================================
              İŞLETME ADI
              ================================================= */}

          <label>

            İşletme Adı

            <input
              type="text"
              name="name"
              defaultValue={
                restaurant.name
              }
              placeholder="Örn. OZT Kafe"
              required
            />

            <small>
              Müşterilerin göreceği
              işletme adı.
            </small>

          </label>

          {/* =================================================
              AÇIKLAMA
              ================================================= */}

          <label>

            İşletme Açıklaması

            <textarea
              name="description"
              defaultValue={
                restaurant.description ||
                ""
              }
              placeholder="İşletmeniz hakkında kısa bir açıklama"
            />

            <small>
              Bu açıklama işletmenizin
              herkese açık sayfasında
              gösterilir.
            </small>

          </label>

          {/* =================================================
              MASA SAYISI
              ================================================= */}

          <label>

            Masa Sayısı

            <input
              type="number"
              name="table_count"
              min="1"
              max="500"
              defaultValue={
                restaurant.table_count ??
                20
              }
              required
            />

            <small>
              İşletmenizde bulunan toplam
              masa sayısını girin.
              <br />
              Örneğin 20.
            </small>

          </label>

          {/* =================================================
              İŞLETME LOGOSU
              ================================================= */}

          <label>

            İşletme Logosu

            {restaurant.logo_url && (
              <div
                style={{
                  marginTop: "10px",
                  marginBottom: "15px",
                }}
              >

                <p
                  style={{
                    marginBottom: "8px",
                  }}
                >
                  Mevcut logo:
                </p>

                <img
                  src={
                    restaurant.logo_url
                  }
                  alt={`${restaurant.name} logosu`}
                  style={{
                    width: "140px",
                    height: "140px",
                    objectFit: "contain",
                    borderRadius: "16px",
                    border:
                      "1px solid #eee",
                    background: "#fff",
                    padding: "10px",
                  }}
                />

              </div>
            )}

            <input
              type="file"
              name="logo"
              accept="image/jpeg,image/png,image/webp"
            />

            <small>
              Yeni logo seçerseniz
              mevcut logo
              değiştirilecektir.
              <br />
              JPG, PNG veya WEBP —
              maksimum 5 MB
            </small>

          </label>

          {/* =================================================
              INSTAGRAM
              ================================================= */}

          <label>

            Instagram URL

            <input
              type="url"
              name="instagram_url"
              defaultValue={
                restaurant.instagram_url ||
                ""
              }
              placeholder="https://instagram.com/oztkafe"
            />

            <small>
              Müşterinin Instagram
              butonuna bastığında
              gideceği adres.
            </small>

          </label>

          {/* =================================================
              GOOGLE
              ================================================= */}

          <label>

            Google Yorum URL

            <input
              type="url"
              name="google_review_url"
              defaultValue={
                restaurant.google_review_url ||
                ""
              }
              placeholder="https://g.page/..."
            />

            <small>
              Müşterinin Google'da
              yorum bırakacağı
              bağlantı.
            </small>

          </label>

          {/* =================================================
              İŞLETME SAYFASI
              ================================================= */}

          <div
            style={{
              marginTop: "8px",
              padding: "18px",
              background: "#faf8f2",
              border:
                "1px solid #eee4cc",
              borderRadius: "14px",
            }}
          >

            <strong
              style={{
                display: "block",
                marginBottom: "7px",
              }}
            >
              🔗 Herkese Açık İşletme Sayfanız
            </strong>

            <p
              style={{
                margin:
                  "0 0 12px",
                color: "#777",
                fontSize: "12px",
              }}
            >
              Müşterileriniz bu
              sayfadan menü, sipariş,
              değerlendirme, Instagram
              ve ödeme seçeneklerine
              ulaşabilir.
            </p>

            <Link
              href={`/restoran/${restaurant.slug}`}
              target="_blank"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: "9px",
                background: "#111",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: "12px",
              }}
            >
              👁️ İşletme Sayfasını Gör
            </Link>

          </div>

          {/* =================================================
              İŞLETME ADRESİ
              ================================================= */}

          <div
            style={{
              marginTop: "18px",
              padding: "18px",
              background: "#f7f7f7",
              borderRadius: "14px",
            }}
          >

            <strong
              style={{
                display: "block",
                marginBottom: "6px",
              }}
            >
              🔗 İşletme Adresi
            </strong>

            <code
              style={{
                fontSize: "12px",
                color: "#666",
                wordBreak: "break-all",
              }}
            >
              /restoran/
              {restaurant.slug}
            </code>

            <p
              style={{
                margin:
                  "8px 0 0",
                fontSize: "11px",
                color: "#999",
              }}
            >
              Bu adres işletmenizin
              QR/NFC sistemi için
              kullanılacak.
            </p>

          </div>

          {/* =================================================
              KAYDET
              ================================================= */}

          <button
            type="submit"
          >
            💾 Değişiklikleri Kaydet
          </button>

        </form>

      </section>

    </main>
  );
}