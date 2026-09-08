"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { IoAlertCircleOutline, IoEyeOffOutline, IoEyeOutline, IoLockClosedOutline } from "react-icons/io5";

import { registerAction } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-blue-700 px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-70 sm:col-span-2"
    >
      {pending ? "Creando cuenta..." : "Crear mi cuenta"}
    </button>
  );
}

function PasswordField({
  id,
  label,
  name,
  visible,
  onToggle,
  onChange,
  inputRef,
}: {
  id: string;
  label: string;
  name: "password" | "confirmPassword";
  visible: boolean;
  onToggle: () => void;
  onChange?: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <label className="text-sm font-bold text-slate-700 sm:col-span-2" htmlFor={id}>
      {label}
      <span className="relative mt-2 block">
        <IoLockClosedOutline
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={id}
          required
          type={visible ? "text" : "password"}
          minLength={8}
          maxLength={128}
          name={name}
          autoComplete="new-password"
          placeholder={name === "password" ? "Mínimo 8 caracteres" : "Escribe la misma contraseña"}
          onChange={(event) => onChange?.(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 font-normal outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <IoEyeOffOutline className="h-5 w-5" /> : <IoEyeOutline className="h-5 w-5" />}
        </button>
      </span>
    </label>
  );
}

export function NewAccountForm({ error }: { error?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const confirmationRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    confirmationRef.current?.setCustomValidity(
      confirmation && confirmation !== password ? "Las contraseñas no coinciden." : "",
    );
  }, [confirmation, password]);

  const inputStyles =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3.5 font-normal outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
  const errorMessage =
    error === "password-match"
      ? "Las contraseñas no coinciden. Escríbelas nuevamente."
      : "No pudimos crear la cuenta. Revisa los datos o utiliza otro correo.";

  return (
    <form action={registerAction} className="mt-7 grid gap-4 sm:grid-cols-2">
      {error && (
        <div
          role="alert"
          className="flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 sm:col-span-2"
        >
          <IoAlertCircleOutline className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      )}

      <label className="text-sm font-bold text-slate-700">
        Nombre
        <input
          required
          name="firstName"
          minLength={2}
          maxLength={60}
          autoComplete="given-name"
          className={inputStyles}
        />
      </label>
      <label className="text-sm font-bold text-slate-700">
        Apellido
        <input
          required
          name="lastName"
          minLength={2}
          maxLength={60}
          autoComplete="family-name"
          className={inputStyles}
        />
      </label>
      <label className="text-sm font-bold text-slate-700 sm:col-span-2">
        Correo
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          className={inputStyles}
        />
      </label>
      <label className="text-sm font-bold text-slate-700 sm:col-span-2">
        Teléfono
        <input name="phone" maxLength={30} autoComplete="tel" inputMode="tel" className={inputStyles} />
      </label>

      <PasswordField
        id="new-password"
        label="Contraseña"
        name="password"
        visible={showPassword}
        onToggle={() => setShowPassword((visible) => !visible)}
        onChange={setPassword}
      />
      <PasswordField
        id="confirm-password"
        label="Repetir contraseña"
        name="confirmPassword"
        visible={showConfirmation}
        onToggle={() => setShowConfirmation((visible) => !visible)}
        onChange={setConfirmation}
        inputRef={confirmationRef}
      />

      <SubmitButton />
    </form>
  );
}
