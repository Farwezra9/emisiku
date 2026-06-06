import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800">
      <h1 className="text-4xl font-extrabold text-emerald-800 mb-2">Carbon Intelligence System</h1>
      <p className="text-gray-500 mb-6">Hitung dan kategorisasi emisi GRK perusahaan secara otomatis.</p>
      
      <div className="flex gap-4">
        <Link href="/login" className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition shadow-md">
          Masuk (Login)
        </Link>
        <Link href="/register" className="px-6 py-3 bg-white text-emerald-600 border border-emerald-600 font-semibold rounded-xl hover:bg-emerald-50 transition shadow-md">
          Daftar Akun
        </Link>
      </div>
    </div>
  );
}