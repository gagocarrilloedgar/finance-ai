"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { toast } from "sonner";
import { DatePickerWithRange } from "@/components/ui/datepicker-with-range";
import { Progress } from "./ui/progress";
import { FileUploader } from "./ui/file-uploader";
import { TransactionSummary } from "./TransactionSummary";
import { TransactionList } from "./TransactionList";
import { useFileProcessing } from "@/hooks/useFileProcessing";
import { useTransactionProcessing } from "@/hooks/useTransactionProcessing";
import {
  analyzedDataAtom,
  dateRangeAtom,
  currentMonthIndexAtom,
  processingChunkAtom
} from "@/store/atoms";

export function FileUpload() {
  const [analyzedData] = useAtom(analyzedDataAtom);
  const [dateRange, setDateRange] = useAtom(dateRangeAtom);
  const [currentMonthIndex, setCurrentMonthIndex] = useAtom(
    currentMonthIndexAtom
  );
  const [processingChunk] = useAtom(processingChunkAtom);

  const { rawData, handleFileUpload, isPending } = useFileProcessing();
  const { processData } = useTransactionProcessing();

  const processedData = processData(analyzedData);

  const handleNextMonth = () => {
    setCurrentMonthIndex((prev) =>
      Math.min(prev + 1, processedData.length - 1)
    );
  };

  const handlePrevMonth = () => {
    setCurrentMonthIndex((prev) => Math.max(prev - 1, 0));
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
  }, [processingChunk, setCurrentMonthIndex]);

  console.log({ rawData, analyzedData: analyzedData?.transactions });

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

      <FileUploader onFileChange={handleFileUpload} isDisabled={isPending} />

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
          <TransactionSummary data={analyzedData} />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cash Flow Details</h3>
            {processedData.length > 0 && (
              <TransactionList
                transactions={processedData[currentMonthIndex][1]}
                monthLabel={new Date(
                  processedData[currentMonthIndex][0] + "-01"
                ).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric"
                })}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                isFirstMonth={currentMonthIndex === 0}
                isLastMonth={currentMonthIndex === processedData.length - 1}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
