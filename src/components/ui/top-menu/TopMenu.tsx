import Link from "next/link";
import { IoCartOutline, IoLogoWhatsapp, IoPersonOutline, IoSearchOutline } from "react-icons/io5";
import { siteConfig } from "@/config/site";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getCartSummary } from "@/lib/cart";

function getUserInitials(firstName: string, lastName: string, email: string) {
  const initials = [firstName, lastName]
    .map((name) => name.trim().charAt(0))
    .filter(Boolean)
    .join("");

  return (initials || email.trim().charAt(0) || "U").toLocaleUpperCase("es");
}

export const TopMenu = async () => {
  const [user, cart] = await Promise.all([getSessionUser(), getCartSummary()]);
  const accountHref = user ? (isStaff(user) ? "/admin" : "/account") : "/auth/login";
  const accountLabel = user ? `Mi cuenta: ${user.firstName} ${user.lastName}` : "Iniciar sesión";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5">
        <Link href="/" className="text-xl font-black tracking-tight">
          Viccs<span className="text-blue-700">Auto</span>
        </Link>

        <div className="hidden sm:block">
          <Link className="m-2 rounded-md p-2 hover:bg-gray-100" href="/products">Autopartes</Link>
          <Link className="m-2 rounded-md p-2 hover:bg-gray-100" href="/category/frenos">Frenos</Link>
          <Link className="m-2 rounded-md p-2 hover:bg-gray-100" href="/vehicles">Vehículos</Link>
          <Link className="m-2 rounded-md p-2 hover:bg-gray-100" href="/#importacion-vehiculos">Importación</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/search" aria-label="Buscar">
            <IoSearchOutline className="h-5 w-5" />
          </Link>

          <Link
            href={accountHref}
            aria-label={accountLabel}
            title={accountLabel}
            className="group flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 lg:pr-3"
          >
            {user ? (
              <>
                <span className="relative" aria-hidden="true">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-blue-700 text-[11px] font-extrabold tracking-wide text-white ring-1 ring-slate-900/10">
                    {getUserInitials(user.firstName, user.lastName, user.email)}
                  </span>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </span>
                <span className="hidden min-w-0 leading-tight lg:block">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mi cuenta</span>
                  <span className="block max-w-24 truncate text-xs font-bold text-slate-800 group-hover:text-blue-800">
                    {user.firstName}
                  </span>
                </span>
              </>
            ) : (
              <>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition group-hover:bg-blue-100 group-hover:text-blue-700">
                  <IoPersonOutline className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="hidden text-xs font-bold text-slate-700 lg:block">Ingresar</span>
              </>
            )}
          </Link>

          <Link href="/cart" aria-label={`Carrito con ${cart.count} productos`} className="relative">
            <IoCartOutline className="h-5 w-5" />
            {cart.count > 0 && (
              <span className="absolute -right-3 -top-3 rounded-full bg-blue-700 px-1.5 text-xs font-bold text-white">
                {cart.count}
              </span>
            )}
          </Link>

          <a
            href={`https://wa.me/${siteConfig.whatsapp}`}
            aria-label="Contactar por WhatsApp"
            className="ml-1 hidden items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white lg:flex"
          >
            <IoLogoWhatsapp /> Cotizar
          </a>
        </div>
      </nav>
    </header>
  );
};
