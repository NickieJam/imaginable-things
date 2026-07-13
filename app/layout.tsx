import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Imaginable Things | Custom Apparel & Embroidery",
  description:
    "Custom embroidery, apparel, uniforms, drinkware and promotional products with personal service and no minimum orders.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
