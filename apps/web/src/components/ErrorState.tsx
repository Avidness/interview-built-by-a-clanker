import { ApiError } from "~/lib/api";

interface ErrorStateProps {
  error: unknown;
  onRetry: () => void;
  title?: string;
}

function describe(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export function ErrorState({ error, onRetry, title = "Something went wrong" }: ErrorStateProps) {
  return (
    <div role="alert" className="text-center py-16 bg-red-50 border border-red-200 rounded-xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-red-700 mb-4">{describe(error)}</p>
      <button type="button" onClick={onRetry} className="text-indigo-600 hover:text-indigo-700 font-medium">
        Try again
      </button>
    </div>
  );
}
