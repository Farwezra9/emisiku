// Simpan sebagai: app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { NatureBackdrop } from "@/app/components/nature-backdrop";
import { CheckCircle, Eye, EyeOff, X } from "lucide-react";

const display = "font-[family-name:var(--font-display)]";

function translateError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "Email atau password salah.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Email Anda belum dikonfirmasi. Periksa kotak masuk Anda.";
  }
  return message;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // Setelah login sukses, arahkan otomatis ke dashboard
  useEffect(() => {
    if (!isModalOpen) return;
    const timer = setTimeout(() => {
      setIsModalOpen(false);
      router.push("/dashboard");
    }, 2000);
    return () => clearTimeout(timer);
  }, [isModalOpen, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(translateError(signInError.message));
      } else {
        setIsModalOpen(true);
      }
    } catch {
      // Terjadi saat "Failed to fetch": server Supabase tidak terjangkau
      setError(
        "Tidak dapat terhubung ke server autentikasi. Periksa koneksi internet Anda, lalu coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";

  return (
    <div className="relative min-h-screen bg-[#081c15] lg:grid lg:grid-cols-2">
      {/* Latar untuk layar kecil */}
      <div className="absolute inset-0 lg:hidden">
        <NatureBackdrop />
      </div>

      {/* Panel ilustrasi (desktop) */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <NatureBackdrop />
        <Link href="/" className="relative z-10 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-100">
            <img src="/emisiku.svg" alt="" className="h-6 w-6" />
          </span>
          <span
            className={`${display} text-xl font-semibold tracking-tight text-stone-50`}
          >
            Emisiku
          </span>
        </Link>

        <div className="relative z-10 max-w-md">
          <p
            className={`${display} text-3xl font-medium leading-snug text-stone-50`}
          >
            Angka emisi yang tercatat dengan baik adalah dasar keputusan yang
            lebih bijak.
          </p>
          <p className="mt-4 text-sm text-stone-300">
            Carbon Calculation System
          </p>
        </div>
      </aside>

      {/* Panel form */}
      <main className="relative flex min-h-screen items-center justify-center px-4 py-10 lg:bg-[#f6f4ee] lg:px-12">
        <div className="w-full max-w-sm rounded-lg bg-[#f6f4ee] p-7 shadow-xl sm:p-8 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
          <Link
            href="/"
            className="mb-8 flex items-center gap-3 lg:hidden"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-950">
              <img src="/emisiku.svg" alt="" className="h-6 w-6" />
            </span>
            <span
              className={`${display} text-xl font-semibold tracking-tight text-emerald-950`}
            >
              Emisiku
            </span>
          </Link>

          <h1
            className={`${display} text-3xl font-medium tracking-tight text-emerald-950`}
          >
            Masuk
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Gunakan akun Anda untuk melanjutkan ke dashboard emisi.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-stone-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-stone-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className={`${inputClass} pr-11`}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-stone-500 hover:text-stone-800"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-900/60"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {loading ? "Memverifikasi..." : "Masuk"}
            </button>
          </form>

          <p className="mt-8 text-sm text-stone-600">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-900 underline-offset-4 hover:underline"
            >
              Daftar di sini
            </Link>
          </p>
        </div>
      </main>

      {/* Dialog login berhasil */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-success-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/60 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-sm rounded-lg bg-[#f6f4ee] p-8 text-center shadow-2xl">
            <button
              type="button"
              aria-label="Tutup dan ke dashboard"
              onClick={() => {
                setIsModalOpen(false);
                router.push("/dashboard");
              }}
              className="absolute right-3 top-3 rounded-md p-1.5 text-stone-400 transition hover:bg-stone-200/60 hover:text-stone-700"
            >
              <X size={18} />
            </button>

            <CheckCircle
              className="mx-auto text-emerald-700"
              size={48}
              strokeWidth={1.5}
            />

            <h3
              id="login-success-title"
              className={`${display} mt-4 text-2xl font-medium text-emerald-950`}
            >
              Berhasil masuk
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Selamat datang kembali. Kami sedang menyiapkan dashboard emisi
              Anda.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2.5 text-xs text-stone-500">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
              Mengarahkan ke dashboard...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}