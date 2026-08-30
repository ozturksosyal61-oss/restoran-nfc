"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type Props = {
  productId: number;
  currentOrder: number;
  neighborId?: number;
  neighborOrder?: number;
  direction: "up" | "down";
};

export default function ProductMoveButton({
  productId,
  currentOrder,
  neighborId,
  neighborOrder,
  direction,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function moveProduct() {
    if (!neighborId || neighborOrder === undefined) {
      return;
    }

    setLoading(true);

    const supabase = createClient();

    try {
      const { error: firstError } = await supabase
        .from("products")
        .update({ sort_order: -999999 })
        .eq("id", productId);

      if (firstError) throw firstError;

      const { error: secondError } = await supabase
        .from("products")
        .update({ sort_order: currentOrder })
        .eq("id", neighborId);

      if (secondError) throw secondError;

      const { error: thirdError } = await supabase
        .from("products")
        .update({ sort_order: neighborOrder })
        .eq("id", productId);

      if (thirdError) throw thirdError;

      window.location.reload();
    } catch (error) {
      console.error("Ürün sıralama hatası:", error);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={moveProduct}
      disabled={loading || !neighborId}
      title={direction === "up" ? "Yukarı taşı" : "Aşağı taşı"}
      className="sort-button"
    >
      {loading ? "..." : direction === "up" ? "↑" : "↓"}
    </button>
  );
}