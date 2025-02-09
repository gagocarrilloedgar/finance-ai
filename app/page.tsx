import { FileUpload } from "@/components/FileUpload";

export default function Home() {
  return (
    <main className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Financial Data Analyzer</h1>
        <FileUpload />
      </div>
    </main>
  );
}
