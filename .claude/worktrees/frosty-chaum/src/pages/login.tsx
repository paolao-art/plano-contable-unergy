import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import Image from "next/image";
import logo from "../../public/logo.png";
import { sileo } from "sileo";

export default function Login() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        sileo.success({ title: "Bienvenido", description: "Acceso concedido." });
        router.push("/");
      } else {
        sileo.error({ title: "Error de acceso", description: data.error || "Fallo en la autenticación" });
      }
    } catch (err) {
      sileo.error({ title: "Error", description: "Ocurrió un problema técnico." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-6 transition-colors`}>
      <Head>
        <title>Login - Sun Money</title>
      </Head>

      {/* Decorative background */}
      <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/40 dark:border-zinc-800/50 shadow-2xl p-10 space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex mb-2">
            <Image src={logo} alt="Unergy" width={64} height={64} />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Unergy Panel</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Ingresa la contraseña para acceder a los datos</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña de acceso"
                className="w-full bg-white dark:bg-zinc-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Entrar al Inicio
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400">Acceso restringido • Unergy 2026</p>
        </div>
      </div>
    </div>
  );
}
