"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type Restaurant = { id: number; name: string };
type BillItem = { id: number; product_name: string; price: number; quantity: number };
type BillOrder = { id: number; created_at: string; customer_name: string; note: string | null; status: string; payment_status: string; payment_method: string | null; total_amount: number; items: BillItem[] };
type BillResponse = { open: boolean; session_id: number | null; restaurant_id: number; table_id: number; table_number: string; orders: BillOrder[]; order_total: number; due_total: number };

function formatPrice(value: number) { return `${Number(value || 0).toLocaleString("tr-TR")} TL`; }
function formatTime(value: string) { return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function orderStatusText(status: string) {
  switch (status) { case "pending": return "Bekliyor"; case "accepted": return "Onaylandı"; case "preparing": return "Hazırlanıyor"; case "ready": return "Hazır"; case "delivered": return "Teslim edildi"; default: return status || "Sipariş"; }
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const token = searchParams.get("masa")?.trim() || "";
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [bill, setBill] = useState<BillResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const supabase = useMemo(() => createClient(), []);

  const loadBill = useCallback(async (silent = false) => {
    if (!token) { setError("Masa bağlantısı bulunamadı. Lütfen NFC ile tekrar giriş yapın."); setLoading(false); return; }
    try {
      if (silent) setRefreshing(true); else setLoading(true);
      setError("");
      const { data: restaurantData, error: restaurantError } = await supabase.from("restaurants").select("id, name").eq("slug", slug).single();
      if (restaurantError || !restaurantData) throw new Error("Restoran bilgileri yüklenemedi.");
      setRestaurant(restaurantData);
      const { data: tableData, error: tableError } = await supabase.from("restaurant_tables").select("id, table_number, public_token, is_active").eq("restaurant_id", restaurantData.id).eq("public_token", token).eq("is_active", true).maybeSingle();
      if (tableError || !tableData) throw new Error("Masa doğrulanamadı.");
      const { data: billData, error: billError } = await supabase.rpc("get_public_dining_bill", { p_restaurant_id: restaurantData.id, p_table_id: tableData.id, p_public_token: token });
      if (billError) throw new Error(billError.message || "Masa hesabı alınamadı.");
      setBill(billData as BillResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Masa hesabı yüklenemedi.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [slug, supabase, token]);

  useEffect(() => {
    void loadBill();
    const interval = window.setInterval(() => void loadBill(true), 10000);
    return () => window.clearInterval(interval);
  }, [loadBill]);

  return (
    <main className="bill-page">
      <div className="bill-shell">
        <div className="top-nav">
          <button type="button" onClick={() => router.push(`/restoran/${slug}?masa=${encodeURIComponent(token)}`)}>← Ana Sayfaya Dön</button>
        </div>

        <header className="bill-hero">
          <div className="eyebrow">MASA HESABI</div>
          <h1>{restaurant?.name || "Restoran"}</h1>
          <p>Masadan kalkana kadar verdiğiniz tüm siparişler burada.</p>
          <div className="table-pill"><span>◉</span> Masa {bill?.table_number || "—"} <small>{refreshing ? "Güncelleniyor" : "Canlı hesap"}</small></div>
        </header>

        {loading ? (
          <section className="state-card"><div className="spinner">◌</div><strong>Hesabınız hazırlanıyor…</strong><span>Masa ve siparişler kontrol ediliyor.</span></section>
        ) : error ? (
          <section className="state-card error-card"><div className="state-icon">!</div><strong>Hesap görüntülenemedi</strong><span>{error}</span><button type="button" onClick={() => void loadBill()}>Tekrar Dene</button></section>
        ) : !bill?.open || bill.orders.length === 0 ? (
          <section className="state-card empty-card"><div className="state-icon">✦</div><strong>Henüz açık siparişiniz yok</strong><span>Sipariş verdikçe hesabınız burada otomatik oluşacak.</span><a href={`/restoran/${slug}/menu?masa=${encodeURIComponent(token)}`}>🍽️ Dijital Menüye Dön</a></section>
        ) : (
          <>
            <section className="orders-card">
              <div className="section-head"><div><span>HESAP DETAYI</span><h2>Siparişleriniz</h2></div><strong>{bill.orders.length} sipariş</strong></div>
              <div className="orders-list">
                {bill.orders.map((order) => (
                  <article key={order.id} className="bill-order">
                    <div className="order-head">
                      <div><strong>Sipariş #{order.id}</strong><span>{formatTime(order.created_at)} · {order.customer_name || "Misafir"}</span></div>
                      <div className="order-head-right"><span className={`status ${order.payment_status === "paid" ? "paid" : "unpaid"}`}>{order.payment_status === "paid" ? "Ödendi" : orderStatusText(order.status)}</span><strong>{formatPrice(order.total_amount)}</strong></div>
                    </div>
                    <div className="item-list">
                      {order.items.map((item) => (
                        <div key={item.id} className="bill-item"><div><strong>{item.product_name}</strong><span>{item.quantity} × {formatPrice(item.price)}</span></div><strong>{formatPrice(item.price * item.quantity)}</strong></div>
                      ))}
                    </div>
                    {order.note && <div className="order-note">Not: {order.note}</div>}
                  </article>
                ))}
              </div>
            </section>
            <section className="total-card"><div><span>MASA TOPLAMI</span><small>Bu oturumdaki siparişler</small></div><strong>{formatPrice(bill.order_total)}</strong></section>
            <section className="due-card"><div><span>ÖDENECEK TUTAR</span><small>Ödenmiş siparişler çıkarılmıştır</small></div><strong>{formatPrice(bill.due_total)}</strong></section>
            <button type="button" className="pay-button" disabled>💳 Hesabı Ödemeye Geç<small>Online ödeme bağlantısı bir sonraki aşamada</small></button>
            <div className="refresh-note">🔄 Hesabınız otomatik olarak güncelleniyor.</div>
          </>
        )}
      </div>

      <style jsx>{`
        * { box-sizing: border-box; }
        .top-nav { display:flex; justify-content:flex-start; margin:0 auto 8px; max-width:560px; } .top-nav button { border:1px solid rgba(215,167,65,.28); background:rgba(215,167,65,.06); color:#d9b65f; padding:9px 12px; border-radius:12px; font-weight:800; cursor:pointer; }
        .bill-page { min-height:100vh; background:radial-gradient(circle at top,rgba(212,160,55,.12),transparent 32%),#090909; color:#f5f0e7; padding:20px 14px 42px; font-family:Arial,Helvetica,sans-serif; }
        .bill-shell { width:100%; max-width:560px; margin:0 auto; }
        .bill-hero { text-align:center; padding:26px 8px 24px; border-bottom:1px solid rgba(212,160,55,.22); }
        .eyebrow,.section-head span,.total-card span,.due-card span { color:#d7a741; font-size:11px; letter-spacing:2px; font-weight:900; }
        .bill-hero h1 { margin:8px 0 6px; font-size:clamp(30px,8vw,46px); color:#fff; }
        .bill-hero p { margin:0 auto 16px; color:#aaa; line-height:1.55; font-size:14px; }
        .table-pill { display:inline-flex; align-items:center; gap:9px; padding:10px 14px; border:1px solid rgba(215,167,65,.4); border-radius:999px; background:rgba(215,167,65,.08); color:#f1cf81; font-weight:900; }
        .table-pill span { color:#d7a741; } .table-pill small { color:#8c8c8c; font-weight:700; }
        .state-card,.orders-card,.total-card,.due-card { margin-top:16px; border:1px solid rgba(215,167,65,.18); background:linear-gradient(180deg,#141414,#0d0d0d); border-radius:22px; box-shadow:0 18px 45px rgba(0,0,0,.28); }
        .state-card { display:flex; flex-direction:column; align-items:center; text-align:center; gap:9px; padding:34px 22px; } .state-card strong { font-size:19px; } .state-card>span { color:#999; font-size:13px; line-height:1.55; }
        .state-icon,.spinner { width:48px; height:48px; display:grid; place-items:center; border-radius:50%; border:1px solid rgba(215,167,65,.35); color:#e1b651; font-size:24px; background:rgba(215,167,65,.08); } .spinner{animation:spin 1s linear infinite;} @keyframes spin{to{transform:rotate(360deg)}}
        .state-card button,.state-card a { margin-top:8px; border:1px solid rgba(215,167,65,.5); background:#c7952e; color:#090909; text-decoration:none; padding:12px 17px; border-radius:12px; font-weight:900; }
        .error-card .state-icon { color:#ff8c8c; border-color:rgba(255,140,140,.35); background:rgba(255,140,140,.08); }
        .section-head { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; padding:20px 18px 14px; border-bottom:1px solid rgba(255,255,255,.08); } .section-head h2{margin:5px 0 0;font-size:25px;} .section-head>strong{color:#c7c7c7;font-size:12px;}
        .orders-list{padding:12px;display:grid;gap:12px;} .bill-order{border:1px solid rgba(255,255,255,.08);border-radius:17px;background:#111;overflow:hidden;}
        .order-head{padding:15px;display:flex;justify-content:space-between;gap:12px;background:linear-gradient(135deg,rgba(215,167,65,.08),rgba(255,255,255,.015));border-bottom:1px solid rgba(255,255,255,.06);} .order-head>div:first-child{display:flex;flex-direction:column;gap:5px;} .order-head span{color:#929292;font-size:12px;} .order-head-right{display:flex;flex-direction:column;align-items:flex-end;gap:7px;} .order-head-right>strong{color:#efc65e;}
        .status{padding:5px 8px;border-radius:999px;font-size:10px;font-weight:900;} .status.unpaid{background:rgba(215,167,65,.12);color:#e7bd58;} .status.paid{background:rgba(71,174,104,.12);color:#72cf90;}
        .item-list{padding:7px 15px;} .bill-item{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);} .bill-item:last-child{border-bottom:0;} .bill-item div{display:flex;flex-direction:column;gap:3px;} .bill-item span{color:#7f7f7f;font-size:11px;} .bill-item>strong{color:#ddd;white-space:nowrap;} .order-note{margin:0 15px 14px;padding:9px 10px;border-radius:10px;background:#181818;color:#a5a5a5;font-size:11px;}
        .total-card,.due-card{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:18px 20px;} .total-card div,.due-card div{display:flex;flex-direction:column;gap:5px;} .total-card small,.due-card small{color:#888;font-size:11px;} .total-card strong,.due-card strong{font-size:25px;color:#f2ca65;} .due-card{border-color:rgba(215,167,65,.42);background:linear-gradient(135deg,rgba(215,167,65,.13),#111);}
        .pay-button{width:100%;margin-top:16px;border:1px solid rgba(215,167,65,.45);border-radius:18px;padding:15px 18px;background:#6c5523;color:#d9c084;font-size:16px;font-weight:900;cursor:not-allowed;} .pay-button small{display:block;margin-top:5px;font-size:10px;font-weight:700;color:#b9a36d;} .refresh-note{text-align:center;color:#707070;font-size:11px;margin-top:12px;}
        @media (max-width:430px){.bill-page{padding:10px 10px 30px}.bill-hero{padding-top:18px}.order-head{padding:13px}.total-card strong,.due-card strong{font-size:21px}}
      `}</style>
    </main>
  );
}
