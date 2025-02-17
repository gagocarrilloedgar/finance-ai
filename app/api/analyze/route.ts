import { generateObject } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

import { groups, categoriesDescription, types } from "@/store/atoms";

const transactionSchema = z.object({
  amount: z.number(),
  description: z.string(),
  category: z.string(),
  type: z.enum(types),
  tags: z.array(z.string()),
  group: z.string(),
  date: z.string()
});

export async function POST(req: Request) {
  const { data, model: modelType = "openai", openaiApiKey } = await req.json();

  let allTransactions: z.infer<typeof transactionSchema>[] = [];

  const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey && modelType === "openai") {
    return new Response("No API key provided", { status: 400 });
  }

  const openai = createOpenAI({
    apiKey
  });

  try {
    const model =
      modelType === "gemini"
        ? google("gemini-1.5-flash")
        : openai("gpt-4o-mini");

    // Step 3: Analyze and categorize the ordered data
    const { object: result } = await generateObject({
      model,
      schema: z.object({
        transactions: z.array(transactionSchema)
      }),
      prompt: `You are a categorization and structuring expert. Categorize the following transactions into the appropriate categories and groups.

      Output has to have the same length as the input.
      Use always the starting of the day as the date. or the only date if only one date is present. If they are different, use always the starting of the day.

      Negative amounts are expenses and positive amounts are earnings.

      ### Categories:
      ${categoriesDescription
        .map((c) => `${c.name}: ${c.description}`)
        .join("\n")}

      ### Groups:
      ${groups.map((g) => `${g.name}: ${g.description}`).join("\n")}

      ### Data to Analyze: ${JSON.stringify(data, null, 2)}`
    });

    allTransactions = result.transactions;
  } catch (error) {
    console.error("Error processing chunk:", error);
  }

  const summary = {
    totalEarnings: allTransactions
      .filter((t) => t.type === "EARNING")
      .reduce((sum, t) => sum + t.amount, 0),
    totalExpenses: allTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0),
    netAmount: 0
  };
  summary.netAmount = summary.totalEarnings - summary.totalExpenses;

  return new Response(
    JSON.stringify({
      summary,
      transactions: allTransactions
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
}
