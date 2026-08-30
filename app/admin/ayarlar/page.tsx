"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { createClient } from "../../../lib/supabase/client";

type Restaurant = {
  id: number;
  name: string;
  slug: string;
  table_count: number | null;
  description: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  instagram_url: string | null;
  google_review_url: string | null;
  is_open: boolean | null;
  opening_time: string | null;
  closing_time: string | null;
};

type ImageType = "logo" | "cover";

export default function RestaurantSettingsPage() {
  const supabase = createClient();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [logoUrl, setLogoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const [instagramUrl, setInstagramUrl] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");

  const [isOpen, setIsOpen] = useState(true);

  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");

  /*
   * =====================================================
   * RESTORAN BİLGİLERİNİ GETİR
   * =====================================================
   */

  async function loadRestaurant() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Oturum bulunamadı.");
        return;
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("restaurant_users")
          .select("restaurant_id")
          .eq("user_id", user.id)
          .single();

      if (membershipError || !membership?.restaurant_id) {
        console.error(membershipError);

        setError(
          "Hesabınıza bağlı bir işletme bulunamadı."
        );

        return;
      }

      const { data, error: restaurantError } =
        await supabase
          .from("restaurants")
          .select(
            `
              id,
              name,
              slug,
              table_count,
              description,
              phone,
              address,
              logo_url,
              cover_image_url,
              instagram_url,
              google_review_url,
              is_open,
              opening_time,
              closing_time
            `
          )
          .eq("id", membership.restaurant_id)
          .single();

      if (restaurantError || !data) {
        console.error(restaurantError);

        setError(
          "İşletme bilgileri yüklenemedi."
        );

        return;
      }

      fillForm(data as Restaurant);
    } catch (err) {
      console.error(err);

      setError(
        "İşletme bilgileri yüklenirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * FORMU DOLDUR
   * =====================================================
   */

  function fillForm(data: Restaurant) {
    setRestaurant(data);

    setName(data.name || "");
    setDescription(data.description || "");
    setPhone(data.phone || "");
    setAddress(data.address || "");

    setLogoUrl(data.logo_url || "");
    setCoverImageUrl(data.cover_image_url || "");

    setInstagramUrl(data.instagram_url || "");
    setGoogleReviewUrl(data.google_review_url || "");

    setIsOpen(data.is_open !== false);

    setOpeningTime(
      data.opening_time
        ? String(data.opening_time).slice(0, 5)
        : ""
    );

    setClosingTime(
      data.closing_time
        ? String(data.closing_time).slice(0, 5)
        : ""
    );
  }

  /*
   * =====================================================
   * İLK YÜKLEME
   * =====================================================
   */

  useEffect(() => {
    loadRestaurant();
  }, []);

  /*
   * =====================================================
   * GÖRSEL YÜKLE
   * =====================================================
   */

  async function uploadImage(
    file: File,
    type: ImageType
  ) {
    if (!restaurant) {
      setError("Önce işletme bilgileri yüklenmelidir.");
      return;
    }

    setError("");
    setMessage("");

    if (!file.type.startsWith("image/")) {
      setError("Lütfen bir görsel dosyası seçin.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Görsel en fazla 5 MB olabilir.");
      return;
    }

    if (type === "logo") {
      setUploadingLogo(true);
    } else {
      setUploadingCover(true);
    }

    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "jpg";

      const fileName =
        `${type}-${Date.now()}.${extension}`;

      const filePath =
        `${restaurant.id}/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("restaurant-assets")
          .upload(
            filePath,
            file,
            {
              cacheControl: "3600",
              upsert: false,
            }
          );

      if (uploadError) {
        console.error(uploadError);

        setError(
          "Görsel yüklenemedi: " +
            uploadError.message
        );

        return;
      }

      const { data: publicData } =
        supabase.storage
          .from("restaurant-assets")
          .getPublicUrl(filePath);

      const publicUrl =
        publicData.publicUrl;

      const updateData =
        type === "logo"
          ? {
              logo_url: publicUrl,
            }
          : {
              cover_image_url: publicUrl,
            };

      const {
        data,
        error: updateError,
      } = await supabase
        .from("restaurants")
        .update(updateData)
        .eq("id", restaurant.id)
        .select(
          `
            id,
            name,
            slug,
            table_count,
            description,
            phone,
            address,
            logo_url,
            cover_image_url,
            instagram_url,
            google_review_url,
            is_open,
            opening_time,
            closing_time
          `
        )
        .single();

      if (updateError) {
        console.error(updateError);

        setError(
          "Görsel bağlantısı kaydedilemedi: " +
            updateError.message
        );

        return;
      }

      if (data) {
        fillForm(data as Restaurant);
      }

      setMessage(
        type === "logo"
          ? "✓ Logo başarıyla yüklendi."
          : "✓ Kapak görseli başarıyla yüklendi."
      );
    } catch (err) {
      console.error(err);

      setError(
        "Görsel yüklenirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setUploadingLogo(false);
      setUploadingCover(false);
    }
  }

  /*
   * =====================================================
   * LOGO SEÇ
   * =====================================================
   */

  function handleLogoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (file) {
      uploadImage(file, "logo");
    }

    event.target.value = "";
  }

  /*
   * =====================================================
   * KAPAK SEÇ
   * =====================================================
   */

  function handleCoverChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (file) {
      uploadImage(file, "cover");
    }

    event.target.value = "";
  }

  /*
   * =====================================================
   * AYARLARI KAYDET
   * =====================================================
   */

  async function saveSettings() {
    if (!restaurant) {
      setError("İşletme bilgileri bulunamadı.");
      return;
    }

    if (!name.trim()) {
      setError("Restoran adı boş bırakılamaz.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        data,
        error: updateError,
      } = await supabase
        .from("restaurants")
        .update({
          name: name.trim(),

          description:
            description.trim() || null,

          phone:
            phone.trim() || null,

          address:
            address.trim() || null,

          logo_url:
            logoUrl.trim() || null,

          cover_image_url:
            coverImageUrl.trim() || null,

          instagram_url:
            instagramUrl.trim() || null,

          google_review_url:
            googleReviewUrl.trim() || null,

          is_open: isOpen,

          opening_time:
            openingTime || null,

          closing_time:
            closingTime || null,
        })
        .eq("id", restaurant.id)
        .select(
          `
            id,
            name,
            slug,
            table_count,
            description,
            phone,
            address,
            logo_url,
            cover_image_url,
            instagram_url,
            google_review_url,
            is_open,
            opening_time,
            closing_time
          `
        )
        .single();

      if (updateError) {
        console.error(updateError);

        setError(
          "Ayarlar kaydedilemedi: " +
            updateError.message
        );

        return;
      }

      if (data) {
        fillForm(data as Restaurant);
      }

      setMessage(
        "✓ Restoran ayarları başarıyla kaydedildi."
      );
    } catch (err) {
      console.error(err);

      setError(
        "Ayarlar kaydedilirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * =====================================================
   * YÜKLENİYOR
   * =====================================================
   */

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingCardStyle}>
          İşletme bilgileri yükleniyor...
        </div>
      </main>
    );
  }

  /*
   * =====================================================
   * EKRAN
   * =====================================================
   */

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>

        {/* HEADER */}

        <header style={headerStyle}>
          <div style={eyebrowStyle}>
            İŞLETME YÖNETİMİ
          </div>

          <h1 style={headerTitleStyle}>
            Restoran Ayarları
          </h1>

          <p style={headerDescriptionStyle}>
            Müşterilerinizin göreceği işletme
            bilgilerini buradan yönetin.
          </p>

          {restaurant && (
            <div style={headerButtonsStyle}>

              <a
                href={`/restoran/${restaurant.slug}/menu`}
                target="_blank"
                rel="noopener noreferrer"
                style={primaryHeaderButtonStyle}
              >
                ↗ Müşteri Menüsünü Aç
              </a>

              <a
                href="/admin/tables"
                style={secondaryHeaderButtonStyle}
              >
                🪑 Masaları Yönet
              </a>

            </div>
          )}
        </header>

        {/* HATA */}

        {error && (
          <div style={errorStyle}>
            ❌ {error}
          </div>
        )}

        {/* BAŞARILI */}

        {message && (
          <div style={successStyle}>
            {message}
          </div>
        )}

        {!restaurant ? (
          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>
              İşletme bulunamadı
            </h2>

            <p style={{ color: "#666" }}>
              Bu kullanıcıya bağlı bir işletme
              bulunamadı.
            </p>
          </section>
        ) : (
          <>
            {/* =========================================
                İŞLETME BİLGİLERİ
            ========================================= */}

            <section style={sectionStyle}>
              <SectionTitle
                eyebrow="İŞLETME"
                title="Restoran Bilgileri"
              />

              <div style={restaurantInfoStyle}>
                İşletme:{" "}
                <strong>
                  {restaurant.name}
                </strong>
              </div>

              <div style={gridStyle}>

                <Field
                  label="Restoran Adı"
                  value={name}
                  onChange={setName}
                  placeholder="OZT KAFE"
                />

                <div>
                  <label style={labelStyle}>
                    Slug
                  </label>

                  <input
                    value={restaurant.slug}
                    readOnly
                    style={{
                      ...inputStyle,
                      background: "#f1efeb",
                      color: "#888",
                    }}
                  />

                  <small style={hintStyle}>
                    QR bağlantılarının bozulmaması
                    için değiştirilemez.
                  </small>
                </div>

                <Field
                  label="Telefon"
                  value={phone}
                  onChange={setPhone}
                  placeholder="0555 555 55 55"
                />

                <Field
                  label="Adres"
                  value={address}
                  onChange={setAddress}
                  placeholder="İşletme adresi"
                />

              </div>

              <div style={{ marginTop: "16px" }}>
                <label style={labelStyle}>
                  İşletme Açıklaması
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Müşterilerinizin göreceği kısa işletme açıklaması..."
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: "110px",
                  }}
                />
              </div>
            </section>

            {/* =========================================
                LOGO / KAPAK
            ========================================= */}

            <section style={sectionStyle}>
              <SectionTitle
                eyebrow="GÖRSEL KİMLİK"
                title="Logo & Kapak"
              />

              <div style={imageGridStyle}>

                {/* LOGO */}

                <div style={uploadCardStyle}>
                  <div style={uploadTitleStyle}>
                    LOGO
                  </div>

                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Restoran logosu"
                      style={logoPreviewStyle}
                    />
                  ) : (
                    <div style={emptyImageStyle}>
                      LOGO
                    </div>
                  )}

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    style={{
                      display: "none",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      logoInputRef.current?.click()
                    }
                    disabled={uploadingLogo}
                    style={secondaryButtonStyle}
                  >
                    {uploadingLogo
                      ? "Yükleniyor..."
                      : "📷 Logo Yükle"}
                  </button>
                </div>

                {/* KAPAK */}

                <div style={uploadCardStyle}>
                  <div style={uploadTitleStyle}>
                    KAPAK GÖRSELİ
                  </div>

                  {coverImageUrl ? (
                    <img
                      src={coverImageUrl}
                      alt="Kapak görseli"
                      style={coverPreviewStyle}
                    />
                  ) : (
                    <div
                      style={{
                        ...emptyImageStyle,
                        width: "100%",
                        height: "150px",
                      }}
                    >
                      KAPAK
                    </div>
                  )}

                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    style={{
                      display: "none",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      coverInputRef.current?.click()
                    }
                    disabled={uploadingCover}
                    style={secondaryButtonStyle}
                  >
                    {uploadingCover
                      ? "Yükleniyor..."
                      : "🖼️ Kapak Yükle"}
                  </button>
                </div>

              </div>

              <div style={{ marginTop: "18px" }}>

                <Field
                  label="Logo URL — İsteğe bağlı"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  placeholder="https://..."
                />

                <div style={{ height: "14px" }} />

                <Field
                  label="Kapak URL — İsteğe bağlı"
                  value={coverImageUrl}
                  onChange={setCoverImageUrl}
                  placeholder="https://..."
                />

              </div>

              <p style={hintStyle}>
                Maksimum görsel boyutu: 5 MB.
              </p>
            </section>

            {/* =========================================
                SOSYAL MEDYA
            ========================================= */}

            <section style={sectionStyle}>
              <SectionTitle
                eyebrow="BAĞLANTILAR"
                title="Sosyal Medya & Yorum"
              />

              <div style={gridStyle}>

                <Field
                  label="Instagram URL"
                  value={instagramUrl}
                  onChange={setInstagramUrl}
                  placeholder="https://instagram.com/..."
                />

                <Field
                  label="Google Yorum URL"
                  value={googleReviewUrl}
                  onChange={setGoogleReviewUrl}
                  placeholder="https://g.page/..."
                />

              </div>
            </section>

            {/* =========================================
                ÇALIŞMA DURUMU
            ========================================= */}

            <section style={sectionStyle}>
              <SectionTitle
                eyebrow="ÇALIŞMA DURUMU"
                title="Açık / Kapalı"
              />

              <div style={statusBoxStyle}>

                <div>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "16px",
                      marginBottom: "5px",
                    }}
                  >
                    İşletme Durumu
                  </strong>

                  <span
                    style={{
                      color: isOpen
                        ? "#16803b"
                        : "#c62828",
                      fontWeight: 800,
                      fontSize: "12px",
                    }}
                  >
                    {isOpen
                      ? "● Sipariş almaya açık"
                      : "● Sipariş almaya kapalı"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsOpen((current) => !current)
                  }
                  style={{
                    border: "none",
                    background: isOpen
                      ? "#eaf8ef"
                      : "#fff0f0",
                    color: isOpen
                      ? "#16743a"
                      : "#b42318",
                    padding: "13px 20px",
                    borderRadius: "11px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {isOpen
                    ? "🟢 AÇIK"
                    : "🔴 KAPALI"}
                </button>

              </div>

              <div style={timeGridStyle}>

                <div>
                  <label style={labelStyle}>
                    Açılış Saati
                  </label>

                  <input
                    type="time"
                    value={openingTime}
                    onChange={(event) =>
                      setOpeningTime(
                        event.target.value
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Kapanış Saati
                  </label>

                  <input
                    type="time"
                    value={closingTime}
                    onChange={(event) =>
                      setClosingTime(
                        event.target.value
                      )
                    }
                    style={inputStyle}
                  />
                </div>

              </div>

              <div style={infoBoxStyle}>
                ℹ️ İşletme kapatıldığında
                müşteriler menüyü görebilir ancak
                yeni sipariş oluşturamaz.
              </div>
            </section>

            {/* =========================================
                KAYDET
            ========================================= */}

            <div style={saveContainerStyle}>
              <button
                type="button"
                onClick={saveSettings}
                disabled={
                  saving ||
                  uploadingLogo ||
                  uploadingCover
                }
                style={{
                  ...saveButtonStyle,
                  background: saving
                    ? "#777"
                    : "#d4a017",
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {saving
                  ? "Kaydediliyor..."
                  : "✓ Ayarları Kaydet"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/*
 * =====================================================
 * FIELD
 * =====================================================
 */

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

/*
 * =====================================================
 * SECTION TITLE
 * =====================================================
 */

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div style={sectionTitleContainerStyle}>
      <div style={sectionEyebrowStyle}>
        {eyebrow}
      </div>

      <h2 style={sectionTitleStyle}>
        {title}
      </h2>
    </div>
  );
}

/*
 * =====================================================
 * STYLES
 * =====================================================
 */

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f5f3ef",
  padding: "30px 16px 70px",
  color: "#171717",
};

const containerStyle: CSSProperties = {
  maxWidth: "1000px",
  margin: "0 auto",
};

const loadingCardStyle: CSSProperties = {
  maxWidth: "1000px",
  margin: "0 auto",
  background: "#fff",
  borderRadius: "20px",
  padding: "40px",
  textAlign: "center",
};

const headerStyle: CSSProperties = {
  background:
    "linear-gradient(135deg,#171717,#29251b)",
  color: "#fff",
  borderRadius: "22px",
  padding: "32px 26px",
  marginBottom: "18px",
};

const eyebrowStyle: CSSProperties = {
  color: "#d4a017",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "2px",
  marginBottom: "7px",
};

const headerTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "30px",
  fontWeight: 950,
};

const headerDescriptionStyle: CSSProperties = {
  margin: "9px 0 0",
  color: "rgba(255,255,255,.68)",
  fontSize: "13px",
  lineHeight: 1.5,
};

const headerButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const primaryHeaderButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 16px",
  borderRadius: "10px",
  background: "#d4a017",
  color: "#fff",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: 900,
};

const secondaryHeaderButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 16px",
  borderRadius: "10px",
  background: "rgba(255,255,255,.10)",
  border: "1px solid rgba(255,255,255,.20)",
  color: "#fff",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: 900,
};

const errorStyle: CSSProperties = {
  background: "#fff0f0",
  border: "1px solid #efb1b1",
  color: "#b42318",
  borderRadius: "12px",
  padding: "13px 15px",
  marginBottom: "15px",
  fontSize: "13px",
  fontWeight: 700,
};

const successStyle: CSSProperties = {
  background: "#eefbf2",
  border: "1px solid #b7e3c2",
  color: "#16743a",
  borderRadius: "12px",
  padding: "13px 15px",
  marginBottom: "15px",
  fontSize: "13px",
  fontWeight: 700,
};

const sectionStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e0d8",
  borderRadius: "19px",
  padding: "22px",
  marginBottom: "16px",
};

const sectionTitleContainerStyle: CSSProperties = {
  marginBottom: "18px",
};

const sectionEyebrowStyle: CSSProperties = {
  color: "#c58d08",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "1.6px",
  marginBottom: "5px",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "21px",
  fontWeight: 900,
};

const restaurantInfoStyle: CSSProperties = {
  background: "#f8f6f1",
  border: "1px solid #e5e0d8",
  borderRadius: "12px",
  padding: "13px 15px",
  marginBottom: "18px",
  color: "#555",
  fontSize: "13px",
  fontWeight: 700,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(280px,1fr))",
  gap: "16px",
};

const timeGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(200px,1fr))",
  gap: "16px",
};

const imageGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(280px,1fr))",
  gap: "18px",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "7px",
  color: "#292929",
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border: "1px solid #d9d4cc",
  borderRadius: "10px",
  background: "#fff",
  color: "#171717",
  fontSize: "14px",
  outline: "none",
};

const hintStyle: CSSProperties = {
  display: "block",
  marginTop: "6px",
  color: "#888",
  fontSize: "11px",
  lineHeight: 1.5,
};

const uploadCardStyle: CSSProperties = {
  border: "1px solid #e5e0d8",
  borderRadius: "16px",
  padding: "18px",
  background: "#faf9f7",
  textAlign: "center",
};

const uploadTitleStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "1.5px",
  color: "#8b877f",
  marginBottom: "15px",
};

const logoPreviewStyle: CSSProperties = {
  width: "130px",
  height: "130px",
  objectFit: "contain",
  borderRadius: "24px",
  background: "#fff",
  border: "1px solid #e5e0d8",
  display: "block",
  margin: "0 auto 16px",
};

const coverPreviewStyle: CSSProperties = {
  width: "100%",
  height: "150px",
  objectFit: "cover",
  borderRadius: "16px",
  background: "#eee",
  display: "block",
  marginBottom: "16px",
};

const emptyImageStyle: CSSProperties = {
  width: "130px",
  height: "130px",
  borderRadius: "24px",
  background: "#ece9e3",
  color: "#aaa",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 900,
  margin: "0 auto 16px",
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #d9d4cc",
  background: "#fff",
  color: "#171717",
  padding: "11px 16px",
  borderRadius: "10px",
  fontWeight: 800,
  cursor: "pointer",
};

const statusBoxStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  padding: "18px",
  border: "1px solid #e5e0d8",
  borderRadius: "15px",
  marginBottom: "18px",
};

const infoBoxStyle: CSSProperties = {
  marginTop: "15px",
  padding: "13px 15px",
  background: "#faf8f4",
  borderRadius: "11px",
  fontSize: "11px",
  color: "#777",
  lineHeight: 1.6,
};

const saveContainerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
};

const saveButtonStyle: CSSProperties = {
  border: "none",
  color: "#fff",
  padding: "15px 30px",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: 900,
  boxShadow:
    "0 10px 25px rgba(0,0,0,.12)",
};