// Menüdeki kampanyalar: indirimli fiyat ve etiket.
// Fiyat veritabanında hesaplanır (public_menu_promotions); sipariş de aynı
// fiyatla alınır (create_table_order, 20261016_promotions_pricing.sql).
// Fonksiyon henüz yoksa menü kampanyasız, normal fiyatla açılır.

export type ProductPromo = {
  // İndirimden önceki fiyat (üstü çizili gösterilir).
  oldPrice: number;
  // Ürünün üstündeki kısa etiket: restoranın yazdığı ya da "-%20".
  label: string;
  title: string;
  description: string | null;
  endsAt: string | null;
  popular: boolean;
};

type PromoRow = {
  product_id: number;
  sale_price: number | string;
  title: string | null;
  description: string | null;
  badge: string | null;
  discount_type: string | null;
  discount_value: number | string | null;
  end_at: string | null;
  is_popular: boolean | null;
};

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

export async function readMenuPromotions(client: RpcClient, restaurantId: number) {
  const { data, error } = await client.rpc("public_menu_promotions", { p_restaurant_id: restaurantId });
  if (error || !Array.isArray(data)) return [] as PromoRow[];
  return data as PromoRow[];
}

function discountLabel(row: PromoRow) {
  const value = Number(row.discount_value) || 0;
  const amount = value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  return row.discount_type === "percentage" ? `-%${amount}` : `-₺${amount}`;
}

// Ürün fiyatını kampanyalı fiyatla değiştirir; eski fiyat promo'da kalır.
export function applyPromotions<T extends { id: number; price: number; promo?: ProductPromo | null }>(
  products: T[],
  rows: PromoRow[]
): T[] {
  if (rows.length === 0) return products;
  const byProduct = new Map(rows.map((row) => [Number(row.product_id), row]));

  return products.map((product) => {
    const row = byProduct.get(product.id);
    const salePrice = row ? Number(row.sale_price) : NaN;
    if (!row || !Number.isFinite(salePrice) || salePrice >= product.price) return product;

    return {
      ...product,
      price: salePrice,
      promo: {
        oldPrice: product.price,
        label: row.badge?.trim() || discountLabel(row),
        title: row.title?.trim() || discountLabel(row),
        description: row.description?.trim() || null,
        endsAt: row.end_at ?? null,
        popular: row.is_popular === true,
      },
    };
  });
}
