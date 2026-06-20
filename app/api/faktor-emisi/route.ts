//app/api/faktor-emisi/route.ts
import { NextResponse } from "next/server";
import { ACTIVITY_OPTIONS } from "@/app/constants/activities";

export async function GET() {
  // Mengembalikan data terstruktur dari activities.ts Anda
  return NextResponse.json(ACTIVITY_OPTIONS);
}