import type { Metadata } from "next";
import Link from "next/link";
import {
  IoArrowBackOutline,
  IoCarSportOutline,
  IoCheckmarkCircleOutline,
  IoLockClosedOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a tu cuenta de ViccsAuto para revisar pedidos y datos de compra.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden border-r border-slate-100 bg-white px-12 py-12 lg:flex lg:flex-col xl:px-16 xl:py-14">
          <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-blue-50 blur-3xl" aria-hidden="true" />
          <div className="absolute -right-28 bottom-0 h-96 w-96 rounded-full bg-sky-50 blur-3xl" aria-hidden="true" />

          <Link
            href="/"
            className="relative inline-flex w-fit items-center gap-2 text-2xl font-black tracking-tight text-slate-950"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-700/20">
              <IoCarSportOutline className="h-6 w-6" aria-hidden="true" />
            </span>
            Viccs<span className="-ml-2 text-blue-700">Auto</span>
          </Link>

          <div className="relative my-auto max-w-lg py-16">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-700">
              Tu vehículo, siempre en marcha
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight text-slate-950 xl:text-6xl">
              Todo lo que necesitas, en un solo lugar.
            </h1>
            <p className="mt-6 max-w-md text-lg font-normal leading-8 text-slate-500">
              Ingresa para seguir tus compras, guardar tus datos y encontrar más rápido el repuesto correcto.
            </p>

            <ul className="mt-10 space-y-4" aria-label="Beneficios de tu cuenta">
              {[
                "Consulta el estado de tus pedidos",
                "Revisa tu historial de compras",
                "Compra de forma rápida y segura",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <IoCheckmarkCircleOutline className="h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center gap-3 border-t border-slate-100 pt-7 text-sm text-slate-500">
            <IoShieldCheckmarkOutline className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <span>Acceso protegido y datos tratados de forma segura.</span>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-[480px]">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-slate-950"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-white">
                  <IoCarSportOutline className="h-6 w-6" aria-hidden="true" />
                </span>
                Viccs<span className="-ml-2 text-blue-700">Auto</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
              >
                <IoArrowBackOutline aria-hidden="true" /> Inicio
              </Link>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-10">
              <div className="mb-8">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <IoLockClosedOutline className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Mi cuenta</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Bienvenido de vuelta
                </h2>
                <p className="mt-3 font-normal leading-6 text-slate-500">
                  Ingresa tus datos para continuar a tu cuenta.
                </p>
              </div>

              <LoginForm hasError={Boolean(error)} />

              <p className="mt-8 text-center text-sm font-normal text-slate-500">
                ¿Aún no tienes cuenta?{" "}
                <Link href="/auth/new-account" className="font-bold text-blue-700 underline-offset-4 hover:underline">
                  Crear cuenta
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs font-normal text-slate-400">
              Al ingresar aceptas nuestros{" "}
              <Link href="/terms" className="underline underline-offset-2 hover:text-slate-600">
                términos de uso
              </Link>
              {" y "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-600">
                política de privacidad
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
