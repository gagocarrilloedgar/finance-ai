import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

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
  const { data } = await req.json();

  let allTransactions: z.infer<typeof transactionSchema>[] = [];

  try {
    // Step 3: Analyze and categorize the ordered data
    const { object: result } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        transactions: z.array(transactionSchema)
      }),
      prompt: `You are a categorization and structuring expert. Categorize the following transactions into the appropriate categories and groups.

      Output should have the same length as the input.
      Use always the starting of the day as the date. or the only date if only one date is present.

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
