"use client";

import ProductCard from "./ProductCard";

type Product = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  ingredients: string | null;
  allergens: string | null;
  price: number;
  image_url: string | null;
};

type Category = {
  id: number;
  name: string;
};

type MenuLayoutsProps = {
  categories: Category[];
  products: Product[];
  layout?: "classic" | "editorial" | "grid" | "ivory";
};

/* =========================================================
   YARDIMCI
========================================================= */

function getCategoryProducts(
  categoryId: number,
  products: Product[]
) {
  return products.filter(
    (product) =>
      Number(product.category_id) === Number(categoryId)
  );
}

function ProductItem({
  product,
}: {
  product: Product;
}) {
  return (
    <ProductCard
      product={{
        id: product.id,
        name: product.name,
        description: product.description,
        ingredients: product.ingredients,
        allergens: product.allergens,
        price: Number(product.price),
        image_url: product.image_url,
      }}
    />
  );
}

function EmptyCategory() {
  return (
    <div className="ozt-empty-category">
      <div className="ozt-empty-icon">🍽️</div>
      <div>Bu kategoride şu anda ürün bulunmuyor.</div>
    </div>
  );
}

/* =========================================================
   CLASSIC
   Geleneksel / temiz restoran menüsü
========================================================= */

function ClassicLayout({
  categories,
  products,
}: MenuLayoutsProps) {
  return (
    <div className="ozt-layout ozt-layout-classic">
      {categories.map((category) => {
        const categoryProducts = getCategoryProducts(
          category.id,
          products
        );

        return (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="ozt-classic-section"
          >
            <div className="ozt-classic-category-header">
              <div className="ozt-classic-title-wrap">
                <div className="ozt-classic-accent" />

                <div>
                  <h2>{category.name}</h2>

                  <span>
                    {categoryProducts.length} ürün
                  </span>
                </div>
              </div>

              <div className="ozt-classic-number">
                {String(categoryProducts.length).padStart(2, "0")}
              </div>
            </div>

            {categoryProducts.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ozt-classic-products">
                {categoryProducts.map((product) => (
                  <div
                    key={product.id}
                    className="ozt-classic-product-wrapper"
                  >
                    <ProductItem product={product} />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* =========================================================
   EDITORIAL
   Dergi / premium restoran
========================================================= */

function EditorialLayout({
  categories,
  products,
}: MenuLayoutsProps) {
  return (
    <div className="ozt-layout ozt-layout-editorial">
      {categories.map((category) => {
        const categoryProducts = getCategoryProducts(
          category.id,
          products
        );

        return (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="ozt-editorial-section"
          >
            {/* KATEGORİ BAŞLIĞI */}

            <div className="ozt-editorial-heading">
              <div className="ozt-editorial-small">
                OZT MENU
              </div>

              <div className="ozt-editorial-heading-row">
                <h2>{category.name}</h2>

                <span>
                  {String(categoryProducts.length).padStart(
                    2,
                    "0"
                  )}
                </span>
              </div>

              <div className="ozt-editorial-line">
                <div />
              </div>
            </div>

            {/* ÜRÜNLER */}

            {categoryProducts.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ozt-editorial-products">
                {categoryProducts.map((product, index) => (
                  <article
                    key={product.id}
                    className={
                      index === 0
                        ? "ozt-editorial-feature"
                        : "ozt-editorial-standard"
                    }
                  >
                    <ProductItem product={product} />
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* =========================================================
   GRID
   Modern / Cafe / Burger / Fast Food
========================================================= */

function GridLayout({
  categories,
  products,
}: MenuLayoutsProps) {
  return (
    <div className="ozt-layout ozt-layout-grid">
      {categories.map((category) => {
        const categoryProducts = getCategoryProducts(
          category.id,
          products
        );

        return (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="ozt-grid-section"
          >
            <div className="ozt-grid-heading">
              <div>
                <span>MENÜ</span>
                <h2>{category.name}</h2>
              </div>

              <strong>
                {categoryProducts.length}
              </strong>
            </div>

            {categoryProducts.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ozt-grid-products">
                {categoryProducts.map((product) => (
                  <article
                    key={product.id}
                    className="ozt-grid-card"
                  >
                    <ProductItem product={product} />
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}



/* =========================================================
   IVORY / LUXURY 3D
   Açık / premium / 3D-neumorphic restoran menüsü
========================================================= */

function IvoryLuxury3DLayout({
  categories,
  products,
}: MenuLayoutsProps) {
  return (
    <div className="ozt-layout ozt-layout-ivory-3d">
      <div className="ozt-ivory-hero">
        <div className="ozt-ivory-orb" />
        <div className="ozt-ivory-kicker">OZT DIGITAL MENU</div>
        <div className="ozt-ivory-title">Lezzeti Keşfet</div>
        <div className="ozt-ivory-subtitle">Premium menü deneyimi</div>
      </div>

      {categories.map((category) => {
        const categoryProducts = getCategoryProducts(
          category.id,
          products
        );

        return (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="ozt-ivory-section"
          >
            <div className="ozt-ivory-heading">
              <div>
                <span>KATEGORİ</span>
                <h2>{category.name}</h2>
              </div>
              <div className="ozt-ivory-count">
                {String(categoryProducts.length).padStart(2, "0")}
              </div>
            </div>

            {categoryProducts.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ozt-ivory-products">
                {categoryProducts.map((product, index) => (
                  <article
                    key={product.id}
                    className={
                      index === 0
                        ? "ozt-ivory-card ozt-ivory-card-feature"
                        : "ozt-ivory-card"
                    }
                  >
                    <ProductItem product={product} />
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function MenuLayouts({
  categories,
  products,
  layout = "classic",
}: MenuLayoutsProps) {
  return (
    <>
      <style>{`

        /* =====================================================
           ORTAK
        ===================================================== */

        .ozt-layout {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 0 18px;
          box-sizing: border-box;
        }

        .ozt-layout *,
        .ozt-layout *::before,
        .ozt-layout *::after {
          box-sizing: border-box;
        }

        .ozt-empty-category {
          padding: 32px 20px;
          border: 1px solid #ded8ce;
          border-radius: 18px;
          background: #fff;
          color: #777 !important;
          text-align: center;
          font-size: 13px;
        }

        .ozt-empty-icon {
          margin-bottom: 8px;
          font-size: 28px;
        }

        /* =====================================================
           CLASSIC
        ===================================================== */

        .ozt-layout-classic {
          padding-top: 4px;
        }

        .ozt-classic-section {
          margin-bottom: 42px;
          scroll-margin-top: 90px;
        }

        .ozt-classic-category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .ozt-classic-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ozt-classic-accent {
          width: 5px;
          height: 34px;
          border-radius: 999px;
          background: #d4a017;
        }

        .ozt-classic-category-header h2 {
          margin: 0 !important;
          color: #171717 !important;
          font-size: 24px !important;
          line-height: 1.05 !important;
          font-weight: 900 !important;
        }

        .ozt-classic-title-wrap span {
          display: block;
          margin-top: 4px;
          color: #999 !important;
          font-size: 11px !important;
        }

        .ozt-classic-number {
          color: #b88927 !important;
          font-size: 12px !important;
          font-weight: 900 !important;
        }

        .ozt-classic-products {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .ozt-classic-product-wrapper {
          width: 100%;
        }

        /*
         * Classic'in kendi kart yapısı
         */

        .ozt-classic-product-wrapper .customer-product {
          display: grid !important;
          grid-template-columns: 125px minmax(0, 1fr) 50px !important;
          align-items: center !important;
          gap: 16px !important;

          width: 100% !important;
          min-height: 125px !important;

          padding: 10px !important;

          background: #fff !important;
          border: 1px solid #e5e0d8 !important;
          border-radius: 18px !important;

          box-shadow:
            0 6px 20px rgba(0,0,0,0.05) !important;

          overflow: hidden !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-image-wrap {
          width: 125px !important;
          height: 105px !important;

          border-radius: 12px !important;
          overflow: hidden !important;

          background: #f4f1eb !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-info {
          min-width: 0 !important;
          padding: 4px 0 !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-info h3 {
          margin: 0 0 7px !important;
          color: #171717 !important;
          font-size: 16px !important;
          font-weight: 900 !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-info p {
          margin: 0 0 10px !important;
          color: #777 !important;
          font-size: 11px !important;
          line-height: 1.45 !important;

          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 2 !important;
          overflow: hidden !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-price {
          color: #b88927 !important;
          font-size: 16px !important;
          font-weight: 950 !important;
        }

        .ozt-classic-product-wrapper
        .customer-product-right {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .ozt-classic-product-wrapper
        .add-to-cart-button {
          width: 42px !important;
          height: 42px !important;

          border: 0 !important;
          border-radius: 50% !important;

          background: #181818 !important;
          color: #fff !important;

          cursor: pointer !important;
        }

        .ozt-classic-product-wrapper
        .add-to-cart-button span {
          font-size: 23px !important;
        }

        /* =====================================================
           EDITORIAL
        ===================================================== */

        .ozt-layout-editorial {
          max-width: 700px;
          padding-left: 22px;
          padding-right: 22px;

          background: #f5f0e7;
          color: #171717;
        }

        .ozt-editorial-section {
          margin-bottom: 58px;
          scroll-margin-top: 90px;
        }

        .ozt-editorial-heading {
          padding-top: 10px;
          margin-bottom: 22px;
        }

        .ozt-editorial-small {
          margin-bottom: 7px;
          color: #a27a2a !important;
          font-size: 9px !important;
          font-weight: 900 !important;
          letter-spacing: 4px !important;
        }

        .ozt-editorial-heading-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 15px;
        }

        .ozt-editorial-heading-row h2 {
          margin: 0 !important;
          color: #171717 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 34px !important;
          line-height: 1 !important;
          font-weight: 500 !important;
          letter-spacing: -1px !important;
        }

        .ozt-editorial-heading-row span {
          color: #a27a2a !important;
          font-size: 12px !important;
          font-weight: 800 !important;
        }

        .ozt-editorial-line {
          position: relative;
          width: 100%;
          height: 1px;
          margin-top: 13px;
          background: #cfc3ae;
        }

        .ozt-editorial-line div {
          width: 62px;
          height: 3px;
          margin-top: -1px;
          background: #a27a2a;
        }

        .ozt-editorial-products {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /*
         * EDITORIAL FEATURE
         * İlk ürün büyük dergi kartı
         */

        .ozt-editorial-feature
        .customer-product {
          position: relative !important;

          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;

          width: 100% !important;

          padding: 0 !important;

          background: #fff !important;
          border: 0 !important;
          border-radius: 0 !important;

          overflow: hidden !important;

          box-shadow:
            0 8px 25px rgba(52,43,28,0.10) !important;
        }

        .ozt-editorial-feature
        .customer-product-image-wrap {
          width: 100% !important;
          height: 300px !important;

          border-radius: 0 !important;
          overflow: hidden !important;
          background: #e9e2d7 !important;
        }

        .ozt-editorial-feature
        .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }

        .ozt-editorial-feature
        .customer-product-info {
          padding: 18px 20px 7px !important;
        }

        .ozt-editorial-feature
        .customer-product-info h3 {
          margin: 0 0 8px !important;
          color: #171717 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 25px !important;
          font-weight: 600 !important;
        }

        .ozt-editorial-feature
        .customer-product-info p {
          margin: 0 0 12px !important;
          color: #777 !important;
          font-size: 12px !important;
          line-height: 1.55 !important;
        }

        .ozt-editorial-feature
        .customer-product-price {
          display: block !important;
          padding: 0 20px 18px !important;

          color: #a27a2a !important;
          font-size: 18px !important;
          font-weight: 900 !important;
        }

        .ozt-editorial-feature
        .customer-product-right {
          position: absolute !important;
          right: 17px !important;
          bottom: 17px !important;
          z-index: 5 !important;
        }

        .ozt-editorial-feature
        .add-to-cart-button {
          width: 48px !important;
          height: 48px !important;

          border: 0 !important;
          border-radius: 50% !important;

          background: #b88927 !important;
          color: #fff !important;
        }

        .ozt-editorial-feature
        .add-to-cart-button span {
          font-size: 25px !important;
        }

        /*
         * EDITORIAL STANDARD
         * Diğer ürünler dergi içi yatay kart
         */

        .ozt-editorial-standard
        .customer-product {
          position: relative !important;

          display: grid !important;
          grid-template-columns:
            190px minmax(0, 1fr) 42px !important;

          align-items: center !important;
          gap: 17px !important;

          width: 100% !important;
          min-height: 150px !important;

          padding: 0 !important;

          background: #fff !important;
          border: 0 !important;
          border-radius: 0 !important;

          overflow: hidden !important;

          box-shadow:
            0 6px 18px rgba(52,43,28,0.07) !important;
        }

        .ozt-editorial-standard
        .customer-product-image-wrap {
          width: 190px !important;
          height: 150px !important;

          border-radius: 0 !important;
          overflow: hidden !important;
          background: #e9e2d7 !important;
        }

        .ozt-editorial-standard
        .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }

        .ozt-editorial-standard
        .customer-product-info {
          min-width: 0 !important;
          padding: 15px 0 !important;
        }

        .ozt-editorial-standard
        .customer-product-info h3 {
          margin: 0 0 6px !important;
          color: #171717 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 19px !important;
          font-weight: 600 !important;
        }

        .ozt-editorial-standard
        .customer-product-info p {
          margin: 0 0 10px !important;
          color: #777 !important;
          font-size: 10px !important;
          line-height: 1.45 !important;
        }

        .ozt-editorial-standard
        .customer-product-price {
          color: #a27a2a !important;
          font-size: 15px !important;
          font-weight: 900 !important;
        }

        .ozt-editorial-standard
        .customer-product-right {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .ozt-editorial-standard
        .add-to-cart-button {
          width: 38px !important;
          height: 38px !important;
          border: 0 !important;
          border-radius: 50% !important;
          background: #171717 !important;
          color: #fff !important;
        }

        /* =====================================================
           GRID
        ===================================================== */

        .ozt-layout-grid {
          max-width: 760px;
        }

        .ozt-grid-section {
          margin-bottom: 48px;
          scroll-margin-top: 90px;
        }

        .ozt-grid-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 17px;
        }

        .ozt-grid-heading span {
          display: block;
          margin-bottom: 6px;
          color: #d4a017 !important;
          font-size: 8px !important;
          font-weight: 900 !important;
          letter-spacing: 3px !important;
        }

        .ozt-grid-heading h2 {
          margin: 0 !important;
          color: #f4efe5 !important;
          font-size: 27px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
        }

        .ozt-grid-heading strong {
          color: #d4a017 !important;
          font-size: 12px !important;
        }

        .ozt-grid-products {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .ozt-grid-card {
          min-width: 0;
        }

        /*
         * GRID = TAMAMEN KART ODAKLI
         */

        .ozt-grid-card
        .customer-product {
          position: relative !important;

          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;

          width: 100% !important;
          height: 100% !important;

          padding: 0 !important;

          background: #fff !important;
          border: 1px solid #ddd7cc !important;
          border-radius: 20px !important;

          overflow: hidden !important;

          box-shadow:
            0 8px 24px rgba(0,0,0,0.08) !important;
        }

        .ozt-grid-card
        .customer-product-image-wrap {
          width: 100% !important;
          height: 190px !important;

          border-radius: 0 !important;
          overflow: hidden !important;

          background: #f2eee7 !important;
        }

        .ozt-grid-card
        .customer-product-image {
          width: 100% !important;
          height: 100% !important;

          object-fit: cover !important;
          display: block !important;
        }

        .ozt-grid-card
        .customer-product-info {
          flex: 1 !important;
          min-width: 0 !important;

          padding: 13px 12px 4px !important;
        }

        .ozt-grid-card
        .customer-product-info h3 {
          margin: 0 0 6px !important;

          color: #171717 !important;
          font-size: 14px !important;
          line-height: 1.15 !important;
          font-weight: 900 !important;
        }

        .ozt-grid-card
        .customer-product-info p {
          margin: 0 !important;

          color: #888 !important;
          font-size: 9px !important;
          line-height: 1.4 !important;

          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 2 !important;
          overflow: hidden !important;
        }

        .ozt-grid-card
        .customer-product-price {
          display: block !important;

          padding: 0 12px 13px !important;

          color: #b88927 !important;
          font-size: 14px !important;
          font-weight: 950 !important;
        }

        .ozt-grid-card
        .customer-product-right {
          position: absolute !important;

          right: 8px !important;
          bottom: 8px !important;

          z-index: 5 !important;
        }

        .ozt-grid-card
        .add-to-cart-button {
          width: 37px !important;
          height: 37px !important;

          border: 0 !important;
          border-radius: 50% !important;

          background: #101820 !important;
          color: #fff !important;

          box-shadow:
            0 5px 14px rgba(0,0,0,0.22) !important;
        }

        .ozt-grid-card
        .add-to-cart-button span {
          font-size: 20px !important;
        }



        /* =====================================================
           IVORY / LUXURY 3D
        ===================================================== */

        .ozt-layout-ivory-3d {
          max-width: 760px;
          padding: 24px 18px 50px;
          background:
            radial-gradient(circle at 20% 0%, rgba(255,255,255,.95), transparent 32%),
            linear-gradient(180deg, #f6f0e6 0%, #eee6d8 100%);
          color: #241f18;
          border-radius: 34px;
        }

        .ozt-layout-ivory-3d .ozt-empty-category {
          background: rgba(255,255,255,.72);
          border-color: #e1d5c2;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.9);
        }

        .ozt-ivory-hero {
          position: relative;
          min-height: 235px;
          margin-bottom: 28px;
          padding: 34px 28px 30px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
          border: 1px solid rgba(171,144,96,.35);
          border-radius: 28px;
          background:
            linear-gradient(145deg, #fffdf8 0%, #efe5d3 56%, #e4d5bd 100%);
          box-shadow:
            14px 16px 30px rgba(102,82,52,.16),
            -8px -8px 20px rgba(255,255,255,.82),
            inset 0 1px 0 rgba(255,255,255,.95);
          transform: perspective(1000px) rotateX(.35deg);
        }

        .ozt-ivory-hero::before {
          content: "";
          position: absolute;
          width: 210px;
          height: 210px;
          top: -115px;
          right: -35px;
          border-radius: 50%;
          border: 1px solid rgba(156,121,62,.22);
          box-shadow:
            0 0 0 24px rgba(255,255,255,.14),
            0 0 0 48px rgba(156,121,62,.08);
        }

        .ozt-ivory-orb {
          position: absolute;
          top: 28px;
          right: 54px;
          width: 82px;
          height: 82px;
          border-radius: 50%;
          background: linear-gradient(145deg, #fffaf0, #d8c3a2);
          box-shadow:
            9px 12px 18px rgba(76,55,29,.18),
            -5px -5px 12px rgba(255,255,255,.9),
            inset 2px 2px 5px rgba(255,255,255,.85),
            inset -3px -3px 8px rgba(135,108,70,.18);
        }

        .ozt-ivory-kicker {
          position: relative;
          z-index: 2;
          margin-bottom: 6px;
          color: #a67b32;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 4px;
        }

        .ozt-ivory-title {
          position: relative;
          z-index: 2;
          max-width: 80%;
          color: #221b13;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(34px, 7vw, 56px);
          line-height: .95;
          font-weight: 700;
          letter-spacing: -1.6px;
          text-shadow: 0 2px 0 rgba(255,255,255,.7);
        }

        .ozt-ivory-subtitle {
          position: relative;
          z-index: 2;
          margin-top: 9px;
          color: #756554;
          font-size: 12px;
          font-weight: 700;
        }

        .ozt-ivory-section {
          margin-bottom: 42px;
          scroll-margin-top: 90px;
        }

        .ozt-ivory-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 17px;
          padding: 0 4px;
        }

        .ozt-ivory-heading span {
          display: block;
          margin-bottom: 5px;
          color: #ae833d;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 3px;
        }

        .ozt-ivory-heading h2 {
          margin: 0 !important;
          color: #292117 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 30px !important;
          line-height: 1 !important;
          font-weight: 600 !important;
          letter-spacing: -.6px !important;
        }

        .ozt-ivory-count {
          min-width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #8f6625;
          font-size: 12px;
          font-weight: 950;
          background: linear-gradient(145deg, #fffaf1, #ded0b8);
          border: 1px solid #d5c3a4;
          box-shadow:
            6px 7px 13px rgba(92,69,37,.14),
            -5px -5px 11px rgba(255,255,255,.88),
            inset 1px 1px 3px rgba(255,255,255,.8);
        }

        .ozt-ivory-products {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          perspective: 1100px;
        }

        .ozt-ivory-card {
          min-width: 0;
          transition: transform .18s ease, filter .18s ease;
        }

        .ozt-ivory-card:hover {
          transform: translateY(-4px) rotateX(1.1deg);
          filter: saturate(1.04);
        }

        .ozt-ivory-card .customer-product {
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          width: 100% !important;
          height: 100% !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: linear-gradient(145deg, #fffdf9 0%, #f1e9dc 100%) !important;
          border: 1px solid #e0d2bc !important;
          border-radius: 24px !important;
          box-shadow:
            12px 14px 25px rgba(81,60,31,.14),
            -7px -7px 16px rgba(255,255,255,.9),
            inset 0 1px 0 rgba(255,255,255,.95) !important;
          transform: translateZ(0);
        }

        .ozt-ivory-card .customer-product-image-wrap {
          position: relative !important;
          width: 100% !important;
          height: 200px !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          background: linear-gradient(145deg, #fdfaf5, #e4d7c2) !important;
        }

        .ozt-ivory-card .customer-product-image-wrap::after {
          content: "";
          position: absolute;
          left: 14px;
          right: 14px;
          bottom: -18px;
          height: 38px;
          border-radius: 50%;
          background: rgba(79,59,33,.18);
          filter: blur(12px);
          pointer-events: none;
        }

        .ozt-ivory-card .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          object-fit: cover !important;
          transition: transform .25s ease;
        }

        .ozt-ivory-card:hover .customer-product-image {
          transform: scale(1.035);
        }

        .ozt-ivory-card .customer-product-info {
          flex: 1 !important;
          min-width: 0 !important;
          padding: 14px 15px 5px !important;
        }

        .ozt-ivory-card .customer-product-info h3 {
          margin: 0 0 6px !important;
          color: #2a2117 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 18px !important;
          line-height: 1.1 !important;
          font-weight: 700 !important;
        }

        .ozt-ivory-card .customer-product-info p {
          margin: 0 !important;
          color: #776b5d !important;
          font-size: 10px !important;
          line-height: 1.45 !important;
          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 2 !important;
          overflow: hidden !important;
        }

        .ozt-ivory-card .customer-product-price {
          display: block !important;
          padding: 0 15px 14px !important;
          color: #a9782a !important;
          font-size: 16px !important;
          font-weight: 950 !important;
        }

        .ozt-ivory-card .customer-product-right {
          position: absolute !important;
          right: 10px !important;
          bottom: 9px !important;
          z-index: 5 !important;
        }

        .ozt-ivory-card .add-to-cart-button {
          width: 42px !important;
          height: 42px !important;
          border: 1px solid #c9ad79 !important;
          border-radius: 14px !important;
          background: linear-gradient(145deg, #fffaf1, #d8bd8e) !important;
          color: #6f4d18 !important;
          box-shadow:
            6px 7px 12px rgba(83,58,25,.2),
            -4px -4px 9px rgba(255,255,255,.9),
            inset 1px 1px 2px rgba(255,255,255,.8) !important;
        }

        .ozt-ivory-card .add-to-cart-button span {
          font-size: 23px !important;
          line-height: 1 !important;
        }

        .ozt-ivory-card-feature .customer-product {
          grid-column: 1 / -1;
        }

        .ozt-ivory-card-feature .customer-product-image-wrap {
          height: 285px !important;
        }

        .ozt-ivory-card-feature .customer-product-info h3 {
          font-size: 23px !important;
        }

        .ozt-ivory-card-feature .customer-product-price {
          font-size: 18px !important;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (min-width: 521px) {

          .ozt-editorial-feature
          .customer-product-image-wrap {
            height: 360px !important;
          }

          .ozt-grid-card
          .customer-product-image-wrap {
            height: 220px !important;
          }
        }

        /* =====================================================
           TELEFON
        ===================================================== */

        @media (max-width: 520px) {

          .ozt-layout-ivory-3d {
            padding: 14px 12px 38px;
            border-radius: 24px;
          }

          .ozt-ivory-hero {
            min-height: 205px;
            margin-bottom: 24px;
            padding: 26px 20px 24px;
            border-radius: 23px;
          }

          .ozt-ivory-orb {
            top: 24px;
            right: 26px;
            width: 62px;
            height: 62px;
          }

          .ozt-ivory-title {
            max-width: 86%;
            font-size: 38px;
          }

          .ozt-ivory-subtitle {
            font-size: 10px;
          }

          .ozt-ivory-section {
            margin-bottom: 34px;
          }

          .ozt-ivory-heading h2 {
            font-size: 25px !important;
          }

          .ozt-ivory-count {
            min-width: 38px;
            height: 38px;
            border-radius: 12px;
          }

          .ozt-ivory-products {
            gap: 11px;
          }

          .ozt-ivory-card .customer-product {
            border-radius: 18px !important;
          }

          .ozt-ivory-card .customer-product-image-wrap {
            height: 145px !important;
          }

          .ozt-ivory-card .customer-product-info {
            padding: 11px 10px 4px !important;
          }

          .ozt-ivory-card .customer-product-info h3 {
            font-size: 14px !important;
          }

          .ozt-ivory-card .customer-product-info p {
            font-size: 8px !important;
          }

          .ozt-ivory-card .customer-product-price {
            padding: 0 10px 11px !important;
            font-size: 13px !important;
          }

          .ozt-ivory-card .customer-product-right {
            right: 7px !important;
            bottom: 7px !important;
          }

          .ozt-ivory-card .add-to-cart-button {
            width: 34px !important;
            height: 34px !important;
            border-radius: 11px !important;
          }

          .ozt-ivory-card .add-to-cart-button span {
            font-size: 19px !important;
          }

          .ozt-ivory-card-feature .customer-product-image-wrap {
            height: 215px !important;
          }

          .ozt-ivory-card-feature .customer-product-info h3 {
            font-size: 19px !important;
          }


          .ozt-layout {
            padding-left: 12px;
            padding-right: 12px;
          }

          /* -------------------------------
             CLASSIC MOBILE
          ------------------------------- */

          .ozt-classic-section {
            margin-bottom: 35px;
          }

          .ozt-classic-category-header h2 {
            font-size: 21px !important;
          }

          .ozt-classic-product-wrapper
          .customer-product {
            grid-template-columns:
              105px minmax(0, 1fr) 38px !important;

            gap: 10px !important;

            min-height: 105px !important;

            padding: 8px !important;

            border-radius: 16px !important;
          }

          .ozt-classic-product-wrapper
          .customer-product-image-wrap {
            width: 105px !important;
            height: 95px !important;
          }

          .ozt-classic-product-wrapper
          .customer-product-info h3 {
            font-size: 13px !important;
          }

          .ozt-classic-product-wrapper
          .customer-product-info p {
            font-size: 9px !important;
            margin-bottom: 7px !important;
          }

          .ozt-classic-product-wrapper
          .customer-product-price {
            font-size: 13px !important;
          }

          .ozt-classic-product-wrapper
          .add-to-cart-button {
            width: 34px !important;
            height: 34px !important;
          }

          /* -------------------------------
             EDITORIAL MOBILE
          ------------------------------- */

          .ozt-layout-editorial {
            padding-left: 14px;
            padding-right: 14px;
          }

          .ozt-editorial-heading-row h2 {
            font-size: 28px !important;
          }

          .ozt-editorial-feature
          .customer-product-image-wrap {
            height: 250px !important;
          }

          .ozt-editorial-feature
          .customer-product-info {
            padding: 15px 16px 5px !important;
          }

          .ozt-editorial-feature
          .customer-product-info h3 {
            font-size: 21px !important;
          }

          .ozt-editorial-feature
          .customer-product-price {
            padding: 0 16px 16px !important;
          }

          .ozt-editorial-feature
          .customer-product-right {
            right: 13px !important;
            bottom: 13px !important;
          }

          .ozt-editorial-feature
          .add-to-cart-button {
            width: 43px !important;
            height: 43px !important;
          }

          .ozt-editorial-standard
          .customer-product {
            grid-template-columns:
              105px minmax(0, 1fr) 35px !important;

            gap: 10px !important;

            min-height: 105px !important;
          }

          .ozt-editorial-standard
          .customer-product-image-wrap {
            width: 105px !important;
            height: 105px !important;
          }

          .ozt-editorial-standard
          .customer-product-info {
            padding: 10px 0 !important;
          }

          .ozt-editorial-standard
          .customer-product-info h3 {
            font-size: 14px !important;
          }

          .ozt-editorial-standard
          .customer-product-info p {
            font-size: 9px !important;
          }

          .ozt-editorial-standard
          .customer-product-price {
            font-size: 13px !important;
          }

          .ozt-editorial-standard
          .add-to-cart-button {
            width: 32px !important;
            height: 32px !important;
          }

          /* -------------------------------
             GRID MOBILE
          ------------------------------- */

          .ozt-grid-products {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 9px;
          }

          .ozt-grid-heading h2 {
            font-size: 23px !important;
          }

          .ozt-grid-card
          .customer-product-image-wrap {
            height: 135px !important;
          }

          .ozt-grid-card
          .customer-product-info {
            padding: 11px 9px 4px !important;
          }

          .ozt-grid-card
          .customer-product-info h3 {
            font-size: 12px !important;
          }

          .ozt-grid-card
          .customer-product-info p {
            font-size: 8px !important;
          }

          .ozt-grid-card
          .customer-product-price {
            padding: 0 9px 10px !important;
            font-size: 12px !important;
          }

          .ozt-grid-card
          .customer-product-right {
            right: 6px !important;
            bottom: 6px !important;
          }

          .ozt-grid-card
          .add-to-cart-button {
            width: 31px !important;
            height: 31px !important;
          }

          .ozt-grid-card
          .add-to-cart-button span {
            font-size: 17px !important;
          }
        }

      `}</style>

      {layout === "classic" && (
        <ClassicLayout
          categories={categories}
          products={products}
          layout="classic"
        />
      )}

      {layout === "editorial" && (
        <EditorialLayout
          categories={categories}
          products={products}
          layout="editorial"
        />
      )}

      {layout === "grid" && (
        <GridLayout
          categories={categories}
          products={products}
          layout="grid"
        />
      )}

      {layout === "ivory" && (
        <IvoryLuxury3DLayout
          categories={categories}
          products={products}
          layout="ivory"
        />
      )}
    </>
  );
}