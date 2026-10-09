"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

// Restoranın anlık pano sinyalini dinler (supabase/migrations/20261022_board_signals.sql).
// Sipariş, çağrı ya da masa oturumu değişince onChange çağrılır; art arda gelen
// sinyaller tek çağrıda birleşir. Dönen değer kanal bağlıyken true olur; false
// iken ekranlar eskisi gibi kısa aralıklarla kontrol etmeye devam etmelidir.
export function useBoardSignal(restaurantId: number, onChange: () => void) {
  const [live, setLive] = useState(false);
  const callbackRef = useRef(onChange);

  useEffect(() => {
    callbackRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!restaurantId) return;

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let timer: number | undefined;
    let cancelled = false;

    void (async () => {
      // Özel kanal, oturumdaki kullanıcının yetkisiyle açılır.
      await supabase.realtime.setAuth().catch(() => undefined);
      if (cancelled) return;

      channel = supabase
        .channel(`board:${restaurantId}`, { config: { private: true } })
        .on("broadcast", { event: "changed" }, () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => callbackRef.current(), 400);
        })
        .subscribe((status) => {
          if (cancelled) return;
          const connected = status === "SUBSCRIBED";
          setLive(connected);
          // Bağlantı kurulurken kaçmış olabilecek değişiklikler için bir kez kontrol.
          if (connected) callbackRef.current();
        });
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  return live;
}
