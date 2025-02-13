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

const groups = [
  {
    name: "Necessary Expenses",
    description:
      "Necessary expenses are expenses that are required to maintain a certain standard of living."
  },
  {
    name: "Expenses",
    description:
      "Expenses are expenses that are not necessary to maintain a certain standard of living."
  },
  {
    name: "Earnings",
    description:
      "Earnings are money earned from a job, or any other source that is positive."
  }
];

export const defaultCategories = [
  "Income",
  "Housing",
  "Transportation",
  "Subscriptions",
  "Groceries",
  "Entertainment",
  "Dining",
  "Travel",
  "Healthcare",
  "Shopping"
];

const categoriesDescription = [
  {
    name: "Income",
    description: "Money earned from a job, or any other source that is positive"
  },
  {
    name: "Housing",
    description:
      "Money spent on rent, mortgage, utilities, insurance, wifi, mobile bill, etc."
  },
  {
    name: "Transportation",
    description:
      "Money spent on gas, car maintenance, public transportation, etc."
  },
  {
    name: "Subscriptions",
    description:
      "Money spent on subscriptions to services like Netflix, Spotify, etc."
  },
  {
    name: "Groceries",
    description: "Money spent on groceries, food, etc."
  },
  {
    name: "Entertainment",
    description: "Money spent on entertainment like movies, concerts."
  },
  {
    name: "Dining",
    description: "Money spent on dining out, cafes, etc."
  },
  {
    name: "Travel",
    description: "Money spent on travel, hotels, flights, rental cars, etc."
  },
  {
    name: "Healthcare",
    description: "Money spent on healthcare, gym, yoga, etc."
  },
  {
    name: "Shopping",
    description: "Money spent on shopping, clothes, shoes, etc."
  }
];

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

  // Calculate summary
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
