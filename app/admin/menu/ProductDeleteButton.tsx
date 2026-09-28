"use client";

import AdminIcon from "../AdminIcon";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

export default function ProductDeleteButton({
  productId,
}: {
  productId: number;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Bu ürünü silmek istediğinize emin misiniz?"
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      alert("Ürün silinemedi: " + error.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="adm-btn adm-btn-sm adm-btn-icon adm-btn-ghost adm-text-danger"
      aria-label="Ürünü sil"
      title="Ürünü sil"
    >
      <AdminIcon name="trash" size={15} />
    </button>
  );
}