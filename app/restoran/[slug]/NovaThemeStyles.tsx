export default function NovaThemeStyles() {
  return (
    <style>{`
      /* =====================================================
         OZT NOVA PREMIUM — ANA RESTORAN EKRANI
         Mevcut HTML / fonksiyonlar korunur.
         Sadece [data-theme] altında görsel tema değişir.
      ===================================================== */

      .restaurant-shell[data-theme="ozt-nova-premium"] {
        --nova-bg: #0b0d0f;
        --nova-surface: #121518;
        --nova-surface-2: #171b1f;
        --nova-line: rgba(255,255,255,.10);
        --nova-text: #f6f7f3;
        --nova-muted: #9da5a4;
        --nova-accent: #d8ff5f;
        --nova-accent-dark: #a9c83d;
        background: #0b0d0f !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-home {
        min-height: 100vh;
        padding: 14px 12px 42px !important;
        background:
          radial-gradient(circle at 50% -8%, rgba(216,255,95,.11), transparent 26%),
          radial-gradient(circle at 100% 35%, rgba(255,255,255,.04), transparent 24%),
          linear-gradient(180deg, #0b0d0f 0%, #0a0c0e 52%, #080a0c 100%) !important;
        color: var(--nova-text) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-shell {
        max-width: 520px !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-hero {
        padding: 22px 17px 18px !important;
        border: 1px solid var(--nova-line) !important;
        border-radius: 28px !important;
        background:
          linear-gradient(145deg, rgba(24,29,33,.96), rgba(13,16,18,.95)) !important;
        box-shadow:
          0 22px 60px rgba(0,0,0,.35),
          inset 0 1px 0 rgba(255,255,255,.05) !important;
        backdrop-filter: blur(16px);
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-hero::before,
      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-hero::after {
        border-color: rgba(216,255,95,.14) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-logo {
        width: 86px !important;
        height: 86px !important;
        border-radius: 26px !important;
        border: 1px solid rgba(216,255,95,.28) !important;
        background: #111418 !important;
        box-shadow: 0 16px 36px rgba(0,0,0,.36), 0 0 0 5px rgba(216,255,95,.035) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-logo-fallback {
        background: linear-gradient(145deg, #20262b, #101316) !important;
        color: var(--nova-accent) !important;
        border: 1px solid rgba(216,255,95,.22);
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-kicker,
      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-section-kicker {
        color: var(--nova-accent) !important;
        letter-spacing: 2.5px !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-title,
      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-section-title {
        color: var(--nova-text) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-description,
      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-review-text {
        color: var(--nova-muted) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-pill {
        border-color: rgba(255,255,255,.10) !important;
        background: rgba(255,255,255,.035) !important;
        color: #d0d7d5 !important;
        box-shadow: none !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-pill.is-open {
        border-color: rgba(216,255,95,.22) !important;
        background: rgba(216,255,95,.08) !important;
        color: var(--nova-accent) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-actions {
        gap: 9px !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-action {
        min-height: 82px !important;
        padding: 13px !important;
        border-radius: 21px !important;
        border: 1px solid var(--nova-line) !important;
        background: linear-gradient(145deg, #161a1e, #101316) !important;
        color: var(--nova-text) !important;
        box-shadow: 0 12px 28px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.035) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-action.featured {
        min-height: 96px !important;
        background: linear-gradient(135deg, #dbff67 0%, #bce44a 48%, #a3ca36 100%) !important;
        color: #10130b !important;
        border-color: rgba(255,255,255,.12) !important;
        box-shadow: 0 16px 34px rgba(168,203,55,.20), inset 0 1px 0 rgba(255,255,255,.38) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-icon {
        background: #20262a !important;
        color: var(--nova-accent) !important;
        box-shadow: none !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .featured .ozt-modern-icon {
        background: rgba(0,0,0,.11) !important;
        color: #10130b !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-action-sub {
        color: #909a98 !important;
        opacity: 1 !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .featured .ozt-modern-action-sub,
      .restaurant-shell[data-theme="ozt-nova-premium"] .featured .ozt-modern-action-title {
        color: #10130b !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-section-head {
        margin-bottom: 13px !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-rating-card,
      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-review,
      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-empty {
        border-color: var(--nova-line) !important;
        background: linear-gradient(145deg, #15191d, #0f1215) !important;
        color: var(--nova-text) !important;
        box-shadow: 0 12px 30px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.03) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-rating-score {
        border-right-color: rgba(255,255,255,.08) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-score,
      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-review-user {
        color: #f7f8f4 !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-stars,
      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-review-stars {
        color: var(--nova-accent) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-count,
      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-review-date,
      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-bar-row {
        color: #8f9998 !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-bar-bg {
        background: #242a2f !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-bar-fill {
        background: linear-gradient(90deg, #a8c936, #d8ff5f) !important;
      }

      .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-footer {
        color: #6f7877 !important;
      }

      /* =====================================================
         NOVA — ESKİ INLINE MENÜNÜN GÖRSEL OLARAK KORUNMASI
         (Tema yanlışlıkla eski layout'a düşerse bile.)
      ===================================================== */
      .restaurant-shell[data-theme="ozt-nova-premium"] .restaurant-menu-page,
      .restaurant-shell[data-theme="ozt-nova-premium"] main[style*="background: #f5f3ef"] {
        background: #0b0d0f !important;
        color: #f6f7f3 !important;
      }

      @media (min-width: 700px) {
        .restaurant-shell[data-theme="ozt-nova-premium"] .ozt-modern-shell {
          max-width: 560px !important;
        }
      }
    `}</style>
  );
}
