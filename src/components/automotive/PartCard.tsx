import Link from "next/link";
import { IoCheckmarkCircle } from "react-icons/io5";
import type { AutomotiveProduct } from "@/interfaces";
import { formatPrice } from "@/lib/format";
import { CategoryIcon } from "./CategoryIcon";

export function PartCard({ product }: { product: AutomotiveProduct }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 text-blue-700">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105" />
          ) : (
            <CategoryIcon name={product.icon} className="h-20 w-20 transition group-hover:scale-110" />
          )}
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>{product.brand ?? "Marca no especificada"}</span><span>{product.sku}</span>
          </div>
          <h3 className="min-h-12 text-lg font-bold leading-tight text-slate-900 group-hover:text-blue-700">{product.name}</h3>
          <p className="line-clamp-2 text-sm text-slate-600">{product.shortDescription}</p>
          <div className="flex items-end justify-between gap-3 pt-2">
            <div><strong className="block text-xl text-slate-950">{formatPrice(product.price)}</strong>{product.compareAtPrice && <span className="text-xs text-slate-400 line-through">{formatPrice(product.compareAtPrice)}</span>}</div>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700"><IoCheckmarkCircle /> {product.stock} disponibles</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
