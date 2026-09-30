"use client";

import { useEffect } from "react";
import { trackMenuView } from "../../../../lib/menu-tracking";

// Aurora dışı menü temalarında menü açılışını sayar (ekrana bir şey çizmez).
export default function MenuViewTracker({ restaurantId }: { restaurantId: number }) {
  useEffect(() => {
    trackMenuView(restaurantId);
  }, [restaurantId]);

  return null;
}
