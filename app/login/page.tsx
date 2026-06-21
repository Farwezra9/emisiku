"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { CheckCircle, X } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // Efek otomatis mengalihkan halaman ke dashboard setelah modal sukses terbuka
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        setIsModalOpen(false);
        router.push("/dashboard"); 
      }, 2500); // Ditambah sedikit ke 2.5 detik agar user sempat membaca modal yang besar
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-gray-800">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-emerald-800">Selamat Datang</h2>
          <p className="text-gray-500 mt-1">Login ke Carbon Calculation System</p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-800"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-800"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition shadow-md disabled:bg-emerald-400"
          >
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Belum punya akun?{" "}
          <Link href="/register" className="text-emerald-600 font-semibold hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>

      {/* ====================================================== */}
      {/* MODAL DIALOG BERHASIL LOGIN (UKURAN BESAR / PROPORSIONAL) */}
      {/* ====================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-[2px]">
          {/* Lebar modal diubah ke max-w-lg dan padding diubah ke p-8 */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full text-center space-y-5 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Tombol Close Manual Pojok Kanan Atas */}
            <button 
              onClick={() => { setIsModalOpen(false); router.push("/dashboard"); }}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition"
            >
              <X size={20} />
            </button>

            {/* Ikon Animasi Checklist Skala Besar */}
            <div className="flex justify-center pt-2">
              <div className="p-4 bg-emerald-50 rounded-full">
                <CheckCircle className="text-emerald-500" size={64} />
              </div>
            </div>

            {/* Pesan Teks (Judul text-xl & Keterangan text-sm) */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">Login Berhasil!</h3>
              <p className="text-sm text-gray-500 leading-relaxed px-6">
                Autentikasi Anda sukses. Selamat datang kembali, sistem sedang menyiapkan ruang kerja dashboard emisi Anda.
              </p>
            </div>

            {/* Indikator Loading Mini */}
            <div className="pt-3 text-xs text-gray-400 flex items-center justify-center gap-2.5">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Mengarahkan ke dashboard utama...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}