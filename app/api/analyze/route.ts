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
      "Expenses are expenses that are not necessary to maintain a certain standard of living and are not investments or savings."
  },
  {
    name: "Investments & Savings",
    description:
      "Investments & Savings are money saved for a future goal, emergency fund, or retirement, investments, etc."
  },
  {
    name: "Earnings",
    description:
      "Earnings are money earned from a job, or any other source that is positive."
  }
];

export const defaultCategories = [
  "Income",
  "Investments",
  "Savings",
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
    name: "Investments",
    description: "Money put into investments, stocks, bonds."
  },
  {
    name: "Savings",
    description: "Money saved for a future goal, emergency fund, or retirement"
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
    const { object: result } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        transactions: z.array(transactionSchema)
      }),
      prompt: `You are a financial expert specialized in categorizing bank transactions based on predefined categories and groups.

      ### Categories:
      ${categoriesDescription
        .map((c) => `${c.name}: ${c.description}`)
        .join("\n")}

      ### Groups:
      ${groups.map((g) => `${g.name}: ${g.description}`).join("\n")}

      ### Instructions:
      - Analyze each transaction and assign it to the most appropriate category.
      - Use transaction descriptions, amounts, and patterns to determine the category.
      - Transactions with positive amounts should be categorized as "Income" unless they fit better under "Investments" or "Savings."
      - Transactions related to recurring payments like Netflix or Spotify should be classified as "Subscriptions."
      - Try to asign the transaction to a group always.
      - Assign "type" as "EARNING" if the amount is positive and "EXPENSE" if negative.
      - Add relevant tags based on the description (e.g., "rent", "salary", "food", "fuel").
      - Use "group" to group related expenses (e.g., "Necessary Expenses" for rent, groceries or utilities, "Expenses" for things like clothing, entertainment, etc.).

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
