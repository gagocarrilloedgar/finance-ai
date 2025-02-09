"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";

const formSchema = z.object({
  file: z.instanceof(File).refine((file) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ext === "csv" || ext === "xlsx" || ext === "xls";
  }, "Only CSV and Excel files are allowed")
});

type FormValues = z.infer<typeof formSchema>;

interface AnalyzedData {
  transactions: Array<{
    amount: number;
    description: string;
    category: string;
    type: "EARNING" | "EXPENSE";
    tags: string[];
    group: string;
  }>;
  summary: {
    totalEarnings: number;
    totalExpenses: number;
    netAmount: number;
    topCategories: Array<{ category: string; amount: number }>;
    topTags: Array<{ tag: string; count: number }>;
  };
}

export function FileUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedData | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema)
  });

  const processFile = async (file: File) => {
    return new Promise((resolve, reject) => {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "csv") {
        Papa.parse(file, {
          complete: (results) => resolve(results.data),
          header: true,
          error: (error) => reject(error)
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsBinaryString(file);
      }
    });
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      const processedData = await processFile(data.file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: processedData })
      });

      if (!response.ok) {
        throw new Error("Failed to analyze data");
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value);
        }
      }

      const analyzedResult = JSON.parse(result) as AnalyzedData;
      setAnalyzedData(analyzedResult);

      toast.success("Success!", {
        description: "Your file has been processed successfully."
      });

    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error", {
        description: "There was a problem processing your file."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="file">Upload Financial Data</Label>
          <Input
            id="file"
            type="file"
            accept=".csv,.xlsx,.xls"
            {...register("file")}
            disabled={isLoading}
          />
          {errors.file && (
            <p className="text-sm text-red-500 mt-1">
              {errors.file.message?.toString()}
            </p>
          )}
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Upload and Analyze"}
        </Button>
      </form>

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
              <p className={`text-2xl ${analyzedData.summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${analyzedData.summary.netAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Transactions</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyzedData.transactions.map((transaction, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{transaction.description}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        transaction.type === 'EARNING' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{transaction.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{transaction.type}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
