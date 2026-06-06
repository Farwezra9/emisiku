import { NextResponse } from "next/server";
import { prosesPerhitungan, InputRow } from "@/app/utils/carbonCalc";

export async function POST(request: Request) {
  try {
    const body: InputRow[] = await request.json();
    const hasil = prosesPerhitungan(body);
    return NextResponse.json(hasil);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}