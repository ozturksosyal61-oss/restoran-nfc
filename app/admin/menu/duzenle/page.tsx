import { createServerSupabaseClient } from "../../../../lib/supabase-server";
import { notFound } from "next/navigation";
import EditProductForm from "./EditProductForm";

export default async function EditProductPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string;
  }>;
}) {
  const params = await searchParams;

  const productId = params.id;

  if (!productId) {
    notFound();
  }

  const supabase =
    await createServerSupabaseClient();

  /* =====================================================
     ÜRÜNÜ GETİR
     ===================================================== */

  const {
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select(
      `
      id,
      category_id,
      name,
      description,
      ingredients,
      allergens,
      price,
      image_url,
      is_available
      `
    )
    .eq(
      "id",
      Number(productId)
    )
    .single();

  if (
    productError ||
    !product
  ) {
    notFound();
  }

  /* =====================================================
     KATEGORİLERİ GETİR
     ===================================================== */

  const {
    data: categories,
  } = await supabase
    .from("categories")
    .select(
      "id, name"
    )
    .order("id");

  /* =====================================================
     FORM
     ===================================================== */

  return (
    <EditProductForm
      product={product}
      categories={
        categories || []
      }
    />
  );
}