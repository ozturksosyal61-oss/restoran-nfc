"use client";

import { useEffect } from "react";

type Props = {
  token: string;
  tableId: number;
  tableNumber: number;
  restaurantId: number;
  restaurantSlug: string;
};

export default function TableTokenSync({
  token,
  tableId,
  tableNumber,
  restaurantId,
  restaurantSlug,
}: Props) {
  useEffect(() => {
    try {
      localStorage.setItem(
        "ozt_table_number",
        token
      );

      localStorage.setItem(
        "ozt_table_id",
        String(tableId)
      );

      localStorage.setItem(
        "ozt_table_real_number",
        String(tableNumber)
      );

      localStorage.setItem(
        "ozt_restaurant_id",
        String(restaurantId)
      );

      localStorage.setItem(
        "ozt_restaurant_slug",
        restaurantSlug
      );

    } catch (error) {
      console.error(
        "Masa bilgileri kaydedilemedi:",
        error
      );
    }
  }, [
    token,
    tableId,
    tableNumber,
    restaurantId,
    restaurantSlug,
  ]);

  return null;
}