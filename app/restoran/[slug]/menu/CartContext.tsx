"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

type CartItem = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (product: CartItem) => void;
  increaseQuantity: (id: number) => void;
  decreaseQuantity: (id: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
};

const CartContext = createContext<CartContextType | undefined>(
  undefined
);

const CART_STORAGE_KEY = "restaurant-cart";

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // =====================================================
  // LOCALSTORAGE'DAN SEPETİ YÜKLE
  // =====================================================

  useEffect(() => {
    try {
      const savedCart =
        window.localStorage.getItem(CART_STORAGE_KEY);

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          const validCart = parsedCart.filter(
            (item) =>
              item &&
              typeof item.id === "number" &&
              typeof item.name === "string" &&
              typeof item.quantity === "number" &&
              item.quantity > 0
          );

          setItems(validCart);
        }
      }
    } catch (error) {
      console.error(
        "Sepet yüklenirken hata oluştu:",
        error
      );
    } finally {
      // LocalStorage yükleme işlemi tamamen bittikten
      // sonra uygulamanın geri kalanını göster.
      setLoaded(true);
    }
  }, []);

  // =====================================================
  // SEPETİ LOCALSTORAGE'A KAYDET
  // =====================================================

  useEffect(() => {
    // İlk yükleme tamamlanmadan localStorage'a
    // boş sepet yazmasını engelliyoruz.
    if (!loaded) {
      return;
    }

    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(items)
      );
    } catch (error) {
      console.error(
        "Sepet kaydedilirken hata oluştu:",
        error
      );
    }
  }, [items, loaded]);

  // =====================================================
  // SEPETE ÜRÜN EKLE
  // =====================================================

  function addToCart(product: CartItem) {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.id === product.id
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  }

  // =====================================================
  // ADET ARTIR
  // =====================================================

  function increaseQuantity(id: number) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  // =====================================================
  // ADET AZALT
  // =====================================================

  function decreaseQuantity(id: number) {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  // =====================================================
  // ÜRÜNÜ TAMAMEN SİL
  // =====================================================

  function removeFromCart(id: number) {
    setItems((currentItems) =>
      currentItems.filter(
        (item) => item.id !== id
      )
    );
  }

  // =====================================================
  // SEPETİ TAMAMEN TEMİZLE
  // =====================================================

  function clearCart() {
    setItems([]);

    try {
      window.localStorage.removeItem(
        CART_STORAGE_KEY
      );
    } catch (error) {
      console.error(
        "Sepet temizlenirken hata oluştu:",
        error
      );
    }
  }

  // =====================================================
  // TOPLAM
  // =====================================================

  const total = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum +
        Number(item.price) *
          Number(item.quantity),
      0
    );
  }, [items]);

  // =====================================================
  // ÜRÜN SAYISI
  // =====================================================

  const itemCount = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum + Number(item.quantity),
      0
    );
  }, [items]);

  // =====================================================
  // LOCALSTORAGE YÜKLENMEDEN SAYFAYI GÖSTERME
  // =====================================================
  //
  // ÖNEMLİ:
  //
  // Sipariş sayfasına geçildiğinde CartProvider yeniden
  // oluşturulursa önce localStorage okunur.
  //
  // Bu sayede:
  //
  // items = []
  //
  // ile yanlışlıkla sipariş ekranının açılmasını
  // engelliyoruz.
  //

  if (!loaded) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f5ef",
          color: "#111",
          fontSize: "16px",
          fontWeight: 600,
        }}
      >
        Sepet yükleniyor...
      </div>
    );
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// =====================================================
// USE CART
// =====================================================

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart CartProvider içinde kullanılmalıdır."
    );
  }

  return context;
}