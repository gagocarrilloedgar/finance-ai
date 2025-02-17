import { FileUpIcon } from "lucide-react";

interface FileUploaderProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isDisabled?: boolean;
}

export function FileUploader({ onFileChange, isDisabled }: FileUploaderProps) {
  return (
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
          accept=".xlsx,.csv,.pdf"
          onChange={onFileChange}
          disabled={isDisabled}
        />
      </label>
    </div>
  );
}
