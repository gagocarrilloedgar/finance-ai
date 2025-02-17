"use client";
import { FileUpload } from "@/components/FileUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  providersAtom,
  providerOptions,
  openaiApiKeyAtom
} from "@/store/atoms";
import { useAtom } from "jotai";

export default function Home() {
  const [providers, setProviders] = useAtom(providersAtom);
  const [openaiApiKey, setOpenaiApiKey] = useAtom(openaiApiKeyAtom);

  return (
    <main className="container mx-auto p-8">
      <div className="mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold mb-8">Financial Data Analyzer</h1>
          <div className="flex items-center gap-2">
            <div className="flex flex-row items-center gap-2">
              <div className="flex flex-col gap-2">
                <Label>Provider</Label>
                <Select
                  value={providers}
                  onValueChange={(value) => setProviders(value)}
                >
                  <SelectTrigger className="capitalize">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerOptions.map((provider: string) => (
                      <SelectItem
                        className="capitalize"
                        key={provider}
                        value={provider}
                      >
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {providers === "openai" && (
                <div className="flex items-center gap-2 ">
                  <div className="flex flex-col gap-2">
                    <Label>OpenAI api key</Label>
                    <Input
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <FileUpload />
      </div>
    </main>
  );
}
