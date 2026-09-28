"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AuroraPalette } from "../../../lib/themes";

type RestaurantThemeValue = {
  restaurantId: number;
  // Aurora temalarından biri değilse null.
  auroraPalette: AuroraPalette | null;
  // Sadece menü restoranı: sipariş, garson çağırma ve ödeme gizlenir.
  menuOnly: boolean;
};

const RestaurantThemeContext = createContext<RestaurantThemeValue | null>(null);

export function RestaurantThemeProvider({
  value,
  children,
}: {
  value: RestaurantThemeValue;
  children: ReactNode;
}) {
  return (
    <RestaurantThemeContext.Provider value={value}>
      {children}
    </RestaurantThemeContext.Provider>
  );
}

export function useRestaurantTheme() {
  return useContext(RestaurantThemeContext);
}
