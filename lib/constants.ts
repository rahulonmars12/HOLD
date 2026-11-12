import type {
  Angle,
  AttemptGuess,
  FailReason,
  Hold,
  HoldColor,
  ReadResult,
  Style,
} from "./types";

export const GRADES = Array.from({ length: 15 }, (_, i) => i);

export const gradeLabel = (g: number) => `V${g}`;

export const ANGLES: { id: Angle; label: string }[] = [
  { id: "slab", label: "Slab" },
  { id: "vertical", label: "Vertical" },
  { id: "overhang", label: "Overhang" },
  { id: "steep", label: "Steep" },
  { id: "roof", label: "Roof" },
];

export const HOLDS: { id: Hold; label: string }[] = [
  { id: "crimp", label: "Crimps" },
  { id: "sloper", label: "Slopers" },
  { id: "pinch", label: "Pinches" },
  { id: "pocket", label: "Pockets" },
  { id: "jug", label: "Jugs" },
  { id: "volume", label: "Volumes" },
];

export const STYLES: { id: Style; label: string }[] = [
  { id: "dynamic", label: "Dynamic" },
  { id: "coordination", label: "Coordination" },
  { id: "compression", label: "Compression" },
  { id: "power", label: "Power" },
  { id: "tension", label: "Body tension" },
  { id: "balance", label: "Balance" },
  { id: "hooks", label: "Heel and toe hooks" },
  { id: "mantle", label: "Mantle" },
];

export const FAIL_REASONS: {
  id: FailReason;
  label: string;
  /** What to practise when this is the most common reason for falling. */
  pointer: string;
}[] = [
  {
    id: "beta",
    label: "Wrong beta",
    pointer:
      "Read for longer before you pull on, and plan your feet as well as your hands. After each fall, change one thing instead of repeating the same sequence.",
  },
  {
    id: "strength",
    label: "Couldn't hold it",
    pointer:
      "Check body position before blaming strength: hips in, weight on feet. If the position was right, this is a case for hangboard or board sessions.",
  },
  {
    id: "commit",
    label: "Didn't commit",
    pointer:
      "Practise falling from the crux move on purpose, then give one attempt per session where the only goal is to go for the move.",
  },
  {
    id: "foot",
    label: "Foot slipped",
    pointer:
      "Warm up with silent feet: place each foot once, watch it until it is weighted, and keep pressure through the toe as you move.",
  },
  {
    id: "precision",
    label: "Missed the hold",
    pointer:
      "Slow the move down on easier climbs. Look at the exact spot on the hold you want and hold the catch position for a second.",
  },
  {
    id: "fatigue",
    label: "Too tired",
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
  { id: "many", label: "7 or more", min: 7, max: Infinity },
];

export const READ_RESULTS: { id: ReadResult; label: string; score: number }[] =
  [
    { id: "yes", label: "Yes", score: 1 },
    { id: "partly", label: "Partly", score: 0.5 },
    { id: "no", label: "No", score: 0 },
  ];

/** Hold colours as they look under gym lights against a dark mat. */
export const HOLD_COLORS: { id: HoldColor; label: string; hex: string }[] = [
  { id: "red", label: "Red", hex: "#E4525A" },
  { id: "orange", label: "Orange", hex: "#F08A3C" },
  { id: "yellow", label: "Yellow", hex: "#EFC94A" },
  { id: "green", label: "Green", hex: "#4DB981" },
  { id: "blue", label: "Blue", hex: "#4F97E8" },
  { id: "purple", label: "Purple", hex: "#A47BE6" },
  { id: "pink", label: "Pink", hex: "#EE7FB2" },
  { id: "white", label: "White", hex: "#F3EFE4" },
  { id: "black", label: "Black", hex: "#0E1218" },
];

export const holdHex = (c: HoldColor) =>
  HOLD_COLORS.find((h) => h.id === c)?.hex ?? "#F3EFE4";

export const labelOf = <T extends string>(
  list: { id: T; label: string }[],
  id: T,
) => list.find((x) => x.id === id)?.label ?? id;
