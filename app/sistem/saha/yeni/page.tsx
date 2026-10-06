import Link from "next/link";
import { requireSystemAdmin } from "../../../../lib/system-admin";
import AdminIcon from "../../../admin/AdminIcon";
import { LeadForm } from "../SalesForms";
import "../saha.css";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  await requireSystemAdmin();

  return (
    <main className="adm-page" style={{ maxWidth: 820 }}>
      <Link href="/sistem/saha" className="adm-back">
        <AdminIcon name="arrowLeft" size={15} />
        Saha satış
      </Link>
      <header className="adm-head">
        <div className="adm-head-text">
          <span className="adm-eyebrow">Saha satış</span>
          <h1>Yeni işletme</h1>
          <p>Yalnızca işletmenin adı zorunlu. Gerisini sonra tamamlayabilirsiniz.</p>
        </div>
      </header>
      <section className="adm-card">
        <LeadForm />
      </section>
    </main>
  );
}
