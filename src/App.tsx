import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Heart, Flag as FlagIcon } from 'lucide-react';

// --- Configuration ---
const WORLD_W = 8600;
const THEME = {
  skyLight: '#7DD3FC',
  skyMid: '#BAE6FD',
  sunset: '#FEF9C3',
  grassMain: '#4ADE80',
  grassDark: '#22C55E',
  dirtMain: '#A16207',
  popcorn: '#FDE047',
  popcornDark: '#854D0E',
  jelly: '#D946EF',
  jellyDark: '#701A75',
  platform: '#F97316',
  platformDark: '#C2410C',
  platformShadow: '#9A3412',
  starMain: '#FACC15',
};

type GameState = 'playing' | 'won' | 'lost';

interface Entity {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [message, setMessage] = useState('');

  const gameRef = useRef({
    cameraX: 0,
    keys: new Set<string>(),
    player: {
      x: 160,
      y: 700,
      w: 76,
      h: 96,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      invincible: 0,
    },
    platforms: [
      { x: 0, y: 930, w: 1520, h: 400, color: THEME.grassMain },
      { x: 1700, y: 930, w: 1200, h: 400, color: THEME.grassMain },
      { x: 3140, y: 930, w: 1560, h: 400, color: THEME.grassMain },
      { x: 4920, y: 930, w: 1260, h: 400, color: THEME.grassMain },
      { x: 6400, y: 930, w: 2200, h: 400, color: THEME.grassMain },

      { x: 640, y: 720, w: 320, h: 52, color: THEME.platform },
      { x: 1220, y: 600, w: 320, h: 52, color: THEME.platform },
      { x: 1940, y: 710, w: 360, h: 52, color: THEME.platform },
      { x: 2480, y: 570, w: 320, h: 52, color: THEME.platform },
      { x: 3360, y: 710, w: 360, h: 52, color: THEME.platform },
      { x: 3920, y: 610, w: 380, h: 52, color: THEME.platform },
      { x: 5100, y: 700, w: 380, h: 52, color: THEME.platform },
      { x: 5700, y: 590, w: 340, h: 52, color: THEME.platform },
      { x: 6600, y: 720, w: 340, h: 52, color: THEME.platform },
      { x: 7160, y: 620, w: 320, h: 52, color: THEME.platform }
    ],
    stars: [
      { x: 730, y: 640, got: false },
      { x: 1320, y: 520, got: false },
      { x: 2060, y: 630, got: false },
      { x: 2600, y: 490, got: false },
      { x: 3480, y: 630, got: false },
      { x: 4040, y: 530, got: false },
      { x: 4520, y: 840, got: false },
      { x: 5240, y: 620, got: false },
      { x: 5820, y: 510, got: false },
      { x: 6720, y: 640, got: false },
      { x: 7280, y: 540, got: false },
      { x: 7960, y: 840, got: false }
    ],
    enemies: [
      { x: 1040, y: 850, w: 84, h: 68, vx: 2.2, min: 440, max: 1400, alive: true },
      { x: 2080, y: 850, w: 84, h: 68, vx: 2.5, min: 1740, max: 2780, alive: true },
      { x: 3600, y: 850, w: 84, h: 68, vx: 2.7, min: 3180, max: 4560, alive: true },
      { x: 5400, y: 850, w: 84, h: 68, vx: 2.8, min: 4960, max: 6080, alive: true },
      { x: 6900, y: 850, w: 84, h: 68, vx: 2.7, min: 6440, max: 8400, alive: true }
    ],
    flag: { x: 8220, y: 510, w: 72, h: 420 },
    clouds: Array.from({ length: 15 }, (_, i) => ({
      x: i * 330 + Math.random() * 120,
      y: 45 + Math.random() * 115,
      s: 0.7 + Math.random() * 0.7
    })),
    hills: Array.from({ length: 12 }, (_, i) => ({
      x: i * 420,
      y: 430,
      w: 260 + Math.random() * 90,
      h: 110 + Math.random() * 70
    })),
    score: 0,
    lives: 3,
    gameState: 'playing' as GameState,
  });

  const resetGame = (full = true) => {
    const g = gameRef.current;
    g.player.x = 160;
    g.player.y = 700;
    g.player.vx = 0;
    g.player.vy = 0;
    g.player.onGround = false;
    g.player.facing = 1;
    g.player.invincible = 0;
    g.cameraX = 0;
    g.gameState = 'playing';
    setGameState('playing');
    setMessage('');
    if (full) {
      g.score = 0;
      g.lives = 3;
      setScore(0);
      setLives(3);
      g.stars.forEach(star => star.got = false);
      g.enemies.forEach(enemy => enemy.alive = true);
    }
  };

  const loseLife = () => {
    const g = gameRef.current;
    if (g.player.invincible > 0 || g.gameState !== 'playing') return;
    g.lives--;
    setLives(g.lives);
    g.player.invincible = 90;
    if (g.lives <= 0) {
      g.gameState = 'lost';
      setGameState('lost');
      setMessage('Ops! Aperte R para brincar de novo 💛');
    } else {
      g.player.y = 300;
      g.player.vy = -5;
    }
  };

