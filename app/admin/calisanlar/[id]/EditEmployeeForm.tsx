"use client";

import { useState } from "react";
import EmployeeFormView from "../EmployeeFormView";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type Employee = {
  id: number;
  restaurant_id: number;
  name: string;
  role: string;
  phone: string | null;
  is_active: boolean;
};

export default function EditEmployeeForm({
  employee,
  extra,
}: {
  employee: Employee;
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(employee.name);
  const [phone, setPhone] = useState(
    employee.phone || ""
  );
  const [role, setRole] = useState(employee.role);
  const [isActive, setIsActive] = useState(
    employee.is_active
  );

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

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

      if (
        membershipError ||
        !membership?.restaurant_id
      ) {
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
      // ÇALIŞAN GÜNCELLE
      //
      // employee.id + restaurant_id birlikte kullanılıyor.
      // Böylece URL/client üzerinden başka restoranın
      // çalışanını değiştirme ihtimali azaltılıyor.
      // =====================================================

      const {
        data: updatedEmployee,
        error: updateError,
      } = await supabase
        .from("employees")
        .update({
          name: cleanName,
          phone: cleanPhone || null,
          role,
          is_active: isActive,
        })
        .eq("id", employee.id)
        .eq(
          "restaurant_id",
          membership.restaurant_id
        )
        .select(
          "id, restaurant_id, name, role, is_active"
        )
        .maybeSingle();

      if (updateError) {
        console.error(
          "Çalışan güncelleme hatası:",
          updateError
        );

        setError(
          "Çalışan güncellenemedi: " +
            updateError.message
        );

        return;
      }

      if (!updatedEmployee) {
        setError(
          "Çalışan güncellenemedi. Çalışan bu işletmeye ait olmayabilir veya Supabase RLS izinleri engelliyor olabilir."
        );

        return;
      }

      setSuccess(
        "✓ Çalışan bilgileri başarıyla güncellendi."
      );

      setName(updatedEmployee.name);
      setPhone(cleanPhone);
      setRole(updatedEmployee.role);
      setIsActive(updatedEmployee.is_active);

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

  async function handleDelete() {
    const confirmed = window.confirm(
      `"${employee.name}" isimli çalışanı tamamen silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.\n\nÇalışanı sadece devre dışı bırakmak istiyorsanız iptal edip "Çalışan aktif" seçeneğini kapatabilirsiniz.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

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

      if (
        membershipError ||
        !membership?.restaurant_id
      ) {
        setError(
          "Kullanıcının bağlı olduğu işletme bulunamadı."
        );

        return;
      }

      // =====================================================
      // ÇALIŞANI SİL
      // =====================================================

      const {
        data: deletedEmployee,
        error: deleteError,
      } = await supabase
        .from("employees")
        .delete()
        .eq("id", employee.id)
        .eq(
          "restaurant_id",
          membership.restaurant_id
        )
        .select("id")
        .maybeSingle();

      if (deleteError) {
        console.error(
          "Çalışan silme hatası:",
          deleteError
        );

        setError(
          "Çalışan silinemedi: " +
            deleteError.message
        );

        return;
      }

      if (!deletedEmployee) {
        setError(
          "Çalışan silinemedi. Çalışan bu işletmeye ait olmayabilir veya Supabase RLS izinleri engelliyor olabilir."
        );

        return;
      }

      router.push("/admin/calisanlar");
      router.refresh();
    } catch (error) {
      console.error(error);

      setError(
        "Çalışan silinirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <EmployeeFormView
      mode="edit"
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
      success={success}
      onDelete={handleDelete}
      deleting={deleting}
      extra={extra}
    />
  );
}
