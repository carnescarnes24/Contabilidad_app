import { NextResponse } from "next/server";

export async function GET() {
  // En Vercel, esta variable cambia con cada despliegue
  const version = process.env.VERCEL_DEPLOYMENT_ID || "dev";
  return NextResponse.json({ version });
}