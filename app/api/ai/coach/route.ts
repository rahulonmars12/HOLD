import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { MODEL, aiError, authorize, claude } from "@/lib/ai-server";

const schema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "The main note or answer, in plain language.",
    },
    practice: {
      type: "array",
      items: { type: "string" },
      description: "Two or three short, concrete things to practise next session, each under ten words.",
    },
  },
  required: ["summary", "practice"],
  additionalProperties: false,
} as const;

const BASE = `You are the coach inside HOLD!, a bouldering log. A climber shares data from their own log as JSON.
Ground everything in that data: name the specific attempts, fall reasons, grades, holds, angles or styles that support each point. Never invent sessions, numbers or beta that are not in the data.
Write like a friendly, experienced climbing coach: direct, specific, no filler, no praise padding. Use climbing terms but keep sentences plain.
If the climber mentions pain or injury, suggest they see a physiotherapist or doctor instead of training through it.`;

const MODES = {
  climb: `The data describes one climb they just worked or sent, their attempts on it, their read before trying it, and a summary of their recent history.
In "summary", write two or three sentences: what changed between the falls and the send (or what is holding them back if unsent), and how it connects to patterns in their history.
In "practice", give two drills for next session.`,
  insights: `The data summarises their recent climbing: grade pyramid, results by wall angle, hold type and style, fall reasons, and how well they read climbs.
In "summary", write two or three sentences on the single biggest pattern holding back their top grade.
In "practice", give three focus items for the coming week.`,
};

export async function POST(req: Request) {
  const auth = await authorize(req, "coach");
  if (!auth.ok) return auth.response;

  let body: { mode?: string; context?: unknown; question?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const mode = body.mode === "insights" ? "insights" : "climb";
  const context = JSON.stringify(body.context ?? {});
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (context.length > 60_000) return Response.json({ error: "Too much data in one request." }, { status: 413 });

  const ask = question
    ? `\n\nThe climber asks: "${question}"\nAnswer the question in "summary" in up to five sentences, using the data. Keep "practice" to two items that follow from your answer.`
    : "";

  try {
    const message = await claude().messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: `${BASE}\n\n${MODES[mode]}`,
      messages: [{ role: "user", content: `Log data:\n${context}${ask}` }],
      output_config: { format: jsonSchemaOutputFormat(schema), effort: "medium" },
    });
    const out = message.parsed_output;
    if (message.stop_reason === "refusal" || !out) {
      return Response.json({ error: "The coach couldn't answer that. Try rephrasing." }, { status: 422 });
    }
    return Response.json({
      summary: out.summary.trim(),
      practice: out.practice.map((p) => p.trim()).filter(Boolean).slice(0, 3),
    });
  } catch (e) {
    return aiError(e);
  }
}
