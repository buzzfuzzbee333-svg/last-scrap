import { useEffect, useRef, useState } from "react";
import { useRunStore } from "@/store/useRunStore";

const STICK_RADIUS = 60;
const KNOB_RADIUS = 28;

export function MobileControls() {
  const setInput = useRunStore((s) => s.setInput);
  const [show, setShow] = useState(false);
  const stickRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const onTouch = () => setShow(true);
    window.addEventListener("touchstart", onTouch, { once: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, []);

  const updateFromTouch = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const mag = Math.hypot(dx, dy);
    if (mag > STICK_RADIUS) {
      dx = (dx / mag) * STICK_RADIUS;
      dy = (dy / mag) * STICK_RADIUS;
    }
    setKnob({ x: dx, y: dy });
    setInput({ moveX: dx / STICK_RADIUS, moveY: dy / STICK_RADIUS });
  };

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-between p-4">
      <div
        ref={stickRef}
        className="pointer-events-auto relative rounded-full bg-white/10 backdrop-blur"
        style={{ width: STICK_RADIUS * 2, height: STICK_RADIUS * 2 }}
        onTouchStart={(e) => {
          const t = e.changedTouches[0];
          touchIdRef.current = t.identifier;
          updateFromTouch(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          for (const t of Array.from(e.changedTouches)) {
            if (t.identifier === touchIdRef.current) updateFromTouch(t.clientX, t.clientY);
          }
        }}
        onTouchEnd={() => {
          touchIdRef.current = null;
          setKnob({ x: 0, y: 0 });
          setInput({ moveX: 0, moveY: 0 });
        }}
      >
        <div
          className="absolute rounded-full bg-white/40"
          style={{
            width: KNOB_RADIUS * 2,
            height: KNOB_RADIUS * 2,
            left: STICK_RADIUS - KNOB_RADIUS + knob.x,
            top: STICK_RADIUS - KNOB_RADIUS + knob.y,
          }}
        />
      </div>
      <button
        className="pointer-events-auto h-28 w-28 rounded-full bg-red-500/70 text-lg font-bold text-white shadow-lg active:bg-red-600/80 select-none"
        onTouchStart={(e) => { e.preventDefault(); setInput({ firePressed: true, fireHeld: true }); }}
        onTouchEnd={(e) => { e.preventDefault(); setInput({ fireHeld: false }); }}
        onTouchCancel={(e) => { e.preventDefault(); setInput({ fireHeld: false }); }}
      >
        FIRE
      </button>
    </div>
  );
}
