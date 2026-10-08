"use client";

import { useActionState, useState } from "react";
import AdminIcon from "../../AdminIcon";
import { TABLE_GAMES, type TableGamesSetting } from "../../../../lib/table-games";
import { saveTableGames } from "./actions";

export default function GamesSettings({ initial }: { initial: TableGamesSetting }) {
  const [result, action, pending] = useActionState(saveTableGames, null);
  const [enabled, setEnabled] = useState(initial.enabled);

  return (
    <form action={action} className="adm-card adm-form">
      <label className="adm-check">
        <input
          type="checkbox"
          name="enabled"
          value="1"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>
          <strong>Masa oyunlarını göster</strong>
          <span>
            Açıkken restoran ana sayfasında “Masa Oyunları” kartı ve sipariş takip ekranında “Beklerken oyna” düğmesi
            görünür. Kapalıyken hiçbir yerde görünmez.
          </span>
        </span>
      </label>

      <div className="adm-field">
        <span className="adm-label">Görünecek oyunlar</span>
        {TABLE_GAMES.map((game) => (
          <label key={game.id} className="adm-check">
            <input type="checkbox" name="games" value={game.id} defaultChecked={initial.games.includes(game.id)} disabled={!enabled} />
            <span>
              <strong>{game.name}</strong>
              <span>
                {game.short} · {game.players}
              </span>
            </span>
          </label>
        ))}
        {/* Kapalıyken de seçim korunur (devre dışı kutular gönderilmez). */}
        {!enabled && initial.games.map((id) => <input key={id} type="hidden" name="games" value={id} />)}
      </div>

      {result && (
        <p className={`adm-alert ${result.ok ? "adm-alert-ok" : "adm-alert-error"}`} role="status" style={{ margin: 0 }}>
          <AdminIcon name={result.ok ? "check" : "alert"} size={16} />
          {result.message}
        </p>
      )}

      <div className="adm-form-actions" style={{ justifyContent: "flex-start" }}>
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
          <AdminIcon name="save" size={16} />
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
