import { useEffect, useRef } from "react";
import { useRunStore } from "@/store/useRunStore";
import { BALANCE } from "@/game/data/balance";

const KEY_MAP: Record<string, [string, number]> = {
  w: ["y", -1], ArrowUp: ["y", -1],
  s: ["y", 1],  ArrowDown: ["y", 1],
  a: ["x", -1], ArrowLeft: ["x", -1],
  d: ["x", 1],  ArrowRight: ["x", 1],
};

export function Arena() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const attackRef = useRef<boolean>(false);

  useEffect(() => {
    const tick = useRunStore.getState().tick;
    const setInput = useRunStore.getState().setInput;

    const loop = (t: number) => {
      const last = lastTRef.current || t;
      const dt = Math.min(0.05, (t - last) / 1000);
      lastTRef.current = t;

      // build input from keyboard
      let x = 0, y = 0;
      const keys = keysRef.current;
      for (const k of keys) {
        const m = KEY_MAP[k];
        if (!m) continue;
        if (m[0] === "x") x += m[1];
        if (m[0] === "y") y += m[1];
      }
      // merge touch input if present (set via setInput by MobileControls)
      const current = useRunStore.getState().input;
      const touchActive = Math.abs(current.moveX) + Math.abs(current.moveY) > 0.01;
      if (touchActive) {
        // keep touch values
      } else {
        setInput({ moveX: x, moveY: y });
      }
      if (attackRef.current || keys.has(" ")) {
        setInput({ attack: true });
      }

      tick(dt);
      // consume attack
      setInput({ attack: false });
      attackRef.current = false;

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

      // background
      ctx.fillStyle = "#1a1614";
      ctx.fillRect(0, 0, W, H);
      // grid
      ctx.strokeStyle = "#2a221e";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 64) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // rig
      const rig = s.rig;
      const rigPct = rig.hp / rig.maxHp;
      ctx.fillStyle = "#3a2f25";
      ctx.beginPath();
      ctx.arc(rig.pos.x, rig.pos.y, BALANCE.arena.rigRadius + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rigPct > 0.5 ? "#c9a84c" : rigPct > 0.25 ? "#d28a3a" : "#a04848";
      ctx.beginPath();
      ctx.arc(rig.pos.x, rig.pos.y, BALANCE.arena.rigRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1614";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("RIG", rig.pos.x, rig.pos.y);

      // enemies
      for (const e of s.enemies) {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        // hp bar
        const w = e.radius * 2;
        const pct = e.hp / e.maxHp;
        ctx.fillStyle = "#000";
        ctx.fillRect(e.pos.x - w / 2, e.pos.y - e.radius - 8, w, 3);
        ctx.fillStyle = "#73ffb8";
        ctx.fillRect(e.pos.x - w / 2, e.pos.y - e.radius - 8, w * pct, 3);
      }

      // player
      const P = s.player;
      ctx.fillStyle = P.alive ? (P.invulnTimer > 0 ? "#ffd84a" : "#e8edf3") : "#555";
      ctx.beginPath();
      ctx.arc(P.pos.x, P.pos.y, 16, 0, Math.PI * 2);
      ctx.fill();
      // facing indicator
      ctx.strokeStyle = "#1a1614";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(P.pos.x, P.pos.y);
      ctx.lineTo(P.pos.x + Math.cos(P.facing) * 20, P.pos.y + Math.sin(P.facing) * 20);
      ctx.stroke();

      // attack range hint when on cooldown
      if (P.attackCooldown > BALANCE.player.attackCooldown - 0.12) {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2;
        const arc = (BALANCE.player.attackArcDeg * Math.PI) / 180;
        ctx.beginPath();
        ctx.arc(P.pos.x, P.pos.y, BALANCE.player.attackRange, P.facing - arc / 2, P.facing + arc / 2);
        ctx.stroke();
      }
    };

    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === " " && down) attackRef.current = true;
      if (down) keysRef.current.add(e.key);
      else keysRef.current.delete(e.key);
    };
    const kd = onKey(true);
    const ku = onKey(false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
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
        maxHeight: "100vh",
        display: "block",
        background: "#1a1614",
        touchAction: "none",
      }}
    />
  );
}
