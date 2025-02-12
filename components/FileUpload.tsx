"use client";

import { Fragment, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { DatePickerWithRange } from "@/components/ui/datepicker-with-range";
import { DateRange } from "react-day-picker";

import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useMutation } from "@tanstack/react-query";
import { FileUpIcon } from "lucide-react";
import { Progress } from "./ui/progress";

interface Transaction {
  amount: number;
  description: string;
  category: string;
  type: string;
  tags: string[];
  date: string;
  group: string;
}

interface AnalyzedData {
  summary: {
    totalEarnings: number;
    totalExpenses: number;
    netAmount: number;
  };
  transactions: Transaction[];
}

// Create atom with localStorage persistence
const analyzedDataAtom = atomWithStorage<AnalyzedData | null>(
  "analyzedData",
  null
);

export function FileUpload() {
  const [analyzedData, setAnalyzedData] = useAtom(analyzedDataAtom);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rawData, setRawData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [processingChunk, setProcessingChunk] = useState({
    current: 0,
    total: 0
  });

  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Add navigation handlers
  const handleNextMonth = () => {
    setCurrentMonthIndex((prev) =>
      Math.min(prev + 1, processedData.length - 1)
    );
  };

  const handlePrevMonth = () => {
    setCurrentMonthIndex((prev) => Math.max(prev - 1, 0));
  };

  const { mutate: handleFileUpload, isPending } = useMutation({
    mutationFn: async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) throw new Error("No file uploaded");

      if (file.type === "application/pdf") {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/files", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${errorText}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          throw new Error("Invalid response format from server");
        }

        const data = await response.json();
        setRawData(data);
        return;
      }

      const data = await readExcelFile(file);
      setRawData(data);
      console.log(data);
      const chunkSize = 50;
      const chunks = [];
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }

      setProcessingChunk({
        current: 0,
        total: chunks.length
      });

      const allTransactions: Transaction[] = [];

      chunks.forEach(async (chunk) => {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ data: chunk })
        });
        if (!response.ok) {
          throw new Error("Failed to analyze data");
        }
        const result = await response.json();
        allTransactions.push(...result.transactions);
        setProcessingChunk((prev) => ({
          ...prev,
          current: prev.current + 1
        }));

        setAnalyzedData((prev) => {
          const mergeTransactions = (
            existing: Transaction[],
            newData: Transaction[]
          ) => {
            const transactionMap = new Map<string, Transaction>();

            // Add existing transactions to map
            existing.forEach((t) => {
              const key = `${t.date}-${t.description}-${t.amount}`;
              transactionMap.set(key, t);
            });

            // Overwrite with new transactions where keys match
            newData.forEach((t) => {
              const key = `${t.date}-${t.description}-${t.amount}`;
              transactionMap.set(key, t);
            });

            return Array.from(transactionMap.values());
          };

          const mergedTransactions = mergeTransactions(
            prev?.transactions || [],
            result.transactions
          );

          return {
            summary: {
              totalEarnings: mergedTransactions.reduce(
                (sum, t) => (t.type === "EARNING" ? sum + t.amount : sum),
                0
              ),
              totalExpenses: mergedTransactions.reduce(
                (sum, t) => (t.type === "EXPENSE" ? sum + t.amount : sum),
                0
              ),
              netAmount: mergedTransactions.reduce(
                (sum, t) =>
                  t.type === "EARNING" ? sum + t.amount : sum - t.amount,
                0
              )
            },
            transactions: mergedTransactions
          };
        });
      });

      toast.success("Data analyzed successfully!");
    },
    onSuccess: () => {
      toast.success("Data analyzed successfully!");
    },
    onError: (error) => {
      toast.error("Error analyzing data");
      console.error("Error processing file:", error);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, {
            type: "binary",
            cellDates: true,
            dateNF: "yyyy-mm-dd"
          });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false
          });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  const processData = (data?: AnalyzedData | null) => {
    if (!data) return [];

    const grouped: {
      [key: string]: { in: Transaction[]; out: Transaction[] };
    } = {};

    data.transactions.forEach((transaction) => {
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

  const processedData = processData(analyzedData);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  useEffect(() => {
    if (processingChunk.current === processingChunk.total) {
      setCurrentMonthIndex(0);
    }
    if (processingChunk.current < processingChunk.total) {
      toast.info(
        `Processing chunk ${processingChunk.current + 1} of ${
          processingChunk.total
        }`
      );
    }
  }, [processingChunk]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium">Date Range</h3>
          <DatePickerWithRange
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            className="[&>div]:w-[300px]"
          />
        </div>
        {dateRange?.from && dateRange?.to && (
          <p className="text-sm text-muted-foreground">
            Showing transactions from{" "}
            {dateRange.from.toLocaleDateString("en-US")} to{" "}
            {dateRange.to.toLocaleDateString("en-US")}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <FileUpIcon className="w-6 h-6 mb-2 text-gray-500" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-gray-500">Excel files only</p>
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv,.pdf"
            onChange={handleFileUpload}
            disabled={isPending}
          />
        </label>
      </div>

      {processingChunk.total > 0 && (
        <div className="flex flex-col gap-4 w-full text-center">
          <p className="text-xs text-gray-500">
            Processing chunk... {processingChunk.current} of{" "}
            {processingChunk.total}
          </p>
          <Progress
            value={(processingChunk.current / processingChunk.total) * 100}
          />
        </div>
      )}

      {rawData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Uploaded Data Preview</h3>
          <div className="border rounded-lg overflow-x-auto h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {Object.keys(rawData[0]).map((header) => (
                    <th
                      key={header}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rawData.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value: unknown, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm"
                      >
                        {value as string}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {analyzedData && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">Total Earnings</h3>
              <p className="text-2xl text-green-600">
                ${analyzedData.summary.totalEarnings.toFixed(2)}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">Total Expenses</h3>
              <p className="text-2xl text-red-600">
                ${analyzedData.summary.totalExpenses.toFixed(2)}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">Net Amount</h3>
              <p
                className={`text-2xl ${
                  analyzedData.summary.netAmount >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                ${analyzedData.summary.netAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cash Flow Details</h3>
            <div className="border rounded-lg overflow-x-auto">
              <div className="min-w-full divide-y divide-gray-200">
                {processedData.length > 0 && (
                  <div
                    key={processedData[currentMonthIndex][0]}
                    className="p-4 even:bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handlePrevMonth}
                          disabled={currentMonthIndex === 0}
                          className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ←
                        </button>
                        <h4 className="font-medium">
                          {new Date(
                            processedData[currentMonthIndex][0] + "-01"
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric"
                          })}
                        </h4>
                        <button
                          onClick={handleNextMonth}
                          disabled={
                            currentMonthIndex === processedData.length - 1
                          }
                          className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          →
                        </button>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1">
                          <span className="text-green-600">↑</span>
                          <span className="text-green-600">
                            $
                            {processedData[currentMonthIndex][1].in
                              .reduce((sum, t) => sum + t.amount, 0)
                              .toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-red-600">↓</span>
                          <span className="text-red-600">
                            $
                            {processedData[currentMonthIndex][1].out
                              .reduce((sum, t) => sum + t.amount, 0)
                              .toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Transactions</h3>
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
                            {(() => {
                              const transactions = [
                                ...processedData[currentMonthIndex][1].in,
                                ...processedData[currentMonthIndex][1].out
                              ];

                              // Group transactions by group and then by category
                              const groups = transactions.reduce(
                                (acc, transaction) => {
                                  const group =
                                    transaction.group || "Uncategorized";
                                  if (!acc[group]) acc[group] = {};
                                  const category =
                                    transaction.category || "Uncategorized";
                                  if (!acc[group][category])
                                    acc[group][category] = [];
                                  acc[group][category].push(transaction);
                                  return acc;
                                },
                                {} as Record<
                                  string,
                                  Record<string, Transaction[]>
                                >
                              );

                              return Object.entries(groups).map(
                                ([groupName, categories]) => (
                                  <Fragment key={groupName}>
                                    {/* Group Header */}
                                    <tr>
                                      <td
                                        colSpan={7}
                                        className="px-6 py-3 bg-gray-200"
                                      >
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">
                                            {groupName}
                                          </span>
                                          <span className="text-sm">
                                            $
                                            {Object.values(categories)
                                              .reduce(
                                                (sum, cat) =>
                                                  sum +
                                                  cat.reduce(
                                                    (s, t) => s + t.amount,
                                                    0
                                                  ),
                                                0
                                              )
                                              .toFixed(2)}
                                          </span>
                                        </div>
                                      </td>
                                    </tr>

                                    {Object.entries(categories).map(
                                      ([category, transactions]) => (
                                        <Fragment
                                          key={`${groupName}-${category}`}
                                        >
                                          <tr
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() =>
                                              toggleCategory(category)
                                            }
                                          >
                                            <td
                                              colSpan={7}
                                              className="px-6 py-3 bg-gray-100"
                                            >
                                              <div className="flex justify-between items-center">
                                                <span className="font-medium">
                                                  {category}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm">
                                                    $
                                                    {transactions
                                                      .reduce(
                                                        (sum, t) =>
                                                          sum + t.amount,
                                                        0
                                                      )
                                                      .toFixed(2)}
                                                  </span>
                                                  <svg
                                                    className={`w-4 h-4 transform transition-transform ${
                                                      expandedCategories.has(
                                                        category
                                                      )
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
                                          {expandedCategories.has(category) &&
                                            transactions.map(
                                              (transaction, index) => (
                                                <tr key={index}>
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {transaction.description}
                                                  </td>
                                                  <td
                                                    className={`px-6 py-4 whitespace-nowrap text-sm ${
                                                      transaction.type ===
                                                      "EARNING"
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                    }`}
                                                  >
                                                    $
                                                    {transaction.amount.toFixed(
                                                      2
                                                    )}
                                                  </td>
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {transaction.category}
                                                  </td>
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {transaction.type}
                                                  </td>
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex gap-1 flex-wrap">
                                                      {transaction.tags.map(
                                                        (
                                                          tag: string,
                                                          tagIndex: number
                                                        ) => (
                                                          <span
                                                            key={tagIndex}
                                                            className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                                                          >
                                                            {tag}
                                                          </span>
                                                        )
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {transaction.group}
                                                  </td>
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {transaction.date}
                                                  </td>
                                                </tr>
                                              )
                                            )}
                                        </Fragment>
                                      )
                                    )}
                                  </Fragment>
                                )
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
