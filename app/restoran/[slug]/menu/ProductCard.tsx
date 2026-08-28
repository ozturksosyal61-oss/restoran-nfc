"use client";

import { useState } from "react";
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

    setIsOpen(false);
  }

  const total = Number(product.price) * quantity;

  return (
    <>
      {/* =========================
          ÜRÜN KARTI
      ========================= */}

      <div
        className="customer-product"
        onClick={openModal}
      >
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="customer-product-image"
          />
        )}

        <div className="customer-product-info">
          <h3>{product.name}</h3>

          {product.description && (
            <p>{product.description}</p>
          )}
        </div>

        <div className="customer-product-right">
          <strong className="customer-product-price">
            {product.price} TL
          </strong>

          <button
            type="button"
            className="add-to-cart-button"
            onClick={(event) => {
              event.stopPropagation();
              openModal();
            }}
          >
            <span>＋</span>
            Sepete Ekle
          </button>
        </div>
      </div>

      {/* =========================
          ÜRÜN DETAY MODALI
      ========================= */}

      {isOpen && (
        <div
          className="product-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="product-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* SOL FOTOĞRAF ALANI */}

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

              <div className="product-modal-image-label">
                ✦ Özel Lezzet
              </div>

            </div>

            {/* SAĞ İÇERİK */}

            <div className="product-modal-content">

              {/* KAPAT */}

              <button
                type="button"
                className="product-modal-close"
                onClick={closeModal}
                aria-label="Kapat"
              >
                ×
              </button>

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

              {/* ALERJENLER */}

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
                  aria-label="Azalt"
                >
                  −
                </button>

                <strong>
                  {quantity}
                </strong>

                <button
                  type="button"
                  onClick={increase}
                  aria-label="Artır"
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