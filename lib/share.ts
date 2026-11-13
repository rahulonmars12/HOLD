"use client";

import { SHAPES } from "@/components/Hold";
import type { Hold as HoldKind } from "./types";

/**
 * Share cards: a picture drawn on a canvas in HOLD!'s style, handed to the
 * phone's share sheet (or downloaded where sharing files isn't supported).
 * Nothing is uploaded; the image is made on the device.
 */
export interface CardSpec {
  /** Small line above the title, such as "Session done". */
  kicker: string;
  title: string;
  lines?: string[];
  /** Up to four figures in a row. */
  stats?: { value: string; label: string }[];
  /** A picture above the title: an image address, or an SVG already on the page. */
  art?: { src: string } | { svg: SVGElement };
  /** Soft background colours. */
  tint?: string[];
  /** Bottom right, such as the gym and date. */
  footer?: string;
}

const W = 1080;
const H = 1350;
const INK = "#1E1B3A";
const MUTED = "#55526F";
const WALL = "#EEF2FB";
const DISPLAY = '"Unbounded Variable", system-ui, sans-serif';
const SANS = '"DM Sans Variable", system-ui, sans-serif';

const CORNER_HOLDS: { kind: HoldKind; fill: string; x: number; y: number; size: number; rot: number }[] = [
  { kind: "jug", fill: "#FFDD55", x: -70, y: -60, size: 330, rot: 14 },
  { kind: "sloper", fill: "#B79BFF", x: 850, y: -90, size: 300, rot: 200 },
  { kind: "pinch", fill: "#5FDDB0", x: -90, y: 1010, size: 280, rot: -24 },
  { kind: "volume", fill: "#FF9CC2", x: 860, y: 1080, size: 300, rot: 18 },
  { kind: "pocket", fill: "#7EB3FF", x: 930, y: 520, size: 210, rot: 10 },
  { kind: "crimp", fill: "#FFA45C", x: -110, y: 560, size: 260, rot: -70 },
];

