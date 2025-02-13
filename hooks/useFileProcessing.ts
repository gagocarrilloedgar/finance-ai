/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from "xlsx";
import { useAtom, useSetAtom } from "jotai";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  analyzedDataAtom,
  parsingFileAtom,
  processingChunkAtom,
  rawDataAtom,
  Transaction
} from "@/store/atoms";

export const useFileProcessing = () => {
  const [rawData, setRawData] = useAtom(rawDataAtom) as [
    any[],
    (data: any[]) => void
  ];
  const setAnalyzedData = useSetAtom(analyzedDataAtom);
  const setProcessingChunk = useSetAtom(processingChunkAtom);
  const setParsingFile = useSetAtom(parsingFileAtom);

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

  const { mutate: handleFileUpload, isPending } = useMutation({
    mutationFn: async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) throw new Error("No file uploaded");
      let data: any[] = [];

      if (file.type === "application/pdf") {
        setParsingFile(true);
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/files", {
          method: "POST",
          body: formData
        });
        const respData = await response.json();
        setRawData(respData);
        data = respData;
        setParsingFile(false);
      } else {
        data = await readExcelFile(file);
        setRawData(data);
      }

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
      const promises = chunks.map(async (chunk) => {
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

        return result.transactions;
      });

      // Wait for all chunks to be processed
      const allResults = await Promise.all(promises);
      const flattenedTransactions = allResults.flat();
      const cleanedTransactions = cleanUPTransactions(flattenedTransactions);

      setAnalyzedData((prevData) => {
        const existingTransactions = prevData?.transactions || [];

        // Merge and remove duplicates
        const mergedTransactions = [...existingTransactions];
        cleanedTransactions.forEach((newTrans) => {
          const isDuplicate = existingTransactions.some(
            (existingTrans) =>
              existingTrans.amount === newTrans.amount &&
              existingTrans.description === newTrans.description &&
              existingTrans.date === newTrans.date
          );

          if (!isDuplicate) {
            mergedTransactions.push(newTrans);
          }
        });

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
                t.type === "EARNING" ? sum + t.amount : sum + t.amount,
              0
            )
          },
          transactions: mergedTransactions
        };
      });
    },
    onSuccess: () => {
      setProcessingChunk({
        current: 0,
        total: 0
      });
      toast.success("Data analyzed successfully!");
    },
    onError: (error) => {
      setAnalyzedData(null);
      toast.error("Error analyzing data");
      console.error("Error processing file:", error);
    }
  });

  return {
    rawData,
    handleFileUpload,
    isPending
  };
};

const cleanUPTransactions = (allTransactions: Transaction[]) => {
  // Remove all prefunding (description contains with "Prefunding") transactions
  const filteredData = allTransactions.filter(
    (t) => !t.description?.toString().toLowerCase().includes("prefunding")
  );

  const orderedData = filteredData?.sort((a, b) =>
    a.description.localeCompare(b.description)
  );

  // Look for transactions with the same description and same amount absolute value and add a tag "cancelled" to both
  const cancelledData = orderedData?.filter((t) =>
    orderedData?.some(
      (t2) =>
        t2.description === t.description &&
        Math.abs(t2.amount) === Math.abs(t.amount) &&
        t2.type !== t.type
    )
  );

  // Add the tag "cancelled" to the cancelledData
  cancelledData?.forEach((t) => {
    t.tags = ["cancelled"];
  });

  // remove cancelledData from filteredData
  const nonCancelledData = orderedData?.filter(
    (t) => !cancelledData?.includes(t)
  );

  return nonCancelledData;
};
