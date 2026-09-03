import Link from "next/link";
import { IoCartOutline, IoLogoWhatsapp, IoPersonOutline, IoSearchOutline } from "react-icons/io5";
import { siteConfig } from "@/config/site";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getCartSummary } from "@/lib/cart";

export const TopMenu = async () => {
  const [user, cart] = await Promise.all([getSessionUser(), getCartSummary()]);
  return <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur"><nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5"><Link href="/" className="text-xl font-black tracking-tight">Viccs<span className="text-blue-700">Auto</span></Link><div className="hidden sm:block"><Link className="m-2 rounded-md p-2 hover:bg-gray-100" href="/products">Autopartes</Link><Link className="m-2 rounded-md p-2 hover:bg-gray-100" href="/category/frenos">Frenos</Link><Link className="m-2 rounded-md p-2 hover:bg-gray-100" href="/vehicles">Vehículos</Link></div><div className="flex items-center gap-3"><Link href="/search" aria-label="Buscar"><IoSearchOutline className="h-5 w-5"/></Link><Link href={user ? (isStaff(user) ? "/admin" : "/account") : "/auth/login"} aria-label={user ? "Mi cuenta" : "Iniciar sesión"}><IoPersonOutline className="h-5 w-5"/></Link><Link href="/cart" aria-label={`Carrito con ${cart.count} productos`} className="relative"><IoCartOutline className="h-5 w-5"/>{cart.count > 0 && <span className="absolute -right-3 -top-3 rounded-full bg-blue-700 px-1.5 text-xs font-bold text-white">{cart.count}</span>}</Link><a href={`https://wa.me/${siteConfig.whatsapp}`} aria-label="Contactar por WhatsApp" className="ml-1 hidden items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white lg:flex"><IoLogoWhatsapp/> Cotizar</a></div></nav></header>;
};
