import "./globals.css";

export const metadata = {
  title: "Pinkie gameee",
  description: "Un juego de plataformas hecho con Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
