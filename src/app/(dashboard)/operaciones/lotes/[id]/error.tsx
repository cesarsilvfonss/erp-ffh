"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Batch Details Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center">
      <div className="bg-rose-500/10 text-rose-400 p-6 rounded-2xl border border-rose-500/20 max-w-2xl w-full">
        <h2 className="text-xl font-bold mb-2">Error Crítico Detectado</h2>
        <p className="text-zinc-300 mb-4">Por favor, toma una captura de este error y envíasela al asistente para poder solucionarlo:</p>
        <div className="bg-zinc-950 p-4 rounded-lg text-left overflow-auto font-mono text-xs text-rose-300">
          <p className="font-bold">Message: {error.message}</p>
          {error.digest && <p>Digest: {error.digest}</p>}
          <p className="mt-2 text-zinc-500">{error.stack}</p>
        </div>
        <button
          onClick={() => reset()}
          className="mt-6 bg-rose-500 hover:bg-rose-600 text-zinc-950 px-6 py-2 rounded-lg font-bold transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
