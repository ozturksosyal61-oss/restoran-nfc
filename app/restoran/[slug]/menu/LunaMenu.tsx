"use client";

import AuroraIcon from "../AuroraIcon";
import { formatLira } from "../aurora-utils";
import { isRtl, type MenuStrings } from "../../../../lib/menu-i18n";
import type { MenuData } from "../../../../lib/menu-data";
import { MenuOverlays } from "./AuroraMenu";
import { useMenuController, type MenuProduct } from "./useMenuController";
import styles from "./LunaMenu.module.css";

// Luna tasarımının müşteri menüsü (bar ve kokteyl). Mantık
// useMenuController'da, pencereler (ürün, sepet, hizmet, dil) ortak
// MenuOverlays'tedir; bu dosya yalnızca Luna görünümünü çizer.

function Row({
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
    <article className={styles.row}>
      <button type="button" className={styles.rowMain} onClick={onOpen}>
        <span className={styles.thumb}>
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} loading="lazy" />
          ) : (
            <span className={styles.thumbInitial} aria-hidden="true">
              {product.name.trim().charAt(0).toLocaleUpperCase("tr-TR")}
            </span>
          )}
        </span>
        <span className={styles.rowText}>
          <strong>{product.name}</strong>
          {product.description?.trim() && <span className={styles.rowDesc}>{product.description}</span>}
          <span className={styles.rowMeta}>
            <span className={styles.rowPrice}>
              {product.promo && <del>{formatLira(product.promo.oldPrice)}</del>}
              {formatLira(Number(product.price))}
            </span>
            {product.promo && <span className={styles.rowTag}>{product.promo.label}</span>}
            {product.calories != null && (
              <span className={styles.kcal}>{product.calories.toLocaleString(t.locale)} kcal</span>
            )}
          </span>
        </span>
      </button>

      {onAdd && (
        <button
          type="button"
          className={`${styles.add} ${quantity > 0 ? styles.addHas : ""}`}
          onClick={onAdd}
          aria-label={quantity > 0 ? t.inCartMore(product.name, quantity) : t.addToCartAria(product.name)}
        >
          <AuroraIcon name="plus" size={quantity > 0 ? 13 : 17} strokeWidth={2.6} />
          {quantity > 0 && <span>{quantity}</span>}
        </button>
      )}
    </article>
  );
}

export default function LunaMenu({
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

  return (
    <div className={styles.page} lang={language} dir={isRtl(language) ? "rtl" : "ltr"}>
      <div className={styles.column}>
        <header className={styles.top}>
          {!menuOnly && (
            <a className={styles.round} href={homeHref} aria-label={t.backHome}>
              <AuroraIcon name="back" />
            </a>
          )}
          <div className={styles.brand}>
            <strong>{restaurant.name}</strong>
            <small>{table ? `${t.table} ${table.number} · ${t.menu}` : t.menu}</small>
          </div>
          {languages.length > 0 && (
            <button
              type="button"
              className={styles.round}
              onClick={() => setSheet("language")}
              aria-label={`${t.language}: ${currentLanguageShort}`}
            >
              {currentLanguageShort}
            </button>
          )}
          {!menuOnly && (
            <button
              type="button"
              className={`${styles.round} ${styles.roundAccent}`}
              onClick={() => setSheet("service")}
              aria-label={t.serviceAria}
            >
              <AuroraIcon name="bell" />
            </button>
          )}
        </header>

        <h1 className={styles.title}>{t.menu}</h1>

        <label className={styles.search}>
          <AuroraIcon name="search" />
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

        <div className={styles.chips} ref={chipsRef} role="navigation" aria-label={t.categories}>
          <button
            type="button"
            data-chip="all"
            className={`${styles.chip} ${activeCategory === null && !query ? styles.chipOn : ""}`}
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
                className={`${styles.chip} ${activeCategory === category.id && !query ? styles.chipOn : ""}`}
                onClick={() => goToCategory(category.id)}
              >
                {category.name}
                <small>{categoryCounts.get(category.id)}</small>
              </button>
            ) : null
          )}
        </div>

        {query && (
          <p className={styles.resultLine} role="status">
            {t.resultsFor(search.trim(), resultCount)}
          </p>
        )}

        {!query && deals.length > 0 && (
          <section className={styles.deals} aria-labelledby="luna-kampanyalar">
            <h2 id="luna-kampanyalar" className={styles.sectionTitle}>
              {t.deals}
              <small>{t.items(deals.length)}</small>
            </h2>
            <div className={styles.dealRail}>
              {deals.map((product) => (
                <button type="button" key={product.id} className={styles.deal} onClick={() => viewProduct(product)}>
                  <span className={styles.dealImage}>
                    {product.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image_url} alt="" loading="lazy" />
                    )}
                    {product.promo && <span className={styles.dealBadge}>{product.promo.label}</span>}
                  </span>
                  <span className={styles.dealBody}>
                    <strong>{product.name}</strong>
                    <span className={styles.dealPrice}>
                      {product.promo && <del>{formatLira(product.promo.oldPrice)}</del>}
                      {formatLira(Number(product.price))}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {sections.map(({ category, items }) => (
          <section
            key={category.id}
            id={`kategori-${category.id}`}
            data-category={category.id}
            className={styles.section}
            aria-labelledby={`luna-kategori-${category.id}`}
          >
            <h2 id={`luna-kategori-${category.id}`} className={styles.sectionTitle}>
              {category.name}
              <small>{t.items(items.length)}</small>
            </h2>
            {items.map((product) => (
              <Row
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

      {!menuOnly && cart.itemCount > 0 && (
        <button type="button" className={styles.cartBar} onClick={() => setSheet("cart")}>
          <span className={styles.cartCount}>{cart.itemCount}</span>
          <span className={styles.cartText}>
            <strong>{formatLira(cart.total)}</strong>
            <small>{table ? `${t.items(cart.itemCount)} · ${t.table} ${table.number}` : t.items(cart.itemCount)}</small>
          </span>
          <span className={styles.cartGo}>
            {t.viewCart}
            <AuroraIcon name="arrow" />
          </span>
        </button>
      )}

      <MenuOverlays menu={menu} />
    </div>
  );
}
