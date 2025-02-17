"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { analyzedDataAtom, extraCategories } from "@/store/atoms";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { groups } from "@/store/atoms";

export function ManualTransactionSheet() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: "",
    description: "",
    amount: "",
    type: "EXPENSE" as "EARNING" | "EXPENSE",
    category: "",
    group: "",
    tags: ""
  });
  const [analyzedData, setAnalyzedData] = useAtom(analyzedDataAtom);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const transaction = {
      date: newTransaction.date,
      description: newTransaction.description,
      amount:
        newTransaction.type === "EARNING"
          ? Math.abs(parseFloat(newTransaction.amount))
          : -Math.abs(parseFloat(newTransaction.amount)),
      category: newTransaction.category,
      group: newTransaction.group,
      tags: newTransaction.tags.split(",").map((t) => t.trim()),
      type: newTransaction.type
    };

    if (!analyzedData) return;

    setAnalyzedData({
      ...analyzedData,
      transactions: [...analyzedData.transactions, transaction]
    });
    setIsSheetOpen(false);
    setNewTransaction({
      date: "",
      description: "",
      amount: "",
      type: "EXPENSE",
      category: "",
      group: "",
      tags: ""
    });
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">Add Transaction</Button>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Manual Transaction</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleAddTransaction} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              required
              value={newTransaction.date}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  date: e.target.value
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={newTransaction.description}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  description: e.target.value
                }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={newTransaction.amount}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  amount: e.target.value
                }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select
              value={newTransaction.type}
              onValueChange={(value: "EARNING" | "EXPENSE") =>
                setNewTransaction((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EARNING">Earning</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={newTransaction.category}
              onValueChange={(value) =>
                setNewTransaction((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {extraCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Group</Label>
            <Select
              value={newTransaction.group}
              onValueChange={(value) =>
                setNewTransaction((prev) => ({ ...prev, group: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.name} value={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={newTransaction.tags}
              onChange={(e) =>
                setNewTransaction((prev) => ({
                  ...prev,
                  tags: e.target.value
                }))
              }
            />
          </div>
          <Button type="submit" className="w-full">
            Add Transaction
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