  const rectsOverlap = (a: Entity, b: Entity) => {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const handleKeyDown = (e: KeyboardEvent) => {
      gameRef.current.keys.add(e.key);
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (e.key.toLowerCase() === 'r') resetGame(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => gameRef.current.keys.delete(e.key);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const update = () => {
      const g = gameRef.current;
      if (g.gameState !== 'playing') return;

      const currentW = canvas.width;
      const currentH = canvas.height;
      const groundY = currentH * 0.86;

      const keys = g.keys;
      const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
      const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
      const jump = keys.has(' ') || keys.has('ArrowUp') || keys.has('w') || keys.has('W');

      if (left) { g.player.vx = -8.6; g.player.facing = -1; }
      else if (right) { g.player.vx = 8.6; g.player.facing = 1; }
      else { g.player.vx *= 0.85; if (Math.abs(g.player.vx) < 0.1) g.player.vx = 0; }

      if (jump && g.player.onGround) { g.player.vy = -24.5; g.player.onGround = false; }
      g.player.vy += 1.3;
      if (g.player.vy > 20) g.player.vy = 20;

      g.player.x += g.player.vx;
      g.player.x = Math.max(0, Math.min(g.player.x, WORLD_W - g.player.w));

      for (const p of g.platforms) {
        const pY = p.y > 900 ? groundY : p.y;
        const pRect = { ...p, y: pY };
        if (rectsOverlap(g.player, pRect)) {
          if (g.player.vx > 0) g.player.x = pRect.x - g.player.w;
          if (g.player.vx < 0) g.player.x = pRect.x + pRect.w;
          g.player.vx = 0;
        }
      }

      g.player.y += g.player.vy;
      g.player.onGround = false;
      for (const p of g.platforms) {
        const pY = p.y > 900 ? groundY : p.y;
        const pH = p.y > 900 ? currentH - groundY + 200 : p.h;
        const pRect = { ...p, y: pY, h: pH };
        if (rectsOverlap(g.player, pRect)) {
          if (g.player.vy > 0) { g.player.y = pRect.y - g.player.h; g.player.vy = 0; g.player.onGround = true; }
          else if (g.player.vy < 0) { g.player.y = pRect.y + pRect.h; g.player.vy = 0; }
        }
      }

      if (g.player.y > currentH + 120) loseLife();
      for (const star of g.stars) {
        if (!star.got && rectsOverlap(g.player, { x: star.x - 28, y: star.y - 28, w: 56, h: 56 })) {
          star.got = true; g.score += 10; setScore(g.score);
        }
      }

      for (const enemy of g.enemies) {
        if (!enemy.alive) continue;
        enemy.x += enemy.vx;
        if (enemy.x < enemy.min || enemy.x + enemy.w > enemy.max) enemy.vx *= -1;
        if (rectsOverlap(g.player, enemy)) {
          if (g.player.vy > 0 && (g.player.y + g.player.h) - enemy.y < 22) {
            enemy.alive = false; g.player.vy = -18.0; g.score += 25; setScore(g.score);
          } else { loseLife(); }
        }
      }

      if (rectsOverlap(g.player, g.flag)) { g.gameState = 'won'; setGameState('won'); setMessage(`Você venceu! ${g.score} estrelinhas! 🌟`); }
      if (g.player.invincible > 0) g.player.invincible--;
      g.cameraX = Math.max(0, Math.min(g.player.x - currentW * 0.42, WORLD_W - currentW));
    };

    const draw = () => {
      const g = gameRef.current;
      const currentW = canvas.width;
      const currentH = canvas.height;
      const groundY = currentH * 0.86;

      const skyGrad = ctx.createLinearGradient(0, 0, 0, currentH);
      skyGrad.addColorStop(0, THEME.skyLight);
      skyGrad.addColorStop(0.6, THEME.skyMid);
      skyGrad.addColorStop(1, THEME.sunset);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, currentW, currentH);

      for (const cd of g.clouds) {
        const x = cd.x * 2 - g.cameraX * 0.25; const y = cd.y * 2; const s = cd.s * 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.beginPath(); ctx.arc(x, y, 24 * s, 0, Math.PI * 2);
        ctx.arc(x + 26 * s, y - 10 * s, 30 * s, 0, Math.PI * 2); ctx.arc(x + 58 * s, y, 24 * s, 0, Math.PI * 2);
        ctx.arc(x + 28 * s, y + 8 * s, 28 * s, 0, Math.PI * 2); ctx.fill();
      }

      for (const hl of g.hills) {
        const x = (hl.x * 2) - g.cameraX * 0.45; ctx.fillStyle = '#86EFAC';
        ctx.beginPath(); ctx.ellipse(x + (hl.w * 2) / 2, groundY + (hl.h * 1.5) / 2, (hl.w * 2) / 2, (hl.h * 1.5) / 2, 0, Math.PI, 0); ctx.fill();
      }

      ctx.save();
      ctx.translate(-g.cameraX, 0);

      for (const p of g.platforms) {
        const iG = p.y > 900; const pY = iG ? groundY : p.y; const pH = iG ? currentH - groundY + 200 : p.h;
        ctx.fillStyle = iG ? THEME.grassMain : THEME.platform;
        ctx.beginPath(); ctx.roundRect(p.x, pY, p.w, pH, iG ? 14 : 12); ctx.fill();
        if (iG) { ctx.fillStyle = THEME.grassDark; ctx.fillRect(p.x, pY, p.w, 8); }
        else { ctx.strokeStyle = THEME.platformDark; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = THEME.platformShadow; ctx.fillRect(p.x + 4, pY + pH - 8, p.w - 8, 4); }
      }

      const t = performance.now() * 0.005;
      for (const star of g.stars) {
        if (star.got) continue;
        const bb = Math.sin(t + star.x * 0.005) * 12; ctx.save(); ctx.translate(star.x, star.y + bb); ctx.rotate(t * 0.5);
        ctx.beginPath(); const rd = 32; for (let i = 0; i < 10; i++) { const r = i % 2 === 0 ? rd : rd * 0.45; const a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fillStyle = THEME.starMain; ctx.fill(); ctx.restore();
      }

      for (const en of g.enemies) {
        if (!en.alive) continue;
        ctx.fillStyle = THEME.jelly; ctx.beginPath(); ctx.roundRect(en.x, en.y, en.w, en.h, [20, 20, 4, 4]); ctx.fill();
        ctx.strokeStyle = THEME.jellyDark; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(en.x + 26, en.y + 26, 10, 0, Math.PI * 2); ctx.arc(en.x + 58, en.y + 26, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = THEME.jellyDark; ctx.beginPath(); ctx.arc(en.x + 26, en.y + 28, 4, 0, Math.PI * 2); ctx.arc(en.x + 58, en.y + 28, 4, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = '#475569'; ctx.fillRect(g.flag.x + 32, g.flag.y, 16, g.flag.h);
      ctx.fillStyle = '#EF4444'; ctx.beginPath(); ctx.moveTo(g.flag.x + 48, g.flag.y); ctx.lineTo(g.flag.x + 180, g.flag.y + 60); ctx.lineTo(g.flag.x + 48, g.flag.y + 120); ctx.closePath(); ctx.fill();

      if (!(g.player.invincible > 0 && Math.floor(g.player.invincible / 6) % 2 === 0)) {
        ctx.save(); ctx.translate(g.player.x + g.player.w / 2, g.player.y + g.player.h / 2); ctx.scale(g.player.facing, 1); ctx.translate(-g.player.w / 2, -g.player.h / 2);
        ctx.fillStyle = THEME.popcorn; ctx.beginPath(); ctx.roundRect(8, 28, 60, 64, 24); ctx.fill();
        ctx.strokeStyle = THEME.popcornDark; ctx.lineWidth = 8; ctx.stroke();
        ctx.fillStyle = '#1E293B'; ctx.beginPath(); ctx.arc(28, 48, 6, 0, Math.PI * 2); ctx.arc(52, 48, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = THEME.popcornDark; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(40, 60, 12, 0.1, Math.PI - 0.1); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    };

    const gameLoop = (time: number) => {
      const delta = time - lastTime; lastTime = time;
      if (delta < 100) { update(); draw(); }
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-sky-mid overflow-hidden select-none">
      <div className="w-full h-full relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute top-8 left-8 right-8 flex flex-wrap justify-between pointer-events-none items-start gap-4">
          <div className="stat-capsule"><Star className="w-8 h-8 text-yellow-500 fill-yellow-500" /><span className="stat-text">{score}</span></div>
          <div className="flex flex-col items-end gap-4 sm:flex-row sm:gap-6">
            <div className="stat-capsule"><Heart className="w-8 h-8 text-red-500 fill-red-500" /><span className="stat-text">{lives}</span></div>
            <div className="stat-capsule"><FlagIcon className="w-8 h-8 text-blue-500" /><span className="stat-text">NÍVEL 1-1</span></div>
          </div>
        </div>
        <AnimatePresence>
          {gameState !== 'playing' && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-0 flex items-center justify-center z-50 bg-white/90 backdrop-blur-sm p-8" >
              <div className="text-center">
                <h2 className="text-4xl md:text-6xl font-black text-slate-800 mb-8 drop-shadow-md">{message}</h2>
                <button onClick={() => resetGame(true)} className="px-12 py-6 bg-platform text-white font-black rounded-3xl shadow-[0_8px_0_#9A3412] hover:translate-y-1 hover:shadow-[0_4px_0_#9A3412] transition-all text-2xl uppercase" > Recomeçar (R) </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
