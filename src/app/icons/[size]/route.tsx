import { ImageResponse } from "next/og";
import { AppIconMark } from "@/components/app-icon";

const SIZES = new Set([180, 192, 512]);

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  return new ImageResponse(<AppIconMark size={size} />, { width: size, height: size });
}
