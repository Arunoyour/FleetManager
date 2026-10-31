import { ImageResponse } from "next/og";
import { AppIconMark } from "@/components/app-icon";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<AppIconMark size={64} />, size);
}
