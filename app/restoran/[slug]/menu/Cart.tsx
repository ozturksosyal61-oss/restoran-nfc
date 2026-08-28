"use client";

import { useCart } from "./CartContext";
import { useParams, useRouter } from "next/navigation";

export default function Cart() {
  const {
    items,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    total,
    itemCount,
  } = useCart();

  const params = useParams();
  const router = useRouter();

  const slug = params.slug as string;

  function openCart() {
    document
      .getElementById("cart-details")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function goToOrder() {
    if (items.length === 0) {
      return;
    }

    router.push(`/restoran/${slug}/siparis`);
  }

  return (
    <>
      {/* SABİT MİNİ SEPET */}
      {items.length > 0 && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "20px",
            transform: "translateX(-50%)",
            width: "min(448px, calc(100% - 24px))",
            padding: "12px 14px",
            background: "#111",
            color: "white",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3)",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                fontSize: "24px",
              }}
            >
              🛒
            </span>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <strong
                style={{
                  fontSize: "14px",
                }}
              >
                {itemCount} Ürün
              </strong>

              <span
                style={{
                  fontSize: "13px",
                  opacity: 0.75,
                }}
              >
                {total} TL
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={openCart}
            style={{
              border: "none",
              background: "white",
              color: "#111",
              padding: "11px 14px",
              borderRadius: "10px",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Sepeti Gör →
          </button>
        </div>
      )}

      {/* NORMAL SEPET */}
      <section
        id="cart-details"
        className="cart-section"
      >
        <div className="cart-header">
          <h2>🛒 Sepet</h2>

          {items.length > 0 && (
            <span>{itemCount} ürün</span>
          )}
        </div>

        {items.length === 0 ? (
          <p>Sepetiniz şu anda boş.</p>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div
                  className="cart-item"
                  key={item.id}
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="cart-item-image"
                    />
                  )}

                  <div className="cart-item-info">
                    <h3>{item.name}</h3>

                    <strong>
                      {item.price} TL
                    </strong>
                  </div>

                  <div className="cart-item-actions">
                    <button
                      type="button"
                      onClick={() =>
                        decreaseQuantity(item.id)
                      }
                    >
                      −
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() =>
                        increaseQuantity(item.id)
                      }
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-item-total">
                    {item.price * item.quantity} TL
                  </div>

                  <button
                    type="button"
                    className="cart-remove-button"
                    onClick={() =>
                      removeFromCart(item.id)
                    }
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <span>Toplam</span>

              <strong>{total} TL</strong>
            </div>

            <button
              type="button"
              className="cart-order-button"
              onClick={goToOrder}
            >
              Sipariş Ver
            </button>
          </>
        )}
      </section>
    </>
  );
}