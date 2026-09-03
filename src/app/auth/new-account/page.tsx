import Link from "next/link";

import { NewAccountForm } from "./NewAccountForm";

export default async function NewAccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <p className="font-bold uppercase tracking-widest text-blue-700">Mi cuenta</p>
      <h1 className="mt-2 text-4xl font-black">Crear cuenta</h1>
      <p className="mt-4 text-slate-600">Guarda tus datos y consulta el estado de tus pedidos.</p>
      <NewAccountForm error={error} />
      <Link href="/auth/login" className="mt-5 text-center text-sm font-bold text-blue-700">Ya tengo cuenta</Link>
    </main>
  );
}
