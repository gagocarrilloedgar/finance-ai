import { Fragment } from "react";
import { useAtom } from "jotai";
import { expandedCategoriesAtom } from "@/store/atoms";
import { Transaction } from "@/store/atoms";

interface TransactionListProps {
  transactions: {
    in: Transaction[];
    out: Transaction[];
  };
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  isFirstMonth: boolean;
  isLastMonth: boolean;
}

export function TransactionList({
  transactions,
  monthLabel,
  onPrevMonth,
  onNextMonth,
  isFirstMonth,
  isLastMonth
}: TransactionListProps) {
  const [expandedCategories, setExpandedCategories] = useAtom(expandedCategoriesAtom);

  const toggleCategory = (category: string) => {
    if (expandedCategories.includes(category)) {
      setExpandedCategories(expandedCategories.filter(c => c !== category));
    } else {
      setExpandedCategories([...expandedCategories, category]);
    }
  };

  const allTransactions = [...transactions.in, ...transactions.out];
  const groups = allTransactions.reduce((acc, transaction) => {
    const group = transaction.group || "Uncategorized";
    if (!acc[group]) acc[group] = {};
    const category = transaction.category || "Uncategorized";
    if (!acc[group][category]) acc[group][category] = [];
    acc[group][category].push(transaction);
    return acc;
  }, {} as Record<string, Record<string, Transaction[]>>);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-4">
          <button
            onClick={onPrevMonth}
            disabled={isFirstMonth}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <h4 className="font-medium">{monthLabel}</h4>
          <button
            onClick={onNextMonth}
            disabled={isLastMonth}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <span className="text-green-600">↑</span>
            <span className="text-green-600">
              ${transactions.in.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-600">↓</span>
            <span className="text-red-600">
              ${transactions.out.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Group
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(groups).map(([groupName, categories]) => (
              <Fragment key={groupName}>
                <tr>
                  <td colSpan={7} className="px-6 py-3 bg-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{groupName}</span>
                      <span className="text-sm">
                        $
                        {Object.values(categories)
                          .reduce(
                            (sum, cat) =>
                              sum + cat.reduce((s, t) => s + t.amount, 0),
                            0
                          )
                          .toFixed(2)}
                      </span>
                    </div>
                  </td>
                </tr>

                {Object.entries(categories).map(([category, transactions]) => (
                  <Fragment key={`${groupName}-${category}`}>
                    <tr
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleCategory(category)}
                    >
                      <td colSpan={7} className="px-6 py-3 bg-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              $
                              {transactions
                                .reduce((sum, t) => sum + t.amount, 0)
                                .toFixed(2)}
                            </span>
                            <svg
                              className={`w-4 h-4 transform transition-transform ${
                                expandedCategories.includes(category)
                                  ? "rotate-180"
                                  : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedCategories.includes(category) &&
                      transactions.map((transaction, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {transaction.description}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm ${
                              transaction.type === "EARNING"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ${transaction.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {transaction.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {transaction.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-1 flex-wrap">
                              {transaction.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {transaction.group}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {transaction.date}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
