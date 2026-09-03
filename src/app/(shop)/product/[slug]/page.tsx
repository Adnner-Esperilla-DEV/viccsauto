import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { addToCartAction } from "@/app/actions/cart";
import { CategoryIcon, ProductImageGallery } from "@/components";
import { siteConfig } from "@/config/site";
import { getProductBySlug } from "@/lib/catalog-repository";
import { absoluteUrl, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  return product
    ? {
        title: product.name,
        description: product.shortDescription,
        alternates: { canonical: `/product/${product.slug}` },
        openGraph: { title: product.name, description: product.shortDescription },
      }
    : {};
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [product, query] = await Promise.all([getProductBySlug((await params).slug), searchParams]);
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    mpn: product.oemCodes[0],
    ...(product.images?.length ? { image: product.images.map((image) => absoluteUrl(image)) } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: siteConfig.currency,
      price: product.price,
      availability: `https://schema.org/${product.stock > 0 ? "InStock" : "OutOfStock"}`,
      itemCondition: `https://schema.org/${product.condition === "new" ? "NewCondition" : "RefurbishedCondition"}`,
    },
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Migas de pan" className="mb-8 text-sm text-slate-500">
        <Link href="/products">Autopartes</Link> /{" "}
        <Link href={`/category/${product.categorySlug}`}>{product.category}</Link> / <span>{product.name}</span>
      </nav>

      {query.error && <p role="alert" className="mb-6 rounded-2xl bg-red-50 p-4 text-red-700">La cantidad solicitada no está disponible.</p>}

      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          {product.images?.length ? (
            <ProductImageGallery images={product.images} name={product.name} />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-[3rem] bg-gradient-to-br from-slate-100 to-blue-100 text-blue-700">
            <CategoryIcon name={product.icon} className="h-40 w-40" />
            </div>
          )}
        </div>

        <div>
          <span className="text-sm font-bold uppercase tracking-widest text-blue-700">{product.brand ?? "Sin marca especificada"} · {product.sku}</span>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">{product.description}</p>
          <strong className="mt-8 block text-4xl">{formatPrice(product.price)}</strong>
          <p className={`mt-2 text-sm font-semibold ${product.stock ? "text-emerald-700" : "text-red-700"}`}>
            {product.stock ? `${product.stock} unidades disponibles` : "Sin stock"}
          </p>

          {product.stock > 0 && (
            <form action={addToCartAction} className="mt-7 flex gap-3">
              <input type="hidden" name="productId" value={product.id} />
              <input aria-label="Cantidad" type="number" name="quantity" defaultValue={1} min={1} max={Math.min(product.stock, 25)} className="w-20 rounded-full border px-4" />
              <button className="rounded-full bg-blue-700 px-7 py-4 font-bold text-white">Agregar al carrito</button>
            </form>
          )}

          <a
            href={`https://wa.me/${siteConfig.whatsapp}?text=${encodeURIComponent(`Hola, quiero confirmar compatibilidad de ${product.name} (${product.sku})`)}`}
            className="mt-3 inline-flex rounded-full border border-emerald-600 px-7 py-3 font-bold text-emerald-700"
          >
            Confirmar compatibilidad
          </a>

          <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Compatibilidad</h2>
            {product.compatibility.map((item) => (
              <div key={`${item.make}-${item.model}`} className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                <span><b>Vehículo:</b> {item.make} {item.model}</span>
                <span><b>Años:</b> {item.years}</span>
                {item.engine && <span><b>Motor:</b> {item.engine}</span>}
              </div>
            ))}
            <p className="mt-5 text-xs text-slate-500">Códigos OEM: {product.oemCodes.join(", ")}. Verifica siempre con VIN o muestra.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
