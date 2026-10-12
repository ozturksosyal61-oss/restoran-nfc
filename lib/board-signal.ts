"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

// Restoranın anlık pano sinyalini dinler (supabase/migrations/20261022_board_signals.sql).
// Sipariş, çağrı ya da masa oturumu değişince onChange çağrılır; art arda gelen
// sinyaller tek çağrıda birleşir. Dönen değer kanal bağlıyken true olur; false
// iken ekranlar eskisi gibi kısa aralıklarla kontrol etmeye devam etmelidir.
//
// Aynı sayfada birden fazla ekran (ör. garson listesi ve masa haritası) aynı
// restoranı dinlerse tek kanal paylaşılır.

type Listener = { onChange: () => void; onStatus: (live: boolean) => void };

type Shared = {
  listeners: Set<Listener>;
  channel: RealtimeChannel | null;
  live: boolean;
  closed: boolean;
  timer?: number;
};

const shared = new Map<number, Shared>();

function open(restaurantId: number): Shared {
  const existing = shared.get(restaurantId);
  if (existing) return existing;

  const entry: Shared = { listeners: new Set(), channel: null, live: false, closed: false };
  shared.set(restaurantId, entry);

  const supabase = createClient();
  void (async () => {
    // Özel kanal, oturumdaki kullanıcının yetkisiyle açılır.
    await supabase.realtime.setAuth().catch(() => undefined);
    if (entry.closed) return;

    entry.channel = supabase
      .channel(`board:${restaurantId}`, { config: { private: true } })
      .on("broadcast", { event: "changed" }, () => {
        window.clearTimeout(entry.timer);
        entry.timer = window.setTimeout(() => entry.listeners.forEach((listener) => listener.onChange()), 400);
      })
      .subscribe((status) => {
        if (entry.closed) return;
        entry.live = status === "SUBSCRIBED";
        entry.listeners.forEach((listener) => {
          listener.onStatus(entry.live);
          // Bağlantı kurulurken kaçmış olabilecek değişiklikler için bir kez kontrol.
          if (entry.live) listener.onChange();
        });
      });
  })();

  return entry;
}

function release(restaurantId: number, listener: Listener) {
  const entry = shared.get(restaurantId);
  if (!entry) return;
  entry.listeners.delete(listener);
  if (entry.listeners.size > 0) return;

  entry.closed = true;
  window.clearTimeout(entry.timer);
  shared.delete(restaurantId);
  if (entry.channel) void createClient().removeChannel(entry.channel);
}

export function useBoardSignal(restaurantId: number, onChange: () => void) {
  const [live, setLive] = useState(false);
  const callbackRef = useRef(onChange);

  useEffect(() => {
    callbackRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!restaurantId) return;

    const listener: Listener = {
      onChange: () => callbackRef.current(),
      onStatus: setLive,
    };
    const entry = open(restaurantId);
    entry.listeners.add(listener);
    if (entry.live) queueMicrotask(() => setLive(true));

    return () => release(restaurantId, listener);
  }, [restaurantId]);

  return live;
}
