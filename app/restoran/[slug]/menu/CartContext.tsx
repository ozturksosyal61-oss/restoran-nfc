"use client";

import {
  createContext,
  useContext,
  useEffect,
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
      const savedCart = window.localStorage.getItem(
        CART_STORAGE_KEY
      );

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setItems(parsedCart);
        }
      }
    } catch (error) {
      console.error(
        "Sepet yüklenirken hata oluştu:",
        error
      );
    }

    setLoaded(true);
  }, []);

  // =====================================================
  // SEPETİ LOCALSTORAGE'A KAYDET
  // =====================================================

  function saveCart(cart: CartItem[]) {
    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cart)
      );
    } catch (error) {
      console.error(
        "Sepet kaydedilirken hata oluştu:",
        error
      );
    }
  }

  // =====================================================
  // SEPETE ÜRÜN EKLE
  // =====================================================

  function addToCart(product: CartItem) {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.id === product.id
      );

      let newItems: CartItem[];

      if (existingItem) {
        newItems = currentItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      } else {
        newItems = [
          ...currentItems,
          {
            ...product,
            quantity: 1,
          },
        ];
      }

      // DEĞİŞİKLİĞİ HEMEN KAYDET
      saveCart(newItems);

      return newItems;
    });
  }

  // =====================================================
  // ADET ARTIR
  // =====================================================

  function increaseQuantity(id: number) {
    setItems((currentItems) => {
      const newItems = currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      );

      saveCart(newItems);

      return newItems;
    });
  }

  // =====================================================
  // ADET AZALT
  // =====================================================

  function decreaseQuantity(id: number) {
    setItems((currentItems) => {
      const newItems = currentItems
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0);

      saveCart(newItems);

      return newItems;
    });
  }

  // =====================================================
  // ÜRÜNÜ TAMAMEN SİL
  // =====================================================

  function removeFromCart(id: number) {
    setItems((currentItems) => {
      const newItems = currentItems.filter(
        (item) => item.id !== id
      );

      saveCart(newItems);

      return newItems;
    });
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

  const total = items.reduce(
    (sum, item) =>
      sum + Number(item.price) * item.quantity,
    0
  );

  // =====================================================
  // ÜRÜN SAYISI
  // =====================================================

  const itemCount = items.reduce(
    (sum, item) =>
      sum + item.quantity,
    0
  );

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