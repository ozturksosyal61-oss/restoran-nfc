import { notFound } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import ProductCard from "./ProductCard";
import Cart from "./Cart";
import TableNumberCapture from "./TableNumberCapture";

type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  ingredients: string | null;
  allergens: string | null;
  price: number;
  image_url: string | null;
};

export default async function MenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const {
    data: restaurant,
    error: restaurantError,
  } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (restaurantError || !restaurant) {
    notFound();
  }

  const {
    data: categories,
    error: categoriesError,
  } = await supabase
    .from("categories")
    .select("id, name")
    .eq("restaurant_id", restaurant.id)
    .order("id");

  const {
    data: products,
    error: productsError,
  } = await supabase
    .from("products")
    .select(
      "id, category_id, name, description, ingredients, allergens, price, image_url"
    )
    .in(
      "category_id",
      (categories ?? []).map(
        (category) => category.id
      )
    )
    .order("id");

  if (categoriesError || productsError) {
    return (
      <main className="restaurant-page">

        <section className="hero">

          <div className="logo">
            OZT
          </div>

          <h1>{restaurant.name}</h1>

          <p>
            Menü yüklenirken bir hata oluştu.
          </p>

        </section>

      </main>
    );
  }

  return (
    <main className="restaurant-page">

      {/* MASA NUMARASINI YAKALA */}

      <TableNumberCapture />


      {/* PREMIUM HEADER */}

      <section className="hero">

        <div className="hero-decoration hero-decoration-left" />

        <div className="hero-decoration hero-decoration-right" />

        <div className="logo">
          OZT
        </div>

        <div className="hero-line" />

        <h1>
          {restaurant.name}
        </h1>

        <p>
          Dijital Menü
        </p>

      </section>


      {/* KATEGORİ MENÜSÜ */}

      <nav className="customer-category-nav">

        {categories?.map((category) => (

          <a
            key={category.id}
            href={`#category-${category.id}`}
          >
            {category.name}
          </a>

        ))}

      </nav>


      {/* MENÜ */}

      <section className="menu">

        {categories?.map((category) => {

          const categoryProducts =
            products?.filter(
              (product) =>
                product.category_id ===
                category.id
            ) ?? [];

          return (

            <div
              key={category.id}
              id={`category-${category.id}`}
              className="customer-category"
            >

              {/* KATEGORİ BAŞLIĞI */}

              <div className="customer-category-heading">

                <span className="category-line" />

                <h2 className="customer-category-title">
                  {category.name}
                </h2>

                <span className="category-line" />

              </div>


              {/* ÜRÜNLER */}

              <div className="customer-products">

                {categoryProducts.map(
                  (product) => (

                    <ProductCard
                      key={product.id}
                      product={product}
                    />

                  )
                )}

              </div>

            </div>

          );
        })}

      </section>


      {/* SEPET */}

      <Cart />

    </main>
  );
}