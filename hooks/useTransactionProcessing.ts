import { AnalyzedData, Transaction } from "@/store/atoms";
import { DateRange } from "react-day-picker";

export const useTransactionProcessing = () => {
  const processData = (data: AnalyzedData | null, dateRange?: DateRange) => {
    if (!data) return [];

    const filtered = data.transactions.filter(
      (t) =>
        !dateRange?.from ||
        !dateRange?.to ||
        (new Date(t.date) >= dateRange.from && new Date(t.date) <= dateRange.to)
    );

    const grouped: {
      [key: string]: { in: Transaction[]; out: Transaction[] };
    } = {};

    filtered.forEach((transaction) => {
      const transactionDate = new Date(transaction.date);
      const monthKey = `${transactionDate.getFullYear()}-${
        transactionDate.getMonth() + 1
      }`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = { in: [], out: [] };
      }
      if (transaction.type === "EARNING") {
        grouped[monthKey].in.push(transaction);
      } else {
        grouped[monthKey].out.push(transaction);
      }
    });

    Object.keys(grouped).forEach((monthKey) => {
      grouped[monthKey].in.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      grouped[monthKey].out.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });

    return Object.entries(grouped).sort(
      (a, b) =>
        new Date(b[0] + "-01").getTime() - new Date(a[0] + "-01").getTime()
    );
  };

  return {
    processData
  };
};
