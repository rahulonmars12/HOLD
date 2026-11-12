import type {
  Angle,
  AttemptGuess,
  BuiltinColor,
  CustomColor,
  FailReason,
  Hold,
  HoldColor,
  ReadResult,
  Style,
} from "./types";

export const GRADES = Array.from({ length: 15 }, (_, i) => i);
export const MAX_GRADE = 14;

export const gradeLabel = (g: number) => `V${g}`;

export const ANGLES: { id: Angle; label: string; hint: string }[] = [
  { id: "slab", label: "Slab", hint: "Leans back" },
  { id: "vertical", label: "Vertical", hint: "Straight up" },
  { id: "overhang", label: "Overhang", hint: "Leans out" },
  { id: "steep", label: "Steep", hint: "About 45 degrees" },
  { id: "roof", label: "Roof", hint: "Flat overhead" },
];

export const HOLDS: { id: Hold; label: string; desc: string; tip: string }[] = [
  {
    id: "crimp",
    label: "Crimps",
    desc: "Thin edges you hold with your fingertips, fingers bent. Wrapping your thumb over your index finger adds power.",
    tip: "Keep your hips close to the wall so your fingers take less load.",
  },
  {
    id: "sloper",
    label: "Slopers",
    desc: "Rounded holds with no edge. You hold them with an open hand and friction.",
    tip: "Keep your arms straight and hang low, under the hold.",
  },
  {
    id: "pinch",
    label: "Pinches",
    desc: "Holds you squeeze between your thumb and fingers.",
    tip: "Squeeze with the thumb first, then turn your hip in.",
  },
  {
    id: "pocket",
    label: "Pockets",
    desc: "Holes in the hold that fit one, two or three fingers.",
    tip: "Use your strongest fingers, usually the middle two.",
  },
  {
    id: "jug",
    label: "Jugs",
    desc: "Big, deep holds you can wrap your whole hand around.",
    tip: "Use them to rest and shake out your arms.",
  },
  {
    id: "volume",
    label: "Volumes",
    desc: "Large shapes bolted to the wall. You stand or smear on them, and smaller holds can be screwed on top.",
    tip: "Press your foot flat on the face for the most friction.",
  },
];

export const STYLES: {
  id: Style;
  label: string;
  short: string;
  desc: string;
  tip: string;
}[] = [
  {
    id: "dynamic",
    label: "Dynamic",
    short: "Dynamic",
    desc: "Moves where you jump or throw for the next hold instead of reaching it slowly.",
    tip: "Look at the target, drive with your legs, and catch with a slightly bent arm.",
  },
  {
    id: "coordination",
    label: "Coordination",
    short: "Coordination",
    desc: "Hands and feet move at the same time, like running up the wall or swinging between holds.",
    tip: "Practise the parts on the ground first, then link them.",
  },
  {
    id: "compression",
    label: "Compression",
    short: "Compression",
    desc: "Squeezing two holds that face away from each other, like hugging a big feature.",
    tip: "Pull in with your arms and push in with your feet at the same time.",
  },
  {
    id: "power",
    label: "Power",
    short: "Power",
    desc: "Short climbs where every move takes maximum effort.",
    tip: "Rest three to five minutes between tries.",
  },
  {
    id: "tension",
    label: "Body tension",
    short: "Tension",
    desc: "Keeping your feet on the wall when it is steep, using your core and toes.",
    tip: "Pull your toes toward you on the foothold, as if dragging the wall in.",
  },
  {
    id: "balance",
    label: "Balance",
    short: "Balance",
    desc: "Slow, precise weight shifts, usually on slabs with small footholds.",
    tip: "Move your hips over your feet before you stand up.",
  },
  {
    id: "hooks",
    label: "Heel and toe hooks",
    short: "Hooks",
    desc: "Pulling with your heel or the top of your foot hooked on a hold.",
    tip: "Point your toes and pull the heel down and in.",
  },
  {
    id: "mantle",
    label: "Mantle",
    short: "Mantle",
    desc: "Pressing down on a ledge to get your body above it, like climbing out of a pool.",
    tip: "Turn your hand so the fingers point sideways and get a high foot early.",
  },
];

