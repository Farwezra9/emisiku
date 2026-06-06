"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { CheckCircle, X } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // Efek otomatis mengalihkan halaman ke login jika modal sukses terbuka
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        setIsModalOpen(false);
        router.push("/login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Mendaftarkan user ke Supabase Auth dengan menyertakan metadata nama lengkap
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else if (data?.user) {
      // Pemicu munculnya modal sukses
      setIsModalOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-gray-800">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-emerald-800">Daftar Akun</h2>
          <p className="text-gray-500 mt-1">Mulai kelola kalkulasi emisi karbon Anda</p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-800"
              placeholder="Masukkan nama lengkap Anda"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-800"
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
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-800"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition shadow-md disabled:bg-emerald-400"
          >
            {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-emerald-600 font-semibold hover:underline">
            Login di sini
          </Link>
        </p>
      </div>

      {/* ====================================================== */}
      {/* MODAL DIALOG BERHASIL REGISTRASI                       */}
      {/* ====================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-[2px]">
         <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full text-center space-y-5 border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Tombol Close Manual */}
            <button 
              onClick={() => { setIsModalOpen(false); router.push("/login"); }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition"
            >
              <X size={18} />
            </button>

            {/* Ikon Animasi Checklist */}
            <div className="flex justify-center pt-2">
              <div className="p-3 bg-emerald-50 rounded-full">
                <CheckCircle className="text-emerald-500" size={56} />
              </div>
            </div>

            {/* Pesan Teks */}
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">Registrasi Berhasil!</h3>
              <p className="text-sm text-gray-500 leading-relaxed px-2">
                Akun Anda telah sukses didaftarkan. Silakan periksa email untuk konfirmasi atau tunggu pengalihan otomatis.
              </p>
            </div>

            {/* Indikator Loading Mini */}
            <div className="pt-2 text-xs text-gray-400 flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              Mengalihkan ke halaman login...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}