function drawHold(ctx: CanvasRenderingContext2D, kind: HoldKind, fill: string, x: number, y: number, size: number, rot: number) {
  const shape = SHAPES[kind];
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(size / 40, size / 40);
  ctx.translate(-20, -20);
  ctx.fillStyle = fill;
  ctx.fill(new Path2D(shape.body));
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(shape.bolt[0], shape.bolt[1], 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > max) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

function svgSource(svg: SVGElement) {
  const copy = svg.cloneNode(true) as SVGElement;
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", "600");
  copy.setAttribute("height", "636");
  copy.removeAttribute("class");
  copy.removeAttribute("style");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
}

export async function makeCard(spec: CardSpec): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  try {
    await Promise.all([document.fonts.load(`900 80px ${DISPLAY}`), document.fonts.load(`600 40px ${SANS}`)]);
  } catch {
    // Fonts not ready: the system font stands in.
  }

  // Wall, soft colour, holds.
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, W, H);
  const tint = spec.tint ?? ["#FFEA9C", "#DCCBFF", "#BCD6FF", "#FFD0E2"];
  const spots: [number, number][] = [[160, 200], [920, 300], [240, 1150], [900, 1060]];
  spots.forEach(([x, y], i) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 620);
    g.addColorStop(0, `${tint[i % tint.length]}E6`);
    g.addColorStop(1, `${tint[i % tint.length]}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });
  for (const h of CORNER_HOLDS) drawHold(ctx, h.kind, h.fill, h.x, h.y, h.size, h.rot);

  // The card.
  const pad = 84;
  const cx = W / 2;
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgb(30 27 58 / 0.14)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 20;
  roundRect(ctx, pad, 150, W - pad * 2, H - 300, 84);
  ctx.fill();
  ctx.shadowColor = "transparent";

  const inner = W - pad * 2 - 120;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Measure everything first so the block can be centred in the card.
  const art = spec.art ? await loadImage("src" in spec.art ? spec.art.src : svgSource(spec.art.svg)).catch(() => null) : null;
  const artH = art ? (spec.stats?.length ? 330 : 430) : 0;
  let titleSize = 104;
  let titleLines: string[] = [];
  for (; titleSize >= 56; titleSize -= 8) {
    ctx.font = `900 ${titleSize}px ${DISPLAY}`;
    titleLines = wrap(ctx, spec.title, inner);
    if (titleLines.length <= 2 && titleLines.every((l) => ctx.measureText(l).width <= inner)) break;
  }
  ctx.font = `600 40px ${SANS}`;
  const body = (spec.lines ?? []).flatMap((l) => wrap(ctx, l, inner));
  const stats = (spec.stats ?? []).slice(0, 4);
  const blockH =
    60 + 36 + (art ? artH + 30 : 0) + titleLines.length * titleSize * 1.08 + (body.length ? 24 + body.length * 54 : 0) + (stats.length ? 50 + 190 : 0);
  let y = 150 + (H - 300 - 110 - blockH) / 2 + 20;

  // Kicker pill.
  ctx.font = `700 34px ${SANS}`;
  const kw = ctx.measureText(spec.kicker).width + 64;
  ctx.fillStyle = WALL;
  roundRect(ctx, cx - kw / 2, y, kw, 60, 30);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.fillText(spec.kicker, cx, y + 42);
  y += 60 + 36;

  if (art) {
    const ratio = art.width / art.height || 1;
    const w = Math.min(inner, artH * ratio);
    ctx.drawImage(art, cx - w / 2, y, w, w / ratio);
    y += artH + 30;
  }

  ctx.fillStyle = INK;
  ctx.font = `900 ${titleSize}px ${DISPLAY}`;
  for (const l of titleLines) {
    y += titleSize;
    ctx.fillText(l, cx, y);
    y += titleSize * 0.08;
  }

  if (body.length) {
    y += 24;
    ctx.font = `600 40px ${SANS}`;
    ctx.fillStyle = MUTED;
    for (const l of body) {
      y += 54;
      ctx.fillText(l, cx, y - 10);
    }
  }

  if (stats.length) {
    y += 50;
    const gap = 20;
    const tw = (inner + 60 - gap * (stats.length - 1)) / stats.length;
    const x0 = cx - (inner + 60) / 2;
    stats.forEach((s, i) => {
      const x = x0 + i * (tw + gap);
      ctx.fillStyle = WALL;
      roundRect(ctx, x, y, tw, 190, 44);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.font = `900 ${s.value.length > 3 ? 60 : 76}px ${DISPLAY}`;
      ctx.fillText(s.value, x + tw / 2, y + 104);
      ctx.fillStyle = MUTED;
      ctx.font = `700 30px ${SANS}`;
      ctx.fillText(s.label, x + tw / 2, y + 154);
    });
  }

  // Footer inside the card: wordmark left, context right.
  const fy = H - 150 - 62;
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `900 48px ${DISPLAY}`;
  ctx.fillText("HOLD!", pad + 64, fy);
  if (spec.footer) {
    ctx.textAlign = "right";
    ctx.fillStyle = MUTED;
    ctx.font = `600 32px ${SANS}`;
    let footer = spec.footer;
    while (footer.length > 8 && ctx.measureText(footer).width > 520) footer = `${footer.slice(0, -2).trimEnd()}…`;
    ctx.fillText(footer, W - pad - 64, fy - 4);
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/png"));
}

/** Makes the card and opens the share sheet, or saves the image when files can't be shared. */
export async function shareCard(spec: CardSpec, name: string, text: string): Promise<"shared" | "saved" | "failed"> {
  let blob: Blob;
  try {
    blob = await makeCard(spec);
  } catch {
    return "failed";
  }
  const file = new File([blob], `${name}.png`, { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
  } catch (e) {
    // Closing the share sheet isn't a failure.
    if ((e as Error).name === "AbortError") return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "saved";
}
