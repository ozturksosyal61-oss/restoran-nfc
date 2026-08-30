"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type Props = {
  categoryId: number;
  direction: "up" | "down";
  currentOrder: number;
  neighborId?: number;
  neighborOrder?: number;
};

export function CategoryMoveButton({
  categoryId,
  direction,
  currentOrder,
  neighborId,
  neighborOrder,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function moveCategory() {
    if (!neighborId || neighborOrder === undefined) {
      return;
    }

    setLoading(true);

    const supabase = createClient();

    try {
      // Mevcut kategoriyi geçici sıraya al
      const { error: firstError } = await supabase
        .from("categories")
        .update({
          sort_order: -999999,
        })
        .eq("id", categoryId);

      if (firstError) {
        throw firstError;
      }

      // Komşu kategoriyi mevcut sıraya al
      const { error: secondError } = await supabase
        .from("categories")
        .update({
          sort_order: currentOrder,
        })
        .eq("id", neighborId);

      if (secondError) {
        throw secondError;
      }

      // Mevcut kategoriyi komşunun sırasına al
      const { error: thirdError } = await supabase
        .from("categories")
        .update({
          sort_order: neighborOrder,
        })
        .eq("id", categoryId);

      if (thirdError) {
        throw thirdError;
      }

      window.location.reload();
    } catch (error) {
      console.error(
        "Kategori sıralama hatası:",
        error
      );

      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={moveCategory}
      disabled={
        loading ||
        !neighborId ||
        neighborOrder === undefined
      }
      title={
        direction === "up"
          ? "Yukarı taşı"
          : "Aşağı taşı"
      }
      className="sort-button"
    >
      {loading
        ? "..."
        : direction === "up"
        ? "↑"
        : "↓"}
    </button>
  );
}