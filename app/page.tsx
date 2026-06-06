import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50/30 text-gray-800 overflow-hidden px-4 sm:px-6">
      
      {/* Efek Dekorasi Latar Belakang (Blob Minimalis) */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-emerald-200/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-200/20 blur-3xl pointer-events-none" />

      {/* Konten Utama */}
      <div className="relative z-10 text-center max-w-2xl mx-auto flex flex-col items-center">
        
        {/* Badge Info Kecil */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-6 text-xs font-medium text-emerald-800 bg-emerald-100/80 backdrop-blur-sm rounded-full border border-emerald-200/50 shadow-sm animate-fade-in">
          🌱 Next-Gen GHG Accounting
        </span>

        {/* Judul Utama yang Responsif */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-4 leading-tight sm:leading-none">
          Carbon <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Intelligence</span> System
        </h1>
        
        {/* Deskripsi */}
        <p className="text-base sm:text-lg md:text-xl text-gray-500 max-w-xl mb-8 leading-relaxed px-2">
          Hitung, lacak, dan kategorisasi emisi GRK (*Scope 1, 2, & 3*) perusahaan Anda secara otomatis dan akurat dalam satu platform cerdas.
        </p>
        
        {/* Tombol Aksi yang Responsif (Menumpuk di HP, Berjejer di Desktop) */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
          <Link 
            href="/login" 
            className="w-full sm:w-auto text-center px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Masuk ke Dashboard
          </Link>
          <Link 
            href="/register" 
            className="w-full sm:w-auto text-center px-8 py-3.5 bg-white text-slate-700 border border-slate-200 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Daftar Akun Baru
          </Link>
        </div>

      </div>

      {/* Footer / Copyright teks tipis di bawah */}
      <div className="absolute bottom-6 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} AKUUUUUUUUUUUUUUUUUU
      </div>
    </div>
  );
}