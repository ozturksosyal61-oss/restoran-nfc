"use client";

type Props = {
  restaurantId: number;
  restaurantName: string;
  action: (formData: FormData) => void | Promise<void>;
};

export default function DeleteRestaurantButton({
  restaurantId,
  restaurantName,
  action,
}: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const phrase = window.prompt(
          `"${restaurantName}" restoranını KALICI olarak silmek üzeresiniz.\n\n` +
            `Bu işlem geri alınamaz. Restorana bağlı menü, ürün, masa, sipariş, yorum, hizmet talepleri ve abonelik kayıtları da silinir.\n\n` +
            `Onaylamak için RESTORANI SIL yazın.`
        );

        if (phrase !== "RESTORANI SIL") {
          event.preventDefault();
          return;
        }

        if (
          !window.confirm(
            `"${restaurantName}" kalıcı olarak silinsin mi?`
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input
        type="hidden"
        name="restaurant_id"
        value={restaurantId}
      />

      <button
        type="submit"
        className="restaurant-delete-button"
        title="Restoranı ve bağlı verilerini kalıcı olarak sil"
      >
        🗑️ Kalıcı Sil
      </button>
    </form>
  );
}
