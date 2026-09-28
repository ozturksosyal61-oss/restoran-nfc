"use client";

import { useState } from "react";
import EmployeeFormView from "../EmployeeFormView";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

export default function YeniCalisanPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("garson");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError("Çalışan adı zorunludur.");
      return;
    }

    if (cleanName.length < 2) {
      setError("Çalışan adı en az 2 karakter olmalıdır.");
      return;
    }

    if (cleanName.length > 100) {
      setError("Çalışan adı en fazla 100 karakter olabilir.");
      return;
    }

    setLoading(true);

    try {
      // =====================================================
      // GİRİŞ YAPAN KULLANICI
      // =====================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        return;
      }

      // =====================================================
      // KULLANICININ RESTORANI
      // =====================================================

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("restaurant_users")
        .select("restaurant_id")
        .eq("user_id", user.id)
        .single();

      if (membershipError || !membership?.restaurant_id) {
        console.error(
          "Restoran üyeliği bulunamadı:",
          membershipError
        );

        setError(
          "Kullanıcının bağlı olduğu işletme bulunamadı."
        );
        return;
      }

      // =====================================================
      // ÇALIŞANI OLUŞTUR
      // =====================================================

      const { error: insertError } = await supabase
        .from("employees")
        .insert({
          restaurant_id: membership.restaurant_id,
          name: cleanName,
          phone: cleanPhone || null,
          role,
          is_active: isActive,
        });

      if (insertError) {
        console.error(
          "Çalışan ekleme hatası:",
          insertError
        );

        setError(
          "Çalışan eklenemedi: " +
            insertError.message
        );

        return;
      }

      router.push("/admin/calisanlar");
      router.refresh();
    } catch (error) {
      console.error(error);

      setError(
        "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <EmployeeFormView
      mode="new"
      name={name}
      onName={setName}
      phone={phone}
      onPhone={setPhone}
      role={role}
      onRole={setRole}
      isActive={isActive}
      onActive={setIsActive}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
    />
  );
}