export const FAIL_REASONS: {
  id: FailReason;
  label: string;
  /** Chip colour on the "why did you come off" sheet. */
  color: string;
  /** What to practise when this is the most common reason for falling. */
  pointer: string;
}[] = [
  {
    id: "beta",
    label: "Wrong beta",
    color: "#B6C0FF",
    pointer:
      "Read for longer before you pull on, and plan your feet as well as your hands. After each fall, change one thing instead of repeating the same sequence.",
  },
  {
    id: "strength",
    label: "Couldn't hold it",
    color: "#FFA45C",
    pointer:
      "Check body position before blaming strength: hips in, weight on feet. If the position was right, it's time for hangboard or board sessions.",
  },
  {
    id: "commit",
    label: "Didn't commit",
    color: "#FF9CC2",
    pointer:
      "Practise falling from the crux move on purpose, then give one attempt per session where the only goal is to go for the move.",
  },
  {
    id: "foot",
    label: "Foot slipped",
    color: "#5FDDB0",
    pointer:
      "Warm up with silent feet: place each foot once, watch it until it is weighted, and keep pressure through the toe as you move.",
  },
  {
    id: "precision",
    label: "Missed the hold",
    color: "#FFDD55",
    pointer:
      "Slow the move down on easier climbs. Look at the exact spot on the hold you want and hold the catch position for a second.",
  },
  {
    id: "fatigue",
    label: "Too tired",
    color: "#C9D1E8",
    pointer:
      "Rest three to five minutes between hard attempts and put your project burns early in the session.",
  },
];

export const GUESSES: {
  id: AttemptGuess;
  label: string;
  /** Inclusive range of total attempts this guess covers. */
  min: number;
  max: number;
}[] = [
  { id: "flash", label: "Flash", min: 1, max: 1 },
  { id: "few", label: "2 to 3", min: 2, max: 3 },
  { id: "several", label: "4 to 6", min: 4, max: 6 },
  { id: "many", label: "7+", min: 7, max: Infinity },
];

export const guessText = (g: AttemptGuess) =>
  g === "flash" ? "a flash" : `${GUESSES.find((x) => x.id === g)?.label} attempts`;

export const READ_RESULTS: { id: ReadResult; label: string; score: number }[] =
  [
    { id: "yes", label: "Yes", score: 1 },
    { id: "partly", label: "Partly", score: 0.5 },
    { id: "no", label: "No", score: 0 },
  ];

/** Built-in hold colours: the fill, and a darker shade for hold details. */
export const HOLD_COLORS: {
  id: BuiltinColor;
  label: string;
  hex: string;
  shade: string;
}[] = [
  { id: "red", label: "Red", hex: "#FF8A7A", shade: "#F5705F" },
  { id: "orange", label: "Orange", hex: "#FFA45C", shade: "#F58F40" },
  { id: "yellow", label: "Yellow", hex: "#FFDD55", shade: "#F5C92E" },
  { id: "green", label: "Green", hex: "#5FDDB0", shade: "#3FC998" },
  { id: "blue", label: "Blue", hex: "#7EB3FF", shade: "#5E9EF5" },
  { id: "purple", label: "Purple", hex: "#B79BFF", shade: "#A080F5" },
  { id: "pink", label: "Pink", hex: "#FF9CC2", shade: "#F582AD" },
  { id: "white", label: "White", hex: "#FFFFFF", shade: "#E1E6F5" },
  { id: "black", label: "Black", hex: "#1E1B3A", shade: "#34305E" },
];

const isHex = (c: string): c is `#${string}` => c.startsWith("#");

export const holdHex = (c: HoldColor) =>
  isHex(c) ? c : (HOLD_COLORS.find((h) => h.id === c)?.hex ?? "#FFFFFF");

/** A darker version of any colour, for hold incuts and silhouettes. */
export function holdShade(c: HoldColor) {
  if (!isHex(c)) return HOLD_COLORS.find((h) => h.id === c)?.shade ?? "#E1E6F5";
  const n = parseInt(c.slice(1, 7), 16);
  const r = Math.round(((n >> 16) & 255) * 0.86);
  const g = Math.round(((n >> 8) & 255) * 0.86);
  const b = Math.round((n & 255) * 0.86);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** True when text on this colour should be white rather than ink. */
export function isDark(c: HoldColor) {
  const hex = holdHex(c);
  const n = parseInt(hex.slice(1, 7), 16);
  const lum =
    0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum < 110;
}

export function colorLabel(c: HoldColor, custom: CustomColor[] = []) {
  if (isHex(c)) return custom.find((x) => x.hex.toLowerCase() === c.toLowerCase())?.label ?? "Custom";
  return HOLD_COLORS.find((h) => h.id === c)?.label ?? c;
}

export const labelOf = <T extends string>(
  list: { id: T; label: string }[],
  id: T,
) => list.find((x) => x.id === id)?.label ?? id;

/** Lower-case, single-spaced gym name, so buddies who type it slightly differently still match. */
export const gymKey = (gym: string) => gym.trim().toLowerCase().replace(/\s+/g, " ");
