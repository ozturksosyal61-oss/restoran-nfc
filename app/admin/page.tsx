import { createServerSupabaseClient } from "../../lib/supabase-server";
import { redirect } from "next/navigation";
import DashboardCharts from "./DashboardCharts";

type Order = {
  id: number;
  customer_name: string | null;
  table_number: string | null;
  total_amount: number | null;
  status: string | null;
  created_at: string;
};

type Review = {
  id: number;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
};

type OrderItem = {
  id: number;
  order_id: number;
  product_name: string;
  price: number;
  quantity: number;
};

type TopProduct = {
  name: string;
  quantity: number;
  revenue: number;
};

export default async function AdminDashboard() {
  const supabase =
    await createServerSupabaseClient();

  // =====================================================
  // GİRİŞ YAPAN KULLANICI
  // =====================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // =====================================================
  // KULLANICI - RESTORAN BAĞLANTISI
  // =====================================================

  const { data: membership } =
    await supabase
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .single();

  if (!membership?.restaurant_id) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f1ed",
          padding: "30px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "40px",
            maxWidth: "500px",
            textAlign: "center",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <h1>
            Restoran bulunamadı
          </h1>

          <p
            style={{
              color: "#666",
            }}
          >
            Hesabınız herhangi bir restorana
            bağlı değil.
          </p>
        </div>
      </main>
    );
  }

  const restaurantId =
    membership.restaurant_id;

  // =====================================================
  // RESTORAN
  // =====================================================

  const { data: restaurant } =
    await supabase
      .from("restaurants")
      .select("id, name, slug")
      .eq("id", restaurantId)
      .single();

  if (!restaurant) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f3f1ed",
          padding: "30px",
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            background: "#fff",
            borderRadius: "20px",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <h1>
            İşletme bulunamadı
          </h1>

          <p>
            Hesabınıza bağlı işletme
            bulunamadı.
          </p>
        </div>
      </main>
    );
  }

  // =====================================================
  // TÜM SİPARİŞLER
  // =====================================================

  const { data: ordersData } =
    await supabase
      .from("orders")
      .select(
        "id, customer_name, table_number, total_amount, status, created_at"
      )
      .eq(
        "restaurant_id",
        restaurantId
      )
      .order("created_at", {
        ascending: false,
      });

  const orders: Order[] =
    ordersData || [];

  // =====================================================
  // TÜM SİPARİŞ ÜRÜNLERİ
  // =====================================================

  const orderIds =
    orders.map(
      (order) => order.id
    );

  let orderItems: OrderItem[] = [];

  if (orderIds.length > 0) {
    const { data: orderItemsData } =
      await supabase
        .from("order_items")
        .select(
          "id, order_id, product_name, price, quantity"
        )
        .in(
          "order_id",
          orderIds
        );

    orderItems =
      orderItemsData || [];
  }

  // =====================================================
  // DEĞERLENDİRMELER
  // =====================================================

  const { data: reviewsData } =
    await supabase
      .from("reviews")
      .select(
        "id, customer_name, rating, comment, is_visible, created_at"
      )
      .eq(
        "restaurant_id",
        restaurantId
      )
      .order("created_at", {
        ascending: false,
      });

  const reviews: Review[] =
    reviewsData || [];

  // =====================================================
  // TARİHLER
  // =====================================================

  const now = new Date();

  const startOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const startOfWeek =
    new Date(
      startOfToday
    );

  startOfWeek.setDate(
    startOfWeek.getDate() -
      ((startOfWeek.getDay() +
        6) %
        7)
  );

  const startOfMonth =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

  // =====================================================
  // BUGÜN / HAFTA / AY SİPARİŞLERİ
  // =====================================================

  const todayOrders =
    orders.filter(
      (order) =>
        new Date(
          order.created_at
        ) >= startOfToday
    );

  const weekOrders =
    orders.filter(
      (order) =>
        new Date(
          order.created_at
        ) >= startOfWeek
    );

  const monthOrders =
    orders.filter(
      (order) =>
        new Date(
          order.created_at
        ) >= startOfMonth
    );

  // =====================================================
  // CİRO
  // =====================================================

  const todayRevenue =
    todayOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.total_amount || 0
        ),
      0
    );

  const weekRevenue =
    weekOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.total_amount || 0
        ),
      0
    );

  const monthRevenue =
    monthOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.total_amount || 0
        ),
      0
    );

  // =====================================================
  // SİPARİŞ DURUMLARI
  // =====================================================

  const pendingCount =
    orders.filter(
      (order) =>
        order.status === "pending"
    ).length;

  const acceptedCount =
    orders.filter(
      (order) =>
        order.status === "accepted"
    ).length;

  const preparingCount =
    orders.filter(
      (order) =>
        order.status === "preparing"
    ).length;

  const readyCount =
    orders.filter(
      (order) =>
        order.status === "ready"
    ).length;

  const deliveredCount =
    orders.filter(
      (order) =>
        order.status === "delivered"
    ).length;

  const cancelledCount =
    orders.filter(
      (order) =>
        order.status === "cancelled"
    ).length;

  const totalOrders =
    orders.length;

  // =====================================================
  // DEĞERLENDİRME İSTATİSTİKLERİ
  // =====================================================

  const reviewCount =
    reviews.length;

  const visibleReviewCount =
    reviews.filter(
      (review) =>
        review.is_visible
    ).length;

  const averageRating =
    reviewCount > 0
      ? reviews.reduce(
          (sum, review) =>
            sum +
            Number(
              review.rating || 0
            ),
          0
        ) / reviewCount
      : 0;

  // =====================================================
  // HAFTALIK CİRO GRAFİĞİ
  // =====================================================

  const weekDays = [
    "Pzt",
    "Sal",
    "Çar",
    "Per",
    "Cum",
    "Cmt",
    "Paz",
  ];

  const weeklyRevenue =
    weekDays.map(
      (day, index) => {
        const targetDate =
          new Date(
            startOfWeek
          );

        targetDate.setDate(
          startOfWeek.getDate() +
            index
        );

        const nextDate =
          new Date(
            targetDate
          );

        nextDate.setDate(
          targetDate.getDate() +
            1
        );

        const revenue =
          orders
            .filter(
              (order) => {
                const date =
                  new Date(
                    order.created_at
                  );

                return (
                  date >=
                    targetDate &&
                  date <
                    nextDate
                );
              }
            )
            .reduce(
              (sum, order) =>
                sum +
                Number(
                  order.total_amount ||
                    0
                ),
              0
            );

        return {
          label: day,
          revenue,
        };
      }
    );

  // =====================================================
  // 30 GÜNLÜK CİRO GRAFİĞİ
  // =====================================================

  const monthlyRevenue =
    Array.from(
      {
        length: 30,
      },
      (_, index) => {
        const targetDate =
          new Date(
            startOfToday
          );

        targetDate.setDate(
          startOfToday.getDate() -
            (29 - index)
        );

        const nextDate =
          new Date(
            targetDate
          );

        nextDate.setDate(
          targetDate.getDate() +
            1
        );

        const revenue =
          orders
            .filter(
              (order) => {
                const date =
                  new Date(
                    order.created_at
                  );

                return (
                  date >=
                    targetDate &&
                  date <
                    nextDate
                );
              }
            )
            .reduce(
              (sum, order) =>
                sum +
                Number(
                  order.total_amount ||
                    0
                ),
              0
            );

        return {
          label: `${String(
            targetDate.getDate()
          ).padStart(
            2,
            "0"
          )}.${String(
            targetDate.getMonth() +
              1
          ).padStart(
            2,
            "0"
          )}`,
          revenue,
        };
      }
    );

  // =====================================================
  // EN ÇOK SATAN ÜRÜNLER
  // =====================================================

  const productMap =
    new Map<
      string,
      TopProduct
    >();

  orderItems.forEach(
    (item) => {
      const productName =
        item.product_name?.trim() ||
        "İsimsiz ürün";

      const quantity =
        Number(
          item.quantity || 0
        );

      const revenue =
        Number(
          item.price || 0
        ) * quantity;

      const existing =
        productMap.get(
          productName
        );

      if (existing) {
        existing.quantity +=
          quantity;

        existing.revenue +=
          revenue;
      } else {
        productMap.set(
          productName,
          {
            name:
              productName,
            quantity,
            revenue,
          }
        );
      }
    }
  );

  const topProducts =
    Array.from(
      productMap.values()
    )
      .sort(
        (a, b) =>
          b.quantity -
          a.quantity
      )
      .slice(0, 5);

  // =====================================================
  // DURUM YÜZDESİ
  // =====================================================

  const getPercent =
    (count: number) => {
      if (
        totalOrders === 0
      ) {
        return 0;
      }

      return Math.round(
        (count /
          totalOrders) *
          100
      );
    };

  // =====================================================
  // FORMATLAR
  // =====================================================

  const formatMoney =
    (amount: number) => {
      return new Intl.NumberFormat(
        "tr-TR",
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }
      ).format(amount);
    };

  const formatTime =
    (date: string) => {
      return new Date(
        date
      ).toLocaleTimeString(
        "tr-TR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    };

  const formatDate =
    (date: string) => {
      return new Date(
        date
      ).toLocaleDateString(
        "tr-TR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      );
    };

  const statusText =
    (status: string | null) => {
      switch (status) {
        case "pending":
          return "Yeni Sipariş";

        case "accepted":
          return "Kabul Edildi";

        case "preparing":
          return "Hazırlanıyor";

        case "ready":
          return "Hazır";

        case "delivered":
          return "Teslim Edildi";

        case "cancelled":
          return "İptal";

        default:
          return (
            status ||
            "Bilinmiyor"
          );
      }
    };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f1efeb",
        padding:
          "30px 20px 60px",
        color: "#111",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <section
          style={{
            background:
              "linear-gradient(135deg, #101010 0%, #17150e 100%)",
            color: "#fff",
            borderRadius: "20px",
            padding: "32px",
            marginBottom: "18px",
            boxShadow:
              "0 15px 35px rgba(0,0,0,0.15)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "-60px",
              top: "-60px",
              width: "180px",
              height: "180px",
              border:
                "1px solid rgba(226,164,15,0.35)",
              borderRadius: "50%",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                color: "#e2a40f",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing:
                  "2px",
                marginBottom: "8px",
              }}
            >
              YÖNETİM PANELİ
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: 900,
              }}
            >
              Hoş geldiniz 👋
            </h1>

            <div
              style={{
                marginTop: "8px",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              {restaurant.name}
            </div>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#cfcfcf",
                fontSize: "14px",
              }}
            >
              İşletmenizin satış,
              sipariş ve müşteri
              performansını buradan
              takip edebilirsiniz.
            </p>
          </div>
        </section>

        {/* =================================================
            ÖZET KARTLARI
        ================================================= */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <StatCard
            icon="🛎️"
            title="Toplam Sipariş"
            value={String(
              totalOrders
            )}
            description="Tüm siparişler"
          />

          <StatCard
            icon="💰"
            title="Bugünkü Ciro"
            value={`${formatMoney(
              todayRevenue
            )} TL`}
            description={`${todayOrders.length} sipariş`}
          />

          <StatCard
            icon="📅"
            title="Bu Hafta"
            value={`${formatMoney(
              weekRevenue
            )} TL`}
            description={`${weekOrders.length} sipariş`}
          />

          <StatCard
            icon="📆"
            title="Bu Ay"
            value={`${formatMoney(
              monthRevenue
            )} TL`}
            description={`${monthOrders.length} sipariş`}
          />

          <StatCard
            icon="⭐"
            title="Ortalama Puan"
            value={averageRating.toFixed(
              1
            )}
            description={`${reviewCount} değerlendirme`}
          />
        </section>

        {/* =================================================
            CİRO GRAFİĞİ
        ================================================= */}

        <section
          style={{
            marginBottom: "18px",
          }}
        >
          <DashboardCharts
            weeklyRevenue={
              weeklyRevenue
            }
            monthlyRevenue={
              monthlyRevenue
            }
          />
        </section>

        {/* =================================================
            SİPARİŞ DURUMLARI
        ================================================= */}

        <section
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow:
              "0 5px 20px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              color: "#d99b08",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing:
                "1.5px",
            }}
          >
            SİPARİŞ ANALİZİ
          </div>

          <h2
            style={{
              margin:
                "4px 0 22px",
              fontSize: "22px",
            }}
          >
            Sipariş Durum Dağılımı
          </h2>

          <StatusRow
            label="Yeni Sipariş"
            count={pendingCount}
            percent={getPercent(
              pendingCount
            )}
            icon="🔔"
          />

          <StatusRow
            label="Kabul Edildi"
            count={acceptedCount}
            percent={getPercent(
              acceptedCount
            )}
            icon="👍"
          />

          <StatusRow
            label="Hazırlanıyor"
            count={preparingCount}
            percent={getPercent(
              preparingCount
            )}
            icon="👨‍🍳"
          />

          <StatusRow
            label="Hazır"
            count={readyCount}
            percent={getPercent(
              readyCount
            )}
            icon="✅"
          />

          <StatusRow
            label="Teslim Edildi"
            count={deliveredCount}
            percent={getPercent(
              deliveredCount
            )}
            icon="📦"
          />

          <StatusRow
            label="İptal"
            count={cancelledCount}
            percent={getPercent(
              cancelledCount
            )}
            icon="❌"
          />
        </section>

        {/* =================================================
            EN ÇOK SATAN ÜRÜNLER
        ================================================= */}

        <section
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow:
              "0 5px 20px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              color: "#d99b08",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing:
                "1.5px",
            }}
          >
            SATIŞ PERFORMANSI
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "10px",
              marginBottom:
                "20px",
            }}
          >
            <div>
              <h2
                style={{
                  margin:
                    "4px 0 0",
                  fontSize: "22px",
                }}
              >
                🏆 En Çok Satan Ürünler
              </h2>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  color: "#888",
                  fontSize: "12px",
                }}
              >
                Satılan adet sayısına göre
                sıralanmıştır.
              </p>
            </div>

            <div
              style={{
                background:
                  "#fff7df",
                color:
                  "#a36f00",
                borderRadius:
                  "10px",
                padding:
                  "9px 12px",
                fontSize: "11px",
                fontWeight: 800,
              }}
            >
              {orderItems.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.quantity ||
                      0
                  ),
                0
              )}{" "}
              ürün satıldı
            </div>
          </div>

          {topProducts.length ===
          0 ? (
            <div
              style={{
                padding:
                  "35px 15px",
                textAlign:
                  "center",
                color: "#888",
                border:
                  "1px dashed #ddd",
                borderRadius:
                  "12px",
              }}
            >
              <div
                style={{
                  fontSize:
                    "36px",
                  marginBottom:
                    "8px",
                }}
              >
                🛒
              </div>

              <strong>
                Henüz ürün satışı
                bulunmuyor.
              </strong>

              <p
                style={{
                  fontSize:
                    "12px",
                  margin:
                    "6px 0 0",
                }}
              >
                Sipariş geldikçe
                ürün performansı
                burada görünecek.
              </p>
            </div>
          ) : (
            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: "10px",
              }}
            >
              {topProducts.map(
                (
                  product,
                  index
                ) => {
                  const medals = [
                    "🥇",
                    "🥈",
                    "🥉",
                    "4️⃣",
                    "5️⃣",
                  ];

                  return (
                    <div
                      key={
                        product.name
                      }
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: "13px",
                        padding:
                          "14px",
                        border:
                          "1px solid #eee",
                        borderRadius:
                          "12px",
                        background:
                          index ===
                          0
                            ? "#fffbf0"
                            : "#fff",
                      }}
                    >
                      <div
                        style={{
                          width:
                            "38px",
                          height:
                            "38px",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          fontSize:
                            "20px",
                          background:
                            "#f8f8f8",
                          borderRadius:
                            "10px",
                        }}
                      >
                        {
                          medals[
                            index
                          ]
                        }
                      </div>

                      <div
                        style={{
                          flex: 1,
                          minWidth:
                            0,
                        }}
                      >
                        <strong
                          style={{
                            display:
                              "block",
                            fontSize:
                              "14px",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            product.name
                          }
                        </strong>

                        <span
                          style={{
                            display:
                              "block",
                            color:
                              "#888",
                            fontSize:
                              "11px",
                            marginTop:
                              "3px",
                          }}
                        >
                          {
                            product.quantity
                          }{" "}
                          adet satıldı
                        </span>
                      </div>

                      <div
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        <strong
                          style={{
                            display:
                              "block",
                            fontSize:
                              "14px",
                          }}
                        >
                          {formatMoney(
                            product.revenue
                          )}{" "}
                          TL
                        </strong>

                        <span
                          style={{
                            color:
                              "#999",
                            fontSize:
                              "10px",
                          }}
                        >
                          toplam satış
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* =================================================
            SON SİPARİŞLER + DEĞERLENDİRMELER
        ================================================= */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "18px",
            marginBottom: "24px",
          }}
        >

          {/* SON SİPARİŞLER */}

          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "24px",
              boxShadow:
                "0 5px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                color: "#d99b08",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing:
                  "1.5px",
              }}
            >
              SON SİPARİŞLER
            </div>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "15px",
              }}
            >
              <h2
                style={{
                  margin:
                    "4px 0 0",
                  fontSize:
                    "21px",
                }}
              >
                Güncel Siparişler
              </h2>

              <a
                href="/admin/orders"
                style={{
                  fontSize:
                    "11px",
                  color:
                    "#b77c00",
                  fontWeight:
                    800,
                  textDecoration:
                    "none",
                }}
              >
                Tümünü Gör →
              </a>
            </div>

            {orders
              .slice(0, 6)
              .map(
                (order) => (
                  <div
                    key={
                      order.id
                    }
                    style={{
                      padding:
                        "13px 0",
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          "10px",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            fontSize:
                              "13px",
                          }}
                        >
                          #{order.id}
                        </strong>

                        <div
                          style={{
                            fontSize:
                              "11px",
                            color:
                              "#888",
                            marginTop:
                              "3px",
                          }}
                        >
                          Masa{" "}
                          {order.table_number ||
                            "-"}{" "}
                          •{" "}
                          {formatTime(
                            order.created_at
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        <strong
                          style={{
                            fontSize:
                              "13px",
                          }}
                        >
                          {formatMoney(
                            Number(
                              order.total_amount ||
                                0
                            )
                          )}{" "}
                          TL
                        </strong>

                        <div
                          style={{
                            fontSize:
                              "10px",
                            color:
                              order.status ===
                              "delivered"
                                ? "#16803c"
                                : "#b77c00",
                            marginTop:
                              "3px",
                          }}
                        >
                          {statusText(
                            order.status
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}

            {orders.length ===
              0 && (
              <div
                style={{
                  textAlign:
                    "center",
                  padding:
                    "30px 10px",
                  color:
                    "#888",
                }}
              >
                Henüz sipariş
                bulunmuyor.
              </div>
            )}
          </div>

          {/* DEĞERLENDİRMELER */}

          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "24px",
              boxShadow:
                "0 5px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                color: "#d99b08",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing:
                  "1.5px",
              }}
            >
              SON DEĞERLENDİRMELER
            </div>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "15px",
              }}
            >
              <h2
                style={{
                  margin:
                    "4px 0 0",
                  fontSize:
                    "21px",
                }}
              >
                Müşteri Yorumları
              </h2>

              <a
                href="/admin/degerlendirmeler"
                style={{
                  fontSize:
                    "11px",
                  color:
                    "#b77c00",
                  fontWeight:
                    800,
                  textDecoration:
                    "none",
                }}
              >
                Tümünü Gör →
              </a>
            </div>

            {reviews
              .slice(0, 5)
              .map(
                (review) => (
                  <div
                    key={
                      review.id
                    }
                    style={{
                      padding:
                        "13px 0",
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          "10px",
                      }}
                    >
                      <strong
                        style={{
                          fontSize:
                            "13px",
                        }}
                      >
                        👤{" "}
                        {review.customer_name ||
                          "Müşteri"}
                      </strong>

                      <span
                        style={{
                          color:
                            "#d99b08",
                          fontSize:
                            "13px",
                        }}
                      >
                        {"★".repeat(
                          Number(
                            review.rating
                          )
                        )}
                      </span>
                    </div>

                    {review.comment && (
                      <p
                        style={{
                          margin:
                            "7px 0 4px",
                          fontSize:
                            "12px",
                          color:
                            "#555",
                          lineHeight:
                            1.5,
                        }}
                      >
                        "
                        {
                          review.comment
                        }
                        "
                      </p>
                    )}

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        marginTop:
                          "5px",
                      }}
                    >
                      <span
                        style={{
                          fontSize:
                            "10px",
                          color:
                            "#999",
                        }}
                      >
                        {formatDate(
                          review.created_at
                        )}
                      </span>

                      <span
                        style={{
                          fontSize:
                            "9px",
                          fontWeight:
                            800,
                          color:
                            review.is_visible
                              ? "#16803c"
                              : "#b42318",
                        }}
                      >
                        {review.is_visible
                          ? "● YAYINDA"
                          : "● GİZLİ"}
                      </span>
                    </div>
                  </div>
                )
              )}

            {reviews.length ===
              0 && (
              <div
                style={{
                  textAlign:
                    "center",
                  padding:
                    "30px 10px",
                  color:
                    "#888",
                }}
              >
                Henüz değerlendirme
                yok.
              </div>
            )}
          </div>

        </section>

        {/* =================================================
            HIZLI İŞLEMLER
        ================================================= */}

        <section>

          <div
            style={{
              color:
                "#d99b08",
              fontSize:
                "10px",
              fontWeight:
                800,
              letterSpacing:
                "1.5px",
              marginBottom:
                "5px",
            }}
          >
            HIZLI İŞLEMLER
          </div>

          <h2
            style={{
              margin:
                "0 0 15px",
              fontSize:
                "22px",
            }}
          >
            İşletmenizi yönetin
          </h2>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >

            <ManagementCard
              icon="📋"
              title="Menü Yönetimi"
              description="Ürünleri ve kategorileri yönetin."
              href="/admin/menu"
            />

            <ManagementCard
              icon="🛒"
              title="Siparişler"
              description="Siparişlerinizi görüntüleyin ve yönetin."
              href="/admin/orders"
            />

            <ManagementCard
              icon="👨‍🍳"
              title="Çalışanlar"
              description="Çalışanlarınızı yönetin."
              href="/admin/calisanlar"
            />

            <ManagementCard
              icon="⭐"
              title="Değerlendirmeler"
              description="Müşteri yorumlarını yönetin."
              href="/admin/degerlendirmeler"
            />

            <ManagementCard
              icon="💳"
              title="Ödemeler"
              description="Ödeme hareketlerini inceleyin."
              href="/admin/odemeler"
            />

            <ManagementCard
              icon="⚙️"
              title="İşletme Ayarları"
              description="Restoran bilgilerinizi düzenleyin."
              href="/admin/ayarlar"
            />
            <a
  href="/admin/qr"
  className="admin-management-card"
