import Game from "@/components/Game";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-100 via-white to-pink-50 flex flex-col items-center py-6 sm:py-10 px-2">
      <h1 className="text-2xl sm:text-4xl font-extrabold text-pink-600 mb-1 tracking-tight text-center">
        Pinkie game para Valeria❤️
      </h1>
      <p className="text-pink-400 mb-4 sm:mb-6 text-xs sm:text-sm text-center">
        Un juego hecho para la mas hernosa.
      </p>
      <Game />
    </div>
  );
}