"use client";

import { useEffect } from "react";

export function ChunkErrorHandler() {
  useEffect(() => {
    // Handle chunk loading errors with retry logic
    const handleChunkError = (event: ErrorEvent) => {
      const error = event.error;
      if (
        error &&
        error.message &&
        (error.message.includes("chunk") ||
          error.message.includes("Loading chunk") ||
          error.message.includes("ChunkLoadError"))
      ) {
        console.warn("Chunk loading error detected, reloading page...");
        // Retry after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    // Handle unhandled promise rejections (chunk loading failures)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (
        reason &&
        typeof reason === "object" &&
        "message" in reason &&
        typeof reason.message === "string" &&
        (reason.message.includes("chunk") ||
          reason.message.includes("Loading chunk") ||
          reason.message.includes("ChunkLoadError"))
      ) {
        console.warn("Chunk loading promise rejection, reloading page...");
        event.preventDefault();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    window.addEventListener("error", handleChunkError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}




