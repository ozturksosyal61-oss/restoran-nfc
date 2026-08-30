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
  layout?: "classic" | "editorial" | "grid";
};

/* =========================================================
   HELPERS
========================================================= */

function getCategoryProducts(
  categoryId: number,
  products: Product[]
) {
  return products.filter(
    (product) =>
      Number(product.category_id) ===
      Number(categoryId)
  );
}

/* =========================================================
   MEVCUT PRODUCT CARD
   İŞLEVSELLİK AYNI KALIYOR
========================================================= */

function Product({
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

/* =========================================================
   EMPTY
========================================================= */

function EmptyCategory() {
  return (
    <div className="ozt-menu-empty">
      <span>🍽️</span>
      <p>Bu kategoride şu anda ürün bulunmuyor.</p>
    </div>
  );
}

/* =========================================================
   CLASSIC
   Sade / güvenli / her restoran için
========================================================= */

function ClassicLayout({
  categories,
  products,
}: MenuLayoutsProps) {
  return (
    <div className="ozt-menu-layout ozt-classic">
      {categories.map((category) => {
        const categoryProducts =
          getCategoryProducts(
            category.id,
            products
          );

        return (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="ozt-category ozt-classic-category"
          >
            <div className="ozt-classic-heading">
              <div className="ozt-classic-heading-line" />

              <div>
                <h2>{category.name}</h2>

                <p>
                  {categoryProducts.length} ürün
                </p>
              </div>
            </div>

            {categoryProducts.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ozt-classic-products">
                {categoryProducts.map(
                  (product) => (
                    <Product
                      key={product.id}
                      product={product}
                    />
                  )
                )}
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
   Premium / restoran / fine dining
========================================================= */

function EditorialLayout({
  categories,
  products,
}: MenuLayoutsProps) {
  return (
    <div className="ozt-menu-layout ozt-editorial">
      {categories.map((category) => {
        const categoryProducts =
          getCategoryProducts(
            category.id,
            products
          );

        return (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="ozt-category ozt-editorial-category"
          >
            <header className="ozt-editorial-heading">
              <span className="ozt-editorial-eyebrow">
                OZT MENU
              </span>

              <div className="ozt-editorial-title-row">
                <h2>{category.name}</h2>

                <span className="ozt-editorial-count">
                  {String(
                    categoryProducts.length
                  ).padStart(2, "0")}
                </span>
              </div>

              <div className="ozt-editorial-rule">
                <span />
              </div>
            </header>

            {categoryProducts.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ozt-editorial-products">
                {categoryProducts.map(
                  (product) => (
                    <div
                      key={product.id}
                      className="ozt-editorial-product"
                    >
                      <Product
                        product={product}
                      />
                    </div>
                  )
                )}
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
    <div className="ozt-menu-layout ozt-grid">
      {categories.map((category) => {
        const categoryProducts =
          getCategoryProducts(
            category.id,
            products
          );

        return (
          <section
            key={category.id}
            id={`category-${category.id}`}
            className="ozt-category ozt-grid-category"
          >
            <header className="ozt-grid-heading">
              <div>
                <span className="ozt-grid-eyebrow">
                  MENÜ
                </span>

                <h2>{category.name}</h2>
              </div>

              <span className="ozt-grid-count">
                {categoryProducts.length}
              </span>
            </header>

            {categoryProducts.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ozt-grid-products">
                {categoryProducts.map(
                  (product) => (
                    <div
                      key={product.id}
                      className="ozt-grid-product"
                    >
                      <Product
                        product={product}
                      />
                    </div>
                  )
                )}
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
           GLOBAL
        ===================================================== */

        .ozt-menu-layout {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 0 18px;
          box-sizing: border-box;
        }

        .ozt-category {
          scroll-margin-top: 90px;
        }

        .ozt-menu-empty {
          width: 100%;
          box-sizing: border-box;
          padding: 28px 20px;
          border-radius: 18px;
          border: 1px solid #e4ded4;
          background: #fff;
          text-align: center;
        }

        .ozt-menu-empty span {
          display: block;
          font-size: 28px;
          margin-bottom: 8px;
        }

        .ozt-menu-empty p {
          margin: 0;
          color: #888 !important;
          font-size: 13px;
        }

        /* =====================================================
           CLASSIC
        ===================================================== */

        .ozt-classic-category {
          margin-bottom: 34px;
        }

        .ozt-classic-heading {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .ozt-classic-heading-line {
          width: 5px;
          height: 28px;
          flex-shrink: 0;
          border-radius: 999px;
          background: #d4a017;
        }

        .ozt-classic-heading h2 {
          margin: 0 !important;
          color: #171717 !important;
          font-size: 22px !important;
          line-height: 1.1 !important;
          font-weight: 950 !important;
        }

        .ozt-classic-heading p {
          margin: 4px 0 0 !important;
          color: #999 !important;
          font-size: 11px !important;
        }

        .ozt-classic-products {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* =====================================================
           EDITORIAL
        ===================================================== */

        .ozt-editorial-category {
          margin-bottom: 52px;
        }

        .ozt-editorial-heading {
          margin-bottom: 20px;
        }

        .ozt-editorial-eyebrow {
          display: block;
          margin-bottom: 8px;
          color: #b88927 !important;
          font-size: 9px !important;
          font-weight: 950 !important;
          letter-spacing: 3px !important;
        }

        .ozt-editorial-title-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
        }

        .ozt-editorial-title-row h2 {
          margin: 0 !important;
          color: #f4efe5 !important;
          font-size: 31px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          letter-spacing: -1px !important;
        }

        .ozt-editorial-count {
          color: #d4a017 !important;
          font-size: 12px !important;
          font-weight: 900 !important;
          letter-spacing: 1px !important;
        }

        .ozt-editorial-rule {
          width: 100%;
          height: 1px;
          margin-top: 15px;
          background: rgba(212,160,23,0.28);
          position: relative;
        }

        .ozt-editorial-rule span {
          position: absolute;
          left: 0;
          top: -1px;
          width: 55px;
          height: 3px;
          border-radius: 999px;
          background: #d4a017;
        }

        .ozt-editorial-products {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* EDITORIAL PRODUCT */

        .ozt-editorial-product {
          width: 100%;
        }

        .ozt-editorial-product
        .customer-product {
          display: grid !important;
          grid-template-columns:
            165px minmax(0, 1fr) 50px !important;

          align-items: center !important;
          gap: 17px !important;

          min-height: 165px !important;
          padding: 10px !important;
          box-sizing: border-box !important;

          background: #fff !important;
          border: 1px solid #e4ded4 !important;
          border-radius: 22px !important;

          box-shadow:
            0 12px 35px rgba(0,0,0,0.07) !important;

          overflow: hidden !important;
        }

        .ozt-editorial-product
        .customer-product-image-wrap {
          width: 165px !important;
          height: 165px !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          background: #f3eee6 !important;
        }

        .ozt-editorial-product
        .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          object-fit: cover !important;
        }

        .ozt-editorial-product
        .customer-product-info {
          min-width: 0 !important;
          padding: 8px 0 !important;
        }

        .ozt-editorial-product
        .customer-product-info h3 {
          margin: 0 0 8px !important;
          color: #171717 !important;
          font-size: 19px !important;
          line-height: 1.12 !important;
          font-weight: 950 !important;
        }

        .ozt-editorial-product
        .customer-product-info p {
          margin: 0 0 15px !important;
          color: #777 !important;
          font-size: 12px !important;
          line-height: 1.5 !important;

          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 3 !important;
          overflow: hidden !important;
        }

        .ozt-editorial-product
        .customer-product-price {
          display: inline-block !important;
          color: #b88927 !important;
          font-size: 18px !important;
          font-weight: 950 !important;
        }

        .ozt-editorial-product
        .customer-product-right {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .ozt-editorial-product
        .add-to-cart-button {
          width: 44px !important;
          height: 44px !important;
          border: 0 !important;
          border-radius: 50% !important;
          background: #171717 !important;
          color: #fff !important;
          box-shadow:
            0 7px 18px rgba(0,0,0,0.18) !important;
        }

        .ozt-editorial-product
        .add-to-cart-button span {
          font-size: 24px !important;
          line-height: 1 !important;
        }

        /* =====================================================
           GRID
        ===================================================== */

        .ozt-grid-category {
          margin-bottom: 46px;
        }

        .ozt-grid-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 16px;
        }

        .ozt-grid-eyebrow {
          display: block;
          margin-bottom: 6px;
          color: #d4a017 !important;
          font-size: 8px !important;
          font-weight: 950 !important;
          letter-spacing: 2.5px !important;
        }

        .ozt-grid-heading h2 {
          margin: 0 !important;
          color: #f4efe5 !important;
          font-size: 26px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
        }

        .ozt-grid-count {
          color: #d4a017 !important;
          font-size: 11px !important;
          font-weight: 900 !important;
        }

        .ozt-grid-products {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .ozt-grid-product {
          min-width: 0;
          position: relative;
        }

        /* GRID PRODUCT */

        .ozt-grid-product
        .customer-product {
          position: relative !important;

          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;

          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;

          padding: 0 !important;
          box-sizing: border-box !important;

          background: #fff !important;
          border: 1px solid #e3ddd2 !important;
          border-radius: 19px !important;

          overflow: hidden !important;

          box-shadow:
            0 9px 26px rgba(0,0,0,0.07) !important;
        }

        .ozt-grid-product
        .customer-product-image-wrap {
          width: 100% !important;
          height: 175px !important;
          border-radius: 0 !important;
          overflow: hidden !important;
          background: #f3eee6 !important;
        }

        .ozt-grid-product
        .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          object-fit: cover !important;
        }

        .ozt-grid-product
        .customer-product-info {
          min-width: 0 !important;
          flex: 1 !important;
          padding: 14px 12px 5px !important;
        }

        .ozt-grid-product
        .customer-product-info h3 {
          margin: 0 0 6px !important;
          color: #171717 !important;
          font-size: 14px !important;
          line-height: 1.15 !important;
          font-weight: 950 !important;
        }

        .ozt-grid-product
        .customer-product-info p {
          margin: 0 !important;
          color: #888 !important;
          font-size: 10px !important;
          line-height: 1.4 !important;

          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 2 !important;
          overflow: hidden !important;
        }

        .ozt-grid-product
        .customer-product-price {
          display: block !important;
          padding: 0 12px 13px !important;

          color: #b88927 !important;
          font-size: 14px !important;
          font-weight: 950 !important;
        }

        .ozt-grid-product
        .customer-product-right {
          position: absolute !important;
          right: 8px !important;
          bottom: 8px !important;
          z-index: 3 !important;
        }

        .ozt-grid-product
        .add-to-cart-button {
          width: 36px !important;
          height: 36px !important;

          border: 0 !important;
          border-radius: 50% !important;

          background: #171717 !important;
          color: #fff !important;

          box-shadow:
            0 6px 15px rgba(0,0,0,0.22) !important;
        }

        .ozt-grid-product
        .add-to-cart-button span {
          font-size: 20px !important;
          line-height: 1 !important;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (min-width: 521px) {

          .ozt-menu-layout {
            padding-left: 22px;
            padding-right: 22px;
          }

          .ozt-grid-products {
            gap: 16px;
          }

          .ozt-grid-product
          .customer-product-image-wrap {
            height: 205px !important;
          }
        }

        /* =====================================================
           MOBİL
        ===================================================== */

        @media (max-width: 520px) {

          .ozt-menu-layout {
            padding-left: 12px;
            padding-right: 12px;
          }

          /* EDITORIAL */

          .ozt-editorial-category {
            margin-bottom: 45px;
          }

          .ozt-editorial-title-row h2 {
            font-size: 27px !important;
          }

          .ozt-editorial-product
          .customer-product {
            grid-template-columns:
              112px minmax(0, 1fr) 39px !important;

            gap: 11px !important;

            min-height: 112px !important;

            padding: 8px !important;

            border-radius: 18px !important;
          }

          .ozt-editorial-product
          .customer-product-image-wrap {
            width: 112px !important;
            height: 112px !important;
            border-radius: 13px !important;
          }

          .ozt-editorial-product
          .customer-product-info {
            padding: 5px 0 !important;
          }

          .ozt-editorial-product
          .customer-product-info h3 {
            margin-bottom: 6px !important;
            font-size: 14px !important;
          }

          .ozt-editorial-product
          .customer-product-info p {
            margin-bottom: 8px !important;
            font-size: 9px !important;
            line-height: 1.4 !important;
          }

          .ozt-editorial-product
          .customer-product-price {
            font-size: 14px !important;
          }

          .ozt-editorial-product
          .add-to-cart-button {
            width: 35px !important;
            height: 35px !important;
          }

          .ozt-editorial-product
          .add-to-cart-button span {
            font-size: 20px !important;
          }

          /* GRID */

          .ozt-grid-category {
            margin-bottom: 40px;
          }

          .ozt-grid-heading h2 {
            font-size: 23px !important;
          }

          .ozt-grid-products {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .ozt-grid-product
          .customer-product-image-wrap {
            height: 135px !important;
          }

          .ozt-grid-product
          .customer-product-info {
            padding: 11px 9px 4px !important;
          }

          .ozt-grid-product
          .customer-product-info h3 {
            font-size: 12px !important;
            margin-bottom: 5px !important;
          }

          .ozt-grid-product
          .customer-product-info p {
            font-size: 9px !important;
            line-height: 1.35 !important;
          }

          .ozt-grid-product
          .customer-product-price {
            padding: 0 9px 10px !important;
            font-size: 12px !important;
          }

          .ozt-grid-product
          .customer-product-right {
            right: 7px !important;
            bottom: 7px !important;
          }

          .ozt-grid-product
          .add-to-cart-button {
            width: 31px !important;
            height: 31px !important;
          }

          .ozt-grid-product
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
    </>
  );
}