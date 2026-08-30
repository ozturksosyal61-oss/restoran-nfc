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
  layout?: "classic" | "editorial" | "grid" | "luxury" | "minimal";
};

function getCategoryProducts(categoryId: number, products: Product[]) {
  return products.filter(
    (product) => Number(product.category_id) === Number(categoryId)
  );
}

function ProductItem({ product }: { product: Product }) {
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
    <div className="ml-empty">
      <div className="ml-empty-icon">🍽️</div>
      <div>Bu kategoride şu anda ürün bulunmuyor.</div>
    </div>
  );
}

/* =========================================================
   1 — CLASSIC
   Mevcut klasik tasarım korunmuştur.
========================================================= */
function ClassicLayout({ categories, products }: MenuLayoutsProps) {
  return (
    <div className="ml-layout ml-classic">
      {categories.map((category) => {
        const items = getCategoryProducts(category.id, products);

        return (
          <section key={category.id} id={`category-${category.id}`} className="ml-classic-section">
            <div className="ml-classic-heading">
              <div className="ml-classic-heading-left">
                <span className="ml-gold-bar" />
                <div>
                  <h2>{category.name}</h2>
                  <span>{items.length} ürün</span>
                </div>
              </div>
              <b>{String(items.length).padStart(2, "0")}</b>
            </div>

            {items.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ml-classic-list">
                {items.map((product) => (
                  <ProductItem key={product.id} product={product} />
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
   2 — EDITORIAL
   Dergi / premium restoran.
========================================================= */
function EditorialLayout({ categories, products }: MenuLayoutsProps) {
  return (
    <div className="ml-layout ml-editorial">
      {categories.map((category) => {
        const items = getCategoryProducts(category.id, products);

        return (
          <section key={category.id} id={`category-${category.id}`} className="ml-editorial-section">
            <div className="ml-editorial-heading">
              <span>OZT MENU</span>
              <div>
                <h2>{category.name}</h2>
                <b>{String(items.length).padStart(2, "0")}</b>
              </div>
              <i />
            </div>

            {items.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ml-editorial-list">
                {items.map((product, index) => (
                  <article
                    key={product.id}
                    className={index === 0 ? "ml-editorial-feature" : "ml-editorial-row"}
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
   3 — GRID
   Modern / cafe / burger.
========================================================= */
function GridLayout({ categories, products }: MenuLayoutsProps) {
  return (
    <div className="ml-layout ml-grid">
      {categories.map((category) => {
        const items = getCategoryProducts(category.id, products);

        return (
          <section key={category.id} id={`category-${category.id}`} className="ml-grid-section">
            <div className="ml-grid-heading">
              <div>
                <span>MENÜ</span>
                <h2>{category.name}</h2>
              </div>
              <b>{items.length}</b>
            </div>

            {items.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ml-grid-products">
                {items.map((product) => (
                  <article key={product.id}>
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
   4 — LUXURY
   Tamamen farklı: koyu zemin, büyük fotoğraf,
   premium restoran / steakhouse / lounge hissi.
========================================================= */
function LuxuryLayout({ categories, products }: MenuLayoutsProps) {
  return (
    <div className="ml-layout ml-luxury">
      {categories.map((category) => {
        const items = getCategoryProducts(category.id, products);

        return (
          <section key={category.id} id={`category-${category.id}`} className="ml-luxury-section">
            <div className="ml-luxury-heading">
              <div>
                <span>SEÇKİLER</span>
                <h2>{category.name}</h2>
              </div>
              <div className="ml-luxury-count">{String(items.length).padStart(2, "0")}</div>
            </div>

            {items.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ml-luxury-products">
                {items.map((product, index) => (
                  <article
                    key={product.id}
                    className={index === 0 ? "ml-luxury-main" : "ml-luxury-card"}
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
   5 — MINIMAL
   Tamamen farklı: beyaz galeri / katalog / fine dining.
========================================================= */
function MinimalLayout({ categories, products }: MenuLayoutsProps) {
  return (
    <div className="ml-layout ml-minimal">
      {categories.map((category) => {
        const items = getCategoryProducts(category.id, products);

        return (
          <section key={category.id} id={`category-${category.id}`} className="ml-minimal-section">
            <header className="ml-minimal-heading">
              <div>
                <span>COLLECTION</span>
                <h2>{category.name}</h2>
              </div>
              <small>{items.length} ürün</small>
            </header>

            {items.length === 0 ? (
              <EmptyCategory />
            ) : (
              <div className="ml-minimal-list">
                {items.map((product) => (
                  <article key={product.id}>
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

export default function MenuLayouts({
  categories,
  products,
  layout = "classic",
}: MenuLayoutsProps) {
  return (
    <>
      <style>{`
        .ml-layout {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 0 18px;
          box-sizing: border-box;
        }

        .ml-layout *,
        .ml-layout *::before,
        .ml-layout *::after {
          box-sizing: border-box;
        }

        .ml-empty {
          padding: 30px 20px;
          border-radius: 18px;
          border: 1px solid #ded8ce;
          background: #fff;
          color: #777 !important;
          text-align: center;
          font-size: 13px;
        }

        .ml-empty-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        /* ================= CLASSIC ================= */

        .ml-classic-section {
          margin-bottom: 42px;
          scroll-margin-top: 90px;
        }

        .ml-classic-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .ml-classic-heading-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ml-gold-bar {
          width: 5px;
          height: 34px;
          border-radius: 99px;
          background: #d4a017;
        }

        .ml-classic-heading h2 {
          margin: 0 !important;
          color: #171717 !important;
          font-size: 24px !important;
          line-height: 1.05 !important;
          font-weight: 900 !important;
        }

        .ml-classic-heading span:not(.ml-gold-bar) {
          display: block;
          margin-top: 4px;
          color: #999 !important;
          font-size: 11px !important;
        }

        .ml-classic-heading b {
          color: #b88927 !important;
          font-size: 12px !important;
        }

        .ml-classic-list {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .ml-classic-list > .customer-product {
          display: grid !important;
          grid-template-columns: 125px minmax(0,1fr) 50px !important;
          align-items: center !important;
          gap: 16px !important;
          width: 100% !important;
          min-height: 125px !important;
          padding: 10px !important;
          background: #fff !important;
          border: 1px solid #e5e0d8 !important;
          border-radius: 18px !important;
          box-shadow: 0 6px 20px rgba(0,0,0,.05) !important;
          overflow: hidden !important;
        }

        .ml-classic-list .customer-product-image-wrap {
          width: 125px !important;
          height: 105px !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background: #f4f1eb !important;
        }

        .ml-classic-list .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }

        .ml-classic-list .customer-product-info h3 {
          margin: 0 0 7px !important;
          color: #171717 !important;
          font-size: 16px !important;
          font-weight: 900 !important;
        }

        .ml-classic-list .customer-product-info p {
          margin: 0 0 10px !important;
          color: #777 !important;
          font-size: 11px !important;
          line-height: 1.45 !important;
          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 2 !important;
          overflow: hidden !important;
        }

        .ml-classic-list .customer-product-price {
          color: #b88927 !important;
          font-size: 16px !important;
          font-weight: 950 !important;
        }

        .ml-classic-list .customer-product-right {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .ml-classic-list .add-to-cart-button {
          width: 42px !important;
          height: 42px !important;
          border: 0 !important;
          border-radius: 50% !important;
          background: #181818 !important;
          color: #fff !important;
        }

        /* ================= EDITORIAL ================= */

        .ml-editorial {
          max-width: 700px;
          padding: 24px 22px;
          background: #f5f0e7;
          color: #171717;
        }

        .ml-editorial-section {
          margin-bottom: 58px;
          scroll-margin-top: 90px;
        }

        .ml-editorial-heading {
          margin-bottom: 22px;
        }

        .ml-editorial-heading > span {
          display: block;
          margin-bottom: 7px;
          color: #a27a2a !important;
          font-size: 9px !important;
          font-weight: 900 !important;
          letter-spacing: 4px !important;
        }

        .ml-editorial-heading > div {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }

        .ml-editorial-heading h2 {
          margin: 0 !important;
          color: #171717 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 34px !important;
          font-weight: 500 !important;
          letter-spacing: -1px !important;
        }

        .ml-editorial-heading b {
          color: #a27a2a !important;
        }

        .ml-editorial-heading i {
          display: block;
          width: 100%;
          height: 1px;
          margin-top: 13px;
          background: #cfc3ae;
          position: relative;
        }

        .ml-editorial-heading i::after {
          content: "";
          position: absolute;
          left: 0;
          top: -1px;
          width: 62px;
          height: 3px;
          background: #a27a2a;
        }

        .ml-editorial-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .ml-editorial-feature .customer-product {
          display: flex !important;
          flex-direction: column !important;
          width: 100% !important;
          padding: 0 !important;
          background: #fff !important;
          border: 0 !important;
          border-radius: 0 !important;
          overflow: hidden !important;
          position: relative !important;
          box-shadow: 0 8px 25px rgba(52,43,28,.10) !important;
        }

        .ml-editorial-feature .customer-product-image-wrap {
          width: 100% !important;
          height: 300px !important;
          border-radius: 0 !important;
          overflow: hidden !important;
        }

        .ml-editorial-feature .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }

        .ml-editorial-feature .customer-product-info {
          padding: 18px 20px 7px !important;
        }

        .ml-editorial-feature .customer-product-info h3 {
          margin: 0 0 8px !important;
          color: #171717 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 25px !important;
        }

        .ml-editorial-feature .customer-product-info p {
          margin: 0 0 12px !important;
          color: #777 !important;
          font-size: 12px !important;
          line-height: 1.55 !important;
        }

        .ml-editorial-feature .customer-product-price {
          display: block !important;
          padding: 0 20px 18px !important;
          color: #a27a2a !important;
          font-size: 18px !important;
          font-weight: 900 !important;
        }

        .ml-editorial-feature .customer-product-right {
          position: absolute !important;
          right: 17px !important;
          bottom: 17px !important;
        }

        .ml-editorial-feature .add-to-cart-button {
          width: 48px !important;
          height: 48px !important;
          border: 0 !important;
          border-radius: 50% !important;
          background: #b88927 !important;
          color: #fff !important;
        }

        .ml-editorial-row .customer-product {
          display: grid !important;
          grid-template-columns: 190px minmax(0,1fr) 42px !important;
          align-items: center !important;
          gap: 17px !important;
          width: 100% !important;
          min-height: 150px !important;
          padding: 0 !important;
          background: #fff !important;
          border: 0 !important;
          border-radius: 0 !important;
          overflow: hidden !important;
          box-shadow: 0 6px 18px rgba(52,43,28,.07) !important;
        }

        .ml-editorial-row .customer-product-image-wrap {
          width: 190px !important;
          height: 150px !important;
          border-radius: 0 !important;
          overflow: hidden !important;
        }

        .ml-editorial-row .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        .ml-editorial-row .customer-product-info {
          min-width: 0 !important;
          padding: 15px 0 !important;
        }

        .ml-editorial-row .customer-product-info h3 {
          margin: 0 0 6px !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 19px !important;
        }

        .ml-editorial-row .customer-product-info p {
          margin: 0 0 10px !important;
          color: #777 !important;
          font-size: 10px !important;
        }

        .ml-editorial-row .customer-product-price {
          color: #a27a2a !important;
          font-size: 15px !important;
          font-weight: 900 !important;
        }

        .ml-editorial-row .add-to-cart-button {
          width: 38px !important;
          height: 38px !important;
          border: 0 !important;
          border-radius: 50% !important;
          background: #171717 !important;
          color: #fff !important;
        }

        /* ================= GRID ================= */

        .ml-grid-section {
          margin-bottom: 48px;
          scroll-margin-top: 90px;
        }

        .ml-grid-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 17px;
        }

        .ml-grid-heading span {
          display: block;
          margin-bottom: 6px;
          color: #d4a017 !important;
          font-size: 8px !important;
          font-weight: 900 !important;
          letter-spacing: 3px !important;
        }

        .ml-grid-heading h2 {
          margin: 0 !important;
          color: #f4efe5 !important;
          font-size: 27px !important;
          font-weight: 950 !important;
        }

        .ml-grid-heading b {
          color: #d4a017 !important;
        }

        .ml-grid-products {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 15px;
        }

        .ml-grid-products > article .customer-product {
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          width: 100% !important;
          height: 100% !important;
          padding: 0 !important;
          background: #fff !important;
          border: 1px solid #ddd7cc !important;
          border-radius: 20px !important;
          overflow: hidden !important;
          box-shadow: 0 8px 24px rgba(0,0,0,.08) !important;
        }

        .ml-grid-products .customer-product-image-wrap {
          width: 100% !important;
          height: 190px !important;
          border-radius: 0 !important;
          overflow: hidden !important;
        }

        .ml-grid-products .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        .ml-grid-products .customer-product-info {
          flex: 1 !important;
          padding: 13px 12px 4px !important;
        }

        .ml-grid-products .customer-product-info h3 {
          margin: 0 0 6px !important;
          color: #171717 !important;
          font-size: 14px !important;
          font-weight: 900 !important;
        }

        .ml-grid-products .customer-product-info p {
          margin: 0 !important;
          color: #888 !important;
          font-size: 9px !important;
          line-height: 1.4 !important;
        }

        .ml-grid-products .customer-product-price {
          display: block !important;
          padding: 0 12px 13px !important;
          color: #b88927 !important;
          font-size: 14px !important;
          font-weight: 950 !important;
        }

        .ml-grid-products .customer-product-right {
          position: absolute !important;
          right: 8px !important;
          bottom: 8px !important;
        }

        .ml-grid-products .add-to-cart-button {
          width: 37px !important;
          height: 37px !important;
          border: 0 !important;
          border-radius: 50% !important;
          background: #101820 !important;
          color: #fff !important;
        }

        /* ================= LUXURY ================= */

        .ml-luxury {
          max-width: 780px;
          padding: 12px 16px 40px;
          background: #080808;
          color: #f5efe3;
        }

        .ml-luxury-section {
          margin-bottom: 62px;
          scroll-margin-top: 90px;
        }

        .ml-luxury-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-bottom: 15px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(210,171,85,.35);
        }

        .ml-luxury-heading span {
          display: block;
          margin-bottom: 8px;
          color: #cda64f !important;
          font-size: 9px !important;
          letter-spacing: 4px !important;
          font-weight: 800 !important;
        }

        .ml-luxury-heading h2 {
          margin: 0 !important;
          color: #fff !important;
          font-family: Georgia,"Times New Roman",serif !important;
          font-size: 34px !important;
          font-weight: 500 !important;
          letter-spacing: -.5px !important;
        }

        .ml-luxury-count {
          color: #cda64f !important;
          font-size: 13px !important;
          font-weight: 800 !important;
        }

        .ml-luxury-products {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 16px;
        }

        .ml-luxury-main {
          grid-column: 1 / -1;
        }

        .ml-luxury-main .customer-product {
          display: grid !important;
          grid-template-columns: minmax(0,1.65fr) minmax(180px,.8fr) !important;
          position: relative !important;
          min-height: 300px !important;
          padding: 0 !important;
          background: #111 !important;
          border: 1px solid rgba(205,166,79,.32) !important;
          border-radius: 2px !important;
          overflow: hidden !important;
        }

        .ml-luxury-main .customer-product-image-wrap {
          width: 100% !important;
          height: 300px !important;
          border-radius: 0 !important;
          overflow: hidden !important;
        }

        .ml-luxury-main .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        .ml-luxury-main .customer-product-info {
          align-self: center !important;
          padding: 28px !important;
        }

        .ml-luxury-main .customer-product-info h3 {
          margin: 0 0 12px !important;
          color: #fff !important;
          font-family: Georgia,"Times New Roman",serif !important;
          font-size: 25px !important;
          font-weight: 500 !important;
        }

        .ml-luxury-main .customer-product-info p {
          margin: 0 0 18px !important;
          color: #bcb4a6 !important;
          font-size: 12px !important;
          line-height: 1.6 !important;
        }

        .ml-luxury-main .customer-product-price {
          color: #e1b85d !important;
          font-size: 19px !important;
          font-weight: 800 !important;
        }

        .ml-luxury-main .customer-product-right {
          position: absolute !important;
          right: 20px !important;
          bottom: 20px !important;
        }

        .ml-luxury-main .add-to-cart-button,
        .ml-luxury-card .add-to-cart-button {
          border: 1px solid rgba(225,184,93,.5) !important;
          background: #171717 !important;
          color: #e1b85d !important;
        }

        .ml-luxury-card .customer-product {
          display: flex !important;
          flex-direction: column !important;
          position: relative !important;
          height: 100% !important;
          padding: 0 !important;
          background: #111 !important;
          border: 1px solid #242424 !important;
          border-radius: 2px !important;
          overflow: hidden !important;
        }

        .ml-luxury-card .customer-product-image-wrap {
          width: 100% !important;
          height: 210px !important;
          border-radius: 0 !important;
          overflow: hidden !important;
        }

        .ml-luxury-card .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        .ml-luxury-card .customer-product-info {
          flex: 1 !important;
          padding: 17px 17px 5px !important;
        }

        .ml-luxury-card .customer-product-info h3 {
          margin: 0 0 7px !important;
          color: #fff !important;
          font-family: Georgia,"Times New Roman",serif !important;
          font-size: 18px !important;
        }

        .ml-luxury-card .customer-product-info p {
          margin: 0 !important;
          color: #9d978e !important;
          font-size: 10px !important;
          line-height: 1.45 !important;
        }

        .ml-luxury-card .customer-product-price {
          display: block !important;
          padding: 0 17px 17px !important;
          color: #e1b85d !important;
          font-size: 15px !important;
          font-weight: 800 !important;
        }

        .ml-luxury-card .customer-product-right {
          position: absolute !important;
          right: 10px !important;
          bottom: 10px !important;
        }

        /* ================= MINIMAL ================= */

        .ml-minimal {
          max-width: 760px;
          padding: 10px 20px 50px;
          background: #fff;
          color: #111;
        }

        .ml-minimal-section {
          margin-bottom: 56px;
          scroll-margin-top: 90px;
        }

        .ml-minimal-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding-bottom: 14px;
          margin-bottom: 8px;
          border-bottom: 1px solid #111;
        }

        .ml-minimal-heading span {
          display: block;
          margin-bottom: 6px;
          color: #8a8a8a !important;
          font-size: 8px !important;
          letter-spacing: 3px !important;
          font-weight: 800 !important;
        }

        .ml-minimal-heading h2 {
          margin: 0 !important;
          color: #111 !important;
          font-family: Georgia,"Times New Roman",serif !important;
          font-size: 31px !important;
          font-weight: 400 !important;
        }

        .ml-minimal-heading small {
          color: #777 !important;
          font-size: 10px !important;
        }

        .ml-minimal-list > article {
          border-bottom: 1px solid #e7e7e7;
        }

        .ml-minimal-list .customer-product {
          display: grid !important;
          grid-template-columns: 150px minmax(0,1fr) 42px !important;
          align-items: center !important;
          gap: 18px !important;
          min-height: 150px !important;
          padding: 12px 0 !important;
          background: transparent !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        .ml-minimal-list .customer-product-image-wrap {
          width: 150px !important;
          height: 125px !important;
          border-radius: 4px !important;
          overflow: hidden !important;
          background: #f2f2f2 !important;
        }

        .ml-minimal-list .customer-product-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        .ml-minimal-list .customer-product-info h3 {
          margin: 0 0 7px !important;
          color: #111 !important;
          font-family: Georgia,"Times New Roman",serif !important;
          font-size: 19px !important;
          font-weight: 500 !important;
        }

        .ml-minimal-list .customer-product-info p {
          margin: 0 0 10px !important;
          color: #777 !important;
          font-size: 11px !important;
          line-height: 1.5 !important;
        }

        .ml-minimal-list .customer-product-price {
          color: #111 !important;
          font-size: 15px !important;
          font-weight: 800 !important;
        }

        .ml-minimal-list .add-to-cart-button {
          width: 38px !important;
          height: 38px !important;
          border: 1px solid #111 !important;
          border-radius: 50% !important;
          background: #fff !important;
          color: #111 !important;
        }

        /* ================= RESPONSIVE ================= */

        @media (min-width: 521px) {
          .ml-editorial-feature .customer-product-image-wrap {
            height: 360px !important;
          }

          .ml-grid-products .customer-product-image-wrap {
            height: 220px !important;
          }
        }

        @media (max-width: 520px) {
          .ml-layout {
            padding-left: 12px;
            padding-right: 12px;
          }

          .ml-classic-heading h2 {
            font-size: 21px !important;
          }

          .ml-classic-list > .customer-product {
            grid-template-columns: 105px minmax(0,1fr) 38px !important;
            gap: 10px !important;
            min-height: 105px !important;
            padding: 8px !important;
            border-radius: 16px !important;
          }

          .ml-classic-list .customer-product-image-wrap {
            width: 105px !important;
            height: 95px !important;
          }

          .ml-classic-list .customer-product-info h3 {
            font-size: 13px !important;
          }

          .ml-classic-list .customer-product-info p {
            font-size: 9px !important;
          }

          .ml-classic-list .customer-product-price {
            font-size: 13px !important;
          }

          .ml-classic-list .add-to-cart-button {
            width: 34px !important;
            height: 34px !important;
          }

          .ml-editorial {
            padding-left: 14px;
            padding-right: 14px;
          }

          .ml-editorial-heading h2 {
            font-size: 28px !important;
          }

          .ml-editorial-feature .customer-product-image-wrap {
            height: 250px !important;
          }

          .ml-editorial-feature .customer-product-info {
            padding: 15px 16px 5px !important;
          }

          .ml-editorial-feature .customer-product-info h3 {
            font-size: 21px !important;
          }

          .ml-editorial-row .customer-product {
            grid-template-columns: 105px minmax(0,1fr) 35px !important;
            gap: 10px !important;
            min-height: 105px !important;
          }

          .ml-editorial-row .customer-product-image-wrap {
            width: 105px !important;
            height: 105px !important;
          }

          .ml-editorial-row .customer-product-info h3 {
            font-size: 14px !important;
          }

          .ml-editorial-row .customer-product-info p {
            font-size: 9px !important;
          }

          .ml-grid-products {
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 9px;
          }

          .ml-grid-heading h2 {
            font-size: 23px !important;
          }

          .ml-grid-products .customer-product-image-wrap {
            height: 135px !important;
          }

          .ml-grid-products .customer-product-info {
            padding: 11px 9px 4px !important;
          }

          .ml-grid-products .customer-product-info h3 {
            font-size: 12px !important;
          }

          .ml-grid-products .customer-product-info p {
            font-size: 8px !important;
          }

          .ml-grid-products .customer-product-price {
            padding: 0 9px 10px !important;
            font-size: 12px !important;
          }

          .ml-luxury {
            padding-left: 10px;
            padding-right: 10px;
          }

          .ml-luxury-heading h2 {
            font-size: 28px !important;
          }

          .ml-luxury-products {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .ml-luxury-main {
            grid-column: auto;
          }

          .ml-luxury-main .customer-product {
            grid-template-columns: 1fr !important;
            display: flex !important;
          }

          .ml-luxury-main .customer-product-image-wrap {
            height: 240px !important;
          }

          .ml-luxury-main .customer-product-info {
            padding: 16px !important;
          }

          .ml-luxury-card .customer-product-image-wrap {
            height: 210px !important;
          }

          .ml-minimal {
            padding-left: 14px;
            padding-right: 14px;
          }

          .ml-minimal-heading h2 {
            font-size: 27px !important;
          }

          .ml-minimal-list .customer-product {
            grid-template-columns: 100px minmax(0,1fr) 35px !important;
            gap: 11px !important;
            min-height: 100px !important;
          }

          .ml-minimal-list .customer-product-image-wrap {
            width: 100px !important;
            height: 90px !important;
          }

          .ml-minimal-list .customer-product-info h3 {
            font-size: 14px !important;
          }

          .ml-minimal-list .customer-product-info p {
            font-size: 9px !important;
          }

          .ml-minimal-list .customer-product-price {
            font-size: 13px !important;
          }
        }
      `}</style>

      {layout === "classic" && (
        <ClassicLayout categories={categories} products={products} layout="classic" />
      )}

      {layout === "editorial" && (
        <EditorialLayout categories={categories} products={products} layout="editorial" />
      )}

      {layout === "grid" && (
        <GridLayout categories={categories} products={products} layout="grid" />
      )}

      {layout === "luxury" && (
        <LuxuryLayout categories={categories} products={products} layout="luxury" />
      )}

      {layout === "minimal" && (
        <MinimalLayout categories={categories} products={products} layout="minimal" />
      )}
    </>
  );
}
