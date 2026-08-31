import { requestPasswordResetAction } from "@/app/actions/auth";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6"><p className="font-bold uppercase tracking-widest text-blue-700">Seguridad</p><h1 className="mt-2 text-4xl font-black">Recuperar contraseña</h1><p className="mt-4 text-slate-600">Si existe una cuenta, enviaremos instrucciones al correo indicado.</p>{sent ? <p className="mt-6 rounded-2xl bg-emerald-50 p-4 text-emerald-800">Solicitud recibida. Revisa tu correo.</p> : <form action={requestPasswordResetAction} className="mt-7 space-y-4"><label className="block text-sm font-bold">Correo<input required type="email" name="email" className="mt-2 w-full rounded-2xl border p-3 font-normal" /></label><button className="w-full rounded-full bg-blue-700 px-6 py-3 font-bold text-white">Enviar instrucciones</button></form>}</main>;
}
