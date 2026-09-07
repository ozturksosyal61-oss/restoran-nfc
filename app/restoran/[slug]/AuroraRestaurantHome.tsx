import AuroraOrderTrackingButton from "./AuroraOrderTrackingButton";

type AuroraRestaurant = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  instagram_url: string | null;
  google_review_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
};

type AuroraTable = {
  id: number;
  table_number: number;
  public_token: string;
} | null;

type AuroraReview = {
  id: number;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

type AuroraProps = {
  restaurant: AuroraRestaurant;
  table: AuroraTable;
  tableQuery: string;
  reviews: AuroraReview[];
  averageRating: string;
  ratingCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  garsonStatus: string;
  hesapStatus: string;
  callWaiter: (formData: FormData) => Promise<void>;
  requestBill: (formData: FormData) => Promise<void>;
};

export default function AuroraRestaurantHome({
  restaurant,
  table,
  tableQuery,
  reviews,
  averageRating,
  callWaiter,
  requestBill,
  garsonStatus,
  hesapStatus,
}: AuroraProps) {
  const totalReviews = reviews.length;
  const ratingValue = Number(averageRating) || 0;

  return (
    <>
      <style>{`
        .aurora-root,
        .aurora-root * {
          box-sizing: border-box;
        }

        .aurora-root {
          --aurora-bg: #080706;
          --aurora-bg-2: #11100e;
          --aurora-panel: rgba(24, 22, 19, .84);
          --aurora-panel-2: rgba(13, 13, 12, .78);
          --aurora-line: rgba(255,255,255,.13);
          --aurora-line-soft: rgba(255,255,255,.08);
          --aurora-text: #f4f1e9;
          --aurora-muted: rgba(244,241,233,.64);
          --aurora-soft: rgba(244,241,233,.38);
          --aurora-gold: #d8c39a;
          --aurora-green: #9fe1d3;
          --aurora-green-soft: rgba(91,193,174,.16);

          position: relative;
          width: 100%;
          min-height: 100vh;

          overflow-x: hidden;

          color: var(--aurora-text);

          background:
            radial-gradient(
              ellipse at 50% -10%,
              rgba(157,91,31,.25),
              transparent 40%
            ),
            radial-gradient(
              ellipse at 88% 52%,
              rgba(110,81,44,.10),
              transparent 31%
            ),
            linear-gradient(
              135deg,
              #060606 0%,
              #0e0c0a 42%,
              #16120e 58%,
              #070707 100%
            );

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        /* =====================================================
           SAHNE
        ===================================================== */

        .aurora-stage {
          position: relative;
          z-index: 1;

          min-height: 100vh;

          display: flex;
          align-items: center;
          justify-content: center;

          padding:
            26px
            28px
            105px;
        }

        .aurora-scene {
          position: relative;

          width: min(1220px, 100%);
          min-height: 790px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* =====================================================
           ANA GÖRSEL
        ===================================================== */

        .aurora-image-frame {
          position: relative;

          width: min(515px, 43vw);
          height: 720px;

          overflow: hidden;

          border-radius: 28px;

          border: 1px solid rgba(255,255,255,.17);

          background:
            linear-gradient(
              145deg,
              #201913,
              #080808
            );

          box-shadow:
            0 40px 120px rgba(0,0,0,.62),
            0 0 0 1px rgba(0,0,0,.35),
            inset 0 1px 0 rgba(255,255,255,.08);
        }

        .aurora-image-frame::before {
          content: "";

          position: absolute;
          inset: 9px;

          z-index: 4;

          border-radius: 21px;

          border: 1px solid rgba(255,255,255,.08);

          pointer-events: none;
        }

        .aurora-image {
          position: absolute;
          inset: 0;

          width: 100%;
          height: 100%;

          object-fit: cover;

          transform: scale(1.01);

          filter:
            brightness(.79)
            contrast(1.03)
            saturate(.90);
        }

        .aurora-image-fallback {
          position: absolute;
          inset: 0;

          background:
            radial-gradient(
              circle at 66% 25%,
              rgba(192,137,72,.34),
              transparent 23%
            ),
            radial-gradient(
              circle at 33% 65%,
              rgba(73,115,100,.18),
              transparent 30%
            ),
            linear-gradient(
              180deg,
              #33261b 0%,
              #11100e 50%,
              #070707 100%
            );
        }

        .aurora-image-overlay {
          position: absolute;
          inset: 0;

          z-index: 2;

          background:
            linear-gradient(
              180deg,
              rgba(0,0,0,.04),
              rgba(0,0,0,.02) 44%,
              rgba(0,0,0,.38) 100%
            );
        }

        /* =====================================================
           DESKTOP — SOL BİLGİ KARTI GÖRSELİN DIŞINDA
        ===================================================== */

        @media (min-width: 761px) {
          .aurora-image-frame {
            overflow: visible;
          }

          .aurora-image,
          .aurora-image-overlay {
            border-radius: 28px;
          }
        }

        /* =====================================================
           SOL BİLGİ KARTI
        ===================================================== */

        .aurora-info-panel {
          position: absolute;

          z-index: 10;

          /* Masa / restoran bilgi kartı artık görselin üstüne gelmez.
             Görselin solunda, 30px boşlukla konumlanır. */
          left: auto;
          right: calc(100% + 30px);
          top: 132px;

          width: 305px;
          max-height: 570px;

          padding: 22px;

          overflow: hidden;

          border-radius: 23px;

          background:
            linear-gradient(
              145deg,
              rgba(28,26,23,.90),
              rgba(11,11,10,.84)
            );

          border:
            1px solid rgba(255,255,255,.14);

          box-shadow:
            0 32px 78px rgba(0,0,0,.50),
            inset 0 1px 0 rgba(255,255,255,.06);

          backdrop-filter: blur(19px);
          -webkit-backdrop-filter: blur(19px);
        }

        .aurora-info-scroll {
          max-height: 523px;

          overflow-y: auto;

          padding-right: 4px;

          scrollbar-width: thin;
          scrollbar-color:
            rgba(255,255,255,.18)
            transparent;
        }

        .aurora-info-scroll::-webkit-scrollbar {
          width: 4px;
        }

        .aurora-info-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .aurora-info-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.18);
          border-radius: 999px;
        }

        /* =====================================================
           LOGO
        ===================================================== */

        .aurora-logo-wrap {
          min-height: 135px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding-bottom: 19px;

          border-bottom:
            1px solid rgba(255,255,255,.09);
        }

        .aurora-logo {
          width: 112px;
          height: 112px;

          object-fit: contain;

          border-radius: 18px;

          background:
            rgba(0,0,0,.13);
        }

        .aurora-logo-fallback {
          width: 112px;
          height: 112px;

          display: grid;
          place-items: center;

          border-radius: 18px;

          color: #e6d6b7;

          background:
            radial-gradient(
              circle at 40% 35%,
              #78653f,
              #191713 68%
            );

          font-family: Georgia, serif;

          font-size: 23px;

          letter-spacing: 4px;
        }

        /* =====================================================
           BİLGİ BLOKLARI
        ===================================================== */

        .aurora-panel-block {
          padding: 17px 0;

          border-bottom:
            1px solid rgba(255,255,255,.08);
        }

        .aurora-panel-block:last-child {
          border-bottom: 0;
        }

        .aurora-kicker {
          color:
            rgba(255,255,255,.37);

          font-size: 7px;

          font-weight: 950;

          letter-spacing: 2px;
        }

        .aurora-title {
          margin-top: 7px;

          color: white;

          font-size: 17px;

          line-height: 1.2;

          font-weight: 950;
        }

        .aurora-description {
          margin-top: 8px;

          color:
            rgba(255,255,255,.60);

          font-size: 9px;

          line-height: 1.55;

          font-weight: 650;
        }

        .aurora-hours {
          margin-top: 8px;

          color: white;

          font-size: 13px;

          line-height: 1.45;

          font-weight: 950;
        }

        .aurora-address {
          margin-top: 8px;

          color:
            rgba(255,255,255,.66);

          font-size: 9px;

          line-height: 1.55;
        }

        .aurora-link {
          display: inline-flex;

          margin-top: 9px;

          padding: 7px 10px;

          border-radius: 999px;

          color:
            rgba(255,255,255,.82);

          background:
            rgba(255,255,255,.055);

          border:
            1px solid rgba(255,255,255,.09);

          text-decoration: none;

          font-size: 8px;

          font-weight: 850;
        }

        .aurora-phone {
          display: inline-flex;

          margin-top: 10px;

          padding: 8px 11px;

          border-radius: 10px;

          color: white;

          background:
            rgba(255,255,255,.055);

          border:
            1px solid rgba(255,255,255,.09);

          text-decoration: none;

          font-size: 8px;

          font-weight: 850;
        }

        /* =====================================================
           MASA
        ===================================================== */

        .aurora-table {
          display: inline-flex;

          align-items: center;

          gap: 6px;

          margin-top: 11px;

          padding: 7px 10px;

          border-radius: 999px;

          color:
            rgba(255,255,255,.88);

          background:
            rgba(255,255,255,.055);

          border:
            1px solid rgba(255,255,255,.09);

          font-size: 8px;

          font-weight: 850;
        }

        .aurora-table-dot {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background:
            #90dfd0;

          box-shadow:
            0 0 11px rgba(144,223,208,.52);
        }

        /* =====================================================
           PUAN
        ===================================================== */

        .aurora-rating-value {
          margin-top: 7px;

          color: white;

          font-size: 25px;

          line-height: 1;

          font-weight: 950;
        }

        .aurora-rating-stars {
          margin-top: 5px;

          color: var(--aurora-gold);

          font-size: 12px;

          letter-spacing: 1px;
        }

        .aurora-rating-count {
          margin-top: 3px;

          color:
            rgba(255,255,255,.39);

          font-size: 7px;

          font-weight: 750;
        }

        /* =====================================================
           SERVİS
        ===================================================== */

        .aurora-service-grid {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 7px;

          margin-top: 11px;
        }

        .aurora-service-form {
          margin: 0;
        }

        .aurora-service-button {
          width: 100%;

          min-height: 39px;

          padding: 7px;

          border-radius: 10px;

          color:
            rgba(255,255,255,.88);

          background:
            rgba(255,255,255,.055);

          border:
            1px solid rgba(255,255,255,.09);

          cursor: pointer;

          font-family: inherit;

          font-size: 7px;

          font-weight: 850;
        }

        .aurora-service-button:hover {
          background:
            rgba(255,255,255,.10);
        }

        .aurora-service-status {
          margin-top: 7px;

          padding: 7px 8px;

          border-radius: 9px;

          color: #bcefe3;

          background:
            rgba(26,147,128,.12);

          border:
            1px solid rgba(116,219,200,.13);

          text-align: center;

          font-size: 7px;

          font-weight: 800;
        }

        /* =====================================================
           SOSYAL
        ===================================================== */

        .aurora-social-row {
          display: flex;

          gap: 7px;

          margin-top: 11px;
        }

        .aurora-social-button {
          width: 32px;
          height: 32px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          color:
            rgba(255,255,255,.84);

          background:
            rgba(255,255,255,.055);

          border:
            1px solid rgba(255,255,255,.08);

          text-decoration: none;

          font-size: 8px;

          font-weight: 900;
        }

        /* =====================================================
           SAĞ KATEGORİLER
        ===================================================== */

        .aurora-category-stack {
          position: absolute;

          z-index: 15;

          top: 182px;
          right: 0;

          width: 350px;

          display: grid;

          gap: 10px;
        }

        .aurora-category {
          min-height: 79px;

          display: flex;

          align-items: center;

          padding:
            0 19px;

          border-radius: 17px;

          color: white;

          background:
            linear-gradient(
              145deg,
              rgba(34,31,28,.90),
              rgba(15,14,13,.82)
            );

          border:
            1px solid rgba(255,255,255,.12);

          box-shadow:
            0 18px 40px rgba(0,0,0,.32),
            inset 0 1px 0 rgba(255,255,255,.04);

          text-decoration: none;

          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);

          transition:
            transform .18s ease,
            background .18s ease,
            border-color .18s ease;
        }

        .aurora-category:hover {
          transform: translateX(-6px);

          background:
            linear-gradient(
              145deg,
              rgba(49,43,35,.94),
              rgba(19,18,16,.88)
            );

          border-color:
            rgba(221,201,161,.24);
        }

        .aurora-category-icon {
          width: 38px;
          height: 38px;

          display: grid;
          place-items: center;

          margin-right: 14px;

          color:
            #eee5d3;

          font-size: 19px;
        }

        .aurora-category-name {
          font-size: 14px;

          font-weight: 950;

          letter-spacing: .1px;
        }

        .aurora-category-arrow {
          margin-left: auto;

          color:
            rgba(255,255,255,.43);

          font-size: 14px;
        }

        .aurora-main-action-form {
          margin: 0;
        }

        .aurora-category-button {
          width: 100%;
          font: inherit;
          text-align: left;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
        }

        @media (min-width: 761px) and (max-width: 1180px) {
          .aurora-stage {
            padding-left: 18px;
            padding-right: 18px;
          }

          .aurora-info-panel {
            width: 275px;
            right: calc(100% + 20px);
          }

          .aurora-image-frame {
            width: min(500px, 42vw);
          }

          .aurora-category-stack {
            width: 325px;
          }
        }

        .aurora-category-button:disabled {
          cursor: not-allowed;
          opacity: .52;
        }

        .aurora-category-button:hover {
          transform: translateX(-6px);
        }

        /* =====================================================
           ALT BAR
        ===================================================== */

        .aurora-bottom {
          position: fixed;

          z-index: 100;

          left: 50%;
          bottom: 17px;

          transform:
            translateX(-50%);

          width:
            min(350px, calc(100% - 32px));

          padding: 6px;

          border-radius: 19px;

          background:
            linear-gradient(
              145deg,
              rgba(42,42,41,.95),
              rgba(19,19,18,.93)
            );

          border:
            1px solid rgba(255,255,255,.14);

          box-shadow:
            0 22px 55px rgba(0,0,0,.46),
            inset 0 1px 0 rgba(255,255,255,.07);

          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .aurora-bottom-nav {
          display: grid;

          grid-template-columns:
            1fr 1fr 1fr;

          gap: 3px;
        }

        .aurora-order-track-nav {
          min-height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;

          padding: 0 8px;

          border-radius: 14px;
          border: 1px solid rgba(230,204,146,.40);

          background: linear-gradient(135deg,#e8cc91,#b58b4b);
          color: #1b140b;

          text-decoration: none;
          font-size: 8px;
          font-weight: 950;

          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.38),
            0 7px 18px rgba(0,0,0,.20);

          transition: transform .16s ease, filter .16s ease;
        }

        .aurora-order-track-nav:hover {
          filter: brightness(1.04);
          transform: translateY(-1px);
        }

        .aurora-order-track-nav-icon {
          font-size: 11px;
          line-height: 1;
        }

        .aurora-order-track-nav-text {
          white-space: nowrap;
        }

        .aurora-nav-link {
          min-height: 40px;

          display: flex;

          align-items: center;
          justify-content: center;

          gap: 5px;

          border-radius: 14px;

          color:
            rgba(255,255,255,.75);

          text-decoration: none;

          font-size: 8px;

          font-weight: 900;

          transition:
            background .18s ease;
        }

        .aurora-nav-link:hover {
          background:
            rgba(255,255,255,.06);
        }

        .aurora-nav-link.active {
          color: white;

          background:
            rgba(255,255,255,.09);
        }

        .aurora-nav-icon {
          font-size: 13px;
        }

        /* =====================================================
           BİLGİ MODAL
        ===================================================== */

        .aurora-dialog {
          position: fixed;

          z-index: 300;

          inset: 0;

          display: none;

          align-items: center;
          justify-content: center;

          padding: 20px;

          background:
            rgba(0,0,0,.78);

          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .aurora-dialog:target {
          display: flex;
        }

        .aurora-dialog-card {
          width: min(520px, 100%);

          max-height:
            calc(100vh - 40px);

          overflow-y: auto;

          padding: 21px;

          border-radius: 25px;

          color: white;

          background:
            linear-gradient(
              145deg,
              #211d18,
              #0e0e0d
            );

          border:
            1px solid rgba(255,255,255,.13);

          box-shadow:
            0 40px 100px rgba(0,0,0,.64);
        }

        .aurora-dialog-head {
          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 15px;

          padding-bottom: 14px;

          border-bottom:
            1px solid rgba(255,255,255,.08);
        }

        .aurora-dialog-title {
          font-size: 16px;

          font-weight: 950;
        }

        .aurora-dialog-close {
          width: 34px;
          height: 34px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          color: white;

          background:
            rgba(255,255,255,.07);

          text-decoration: none;

          font-size: 17px;
        }

        .aurora-dialog-grid {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 8px;

          margin-top: 14px;
        }

        .aurora-dialog-item {
          padding: 14px;

          border-radius: 16px;

          background:
            rgba(255,255,255,.05);

          border:
            1px solid rgba(255,255,255,.07);
        }

        .aurora-dialog-label {
          color:
            rgba(255,255,255,.38);

          font-size: 6px;

          font-weight: 900;

          letter-spacing: 1.5px;
        }

        .aurora-dialog-value {
          margin-top: 6px;

          color:
            rgba(255,255,255,.86);

          font-size: 9px;

          line-height: 1.5;

          font-weight: 800;
        }

        .aurora-dialog-wifi {
          margin-top: 9px;

          padding: 14px;

          border-radius: 17px;

          background:
            linear-gradient(
              145deg,
              rgba(42,111,97,.25),
              rgba(17,59,51,.16)
            );

          border:
            1px solid rgba(108,218,198,.11);
        }

        .aurora-dialog-wifi-title {
          font-size: 11px;

          font-weight: 950;
        }

        .aurora-dialog-wifi-text {
          margin-top: 5px;

          color:
            rgba(255,255,255,.62);

          font-size: 8px;

          line-height: 1.5;
        }

        .aurora-dialog-actions {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 8px;

          margin-top: 10px;
        }

        /* =====================================================
           MOBİL
        ===================================================== */

        @media (max-width: 760px) {
          .aurora-stage {
            display: block;

            min-height: 100svh;

            padding:
              10px
              9px
              88px;
          }

          .aurora-scene {
            min-height: auto;

            display: block;
          }

          .aurora-image-frame {
            width: 100%;

            height:
              min(650px, calc(100svh - 120px));

            min-height: 520px;

            border-radius: 25px;
          }

          .aurora-info-panel {
            left: 12px;
            right: 12px;

            top: auto;
            bottom: 12px;

            width: auto;

            max-height: 235px;

            padding: 14px;

            border-radius: 19px;
          }

          .aurora-info-scroll {
            max-height: 205px;
          }

          .aurora-logo-wrap {
            display: none;
          }

          .aurora-panel-block {
            padding:
              12px 0;
          }

          .aurora-panel-block:first-child {
            padding-top: 0;
          }

          .aurora-panel-block:last-child {
            padding-bottom: 0;
          }

          .aurora-title {
            font-size: 15px;
          }

          .aurora-description {
            font-size: 8px;
          }

          .aurora-hours {
            font-size: 11px;
          }

          .aurora-address {
            font-size: 8px;
          }

          .aurora-service-grid {
            display: grid;
          }

          .aurora-category-stack {
            position: relative;

            top: auto;
            right: auto;

            width: 100%;

            grid-template-columns:
              1fr 1fr;

            gap: 7px;

            margin-top: 9px;
          }

          .aurora-main-action-form {
            min-width: 0;
          }

          .aurora-category {
            min-height: 72px;

            padding:
              0 12px;

            border-radius: 16px;
          }

          .aurora-category-wide-mobile {
            grid-column: 1 / -1;
          }

          .aurora-category-icon {
            width: 28px;
            height: 28px;

            margin-right: 8px;

            font-size: 15px;
          }

          .aurora-category-name {
            font-size: 9px;
          }

          .aurora-category-arrow {
            display: none;
          }

          .aurora-bottom {
            width:
              calc(100% - 18px);

            bottom: 7px;
          }

          .aurora-nav-link {
            min-height: 38px;

            font-size: 7px;
          }

          .aurora-order-track-nav {
            min-height: 38px;
            padding: 0 5px;
            font-size: 7px;
          }

          .aurora-order-track-nav-icon {
            font-size: 10px;
          }

          .aurora-dialog {
            padding: 10px;
          }

          .aurora-dialog-card {
            max-height:
              calc(100vh - 20px);

            padding: 16px;

            border-radius: 22px;
          }

          .aurora-dialog-grid,
          .aurora-dialog-actions {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 430px) {
          .aurora-image-frame {
            height: 580px;

            min-height: 580px;
          }

          .aurora-info-panel {
            left: 8px;
            right: 8px;
            bottom: 8px;
          }

          .aurora-category {
            min-height: 67px;
          }

          .aurora-category-name {
            font-size: 8px;
          }
        }
      `}</style>

      <main className="aurora-root">

        {/* ===================================================
            ANA SAHNE
        =================================================== */}

        <section className="aurora-stage">

          <div className="aurora-scene">

            {/* =================================================
                MERKEZ GÖRSEL
            ================================================= */}

            <div className="aurora-image-frame">

              {restaurant.cover_image_url ? (
                <img
                  src={restaurant.cover_image_url}
                  alt={restaurant.name}
                  className="aurora-image"
                />
              ) : (
                <div className="aurora-image-fallback" />
              )}

              <div className="aurora-image-overlay" />

              {/* =============================================
                  SOL BİLGİ KARTI
              ============================================= */}

              <aside className="aurora-info-panel">

                <div className="aurora-info-scroll">

                  {/* LOGO */}

                  <div className="aurora-logo-wrap">

                    {restaurant.logo_url ? (
                      <img
                        src={restaurant.logo_url}
                        alt={`${restaurant.name} logosu`}
                        className="aurora-logo"
                      />
                    ) : (
                      <div className="aurora-logo-fallback">
                        {restaurant.name
                          .slice(0, 3)
                          .toUpperCase()}
                      </div>
                    )}

                  </div>

                  {/* RESTAURANT */}

                  <section className="aurora-panel-block">

                    <div className="aurora-kicker">
                      RESTAURANT
                    </div>

                    <div className="aurora-title">
                      {restaurant.name}
                    </div>

                    {restaurant.description &&
                      restaurant.description.trim() !== "" && (
                        <div className="aurora-description">
                          {restaurant.description}
                        </div>
                      )}

                    {table && (
                      <div className="aurora-table">

                        <span className="aurora-table-dot" />

                        Masa {table.table_number}

                        <span>
                          · QR / NFC
                        </span>

                      </div>
                    )}

                  </section>

                  {/* SAAT */}

                  <section className="aurora-panel-block">

                    <div className="aurora-kicker">
                      BUGÜN
                    </div>

                    <div className="aurora-hours">
                      Pazartesi — Cuma
                      <br />
                      08:00 — 24:00
                    </div>

                  </section>

                  {/* ADRES */}

                  <section className="aurora-panel-block">

                    <div className="aurora-kicker">
                      ADRES
                    </div>

                    <div className="aurora-address">
                      {restaurant.address?.trim() ? (
                        restaurant.address
                      ) : (
                        <>
                          Restoran adres bilgisi
                          <br />
                          İstanbul / Türkiye
                        </>
                      )}
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        restaurant.name
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aurora-link"
                    >
                      ⌖ Haritada Aç
                    </a>

                  </section>

                  {/* TELEFON */}

                  <section className="aurora-panel-block">

                    <div className="aurora-kicker">
                      TELEFON
                    </div>

                    <a
                      href={
                        restaurant.phone?.trim()
                          ? `tel:${restaurant.phone.replace(/[^\d+]/g, "")}`
                          : undefined
                      }
                      className="aurora-phone"
                    >
                      ☎ {restaurant.phone?.trim() || "+90 500 000 00 00"}
                    </a>

                  </section>

                  {/* PUAN */}

                  <section className="aurora-panel-block">

                    <div className="aurora-kicker">
                      MÜŞTERİ DENEYİMİ
                    </div>

                    <div className="aurora-rating-value">
                      {averageRating}
                    </div>

                    <div className="aurora-rating-stars">

                      {Array.from({
                        length: 5,
                      }).map((_, index) => (
                        <span key={index}>
                          {index <
                          Math.round(ratingValue)
                            ? "★"
                            : "☆"}
                        </span>
                      ))}

                    </div>

                    <div className="aurora-rating-count">
                      {totalReviews} değerlendirme
                    </div>

                  </section>

                  {/* SERVİS */}

                  {table && (
                    <section className="aurora-panel-block">

                      <div className="aurora-kicker">
                        SERVİS
                      </div>

                      <div className="aurora-service-grid">

                        <form
                          action={callWaiter}
                          className="aurora-service-form"
                        >

                          <input
                            type="hidden"
                            name="slug"
                            value={restaurant.slug}
                          />

                          <input
                            type="hidden"
                            name="masa"
                            value={table.public_token}
                          />

                          <button
                            type="submit"
                            className="aurora-service-button"
                          >
                            {garsonStatus === "ok"
                              ? "✓ Garson Çağrıldı"
                              : "♟ Garsonu Çağır"}
                          </button>

                        </form>

                        <form
                          action={requestBill}
                          className="aurora-service-form"
                        >

                          <input
                            type="hidden"
                            name="slug"
                            value={restaurant.slug}
                          />

                          <input
                            type="hidden"
                            name="masa"
                            value={table.public_token}
                          />

                          <button
                            type="submit"
                            className="aurora-service-button"
                          >
                            {hesapStatus === "ok"
                              ? "✓ Hesap İstendi"
                              : "▤ Hesap İste"}
                          </button>

                        </form>

                      </div>

                      {garsonStatus === "ok" && (
                        <div className="aurora-service-status">
                          Garson talebiniz iletildi.
                        </div>
                      )}

                      {hesapStatus === "ok" && (
                        <div className="aurora-service-status">
                          Hesap talebiniz iletildi.
                        </div>
                      )}

                    </section>
                  )}

                  {/* SOSYAL */}

                  <section className="aurora-panel-block">

                    <div className="aurora-kicker">
                      FOLLOW US
                    </div>

                    <div className="aurora-social-row">

                      {restaurant.instagram_url && (
                        <a
                          href={restaurant.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aurora-social-button"
                          aria-label="Instagram"
                        >
                          IG
                        </a>
                      )}

                      {restaurant.google_review_url && (
                        <a
                          href={restaurant.google_review_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aurora-social-button"
                          aria-label="Google"
                        >
                          ★
                        </a>
                      )}

                    </div>

                  </section>

                </div>

              </aside>

            </div>

            {/* =================================================
                SAĞ KATEGORİLER
            ================================================= */}

            <nav className="aurora-category-stack" aria-label="Restoran işlemleri">

              {/* MENÜ */}
              <a
                href={`/restoran/${restaurant.slug}/menu${tableQuery}`}
                className="aurora-category"
              >
                <span className="aurora-category-icon">
                  ♧
                </span>

                <span className="aurora-category-name">
                  MENÜ
                </span>

                <span className="aurora-category-arrow">
                  →
                </span>
              </a>

              {/* GARSON ÇAĞIR */}
              {table ? (
                <form
                  action={callWaiter}
                  className="aurora-service-form aurora-main-action-form"
                >
                  <input
                    type="hidden"
                    name="slug"
                    value={restaurant.slug}
                  />
                  <input
                    type="hidden"
                    name="masa"
                    value={table.public_token}
                  />

                  <button
                    type="submit"
                    className="aurora-category aurora-category-button"
                    aria-label="Garson çağır"
                  >
                    <span className="aurora-category-icon">
                      ♟
                    </span>

                    <span className="aurora-category-name">
                      {garsonStatus === "ok"
                        ? "GARSON ÇAĞRILDI"
                        : "GARSON ÇAĞIR"}
                    </span>

                    <span className="aurora-category-arrow">
                      →
                    </span>
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="aurora-category aurora-category-button"
                  disabled
                  aria-label="Garson çağırmak için masa bilgisi gerekli"
                >
                  <span className="aurora-category-icon">
                    ♟
                  </span>

                  <span className="aurora-category-name">
                    GARSON ÇAĞIR
                  </span>

                  <span className="aurora-category-arrow">
                    →
                  </span>
                </button>
              )}

              {/* HESAP İSTE */}
              {table ? (
                <form
                  action={requestBill}
                  className="aurora-service-form aurora-main-action-form"
                >
                  <input
                    type="hidden"
                    name="slug"
                    value={restaurant.slug}
                  />
                  <input
                    type="hidden"
                    name="masa"
                    value={table.public_token}
                  />

                  <button
                    type="submit"
                    className="aurora-category aurora-category-button"
                    aria-label="Hesap iste"
                  >
                    <span className="aurora-category-icon">
                      ▤
                    </span>

                    <span className="aurora-category-name">
                      {hesapStatus === "ok"
                        ? "HESAP İSTENDİ"
                        : "HESAP İSTE"}
                    </span>

                    <span className="aurora-category-arrow">
                      →
                    </span>
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="aurora-category aurora-category-button"
                  disabled
                  aria-label="Hesap istemek için masa bilgisi gerekli"
                >
                  <span className="aurora-category-icon">
                    ▤
                  </span>

                  <span className="aurora-category-name">
                    HESAP İSTE
                  </span>

                  <span className="aurora-category-arrow">
                    →
                  </span>
                </button>
              )}

              {/* ÖDEME YAP */}
              <a
                href={`/restoran/${restaurant.slug}/odeme${tableQuery}`}
                className="aurora-category"
              >
                <span className="aurora-category-icon">
                  ₺
                </span>

                <span className="aurora-category-name">
                  ÖDEME YAP
                </span>

                <span className="aurora-category-arrow">
                  →
                </span>
              </a>

              {/* BİZİ DEĞERLENDİR — kayıtlı Google değerlendirme bağlantısı */}
              <a
                href={
                  restaurant.google_review_url ??
                  `/restoran/${restaurant.slug}/calisan${tableQuery}`
                }
                {...(restaurant.google_review_url
                  ? {
                      target: "_blank",
                      rel: "noopener noreferrer",
                    }
                  : {})}
                className="aurora-category aurora-category-wide-mobile"
              >
                <span className="aurora-category-icon">
                  ★
                </span>

                <span className="aurora-category-name">
                  BİZİ DEĞERLENDİR
                </span>

                <span className="aurora-category-arrow">
                  →
                </span>
              </a>

            </nav>

          </div>

        </section>

        {/* =====================================================
            BİLGİ MODALI
        ===================================================== */}

        <div
          id="aurora-info"
          className="aurora-dialog"
        >

          <div className="aurora-dialog-card">

            <div className="aurora-dialog-head">

              <div className="aurora-dialog-title">
                {restaurant.name}
              </div>

              <a
                href="#"
                className="aurora-dialog-close"
                aria-label="Kapat"
              >
                ×
              </a>

            </div>

            <div className="aurora-dialog-grid">

              <div className="aurora-dialog-item">

                <div className="aurora-dialog-label">
                  ÇALIŞMA SAATLERİ
                </div>

                <div className="aurora-dialog-value">
                  Pazartesi — Cuma
                  <br />
                  08:00 — 24:00
                </div>

              </div>

              <div className="aurora-dialog-item">

                <div className="aurora-dialog-label">
                  MASA
                </div>

                <div className="aurora-dialog-value">
                  {table
                    ? `Masa ${table.table_number}`
                    : "Masa bilgisi yok"}
                </div>

              </div>

              <div className="aurora-dialog-item">

                <div className="aurora-dialog-label">
                  ADRES
                </div>

                <div className="aurora-dialog-value">
                  {restaurant.address?.trim() ? (
                    restaurant.address
                  ) : (
                    <>
                      Restoran adres bilgisi
                      <br />
                      İstanbul / Türkiye
                    </>
                  )}
                </div>

              </div>

              <div className="aurora-dialog-item">

                <div className="aurora-dialog-label">
                  MÜŞTERİ PUANI
                </div>

                <div className="aurora-dialog-value">
                  {averageRating} / 5
                  <br />
                  {totalReviews} değerlendirme
                </div>

              </div>

            </div>

            <div className="aurora-dialog-wifi">

              <div className="aurora-dialog-wifi-title">
                WiFi Connect
              </div>

              <div className="aurora-dialog-wifi-text">
                Ağ: <strong>Deneme Wifi</strong>
                <br />
                Şifre: <strong>123456</strong>
              </div>

            </div>

            {table && (
              <div className="aurora-dialog-actions">

                <form action={callWaiter}>

                  <input
                    type="hidden"
                    name="slug"
                    value={restaurant.slug}
                  />

                  <input
                    type="hidden"
                    name="masa"
                    value={table.public_token}
                  />

                  <button
                    type="submit"
                    className="aurora-service-button"
                  >
                    {garsonStatus === "ok"
                      ? "✓ Garson Çağrıldı"
                      : "♟ Garsonu Çağır"}
                  </button>

                </form>

                <form action={requestBill}>

                  <input
                    type="hidden"
                    name="slug"
                    value={restaurant.slug}
                  />

                  <input
                    type="hidden"
                    name="masa"
                    value={table.public_token}
                  />

                  <button
                    type="submit"
                    className="aurora-service-button"
                  >
                    {hesapStatus === "ok"
                      ? "✓ Hesap İstendi"
                      : "▤ Hesap İste"}
                  </button>

                </form>

              </div>
            )}

            <div className="aurora-social-row">

              {restaurant.instagram_url && (
                <a
                  href={restaurant.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aurora-social-button"
                >
                  IG
                </a>
              )}

              {restaurant.google_review_url && (
                <a
                  href={restaurant.google_review_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aurora-social-button"
                >
                  ★
                </a>
              )}

            </div>

          </div>

        </div>

        {/* =====================================================
            ALT NAV
        ===================================================== */}

        <div className="aurora-bottom">

          <nav className="aurora-bottom-nav">

            <a
              href="#aurora-info"
              className="aurora-nav-link"
            >
              <span className="aurora-nav-icon">
                ⓘ
              </span>

              Bilgi
            </a>

            <a
              href={`/restoran/${restaurant.slug}/menu${tableQuery}`}
              className="aurora-nav-link active"
            >
              <span className="aurora-nav-icon">
                ♧
              </span>

              MENU
            </a>

            <AuroraOrderTrackingButton
              slug={restaurant.slug}
              tableToken={table?.public_token}
            />

          </nav>

        </div>

      </main>
    </>
  );
}