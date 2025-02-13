import { AnalyzedData } from "@/store/atoms";

interface TransactionSummaryProps {
  data: AnalyzedData;
}

export function TransactionSummary({ data }: TransactionSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold">Total Earnings</h3>
        <p className="text-2xl text-green-600">
          ${data.summary.totalEarnings.toFixed(2)}
        </p>
      </div>
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold">Total Expenses</h3>
        <p className="text-2xl text-red-600">
          ${data.summary.totalExpenses.toFixed(2)}
        </p>
      </div>
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold">Net Amount</h3>
        <p
          className={`text-2xl ${
            data.summary.netAmount >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          ${data.summary.netAmount.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
