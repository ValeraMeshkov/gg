import type { FighterSkinId } from "../../game/appearance";
import { fighterFlightRotation } from "./fighterSkinGlyphs";
import { projectileTrianglePoints } from "./projectileShape";

function parseTrianglePoints(pointsStr: string): [number, number][] {
  return pointsStr.split(" ").map((triplet) => {
    const [sx, sy] = triplet.split(",").map(Number);
    return [sx!, sy!];
  });
}

/** Треугольник как в ProjectileTriangle — в координатах карты, с центром в (x,y). */
export function fillProjectileTriangleCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  fill: string
): void {
  const pts = parseTrianglePoints(projectileTrianglePoints(x, y, angle, size));
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  ctx.lineTo(pts[1]![0], pts[1]![1]);
  ctx.lineTo(pts[2]![0], pts[2]![1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawStarGlyph(
  ctx: CanvasRenderingContext2D,
  outerR: number,
  fill: string
): void {
  const innerR = outerR * 0.42;
  const points = 5;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / 2) * -1 + (i * Math.PI) / points;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
  ctx.fill();
}

/** Глиф бойца вокруг (0,0), масштаб `s` как в renderFighterGlyph (не путать с projR). */
export function fillFighterGlyphCanvas(
  ctx: CanvasRenderingContext2D,
  skin: FighterSkinId,
  fill: string,
  s: number
): void {
  switch (skin) {
    case "heart": {
      const d = `M0 ${s * 0.35} C${-s * 0.9} ${-s * 0.45} ${-s * 0.35} ${
        -s * 0.95
      } 0 ${-s * 0.55} C${s * 0.35} ${-s * 0.95} ${s * 0.9} ${-s * 0.45} 0 ${
        s * 0.35
      } Z`;
      ctx.fillStyle = fill;
      ctx.fill(new Path2D(d));
      break;
    }
    case "bear": {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(-s * 0.42, -s * 0.42, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.42, -s * 0.42, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.ellipse(-s * 0.2, -s * 0.05, s * 0.1, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * 0.2, -s * 0.05, s * 0.1, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.ellipse(0, s * 0.18, s * 0.14, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "star":
      drawStarGlyph(ctx, s * 0.85, fill);
      break;
    case "diamond": {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.85);
      ctx.lineTo(s * 0.55, 0);
      ctx.lineTo(0, s * 0.85);
      ctx.lineTo(-s * 0.55, 0);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      break;
    }
    case "ghost": {
      const d = `M0 ${-s * 0.72} A${s * 0.55} ${s * 0.55} 0 1 1 0 ${
        -s * 0.72
      } Z M${-s * 0.55} ${-s * 0.2} L${-s * 0.55} ${s * 0.55} L${
        -s * 0.28
      } ${s * 0.35} L0 ${s * 0.62} L${s * 0.28} ${s * 0.35} L${s * 0.55} ${
        s * 0.55
      } L${s * 0.55} ${-s * 0.2} Z`;
      ctx.fillStyle = fill;
      ctx.fill(new Path2D(d));
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-s * 0.2, -s * 0.15, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.2, -s * 0.15, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "rocket": {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.9);
      ctx.lineTo(-s * 0.32, s * 0.35);
      ctx.lineTo(s * 0.32, s * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.32, s * 0.2);
      ctx.lineTo(-s * 0.55, s * 0.65);
      ctx.lineTo(-s * 0.12, s * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.32, s * 0.2);
      ctx.lineTo(s * 0.55, s * 0.65);
      ctx.lineTo(s * 0.12, s * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(0, -s * 0.15, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "clover": {
      ctx.fillStyle = fill;
      for (const [cx, cy] of [
        [0, -s * 0.32],
        [-s * 0.32, 0],
        [s * 0.32, 0],
        [0, s * 0.32],
      ] as const) {
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      fillRoundRect(ctx, -s * 0.08, s * 0.2, s * 0.16, s * 0.45, s * 0.04);
      break;
    }
    case "bomb": {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(0, s * 0.12, s * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = fill;
      ctx.lineWidth = s * 0.12;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s * 0.18, -s * 0.28);
      ctx.quadraticCurveTo(s * 0.42, -s * 0.55, s * 0.28, -s * 0.72);
      ctx.stroke();
      ctx.fillStyle = "#ffe082";
      ctx.beginPath();
      ctx.arc(s * 0.32, -s * 0.78, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "ufo": {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.15, s * 0.72, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.18, s * 0.32, s * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (const ox of [-s * 0.28, 0, s * 0.28]) {
        ctx.beginPath();
        ctx.arc(ox, s * 0.18, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "shield": {
      const d = `M0 ${-s * 0.75} L${s * 0.62} ${-s * 0.35} L${s * 0.55} ${
        s * 0.25
      } Q0 ${s * 0.85} 0 ${s * 0.85} Q0 ${s * 0.85} ${-s * 0.55} ${
        s * 0.25
      } L${-s * 0.62} ${-s * 0.35} Z`;
      ctx.fillStyle = fill;
      ctx.fill(new Path2D(d));
      break;
    }
    case "triangle":
      break;
    default: {
      const _exhaustive: never = skin;
      return _exhaustive;
    }
  }
}

/** Один снаряд в координатах карты (как SVG). */
export function drawMapProjectileOnCanvas(
  ctx: CanvasRenderingContext2D,
  skin: FighterSkinId,
  fill: string,
  projR: number,
  mapX: number,
  mapY: number,
  flightAngle: number
): void {
  if (skin === "triangle") {
    fillProjectileTriangleCanvas(
      ctx,
      mapX,
      mapY,
      flightAngle,
      projR,
      fill
    );
    return;
  }
  const glyphS = projR * 1.35;
  const rot = fighterFlightRotation(skin, flightAngle);
  ctx.save();
  ctx.translate(mapX, mapY);
  ctx.rotate(rot);
  fillFighterGlyphCanvas(ctx, skin, fill, glyphS);
  ctx.restore();
}
