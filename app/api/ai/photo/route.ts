import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { MODEL, aiError, authorize, claude } from "@/lib/ai-server";

const COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "white", "black", "other"] as const;
const ANGLES = ["slab", "vertical", "overhang", "steep", "roof"] as const;
const HOLDS = ["crimp", "sloper", "pinch", "pocket", "jug", "volume"] as const;
const STYLES = ["dynamic", "coordination", "compression", "power", "tension", "balance", "hooks", "mantle"] as const;
const GRADES = ["unknown", ...Array.from({ length: 15 }, (_, i) => `V${i}`)] as const;

const schema = {
  type: "object",
  properties: {
    color: { type: "string", enum: COLORS, description: "Colour of the holds that make up the problem." },
    other_color_hex: {
      type: "string",
      description: 'Only when color is "other": the hold colour as #rrggbb. Otherwise an empty string.',
    },
    angle: { type: "string", enum: ANGLES },
    holds: { type: "array", items: { type: "string", enum: HOLDS }, description: "The one to three hold types that define it." },
    styles: { type: "array", items: { type: "string", enum: STYLES }, description: "The one or two styles it most likely needs." },
    grade: { type: "string", enum: GRADES, description: "Only if a grade tag is readable in the photo, else unknown." },
    beta: { type: "string", description: "One sentence: a starting idea for the crux, or what stands out." },
  },
  required: ["color", "other_color_hex", "angle", "holds", "styles", "grade", "beta"],
  additionalProperties: false,
} as const;

const SYSTEM = `You look at photos of indoor bouldering problems for HOLD!, a climbing log, and fill in the climb's tags.
Identify the problem by its hold colour: usually the most prominent colour near the centre of the photo, or the colour of the start tag.
Judge the wall angle from the wall's shape and the floor. List only hold types you can actually see on the problem.
Pick styles from the movement the holds and spacing suggest. Read the grade only from a visible tag or label; never estimate it from difficulty.
If the photo isn't a climbing wall, use your best guesses and say so in "beta".`;

export async function POST(req: Request) {
  const auth = await authorize(req, "photo");
  if (!auth.ok) return auth.response;

  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const image = typeof body.image === "string" ? body.image.replace(/^data:image\/\w+;base64,/, "") : "";
  if (!image) return Response.json({ error: "No photo was sent." }, { status: 400 });
  if (image.length > 5_000_000) return Response.json({ error: "That photo is too large." }, { status: 413 });

  try {
    const message = await claude().messages.parse({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: "Fill in the tags for this problem." },
          ],
        },
      ],
      output_config: { format: jsonSchemaOutputFormat(schema), effort: "low" },
    });
    const out = message.parsed_output;
    if (message.stop_reason === "refusal" || !out) {
      return Response.json({ error: "Couldn't read that photo. Try another angle." }, { status: 422 });
    }
    const hex = /^#[0-9a-f]{6}$/i.test(out.other_color_hex) ? out.other_color_hex : null;
    const lower = (s: string) => s.toLowerCase();
    return Response.json({
      color: out.color === "other" ? hex : lower(out.color),
      angle: lower(out.angle),
      holds: [...new Set(out.holds.map(lower))].slice(0, 3),
      styles: [...new Set(out.styles.map(lower))].slice(0, 2),
      grade: out.grade === "unknown" ? null : Number(out.grade.slice(1)),
      beta: out.beta.trim(),
    });
  } catch (e) {
    return aiError(e);
  }
}
