import React from "react";

export default function AnimatedBackground({
  opacity = 1,
  colors = { a: "#1d7afc", b: "#7c3aed", c: "#06b6d4" },
}) {
  return (
    <div
      className="abg abg--aurora"
      style={
        {
          "--abg-a": colors.a,
          "--abg-b": colors.b,
          "--abg-c": colors.c,
          "--abg-op": opacity,
        }
      }
      aria-hidden
    >
      <div className="abg-noise" />
      <style>{css}</style>
    </div>
  );
}

const css = `
.abg{
  position: fixed; inset: 0; z-index: -1; pointer-events: none;
  opacity: var(--abg-op, 1);
}

/* Aurora: layered gradients + gentle hue drift */
.abg--aurora{
  background:
    radial-gradient(1200px 500px at 8% -10%, color-mix(in oklab, var(--abg-a) 24%, transparent), transparent 60%),
    radial-gradient(1000px 520px at 92% -20%, color-mix(in oklab, var(--abg-b) 22%, transparent), transparent 60%),
    radial-gradient(900px 520px at 50% -30%, color-mix(in oklab, var(--abg-c) 18%, transparent), transparent 60%),
    linear-gradient(180deg, #0f172a, #111827);
  animation: abg-hue 40s linear infinite;
}

/* Subtle grain to avoid banding */
.abg-noise{
  position:absolute; inset:0; mix-blend-mode: overlay; opacity:.05;
  background-image:url("data:image/svg+xml;utf8,\
  <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>\
  <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/></filter>\
  <rect width='128' height='128' filter='url(#n)' opacity='0.65'/></svg>");
}

/* Motion (respects reduced-motion) */
@keyframes abg-hue { to { filter: hue-rotate(12deg); } }
@media (prefers-reduced-motion: reduce){
  .abg, .abg * { animation: none !important; transform: none !important; }
}
`;