type ProductSalesItem = {
  productName: string;
  quantity: number;
  revenue: number;
};

type CategorySalesItem = {
  categoryName: string;
  quantity: number;
  revenue: number;
};

type Props = {
  products: ProductSalesItem[];
  categories: CategorySalesItem[];
};

function formatPrice(value: number) {
  return Number(value).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function ProductSalesAnalytics({
  products,
  categories,
}: Props) {
  const totalQuantity = products.reduce(
    (sum, product) => sum + product.quantity,
    0
  );

  const totalRevenue = products.reduce(
    (sum, product) => sum + product.revenue,
    0
  );

  const topProduct = products[0] ?? null;
  const topCategory = categories[0] ?? null;

  return (
    <section
      style={{
        background: "white",
        borderRadius: "18px",
        padding: "22px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
        minWidth: 0,
      }}
    >
      <div
        className="dashboard-section-heading"
        style={{
          marginBottom: "18px",
        }}
      >
        <span>ÜRÜN & SATIŞ ANALİTİĞİ</span>
        <h2>En çok satanlar</h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(145px, 1fr))",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            padding: "13px 14px",
            borderRadius: "12px",
            background: "#faf8f3",
            border: "1px solid #eee7d8",
          }}
        >
          <div
            style={{
              color: "#999",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: ".6px",
            }}
          >
            SATILAN ÜRÜN ADEDİ
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "21px",
              fontWeight: 800,
            }}
          >
            {totalQuantity.toLocaleString("tr-TR")}
          </div>
        </div>

        <div
          style={{
            padding: "13px 14px",
            borderRadius: "12px",
            background: "#faf8f3",
            border: "1px solid #eee7d8",
          }}
        >
          <div
            style={{
              color: "#999",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: ".6px",
            }}
          >
            ÜRÜN CİROSU
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "21px",
              fontWeight: 800,
            }}
          >
            {formatPrice(totalRevenue)} TL
          </div>
        </div>

        <div
          style={{
            padding: "13px 14px",
            borderRadius: "12px",
            background: "#faf8f3",
            border: "1px solid #eee7d8",
          }}
        >
          <div
            style={{
              color: "#999",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: ".6px",
            }}
          >
            EN ÇOK SATAN
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "16px",
              fontWeight: 800,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={topProduct?.productName || "Henüz veri yok"}
          >
            {topProduct?.productName || "-"}
          </div>

          <div
            style={{
              marginTop: "2px",
              color: "#999",
              fontSize: "10px",
            }}
          >
            {topProduct
              ? `${topProduct.quantity.toLocaleString(
                  "tr-TR"
                )} adet`
              : "Henüz veri yok"}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div
          style={{
            padding: "28px 18px",
            textAlign: "center",
            border: "1px dashed #ddd4c3",
            borderRadius: "14px",
            background: "#faf8f3",
          }}
        >
          <div style={{ fontSize: "34px" }}>📊</div>

          <h3 style={{ margin: "8px 0 5px" }}>
            Henüz satış verisi yok
          </h3>

          <p
            style={{
              margin: 0,
              color: "#888",
              fontSize: "12px",
            }}
          >
            Siparişler oluştukça ürün satış analitiği
            burada görünecek.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.35fr) minmax(260px, 1fr)",
            gap: "18px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: ".7px",
                color: "#a47a17",
                marginBottom: "9px",
              }}
            >
              ÜRÜNLER
            </div>

            <div
              style={{
                display: "grid",
                gap: "8px",
              }}
            >
              {products.slice(0, 10).map((product, index) => (
                <div
                  key={`${product.productName}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "30px minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 11px",
                    border: "1px solid #eee9df",
                    borderRadius: "11px",
                  }}
                >
                  <span
                    style={{
                      width: "28px",
                      height: "28px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "9px",
                      background: "#fff7df",
                      color: "#946b00",
                      fontSize: "11px",
                      fontWeight: 800,
                    }}
                  >
                    {index + 1}
                  </span>

                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {product.productName}
                    </strong>

                    <span
                      style={{
                        display: "block",
                        marginTop: "2px",
                        color: "#999",
                        fontSize: "10px",
                      }}
                    >
                      {product.quantity.toLocaleString(
                        "tr-TR"
                      )}{" "}
                      adet
                    </span>
                  </div>

                  <strong
                    style={{
                      fontSize: "11px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatPrice(product.revenue)} TL
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: ".7px",
                color: "#a47a17",
                marginBottom: "9px",
              }}
            >
              KATEGORİLER
            </div>

            {categories.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: "#999",
                  fontSize: "12px",
                }}
              >
                Kategori satış verisi yok.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "8px",
                }}
              >
                {categories
                  .slice(0, 8)
                  .map((category, index) => (
                    <div
                      key={`${category.categoryName}-${index}`}
                      style={{
                        padding: "11px 12px",
                        border: "1px solid #eee9df",
                        borderRadius: "11px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <strong
                          style={{
                            fontSize: "11px",
                          }}
                        >
                          {category.categoryName}
                        </strong>

                        <span
                          style={{
                            fontSize: "10px",
                            color: "#999",
                          }}
                        >
                          {category.quantity.toLocaleString(
                            "tr-TR"
                          )}{" "}
                          adet
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        {formatPrice(category.revenue)} TL
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {topCategory && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "11px 12px",
                  borderRadius: "11px",
                  background: "#fffaf0",
                  border: "1px solid #ead9ae",
                }}
              >
                <div
                  style={{
                    color: "#946b00",
                    fontSize: "9px",
                    fontWeight: 800,
                    letterSpacing: ".5px",
                  }}
                >
                  EN ÇOK SATIŞ GETİREN KATEGORİ
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                    fontSize: "12px",
                  }}
                >
                  {topCategory.categoryName}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      <p
        style={{
          margin: "14px 0 0",
          color: "#999",
          fontSize: "11px",
        }}
      >
        Analitik veriler sipariş kalemlerindeki ürün adı,
        adet ve fiyat bilgilerine göre hesaplanır.
      </p>
    </section>
  );
}
