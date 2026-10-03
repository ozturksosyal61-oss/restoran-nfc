"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { createClient } from "../../../lib/supabase/client";
import { compressImage } from "../../../lib/image-compress";
import AdminIcon from "../AdminIcon";
import { useAdminMenuOnly } from "../AdminShell";

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
  const menuOnly = useAdminMenuOnly();

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

  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  // WiFi sütunları ayrı migration ile gelir; henüz yoksa alanlar kilitlenir.
  const [wifiAvailable, setWifiAvailable] = useState(true);

  // Slogan sütunu da ayrı migration ile gelir.
  const [tagline, setTagline] = useState("");
  const [taglineAvailable, setTaglineAvailable] = useState(true);

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

      const { data: wifi, error: wifiError } = await supabase
        .from("restaurants")
        .select("wifi_name, wifi_password")
        .eq("id", membership.restaurant_id)
        .single();

      if (wifiError) {
        console.error(wifiError);
        setWifiAvailable(false);
      } else {
        setWifiAvailable(true);
        setWifiName(wifi?.wifi_name || "");
        setWifiPassword(wifi?.wifi_password || "");
      }

      const { data: extra, error: taglineError } = await supabase
        .from("restaurants")
        .select("tagline")
        .eq("id", membership.restaurant_id)
        .single();

      if (taglineError) {
        console.error(taglineError);
        setTaglineAvailable(false);
      } else {
        setTaglineAvailable(true);
        setTagline(extra?.tagline || "");
      }
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

    if (file.size > 20 * 1024 * 1024) {
      setError("Görsel en fazla 20 MB olabilir.");
      return;
    }

    if (type === "logo") {
      setUploadingLogo(true);
    } else {
      setUploadingCover(true);
    }

    try {
      // Logo daha küçük, kapak fotoğrafı daha geniş tutulur.
      const compressed = await compressImage(file, { maxSize: type === "logo" ? 600 : 1600 });
      const extension = compressed.extension;

      const fileName =
        `${type}-${Date.now()}.${extension}`;

      const filePath =
        `${restaurant.id}/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("restaurant-assets")
          .upload(
            filePath,
            compressed.file,
            {
              // Dosya adı her yüklemede değişir; uzun süre önbelleğe alınabilir.
              cacheControl: "31536000",
              contentType: compressed.file.type,
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

      if (wifiAvailable) {
        const { error: wifiError } = await supabase
          .from("restaurants")
          .update({
            wifi_name: wifiName.trim() || null,
            wifi_password: wifiPassword.trim() || null,
          })
          .eq("id", restaurant.id);

        if (wifiError) {
          console.error(wifiError);

          setError(
            "Diğer ayarlar kaydedildi ancak WiFi bilgileri kaydedilemedi: " +
              wifiError.message
          );

          return;
        }
      }

      if (taglineAvailable) {
        const { error: taglineError } = await supabase
          .from("restaurants")
          .update({ tagline: tagline.trim() || null })
          .eq("id", restaurant.id);

        if (taglineError) {
          console.error(taglineError);

          setError(
            "Diğer ayarlar kaydedildi ancak slogan kaydedilemedi: " +
              taglineError.message
          );

          return;
        }
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
      <main className="adm-page">
        <p className="adm-hint">İşletme bilgileri yükleniyor…</p>
      </main>
    );
  }

  /*
   * =====================================================
   * EKRAN
   * =====================================================
   */

  const busy = saving || uploadingLogo || uploadingCover;

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Ayarlar</span>
          <h1>İşletme ayarları</h1>
          <p>Burada girdiğiniz bilgiler yalnızca sizin restoran sayfanızda ve menünüzde görünür.</p>
        </div>
        {restaurant && (
          <div className="adm-head-actions">
            <a
              className="adm-btn"
              href={`/restoran/${restaurant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <AdminIcon name="external" size={16} />
              Restoran sayfası
            </a>
          </div>
        )}
      </header>

      {error && (
        <p className="adm-alert adm-alert-error" role="alert">
          <AdminIcon name="alert" size={16} />
          {error}
        </p>
      )}

      {message && (
        <p className="adm-alert adm-alert-ok" role="status">
          <AdminIcon name="check" size={16} />
          {message.replace(/^[✓✅]\s*/, "")}
        </p>
      )}

      {!restaurant ? (
        <div className="adm-empty">
          <span className="adm-empty-icon"><AdminIcon name="store" /></span>
          <strong>İşletme bulunamadı</strong>
          <p>Bu kullanıcıya bağlı bir işletme bulunamadı.</p>
        </div>
      ) : (
        <>
          {/* ============ İŞLETME BİLGİLERİ ============ */}
          <SettingsSection
            title="İşletme bilgileri"
            description="Restoran sayfanızın üst kısmında ve bilgi penceresinde görünür."
          >
            <div className="adm-form-grid">
              <Field label="Restoran adı" value={name} onChange={setName} placeholder="Mira Kitchen" />

              <div className="adm-field">
                <label className="adm-label" htmlFor="ayar-slug">Sayfa adresi</label>
                <input id="ayar-slug" className="adm-input" value={`/restoran/${restaurant.slug}`} readOnly />
                <span className="adm-hint">QR kodları bozulmasın diye değiştirilemez.</span>
              </div>

              <Field label="Telefon" value={phone} onChange={setPhone} placeholder="0555 555 55 55" type="tel" />

              {taglineAvailable && (
                <Field
                  label="Kısa slogan"
                  value={tagline}
                  onChange={setTagline}
                  placeholder="Restaurant & Cafe"
                  hint="Adınızın altında görünür. Boş bırakırsanız gösterilmez."
                />
              )}

              <div className="adm-field adm-field-full">
                <Field label="Adres" value={address} onChange={setAddress} placeholder="Mahalle, sokak, no, ilçe/il" />
              </div>

              <div className="adm-field adm-field-full">
                <label className="adm-label" htmlFor="ayar-aciklama">
                  Açıklama <em>· isteğe bağlı</em>
                </label>
                <textarea
                  id="ayar-aciklama"
                  className="adm-textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="Müşterilerinizin göreceği kısa işletme açıklaması"
                />
              </div>
            </div>
          </SettingsSection>

          {/* ============ ÇALIŞMA DURUMU ============ */}
          <SettingsSection
            title="Çalışma durumu"
            description={
              menuOnly
                ? "Kapalıyken menünün üstünde “Şu an kapalıyız” notu görünür."
                : "Kapalıyken müşteriler menüyü görür ama sipariş veremez."
            }
          >
            <label className="adm-switch-row">
              <span>
                <strong>{menuOnly ? "Açığız" : "Sipariş alıyoruz"}</strong>
                <small className={isOpen ? "is-open" : "is-closed"}>
                  {menuOnly
                    ? isOpen
                      ? "Şu an açık"
                      : "Şu an kapalı"
                    : isOpen
                      ? "Şu an sipariş almaya açık"
                      : "Şu an sipariş almaya kapalı"}
                </small>
              </span>
              <input
                type="checkbox"
                className="adm-switch"
                checked={isOpen}
                onChange={(event) => setIsOpen(event.target.checked)}
                aria-label={menuOnly ? "Açık / kapalı durumu" : "Sipariş alma durumu"}
              />
            </label>

            <div className="adm-form-grid">
              <div className="adm-field">
                <label className="adm-label" htmlFor="ayar-acilis">Açılış saati</label>
                <input
                  id="ayar-acilis"
                  type="time"
                  className="adm-input"
                  value={openingTime}
                  onChange={(event) => setOpeningTime(event.target.value)}
                />
              </div>
              <div className="adm-field">
                <label className="adm-label" htmlFor="ayar-kapanis">Kapanış saati</label>
                <input
                  id="ayar-kapanis"
                  type="time"
                  className="adm-input"
                  value={closingTime}
                  onChange={(event) => setClosingTime(event.target.value)}
                />
              </div>
            </div>
          </SettingsSection>

          {/* ============ GÖRSELLER ============ */}
          <SettingsSection
            title="Logo ve kapak"
            description="Kapak görseli restoran sayfasının üstünde, logo adınızın yanında görünür. Yüklerken otomatik küçültülür."
          >
            <div className="adm-upload-grid">
              <div className="adm-upload">
                <div className="adm-upload-preview is-logo">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Restoran logosu" />
                  ) : (
                    <AdminIcon name="image" size={26} />
                  )}
                </div>
                <div className="adm-upload-body">
                  <strong>Logo</strong>
                  <span className="adm-hint">Kare, en az 400×400 px önerilir.</span>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    hidden
                  />
                  <button
                    type="button"
                    className="adm-btn adm-btn-sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    <AdminIcon name="download" size={15} />
                    {uploadingLogo ? "Yükleniyor…" : logoUrl ? "Değiştir" : "Logo yükle"}
                  </button>
                </div>
              </div>

              <div className="adm-upload">
                <div className="adm-upload-preview is-cover">
                  {coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImageUrl} alt="Kapak görseli" />
                  ) : (
                    <AdminIcon name="image" size={26} />
                  )}
                </div>
                <div className="adm-upload-body">
                  <strong>Kapak görseli</strong>
                  <span className="adm-hint">Yatay ya da dikey; en az 1200 px genişlik.</span>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    hidden
                  />
                  <button
                    type="button"
                    className="adm-btn adm-btn-sm"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                  >
                    <AdminIcon name="download" size={15} />
                    {uploadingCover ? "Yükleniyor…" : coverImageUrl ? "Değiştir" : "Kapak yükle"}
                  </button>
                </div>
              </div>
            </div>

            <details className="adm-details">
              <summary>Görsel bağlantısını elle girin</summary>
              <div className="adm-form-grid">
                <Field label="Logo bağlantısı" value={logoUrl} onChange={setLogoUrl} placeholder="https://..." type="url" />
                <Field label="Kapak bağlantısı" value={coverImageUrl} onChange={setCoverImageUrl} placeholder="https://..." type="url" />
              </div>
            </details>
          </SettingsSection>

          {/* Sadece menü restoranında WiFi, bağlantılar ve menü düzeni
              müşteriye gösterilmediği için bu bölümler gizlenir. */}
          {!menuOnly && (
          <>
          {/* ============ WIFI ============ */}
          <SettingsSection
            title="WiFi"
            description="Restoran sayfasındaki Bilgi penceresinde gösterilir. Boş bırakırsanız bölüm görünmez."
          >
            {wifiAvailable ? (
              <div className="adm-form-grid">
                <Field label="Ağ adı" value={wifiName} onChange={setWifiName} placeholder="Restoran_WiFi" />
                <Field label="Şifre" value={wifiPassword} onChange={setWifiPassword} placeholder="WiFi şifresi" />
              </div>
            ) : (
              <p className="adm-alert adm-alert-info" style={{ margin: 0 }}>
                <AdminIcon name="info" size={16} />
                WiFi alanları henüz veritabanında yok. Sistem yöneticisinin güncellemeyi yapması gerekiyor.
              </p>
            )}
          </SettingsSection>

          {/* ============ BAĞLANTILAR ============ */}
          <SettingsSection
            title="Sosyal medya ve yorum"
            description="Google yorum bağlantısı girerseniz &quot;Bizi değerlendir&quot; düğmesi oraya yönlenir."
          >
            <div className="adm-form-grid">
              <Field label="Instagram" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://instagram.com/..." type="url" />
              <Field label="Google yorum bağlantısı" value={googleReviewUrl} onChange={setGoogleReviewUrl} placeholder="https://g.page/..." type="url" />
            </div>
          </SettingsSection>

          </>
          )}

          {/* ============ KAYDET ============ */}
          <div className="adm-sticky-actions">
            <span>Değişiklikler kaydettiğinizde restoran sayfanıza yansır.</span>
            <button
              type="button"
              className="adm-btn adm-btn-primary adm-btn-lg"
              onClick={saveSettings}
              disabled={busy}
            >
              <AdminIcon name="save" size={17} />
              {saving ? "Kaydediliyor…" : "Ayarları kaydet"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

/*
 * =====================================================
 * PARÇALAR
 * =====================================================
 */

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="adm-settings">
      <div className="adm-settings-intro">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="adm-card adm-settings-body">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  const id = `ayar-${label.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9ğüşöçı]+/g, "-")}`;
  return (
    <div className="adm-field">
      <label className="adm-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className="adm-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {hint && <span className="adm-hint">{hint}</span>}
    </div>
  );
}

