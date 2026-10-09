"use client";

import AuroraIcon from "../AuroraIcon";
import { formatLira } from "../aurora-utils";
import { isRtl, type MenuStrings } from "../../../../lib/menu-i18n";
import type { MenuData } from "../../../../lib/menu-data";
import { MenuOverlays } from "./AuroraMenu";
import { useMenuController, type MenuProduct } from "./useMenuController";
import styles from "./LinenMenu.module.css";

// Linen tasarımının müşteri menüsü (fine dining ve bistro). Mantık
// useMenuController'da, pencereler (ürün, sepet, hizmet, dil) ortak
// MenuOverlays'tedir; bu dosya yalnızca Linen görünümünü çizer.

function Price({ product }: { product: MenuProduct }) {
  return (
    <span className={styles.price}>
      {product.promo && <del>{formatLira(product.promo.oldPrice)}</del>}
      {formatLira(Number(product.price))}
    </span>
  );
}

function Item({
  t,
  product,
  quantity,
  onOpen,
  onAdd,
}: {
  t: MenuStrings;
  product: MenuProduct;
  quantity: number;
  onOpen: () => void;
  // Yoksa (sadece menü) sepete ekleme düğmesi gösterilmez.
  onAdd?: () => void;
}) {
  return (
    <article className={styles.item}>
      <button type="button" className={styles.itemMain} onClick={onOpen}>
        <span className={styles.itemText}>
          <span className={styles.itemHead}>
            <strong>{product.name}</strong>
            <span className={styles.leader} aria-hidden="true" />
            <Price product={product} />
          </span>
          {product.description?.trim() && <span className={styles.itemDesc}>{product.description}</span>}
          {(product.promo || product.calories != null) && (
            <span className={styles.itemMeta}>
              {product.promo && <em>{product.promo.label}</em>}
              {product.calories != null && <span>{product.calories.toLocaleString(t.locale)} kcal</span>}
            </span>
          )}
        </span>
        {product.image_url && (
          <span className={styles.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image_url} alt={product.name} loading="lazy" />
          </span>
        )}
      </button>

      {onAdd && (
        <button
          type="button"
          className={`${styles.add} ${quantity > 0 ? styles.addHas : ""}`}
          onClick={onAdd}
          aria-label={quantity > 0 ? t.inCartMore(product.name, quantity) : t.addToCartAria(product.name)}
        >
          <AuroraIcon name="plus" size={quantity > 0 ? 13 : 16} strokeWidth={2} />
          {quantity > 0 && <span>{quantity}</span>}
        </button>
      )}
    </article>
  );
}

