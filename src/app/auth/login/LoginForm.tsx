"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  IoAlertCircleOutline,
  IoEyeOffOutline,
  IoEyeOutline,
  IoLockClosedOutline,
  IoMailOutline,
} from "react-icons/io5";

import { loginAction } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 flex w-full items-center justify-center rounded-2xl bg-blue-700 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-blue-700/30 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70"
    >
      {pending ? (
        <>
          <span
            className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
          Ingresando...
        </>
      ) : (
        "Iniciar sesión"
      )}
    </button>
  );
}

export function LoginForm({ hasError }: { hasError: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const inputStyles =
    "peer mt-2 w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-normal text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <form action={loginAction} className="space-y-5">
      {hasError && (
        <div
          role="alert"
          aria-live="polite"
          className="flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
        >
          <IoAlertCircleOutline className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold text-red-800">No pudimos iniciar sesión</p>
            <p className="mt-1 font-normal text-red-700">Revisa tu correo y contraseña e inténtalo nuevamente.</p>
          </div>
        </div>
      )}

      <label className="block text-sm font-bold text-slate-700" htmlFor="email">
        Correo electrónico
        <span className="relative block">
          <IoMailOutline
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 peer-focus:text-blue-600"
            aria-hidden="true"
          />
          <input
            id="email"
            required
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="tu@correo.com"
            className={inputStyles}
          />
        </span>
      </label>

      <div>
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm font-bold text-slate-700" htmlFor="password">
            Contraseña
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-bold text-blue-700 underline-offset-4 hover:underline"
          >
            ¿La olvidaste?
          </Link>
        </div>
        <span className="relative block">
          <IoLockClosedOutline
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="password"
            required
            minLength={8}
            maxLength={128}
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            placeholder="Mínimo 8 caracteres"
            className={`${inputStyles} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
          >
            {showPassword ? <IoEyeOffOutline className="h-5 w-5" /> : <IoEyeOutline className="h-5 w-5" />}
          </button>
        </span>
      </div>

      <SubmitButton />
    </form>
  );
}
