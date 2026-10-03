import Link from "next/link";
import AdminIcon from "./AdminIcon";
import { FEATURE_INFO, featuresAddedIn, featurePlan, getPlanName, type PlanFeature } from "../../lib/plan";

// Pakette olmayan bir sayfa açıldığında gösterilir: özelliğin hangi pakette
// olduğu ve o paketle gelen diğer özellikler.
export default function PlanLock({
  feature,
  title,
  eyebrow = "Paket",
}: {
  feature: PlanFeature;
  title: string;
  eyebrow?: string;
}) {
  const plan = featurePlan(feature);
  const others = featuresAddedIn(plan).filter((item) => item !== feature);

  return (
    <main className="adm-page">
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
        </div>
      </header>

      <section className="adm-card" aria-labelledby="paket-kilit">
        <div className="adm-card-head">
          <div>
            <h2 id="paket-kilit">
              <AdminIcon name="lock" size={18} /> {getPlanName(plan)} paketinde
            </h2>
            <p>{FEATURE_INFO[feature].label} {getPlanName(plan)} paketiyle kullanılabilir.</p>
          </div>
        </div>

        {others.length > 0 && (
          <div className="adm-form">
            <span className="adm-label">{getPlanName(plan)} paketiyle ayrıca gelenler</span>
            <ul className="adm-plan-list">
              {others.map((item) => (
                <li key={item}>
                  <AdminIcon name="check" size={14} />
                  {FEATURE_INFO[item].label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
          <Link className="adm-btn adm-btn-primary" href="/admin/abonelik">
            <AdminIcon name="card" size={16} />
            Paketimi yükselt
          </Link>
        </div>
        <p className="adm-hint" style={{ margin: 0 }}>
          Paketiniz OZT Digital tarafından yönetiliyorsa yükseltme için bizimle iletişime geçin.
        </p>
      </section>
    </main>
  );
}
