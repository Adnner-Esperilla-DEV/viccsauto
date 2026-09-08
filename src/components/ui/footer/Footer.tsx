import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-20 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <p className="text-2xl font-black text-white">
            Viccs<span className="text-blue-400">Auto</span>
          </p>
          <p className="mt-3 max-w-sm text-sm">
            Repuestos correctos, vehículos seleccionados y asesoría antes de comprar.
          </p>
        </div>
        <div>
          <p className="font-bold text-white">Compra</p>
          <nav className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/products">Autopartes</Link>
            <Link href="/vehicles">Vehículos</Link>
            <Link href="/about">Nosotros</Link>
            <Link href="/contact">Contacto</Link>
          </nav>
        </div>
        <div>
          <p className="font-bold text-white">Ayuda y legal</p>
          <nav className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/warranty">Garantías</Link>
            <Link href="/returns">Cambios y devoluciones</Link>
            <Link href="/privacy">Privacidad</Link>
            <Link href="/terms">Términos</Link>
          </nav>
        </div>
        <div>
          <p className="font-bold text-white">Atención</p>
          <address className="mt-3 text-sm not-italic">
            <p>{siteConfig.address}</p>
            <p className="mt-2">{siteConfig.phone}</p>
            <p>{siteConfig.email}</p>
          </address>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-5 text-center text-xs">
        © {new Date().getFullYear()} ViccsAuto. Todos los derechos reservados.
      </div>
    </footer>
  );
}
