import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { DateRange } from "react-day-picker";

export const types = ["EARNING", "EXPENSE"] as const;

export const groups = [
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

export const providerOptions = ["openai", "gemini"] as const;

export const providersAtom = atomWithStorage<string>("providers", "gemini");
export const openaiApiKeyAtom = atomWithStorage<string | undefined>(
  "openaiApiKey",
  undefined
);

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

export const extraCategories = [
  ...defaultCategories,
  "Savings",
  "Investments",
  "Loans",
  "Gifts",
  "Taxes",
  "Insurance",
  "Other"
];

export const categoriesDescription = [
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

export interface Transaction {
  amount: number;
  description: string;
  category: string;
  type: string;
  tags: string[];
  date: string;
  group: string;
}

export interface AnalyzedData {
  summary: {
    totalEarnings: number;
    totalExpenses: number;
    netAmount: number;
  };
  transactions: Transaction[];
}

export const rawDataAtom = atomWithStorage<unknown[]>("rawData", []);

export const analyzedDataAtom = atomWithStorage<AnalyzedData | null>(
  "analyzedData",
  null
);

export const dateRangeAtom = atomWithStorage<DateRange | undefined>(
  "dateRange",
  undefined
);

export const currentMonthIndexAtom = atomWithStorage<number>(
  "currentMonthIndex",
  0
);

export const expandedCategoriesAtom = atom<string[]>([]);

export const processingChunkAtom = atomWithStorage<{
  current: number;
  total: number;
}>("processingChunk", {
  current: 0,
  total: 0
});

export const parsingFileAtom = atom<boolean>(false);
