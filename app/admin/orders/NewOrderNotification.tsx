"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type Props = {
  restaurantId: number;
};

type NewOrder = {
  id: number;
  customer_name: string | null;
  table_number: string;
  total_amount: number;
  status: string;
  created_at: string;
};

export default function NewOrderNotification({
  restaurantId,
}: Props) {
  const [newOrder, setNewOrder] = useState<NewOrder | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const supabase = createClient();

    let mounted = true;

    async function checkNewOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, customer_name, table_number, total_amount, status, created_at"
        )
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending")
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

      if (error) {
        console.error(
          "Yeni sipariş kontrol hatası:",
          error
        );
        return;
      }

      if (!mounted || !data || data.length === 0) {
        return;
      }

      const order = data[0] as NewOrder;

      const lastSeenOrderId = Number(
        localStorage.getItem(
          `last-seen-order-${restaurantId}`
        ) || "0"
      );

      if (order.id > lastSeenOrderId) {
        localStorage.setItem(
          `last-seen-order-${restaurantId}`,
          String(order.id)
        );

        setNewOrder(order);
        setShowNotification(true);

        playNotificationSound();
      }
    }

    function playNotificationSound() {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;

        if (!AudioContextClass) {
          return;
        }

        if (!audioContextRef.current) {
          audioContextRef.current =
            new AudioContextClass();
        }

        const context =
          audioContextRef.current;

        const oscillator =
          context.createOscillator();

        const gain =
          context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = 880;

        gain.gain.setValueAtTime(
          0.001,
          context.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
          0.25,
          context.currentTime + 0.02
        );

        gain.gain.exponentialRampToValueAtTime(
          0.001,
          context.currentTime + 0.4
        );

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start();

        oscillator.stop(
          context.currentTime + 0.4
        );
      } catch (error) {
        console.error(
          "Bildirim sesi çalınamadı:",
          error
        );
      }
    }

    checkNewOrders();

    const interval = window.setInterval(
      checkNewOrders,
      5000
    );

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [restaurantId]);

  function closeNotification() {
    setShowNotification(false);
    setNewOrder(null);
  }

  if (!showNotification || !newOrder) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 99999,
        width: "360px",
        maxWidth: "calc(100vw - 40px)",
        background: "#ffffff",
        border: "2px solid #dca315",
        borderRadius: "18px",
        padding: "20px",
        boxShadow:
          "0 20px 50px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <strong
          style={{
            fontSize: "18px",
          }}
        >
          🔔 Yeni Sipariş!
        </strong>

        <button
          type="button"
          onClick={closeNotification}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          marginBottom: "10px",
        }}
      >
        <strong>
          Masa {newOrder.table_number}
        </strong>
      </div>

      <div
        style={{
          color: "#555",
          marginBottom: "6px",
        }}
      >
        👤{" "}
        {newOrder.customer_name ||
          "Müşteri"}
      </div>

      <div
        style={{
          fontWeight: 700,
          fontSize: "18px",
          marginBottom: "16px",
        }}
      >
        💰{" "}
        {Number(
          newOrder.total_amount
        ).toFixed(2)}{" "}
        TL
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
        }}
      >
        <a
          href="/admin/orders"
          onClick={closeNotification}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "11px 14px",
            borderRadius: "10px",
            background: "#dca315",
            color: "#111",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          Siparişe Git
        </a>

        <button
          type="button"
          onClick={closeNotification}
          style={{
            padding: "11px 14px",
            borderRadius: "10px",
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Kapat
        </button>
      </div>
    </div>
  );
}