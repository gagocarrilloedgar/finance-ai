import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { DateRange } from "react-day-picker";

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
