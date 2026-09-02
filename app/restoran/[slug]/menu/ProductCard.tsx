"use client";

import { useEffect, useState } from "react";
import { useCart } from "./CartContext";

type Product = {
  id: number;
  name: string;
  description: string | null;
  ingredients: string | null;
  allergens: string | null;
  price: number;
  image_url: string | null;
};

export default function ProductCard({
  product,
}: {
  product: Product;
}) {
  const { addToCart } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // =====================================================
  // SEPETE EKLENDİ BİLDİRİMİ
  // =====================================================

  const [showAddedToast, setShowAddedToast] = useState(false);

  function openModal() {
    setQuantity(1);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  function increase() {
    setQuantity((current) => current + 1);
  }

  function decrease() {
    setQuantity((current) =>
      current > 1 ? current - 1 : 1
    );
  }

  function handleAddToCart() {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image_url: product.image_url,
        quantity: 1,
      });
    }

    // Önce modalı kapat
    closeModal();

    // Bildirimi göster
    setShowAddedToast(true);
  }

  // =====================================================
  // TOAST'U OTOMATİK KAPAT
  // =====================================================

  useEffect(() => {
    if (!showAddedToast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowAddedToast(false);
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [showAddedToast]);

  const total =
    Number(product.price) * quantity;

  /*
   * =====================================================
   * MODAL AÇIKKEN ARKA PLAN SCROLL'UNU KİLİTLE
   * =====================================================
   */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen]);

  /*
   * =====================================================
   * ESC İLE MODAL KAPAT
   * =====================================================
   */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen]);

  return (
    <>
      {/* =================================================
          SEPETE EKLENDİ — TOAST
      ================================================= */}

      {showAddedToast && (
        <div
          className="cart-added-toast"
          role="status"
          aria-live="polite"
        >
          <div className="cart-added-toast-icon">
            ✓
          </div>

          <div className="cart-added-toast-content">
            <strong>
              SEPETE EKLENDİ
            </strong>

            <span>
              {product.name}
              {quantity > 1
                ? ` · ${quantity} adet`
                : ""}
            </span>
          </div>
        </div>
      )}

      {/* =================================================
          ÜRÜN KARTI
      ================================================= */}

      <article
        className="customer-product"
        onClick={openModal}
        role="button"
        tabIndex={0}
        aria-label={`${product.name} detaylarını aç`}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            openModal();
          }
        }}
      >
        {/* FOTOĞRAF */}

        <div className="customer-product-image-wrap">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="customer-product-image"
            />
          ) : (
            <div className="customer-product-no-image">
              🍽️
            </div>
          )}
        </div>

        {/* ÜRÜN BİLGİLERİ */}

        <div className="customer-product-info">

          <h3>
            {product.name}
          </h3>

          {product.description && (
            <p>
              {product.description}
            </p>
          )}

          <strong className="customer-product-price">
            {product.price} TL
          </strong>

        </div>

        {/* SAĞ BUTON */}

        <div className="customer-product-right">

          <button
            type="button"
            className="add-to-cart-button"
            onClick={(event) => {
              event.stopPropagation();
              openModal();
            }}
            aria-label={`${product.name} detaylarını aç`}
          >
            <span>＋</span>
          </button>

        </div>
      </article>

      {/* =================================================
          ÜRÜN DETAY MODALI
      ================================================= */}

      {isOpen && (
        <div
          className="product-modal-overlay"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${product.name} ürün detayları`}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* ================================
                FOTOĞRAF
            ================================= */}

            <div className="product-modal-image-area">

              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="product-modal-image"
                />
              ) : (
                <div className="product-modal-no-image">
                  <span>🍽️</span>
                </div>
              )}

            </div>

            {/* ================================
                KAPAT
            ================================= */}

            <button
              type="button"
              className="product-modal-close"
              onClick={closeModal}
              aria-label="Ürün detayını kapat"
            >
              ×
            </button>

            {/* ================================
                İÇERİK
            ================================= */}

            <div className="product-modal-content">

              {/* BAŞLIK */}

              <div className="product-modal-heading">

                <h2>
                  {product.name}
                </h2>

                <div className="product-modal-line">
                  <span>◆</span>
                </div>

              </div>

              {/* FİYAT */}

              <div className="product-modal-price">
                {product.price} TL
              </div>

              {/* AÇIKLAMA */}

              {product.description && (
                <p className="product-modal-description">
                  {product.description}
                </p>
              )}

              {/* İÇİNDEKİLER */}

              {product.ingredients && (
                <div className="product-modal-info-box">

                  <div className="product-modal-info-title">
                    🍴 İçindekiler
                  </div>

                  <p>
                    {product.ingredients}
                  </p>

                </div>
              )}

              {/* ALERJEN */}

              {product.allergens && (
                <div className="product-modal-allergen-box">

                  <div className="product-modal-info-title">
                    ⚠️ Alerjen Bilgisi
                  </div>

                  <p>
                    {product.allergens}
                  </p>

                </div>
              )}

              {/* AYIRICI */}

              <div className="product-modal-divider" />

              {/* ADET */}

              <div className="quantity-title">
                Adet
              </div>

              <div className="quantity-selector">

                <button
                  type="button"
                  onClick={decrease}
                  aria-label="Ürün adedini azalt"
                >
                  −
                </button>

                <strong>
                  {quantity}
                </strong>

                <button
                  type="button"
                  onClick={increase}
                  aria-label="Ürün adedini artır"
                >
                  +
                </button>

              </div>

              {/* TOPLAM */}

              <div className="product-modal-total">

                <span>
                  Toplam
                </span>

                <strong>
                  {total} TL
                </strong>

              </div>

              {/* SEPETE EKLE */}

              <button
                type="button"
                className="product-modal-add"
                onClick={handleAddToCart}
              >
                <span>🛒</span>

                Sepete Ekle
              </button>

              <div className="product-modal-note">
                ✦ Siparişinizi hızlıca oluşturun
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}