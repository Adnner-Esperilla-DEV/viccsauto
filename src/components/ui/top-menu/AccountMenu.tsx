"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { IoChevronDownOutline, IoLogOutOutline, IoPersonOutline } from "react-icons/io5";
import { logoutAction } from "@/app/actions/auth";

type AccountMenuProps = {
  accountHref: string;
  accountLabel: string;
  email: string;
  firstName: string;
  initials: string;
  lastName: string;
};

export function AccountMenu({
  accountHref,
  accountLabel,
  email,
  firstName,
  initials,
  lastName,
}: AccountMenuProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        menuRef.current.open = false;
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuRef.current) menuRef.current.open = false;
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <details ref={menuRef} className="group/account relative">
      <summary
        aria-label={accountLabel}
        title={accountLabel}
        className="group flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden lg:pr-3"
      >
        <span className="relative" aria-hidden="true">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-blue-700 text-[11px] font-extrabold tracking-wide text-white ring-1 ring-slate-900/10">
            {initials}
          </span>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <span className="hidden min-w-0 leading-tight lg:block">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Mi cuenta
          </span>
          <span className="block max-w-24 truncate text-xs font-bold text-slate-800 group-hover:text-blue-800">
            {firstName}
          </span>
        </span>
        <IoChevronDownOutline
          className="hidden h-3.5 w-3.5 text-slate-400 transition-transform group-open/account:rotate-180 lg:block"
          aria-hidden="true"
        />
      </summary>

      <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div className="border-b border-slate-100 px-4 py-4">
          <p className="truncate text-sm font-extrabold text-slate-900">
            {firstName} {lastName}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{email}</p>
        </div>

        <div className="p-2">
          <Link
            href={accountHref}
            onClick={closeMenu}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <IoPersonOutline className="h-5 w-5" aria-hidden="true" />
            Ver mi perfil
          </Link>
        </div>

        <form action={logoutAction} onSubmit={closeMenu} className="border-t border-slate-100 p-2">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <IoLogOutOutline className="h-5 w-5" aria-hidden="true" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </details>
  );
}