>
  <div className="admin-card-icon">
    📱
  </div>

  <div>
    <h3>
      QR / NFC
    </h3>

    <p>
      İşletmenizin QR kodunu
      oluşturun ve yönetin.
    </p>
  </div>

  <span className="admin-card-arrow">
    →
  </span>
</a>

          </div>

        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer
          style={{
            textAlign:
              "center",
            padding:
              "35px 0 10px",
            color:
              "#999",
            fontSize:
              "11px",
          }}
        >
          OZT Digital Menu •
          Yönetim Sistemi
        </footer>

      </div>
    </main>
  );
}

// ======================================================
// STAT CARD
// ======================================================

function StatCard({
  icon,
  title,
  value,
  description,
}: {
  icon: string;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "18px",
        minHeight: "115px",
        boxShadow:
          "0 5px 18px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          background:
            "#fff6db",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontSize:
            "18px",
          marginBottom:
            "12px",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize:
            "11px",
          color:
            "#777",
          fontWeight:
            700,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize:
            "19px",
          fontWeight:
            900,
          marginTop:
            "3px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize:
            "10px",
          color:
            "#999",
          marginTop:
            "3px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

// ======================================================
// STATUS ROW
// ======================================================

function StatusRow({
  label,
  count,
  percent,
  icon,
}: {
  label: string;
  count: number;
  percent: number;
  icon: string;
}) {
  return (
    <div
      style={{
        marginBottom:
          "17px",
      }}
    >
      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginBottom:
            "7px",
          fontSize:
            "13px",
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "8px",
            fontWeight:
              700,
          }}
        >
          <span>
            {icon}
          </span>

          {label}
        </div>

        <strong>
          {count}
        </strong>
      </div>

      <div
        style={{
          height:
            "9px",
          background:
            "#eeeeee",
          borderRadius:
            "20px",
          overflow:
            "hidden",
        }}
      >
        <div
          style={{
            width:
              `${percent}%`,
            height:
              "100%",
            background:
              "linear-gradient(90deg, #d99b08, #edbd45)",
            borderRadius:
              "20px",
            transition:
              "width .3s ease",
          }}
        />
      </div>
    </div>
  );
}

// ======================================================
// MANAGEMENT CARD
// ======================================================

function ManagementCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      style={{
        textDecoration:
          "none",
        color:
          "#111",
        background:
          "#fff",
        borderRadius:
          "16px",
        padding:
          "20px",
        minHeight:
          "130px",
        boxShadow:
          "0 5px 18px rgba(0,0,0,0.04)",
        display:
          "block",
        transition:
          "transform .15s",
      }}
    >
      <div
        style={{
          width:
            "38px",
          height:
            "38px",
          borderRadius:
            "10px",
          background:
            "#fff6db",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontSize:
            "18px",
          marginBottom:
            "14px",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize:
            "16px",
          fontWeight:
            900,
          marginBottom:
            "5px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize:
            "11px",
          color:
            "#777",
          lineHeight:
            1.5,
        }}
      >
        {description}
      </div>

      <div
        style={{
          marginTop:
            "10px",
          color:
            "#c88b00",
          fontWeight:
            800,
          fontSize:
            "12px",
        }}
      >
        Yönet →
      </div>
    </a>
  );
}