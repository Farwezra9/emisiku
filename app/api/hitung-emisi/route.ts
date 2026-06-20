import { NextResponse } from "next/server";
import { prosesPerhitungan, InputRow } from "@/app/utils/carbonCalc";
import { ReferenceKey } from "@/app/constants/activities";

interface RequestBody {
  payload: InputRow[];
  reference?: ReferenceKey;
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const reference: ReferenceKey = body.reference || "ESDM";

    const hasil = prosesPerhitungan(body.payload, reference);
    return NextResponse.json(hasil);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || "Terjadi kesalahan server" },
      { status: 400 }
    );
  }
}