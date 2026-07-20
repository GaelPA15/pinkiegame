# Pony Platformer 🎈

Juego de plataformas estilo Mario hecho con Next.js (App Router) + Tailwind + Canvas.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Controles

- Flechas o A/D: moverte
- Espacio, Arriba o W: saltar
- Salta sobre los enemigos para eliminarlos
- Junta monedas y llega a la bandera para pasar de nivel

## Poner tu propio personaje

El juego carga el sprite del jugador desde:

```
public/sprites/player.svg
```

Para usar tu propia imagen:

1. Pon tu archivo (png, jpg o svg) dentro de `public/sprites/`, por ejemplo `public/sprites/player.png`.
2. Abre `components/Game.jsx` y cambia esta línea cerca del inicio del archivo:

```js
const SPRITE_PATHS = {
  player: "/sprites/player.svg", // <-- cambia esto por "/sprites/player.png" o tu archivo
  enemy: "/sprites/enemy.svg",
  coin: "/sprites/coin.svg",
};
```

3. Guarda y recarga. Listo, tu personaje ya se ve en el juego.

También puedes reemplazar `enemy.svg` y `coin.svg` de la misma forma para personalizar enemigos y monedas.

## Estructura

- `app/page.js` — página principal
- `components/Game.jsx` — motor del juego (física, colisiones, render en canvas)
- `lib/levels.js` — datos de los 3 niveles (plataformas, monedas, enemigos, meta)
- `public/sprites/` — imágenes de personaje, enemigo y moneda

## Notas

- El motor detecta colisiones AABB simples, salto tipo Mario (saltar sobre enemigos los elimina), cámara con scroll horizontal, y 3 vidas.
- Para agregar más niveles, agrega un objeto nuevo al arreglo `LEVELS` en `lib/levels.js` siguiendo el mismo formato.
- Si tu imagen no es cuadrada, ajusta `PLAYER_W` / `PLAYER_H` en `components/Game.jsx` para que no se vea deformada.
