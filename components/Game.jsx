"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { LEVELS } from "@/lib/levels";

const GRAVITY = 1800;
const MOVE_SPEED = 260;
const JUMP_VELOCITY = 700;
const PLAYER_W = 48;
const PLAYER_H = 48;
const VIEW_W = 900;
const VIEW_H = 500;

const SPRITE_PATHS = {
  player: "/sprites/pinkiepie.png",
  enemy: "/sprites/enemy.svg",
  coin: "/sprites/coin.svg",
};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export default function Game() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const keysRef = useRef({});
  const touchRef = useRef({ left: false, right: false, jump: false });
  const [levelIndex, setLevelIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [status, setStatus] = useState("ready");
  const [spriteVersion] = useState(0);
  const [scale, setScale] = useState(1);
  const [isTouch, setIsTouch] = useState(false);

  const gameStateRef = useRef(null);
  const imagesRef = useRef({});
  const rafRef = useRef(null);

  const level = LEVELS[levelIndex];

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  useEffect(() => {
    function handleResize() {
      const container = containerRef.current;
      if (!container) return;
      const maxW = Math.min(window.innerWidth - 24, VIEW_W);
      const s = maxW / VIEW_W;
      setScale(s);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        Object.entries(SPRITE_PATHS).map(async ([key, path]) => {
          const bust = `${path}?v=${spriteVersion}`;
          const img = await loadImage(bust);
          return [key, img];
        })
      );
      if (!cancelled) {
        const map = {};
        for (const [k, v] of entries) map[k] = v;
        imagesRef.current = map;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spriteVersion]);

  const resetLevel = useCallback(() => {
    const lvl = LEVELS[levelIndex];
    gameStateRef.current = {
      player: {
        x: lvl.playerStart.x,
        y: lvl.playerStart.y,
        vx: 0,
        vy: 0,
        w: PLAYER_W,
        h: PLAYER_H,
        onGround: false,
        facing: 1,
        invuln: 0,
      },
      coins: lvl.coins.map((c) => ({ ...c, taken: false })),
      enemies: lvl.enemies.map((e) => ({ ...e, dir: 1, x0: e.x })),
      camX: 0,
      time: 0,
    };
  }, [levelIndex]);

  useEffect(() => {
    resetLevel();
    setStatus("ready");
  }, [levelIndex, resetLevel]);

  function advanceOnAction() {
    if (status === "ready") setStatus("playing");
    if (status === "dead" || status === "gameover") {
      setLives(3);
      setScore(0);
      resetLevel();
      setStatus("playing");
    }
    if (status === "levelComplete") {
      const next = (levelIndex + 1) % LEVELS.length;
      setLevelIndex(next);
    }
  }

  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.code] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "Space" || e.code === "Enter") {
        advanceOnAction();
      }
    };
    const up = (e) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, levelIndex, resetLevel]);

  useEffect(() => {
    let lastTime = performance.now();

    function tick(now) {
      const dt = Math.min((now - lastTime) / 1000, 1 / 30);
      lastTime = now;

      if (status === "playing") {
        update(dt);
      }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, levelIndex]);

  function update(dt) {
    const gs = gameStateRef.current;
    if (!gs) return;
    const lvl = LEVELS[levelIndex];
    const p = gs.player;
    const keys = keysRef.current;
    const touch = touchRef.current;

    let move = 0;
    if (keys["ArrowLeft"] || keys["KeyA"] || touch.left) move -= 1;
    if (keys["ArrowRight"] || keys["KeyD"] || touch.right) move += 1;
    p.vx = move * MOVE_SPEED;
    if (move !== 0) p.facing = move;

    if ((keys["Space"] || keys["ArrowUp"] || keys["KeyW"] || touch.jump) && p.onGround) {
      p.vy = -JUMP_VELOCITY;
      p.onGround = false;
    }

    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < 0) p.x = 0;
    if (p.x + p.w > lvl.width) p.x = lvl.width - p.w;

    p.onGround = false;
    for (const plat of lvl.platforms) {
      const pRect = { x: p.x, y: p.y, w: p.w, h: p.h };
      const platRect = { x: plat.x, y: plat.y, w: plat.w, h: plat.h };
      if (rectsOverlap(pRect, platRect)) {
        const prevBottom = p.y + p.h - p.vy * dt;
        if (p.vy >= 0 && prevBottom <= plat.y + 1) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.onGround = true;
        } else if (p.vy < 0 && p.y - p.vy * dt >= plat.y + plat.h - 1) {
          p.y = plat.y + plat.h;
          p.vy = 0;
        } else if (p.vx > 0) {
          p.x = plat.x - p.w;
        } else if (p.vx < 0) {
          p.x = plat.x + plat.w;
        }
      }
    }

    if (p.y > lvl.height + 100) {
      loseLife();
      return;
    }

    if (p.invuln > 0) p.invuln -= dt;

    for (const e of gs.enemies) {
      e.x += e.dir * e.speed * dt;
      if (e.x < e.range[0]) {
        e.x = e.range[0];
        e.dir = 1;
      } else if (e.x + 32 > e.range[1]) {
        e.x = e.range[1] - 32;
        e.dir = -1;
      }
      const eRect = { x: e.x, y: e.y, w: 32, h: 32 };
      const pRect = { x: p.x, y: p.y, w: p.w, h: p.h };
      if (rectsOverlap(pRect, eRect) && p.invuln <= 0) {
        if (p.vy > 0 && p.y + p.h - eRect.h / 2 < eRect.y + 10) {
          e.range = [e.x, e.x];
          e.dead = true;
          p.vy = -JUMP_VELOCITY * 0.6;
          setScore((s) => s + 50);
        } else {
          loseLife();
          return;
        }
      }
    }
    gs.enemies = gs.enemies.filter((e) => !e.dead);

    for (const c of gs.coins) {
      if (c.taken) continue;
      const cRect = { x: c.x, y: c.y, w: 28, h: 28 };
      const pRect = { x: p.x, y: p.y, w: p.w, h: p.h };
      if (rectsOverlap(pRect, cRect)) {
        c.taken = true;
        setScore((s) => s + 10);
      }
    }

    const goalRect = { x: lvl.goal.x, y: lvl.goal.y, w: 40, h: 70 };
    const pRect = { x: p.x, y: p.y, w: p.w, h: p.h };
    if (rectsOverlap(pRect, goalRect)) {
      setStatus("levelComplete");
    }

    gs.camX = Math.max(0, Math.min(p.x - VIEW_W / 2, lvl.width - VIEW_W));
  }

  function loseLife() {
    setLives((l) => {
      const nl = l - 1;
      if (nl <= 0) {
        setStatus("gameover");
      } else {
        setStatus("dead");
      }
      return nl;
    });
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const gs = gameStateRef.current;
    const lvl = LEVELS[levelIndex];
    const imgs = imagesRef.current;

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, "#bfe9ff");
    sky.addColorStop(1, "#eaf9ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (!gs) return;
    const camX = gs.camX;

    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 400 - camX * 0.3) % (lvl.width + 400) + lvl.width + 400) % (lvl.width + 400);
      drawCloud(ctx, cx - camX * 0, 60 + (i % 3) * 40);
    }

    ctx.fillStyle = "#f8bbd0";
    ctx.strokeStyle = "#ec407a";
    ctx.lineWidth = 3;
    for (const plat of lvl.platforms) {
      const x = plat.x - camX;
      if (x + plat.w < 0 || x > VIEW_W) continue;
      ctx.fillRect(x, plat.y, plat.w, plat.h);
      ctx.strokeRect(x, plat.y, plat.w, plat.h);
    }

    for (const c of gs.coins) {
      if (c.taken) continue;
      const x = c.x - camX;
      if (x + 28 < 0 || x > VIEW_W) continue;
      if (imgs.coin) {
        ctx.drawImage(imgs.coin, x, c.y, 28, 28);
      } else {
        ctx.fillStyle = "gold";
        ctx.beginPath();
        ctx.arc(x + 14, c.y + 14, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const e of gs.enemies) {
      const x = e.x - camX;
      if (x + 32 < 0 || x > VIEW_W) continue;
      if (imgs.enemy) {
        ctx.drawImage(imgs.enemy, x, e.y, 32, 32);
      } else {
        ctx.fillStyle = "#8d6e63";
        ctx.fillRect(x, e.y, 32, 32);
      }
    }

    {
      const gx = lvl.goal.x - camX;
      ctx.fillStyle = "#66bb6a";
      ctx.fillRect(gx, lvl.goal.y, 8, 70);
      ctx.fillStyle = "#ffee58";
      ctx.beginPath();
      ctx.moveTo(gx + 8, lvl.goal.y);
      ctx.lineTo(gx + 40, lvl.goal.y + 12);
      ctx.lineTo(gx + 8, lvl.goal.y + 24);
      ctx.fill();
    }

    const p = gs.player;
    const px = p.x - camX;
    ctx.save();
    if (p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }
    if (imgs.player) {
      ctx.save();
      if (p.facing < 0) {
        ctx.translate(px + p.w, p.y);
        ctx.scale(-1, 1);
        ctx.drawImage(imgs.player, 0, 0, p.w, p.h);
      } else {
        ctx.drawImage(imgs.player, px, p.y, p.w, p.h);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = "#f78fb3";
      ctx.fillRect(px, p.y, p.w, p.h);
    }
    ctx.restore();
  }

  function drawCloud(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 22, y - 10, 24, 0, Math.PI * 2);
    ctx.arc(x + 46, y, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  function setTouchFlag(key, value) {
    touchRef.current[key] = value;
  }

  function handleCanvasTap() {
    if (status !== "playing") advanceOnAction();
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full px-2">
      <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-lg font-bold text-pink-700 flex-wrap justify-center">
        <span>⭐ {score}</span>
        <span>❤️ {lives}</span>
        <span>🎪 {level.name}</span>
      </div>

      <div
        ref={containerRef}
        className="relative border-4 border-pink-400 rounded-xl overflow-hidden shadow-lg"
        style={{ width: VIEW_W * scale, height: VIEW_H * scale }}
        onClick={handleCanvasTap}
      >
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          className="block bg-sky-100"
          style={{
            width: VIEW_W * scale,
            height: VIEW_H * scale,
          }}
        />

        {status !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white text-center p-4 sm:p-6">
            {status === "ready" && (
              <>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">{level.name}</h2>
                <p className="mb-4 text-sm sm:text-base">
                  {isTouch
                    ? "Usa los botones de abajo para moverte y saltar."
                    : "Flechas / A-D para moverte, Espacio o Arriba para saltar."}
                </p>
                <p className="text-pink-200 text-sm sm:text-base">
                  {isTouch ? "Toca la pantalla para empezar" : "Presiona Espacio para empezar"}
                </p>
              </>
            )}
            {status === "dead" && (
              <>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">¡Perdiste una vida!</h2>
                <p className="text-sm sm:text-base">
                  {isTouch ? "Toca la pantalla para continuar" : "Presiona Espacio para continuar"}
                </p>
              </>
            )}
            {status === "gameover" && (
              <>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Game Over</h2>
                <p className="mb-2 text-sm sm:text-base">Puntaje final: {score}</p>
                <p className="text-sm sm:text-base">
                  {isTouch ? "Toca la pantalla para reiniciar" : "Presiona Espacio para reiniciar"}
                </p>
              </>
            )}
            {status === "levelComplete" && (
              <>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">¡Nivel completado! 🎉</h2>
                <p className="mb-2 text-sm sm:text-base">Puntaje: {score}</p>
                <p className="text-sm sm:text-base">
                  {isTouch ? "Toca la pantalla para el siguiente nivel" : "Presiona Espacio para el siguiente nivel"}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {isTouch && (
        <div className="flex items-center justify-between w-full max-w-[900px] px-2 select-none">
          <div className="flex gap-3">
            <TouchButton
              label="◀"
              onDown={() => setTouchFlag("left", true)}
              onUp={() => setTouchFlag("left", false)}
            />
            <TouchButton
              label="▶"
              onDown={() => setTouchFlag("right", true)}
              onUp={() => setTouchFlag("right", false)}
            />
          </div>
          <TouchButton
            label="⤴"
            big
            onDown={() => setTouchFlag("jump", true)}
            onUp={() => setTouchFlag("jump", false)}
          />
        </div>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        {LEVELS.map((l, i) => (
          <button
            key={l.name}
            onClick={() => setLevelIndex(i)}
            className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border ${
              i === levelIndex
                ? "bg-pink-500 text-white border-pink-500"
                : "bg-white text-pink-600 border-pink-300"
            }`}
          >
            {i + 1}. {l.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function TouchButton({ label, onDown, onUp, big }) {
  const size = big ? "w-20 h-20 text-3xl" : "w-16 h-16 text-2xl";
  return (
    <button
      className={`${size} rounded-full bg-pink-500 text-white font-bold shadow-md active:bg-pink-600 flex items-center justify-center touch-none`}
      onTouchStart={(e) => {
        e.preventDefault();
        onDown();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onUp();
      }}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >
      {label}
    </button>
  );
}