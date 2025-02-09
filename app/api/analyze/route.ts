import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

const transactionSchema = z.object({
  amount: z.number(),
  description: z.string(),
  category: z.string(),
  type: z.enum(["EARNING", "EXPENSE"]),
  tags: z.array(z.string()),
  group: z.string(),
  date: z.string()
});

export async function POST(req: Request) {
  const { data } = await req.json();

  const chunkSize = 50;

  let allTransactions: z.infer<typeof transactionSchema>[] = [];

  try {
    const { object: result } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        transactions: z.array(transactionSchema)
      }),
      prompt: `Analyze these financial transactions and categorize each as either an earning or expense.
          Add appropriate tags and group similar transactions together.
          Return only validated transactions in the correct format.

          Data to analyze: ${JSON.stringify(data, null, 2)}`
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
    netAmount: 0 // Will calculate below
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
