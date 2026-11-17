// Simpan sebagai: app/page.tsx
import Link from "next/link";
import { NatureBackdrop } from "@/app/components/nature-backdrop";

const display = "font-[family-name:var(--font-display)]";

const scopes = [
  {
    label: "Scope 1",
    text: "Emisi langsung dari sumber milik sendiri, seperti kendaraan operasional dan genset.",
  },
  {
    label: "Scope 2",
    text: "Emisi tidak langsung dari energi yang dibeli, terutama listrik.",
  },
  {
    label: "Scope 3",
    text: "Emisi dari rantai nilai: perjalanan dinas, pengadaan, dan limbah.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#081c15] text-stone-100">
      <NatureBackdrop />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-100">
            <img src="/emisiku.svg" alt="" className="h-6 w-6" />
          </span>
          <span className={`${display} text-xl font-semibold tracking-tight`}>
            Emisiku
          </span>
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-stone-200 underline-offset-4 hover:text-white hover:underline"
        >
          Masuk
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-16 pt-8 sm:px-8">
        <p className="mb-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-emerald-200/80">
          <span className="h-px w-10 bg-emerald-200/60" />
          Perhitungan emisi gas rumah kaca
        </p>

        <h1
          className={`${display} max-w-3xl text-4xl font-medium leading-[1.1] tracking-tight text-stone-50 sm:text-5xl lg:text-6xl`}
        >
          Catat aktivitas, hitung emisi, dan pahami jejak karbon Anda.
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-300 sm:text-lg">
          Emisiku menghitung dan mengelompokkan emisi Scope 1, 2, dan 3 secara
          otomatis, lengkap dengan laporan yang bisa langsung ditindaklanjuti.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-md bg-stone-100 px-7 py-3 text-center text-sm font-semibold text-emerald-950 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#081c15]"
          >
            Masuk ke dashboard
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-stone-400/50 px-7 py-3 text-center text-sm font-semibold text-stone-100 transition-colors hover:border-stone-200 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#081c15]"
          >
            Buat akun
          </Link>
        </div>

        <dl className="mt-16 grid gap-8 border-t border-white/15 pt-6 sm:grid-cols-3 sm:gap-10">
          {scopes.map((s) => (
            <div key={s.label}>
              <dt
                className={`${display} text-lg font-medium text-emerald-100`}
              >
                {s.label}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-stone-300">
                {s.text}
              </dd>
            </div>
          ))}
        </dl>
      </main>

      <footer className="relative z-10 px-6 pb-6 text-xs text-stone-400 sm:px-8">
        <div className="mx-auto max-w-6xl">
          &copy; {new Date().getFullYear()} Emisiku
        </div>
      </footer>
    </div>
  );
}