export default function LinenMenu({
  slug,
  menuOnly = false,
  initialData = null,
}: {
  slug: string;
  menuOnly?: boolean;
  initialData?: MenuData | null;
}) {
  const menu = useMenuController({ slug, menuOnly, initialData });
  const {
    cart,
    restaurant,
    table,
    loading,
    loadError,
    search,
    setSearch,
    activeCategory,
    viewProduct,
    setSheet,
    languages,
    language,
    t,
    chipsRef,
    query,
    shownCategories,
    sections,
    currentLanguageShort,
    categoryCounts,
    deals,
    quantities,
    goToCategory,
    addProduct,
    homeHref,
    base,
  } = menu;

  if (loading || !restaurant) {
    return (
      <div className={styles.page}>
        <div className={styles.state} role={loading ? "status" : "alert"}>
          {loading && <span className={styles.spinner} aria-hidden="true" />}
          <strong>{loading ? t.preparing : t.cantOpen}</strong>
          <span>{loading ? t.preparingSub : loadError || t.notFound}</span>
        </div>
      </div>
    );
  }

  const resultCount = sections.reduce((sum, section) => sum + section.items.length, 0);
  // Görseli olan ilk kampanyalı ürün öne çıkarılır; diğerleri listede işaretlidir.
  const featured = !query ? deals.find((product) => product.image_url) : undefined;

  return (
    <div className={styles.page} lang={language} dir={isRtl(language) ? "rtl" : "ltr"}>
      <div className={styles.column}>
        <header className={styles.top}>
          {menuOnly ? (
            <span />
          ) : (
            <a className={styles.back} href={homeHref} aria-label={t.backHome}>
              <AuroraIcon name="back" size={16} />
              {t.home}
            </a>
          )}
          <div className={styles.topActions}>
            {languages.length > 0 && (
              <button
                type="button"
                className={styles.square}
                onClick={() => setSheet("language")}
                aria-label={`${t.language}: ${currentLanguageShort}`}
              >
                {currentLanguageShort}
              </button>
            )}
          </div>
        </header>

        <div className={styles.identity}>
          <h1>{restaurant.name}</h1>
          <p>{table ? `${t.menu} · ${t.table} ${table.number}` : t.menu}</p>
        </div>

        <label className={styles.search}>
          <AuroraIcon name="search" size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.search}
            aria-label={t.search}
            autoComplete="off"
          />
          {search && (
            <button type="button" className={styles.searchClear} onClick={() => setSearch("")} aria-label={t.clearSearch}>
              <AuroraIcon name="close" size={16} />
            </button>
          )}
        </label>

        {restaurant.is_open === false && (
          <div className={`${styles.notice} ${styles.noticeWarn}`} role="status">
            <AuroraIcon name="clock" />
            <span>
              <strong>{menuOnly ? t.closedTitle : t.noOrdersTitle}</strong>
              {menuOnly ? t.closedSub : t.noOrdersSub}
            </span>
          </div>
        )}

        {!table && !menuOnly && (
          <div className={styles.notice}>
            <AuroraIcon name="qr" />
            <span>
              <strong>{t.scanTitle}</strong>
              {t.scanSub}
            </span>
          </div>
        )}

        <div className={styles.tabs} ref={chipsRef} role="navigation" aria-label={t.categories}>
          <button
            type="button"
            data-chip="all"
            className={`${styles.tab} ${activeCategory === null && !query ? styles.tabOn : ""}`}
            onClick={() => goToCategory(null)}
          >
            {t.all}
          </button>
          {shownCategories.map((category) =>
            categoryCounts.get(category.id) ? (
              <button
                type="button"
                key={category.id}
                data-chip={category.id}
                className={`${styles.tab} ${activeCategory === category.id && !query ? styles.tabOn : ""}`}
                onClick={() => goToCategory(category.id)}
              >
                {category.name}
              </button>
            ) : null
          )}
        </div>

        {query && (
          <p className={styles.resultLine} role="status">
            {t.resultsFor(search.trim(), resultCount)}
          </p>
        )}

        {featured && (
          <figure className={styles.featured}>
            <button type="button" className={styles.featuredButton} onClick={() => viewProduct(featured)}>
              <span className={styles.featuredImage}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featured.image_url ?? ""} alt={featured.name} loading="lazy" />
              </span>
              <figcaption className={styles.featuredCaption}>
                <em>{featured.promo?.label ?? t.deals}</em>
                <span>
                  {featured.name} · {formatLira(Number(featured.price))}
                </span>
              </figcaption>
            </button>
          </figure>
        )}

        {sections.map(({ category, items }) => (
          <section
            key={category.id}
            id={`kategori-${category.id}`}
            data-category={category.id}
            className={styles.section}
            aria-labelledby={`linen-kategori-${category.id}`}
          >
            <h2 id={`linen-kategori-${category.id}`} className={styles.sectionTitle}>
              {category.name}
              <small>{t.items(items.length)}</small>
            </h2>
            {items.map((product) => (
              <Item
                key={product.id}
                t={t}
                product={product}
                quantity={quantities.get(product.id) ?? 0}
                onOpen={() => viewProduct(product)}
                onAdd={menuOnly ? undefined : () => addProduct(product)}
              />
            ))}
          </section>
        ))}

        {sections.length === 0 && (
          <div className={styles.empty}>
            <strong>{query ? t.noResults : t.emptyMenu}</strong>
            <span>{query ? t.noResultsSub : t.emptyMenuSub}</span>
            {query && (
              <button type="button" className={styles.textButton} onClick={() => setSearch("")}>
                {t.showAll}
              </button>
            )}
          </div>
        )}

        {menuOnly && sections.length > 0 && !query && (
          <a className={`${styles.notice} ${styles.rateLink}`} href={`${base}/degerlendir`}>
            <AuroraIcon name="star" />
            <span>
              <strong>{t.rateUs}</strong>
            </span>
            <AuroraIcon name="arrow" size={16} />
          </a>
        )}

        {sections.length > 0 && !query && (
          <p className={styles.legal}>
            <a href="/kvkk#menu-kullanicilari" target="_blank" rel="noreferrer">
              {t.privacy}
            </a>
          </p>
        )}
      </div>

      {!menuOnly && (
        <div className={styles.bar}>
          <div className={styles.barInner}>
            <button type="button" className={styles.barButton} onClick={() => setSheet("service")} aria-label={t.serviceAria}>
              <AuroraIcon name="bell" size={16} />
              {t.callWaiter}
            </button>
            {cart.itemCount > 0 && (
              <button type="button" className={`${styles.barButton} ${styles.barPrimary}`} onClick={() => setSheet("cart")}>
                {t.cart} · {cart.itemCount} · {formatLira(cart.total)}
              </button>
            )}
          </div>
        </div>
      )}

      <MenuOverlays menu={menu} />
    </div>
  );
}
