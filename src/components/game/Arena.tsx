import { useEffect, useRef } from "react";
import { useRunStore } from "@/store/useRunStore";
import { BALANCE } from "@/game/data/balance";
import arenaUrl from "@/assets/game/arena.png";
import heroUrl from "@/assets/game/hero.png";
import bruteUrl from "@/assets/game/brute.png";
import shamblerUrl from "@/assets/game/shambler.png";

const loadImg = (src: string): HTMLImageElement => {
  const i = new Image();
  i.src = src;
  return i;
};
const IMG = {
  arena: loadImg(arenaUrl),
  hero: loadImg(heroUrl),
  brute: loadImg(bruteUrl),
  shambler: loadImg(shamblerUrl),
};

const MOVE_KEYS: Record<string, [string, number]> = {
  w: ["y", -1], ArrowUp: ["y", -1],
  s: ["y", 1],  ArrowDown: ["y", 1],
  a: ["x", -1], ArrowLeft: ["x", -1],
  d: ["x", 1],  ArrowRight: ["x", 1],
};
const FIRE_KEYS = new Set([" ", "Space", "j", "J"]);

export function Arena() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const fireHeldRef = useRef<boolean>(false);
  const firePressedQueueRef = useRef<boolean>(false);

  useEffect(() => {
    const tick = useRunStore.getState().tick;
    const setInput = useRunStore.getState().setInput;

    const loop = (t: number) => {
      const last = lastTRef.current || t;
      const dt = Math.min(0.05, (t - last) / 1000);
      lastTRef.current = t;

      // movement from keyboard
      let x = 0, y = 0;
      for (const k of keysRef.current) {
        const m = MOVE_KEYS[k];
        if (!m) continue;
        if (m[0] === "x") x += m[1];
        if (m[0] === "y") y += m[1];
      }
      const current = useRunStore.getState().input;
      const touchActive = Math.abs(current.moveX) + Math.abs(current.moveY) > 0.01;
      if (!touchActive) setInput({ moveX: x, moveY: y });

      // fire input: keyboard or mobile button
      const fireHeld = fireHeldRef.current || current.fireHeld;
      const firePressed = firePressedQueueRef.current || current.firePressed;
      setInput({ fireHeld, firePressed });

      tick(dt);

      // consume one-shot press
      firePressedQueueRef.current = false;
      setInput({ firePressed: false, attack: false });

      render();
      rafRef.current = requestAnimationFrame(loop);
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const s = useRunStore.getState();
      const W = BALANCE.arena.width;
      const H = BALANCE.arena.height;
      const SMOOTH = !BALANCE.render.pixelArt;

      // arena background (stretched to fill logical world)
      ctx.imageSmoothingEnabled = SMOOTH;
      if (IMG.arena.complete && IMG.arena.naturalWidth > 0) {
        ctx.drawImage(IMG.arena, 0, 0, W, H);
      } else {
        ctx.fillStyle = "#1a1614";
        ctx.fillRect(0, 0, W, H);
      }

      // rig
      const rig = s.rig;
      const rigPct = rig.hp / rig.maxHp;
      ctx.fillStyle = "#3a2f25";
      ctx.beginPath(); ctx.arc(rig.pos.x, rig.pos.y, BALANCE.arena.rigRadius + 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rigPct > 0.5 ? "#c9a84c" : rigPct > 0.25 ? "#d28a3a" : "#a04848";
      ctx.beginPath(); ctx.arc(rig.pos.x, rig.pos.y, BALANCE.arena.rigRadius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1614";
      ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("RIG", rig.pos.x, rig.pos.y);

      // enemies as sprites (size from BALANCE.render.sprites for consistency)
      ctx.imageSmoothingEnabled = SMOOTH;
      for (const e of s.enemies) {
        const img = e.kind === "brute" ? IMG.brute : IMG.shambler;
        const size = e.kind === "brute" ? BALANCE.render.sprites.brute : BALANCE.render.sprites.shambler;
        if (img.complete && img.naturalWidth > 0) {
          // face toward rig horizontally
          const flip = e.pos.x > rig.pos.x ? -1 : 1;
          ctx.save();
          ctx.translate(e.pos.x, e.pos.y);
          ctx.scale(flip, 1);
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
          ctx.restore();
        } else {
          ctx.fillStyle = e.color;
          ctx.beginPath(); ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2); ctx.fill();
        }
        const w = e.radius * 2;
        const pct = e.hp / e.maxHp;
        ctx.fillStyle = "#000"; ctx.fillRect(e.pos.x - w / 2, e.pos.y - e.radius - 10, w, 3);
        ctx.fillStyle = "#73ffb8"; ctx.fillRect(e.pos.x - w / 2, e.pos.y - e.radius - 10, w * pct, 3);
      }

      // bullets
      for (const b of s.bullets) {
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2); ctx.fill();
      }

      // player sprite, rotated to facing
      const P = s.player;
      const pSize = BALANCE.render.sprites.hero;
      if (IMG.hero.complete && IMG.hero.naturalWidth > 0) {
        ctx.save();
        ctx.translate(P.pos.x, P.pos.y);
        // sprite is drawn facing down; rotate so "down" aligns with facing angle
        ctx.rotate(P.facing - Math.PI / 2);
        if (P.invulnTimer > 0) ctx.globalAlpha = 0.6;
        if (!P.alive) ctx.globalAlpha = 0.3;
        ctx.drawImage(IMG.hero, -pSize / 2, -pSize / 2, pSize, pSize);
        ctx.restore();
      } else {
        ctx.fillStyle = P.alive ? "#e8edf3" : "#555";
        ctx.beginPath(); ctx.arc(P.pos.x, P.pos.y, 16, 0, Math.PI * 2); ctx.fill();
      }
      // muzzle indicator
      ctx.strokeStyle = "#ffd84a"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(P.pos.x + Math.cos(P.facing) * 18, P.pos.y + Math.sin(P.facing) * 18);
      ctx.lineTo(P.pos.x + Math.cos(P.facing) * 28, P.pos.y + Math.sin(P.facing) * 28);
      ctx.stroke();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (FIRE_KEYS.has(e.key)) {
        if (!fireHeldRef.current) firePressedQueueRef.current = true;
        fireHeldRef.current = true;
        e.preventDefault();
        return;
      }
      keysRef.current.add(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (FIRE_KEYS.has(e.key)) {
        fireHeldRef.current = false;
        useRunStore.getState().setInput({ fireHeld: false });
        return;
      }
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={BALANCE.arena.width}
      height={BALANCE.arena.height}
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: `${BALANCE.arena.width} / ${BALANCE.arena.height}`,
        display: "block",
        background: "#1a1614",
        touchAction: "none",
        imageRendering: BALANCE.render.pixelArt ? "pixelated" : "auto",
      }}
    />
  );
}
