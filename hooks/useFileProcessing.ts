/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  analyzedDataAtom,
  parsingFileAtom,
  processingChunkAtom,
  rawDataAtom,
  Transaction,
  providersAtom,
  openaiApiKeyAtom
} from "@/store/atoms";
import Papa from "papaparse";

export const useFileProcessing = () => {
  const [rawData, setRawData] = useAtom(rawDataAtom) as [
    any[],
    (data: any[]) => void
  ];
  const setAnalyzedData = useSetAtom(analyzedDataAtom);
  const setProcessingChunk = useSetAtom(processingChunkAtom);
  const setParsingFile = useSetAtom(parsingFileAtom);
  const provider = useAtomValue(providersAtom);
  const openaiApiKey = useAtomValue(openaiApiKeyAtom);

  const readFile = async (file: File): Promise<any[]> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error("No file data found");

          // Handle CSV files
          if (file.type === "text/csv") {
            const results = Papa.parse(data as string, { header: true });
            resolve(results.data);
            return;
          }

          const workbook = new ExcelJS.Workbook();
          const buffer = data as ArrayBuffer;

          if (file.name.endsWith(".xls")) {
            await workbook.xlsx.load(buffer);
          } else {
            await workbook.xlsx.load(buffer);
          }

          const worksheet = workbook.worksheets[0];
          const jsonData = worksheet
            .getSheetValues()
            .slice(1)
            .map((row) => {
              const obj: any = {};
              worksheet.columns.forEach((column, index) => {
                obj[column.header?.toString() || `column${index}`] = (
                  row as any[]
                )[index + 1];
              });
              return obj;
            });

          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);

      // Read file based on type
      if (file.type === "text/csv") {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const { mutate: handleFileUpload, isPending } = useMutation({
    mutationFn: async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (window.location.hostname !== "localhost" && !openaiApiKey) {
        toast.error("OpenAI without apikey is not available yet");
        return;
      }

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
        data = await readFile(file);
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
          body: JSON.stringify({ data: chunk, model: provider, openaiApiKey })
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
  console.log({ allTransactions });
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

  cancelledData?.forEach((t) => {
    t.tags = ["cancelled"];
  });

  // remove cancelledData from filteredData
  const nonCancelledData = orderedData?.filter(
    (t) => !cancelledData?.includes(t)
  );

  return nonCancelledData;
};
