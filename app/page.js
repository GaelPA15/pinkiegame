import Game from "@/components/Game";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-100 via-white to-pink-50 flex flex-col items-center py-10 px-4">
      <h1 className="text-4xl font-extrabold text-pink-600 mb-1 tracking-tight">
        Pinkiegame para Valeria❤️
      </h1>
      <p className="text-pink-400 mb-6 text-sm">
        Un juego hecho para la mujer mas hermosa.
      </p>
      <Game />
    </div>
  );
}
