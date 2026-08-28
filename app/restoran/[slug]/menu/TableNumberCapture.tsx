"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function TableNumberCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const tableNumber = searchParams.get("masa");

    if (!tableNumber) {
      return;
    }

    const cleanTableNumber = tableNumber.trim();

    if (!cleanTableNumber) {
      return;
    }

    localStorage.setItem(
      "ozt_table_number",
      cleanTableNumber
    );
  }, [searchParams]);

  return null;
}