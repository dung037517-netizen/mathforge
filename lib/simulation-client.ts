/**
 * Client-side driver for Monte Carlo simulations.
 *
 * Two execution strategies, chosen at runtime:
 *
 *   1. **Web Worker** (preferred). The entire simulation runs off the main
 *      thread, so the UI stays at 60 fps regardless of path count.
 *   2. **Cooperative main-thread scheduler** (fallback). Where workers are
 *      unavailable — some embedded webviews, or a bundling environment that
 *      cannot resolve the worker URL — the same batched runner is driven one
 *      batch per macrotask. Yielding between batches means the longest task is
 *      a single batch (a few milliseconds), so the page still never freezes.
 *
 * Both strategies share `createSimulation` from the engine, so results are
 * bit-for-bit identical for a given seed.
 */

import { createSimulation, validateSimulationConfig } from "@/lib/math-engine";
import type {
  EngineError,
  SimulationConfig,
  SimulationResponse,
  SimulationSummary,
} from "@/types/math";

export type SimulationStrategy = "worker" | "main-thread";

export interface SimulationHandle {
  /** Resolves with the summary, or rejects with an {@link EngineError}. */
  readonly completed: Promise<SimulationSummary>;
  /** Request cancellation; the promise rejects with a `CANCELLED` error. */
  cancel(): void;
  readonly strategy: SimulationStrategy;
}

export interface SimulationCallbacks {
  onProgress?: (progress: number, completedPaths: number) => void;
}

export class SimulationCancelledError extends Error {
  constructor() {
    super("The simulation was cancelled.");
    this.name = "SimulationCancelledError";
  }
}

let workerSupported: boolean | null = null;

function createWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (workerSupported === false) return null;
  try {
    const worker = new Worker(new URL("./workers/simulation.worker.ts", import.meta.url), {
      type: "module",
      name: "mathforge-simulation",
    });
    workerSupported = true;
    return worker;
  } catch {
    // Cache the failure so we do not pay the construction cost on every run.
    workerSupported = false;
    return null;
  }
}

let requestCounter = 0;
function nextRequestId(): string {
  requestCounter += 1;
  return `sim-${Date.now().toString(36)}-${requestCounter}`;
}

/** Yield to the event loop so the browser can paint and process input. */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function runOnMainThread(
  config: SimulationConfig,
  callbacks: SimulationCallbacks,
): SimulationHandle {
  let cancelRequested = false;

  const completed = (async (): Promise<SimulationSummary> => {
    const validation = validateSimulationConfig(config);
    if (!validation.ok) throw validation.error;

    const started =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const simulation = createSimulation(validation.value);
    // Small batches keep every task comfortably under one animation frame.
    const batchSize = Math.max(200, Math.min(5_000, Math.ceil(simulation.totalPaths / 250)));
    let lastReport = 0;

    while (!simulation.isComplete) {
      if (cancelRequested) throw new SimulationCancelledError();

      simulation.runBatch(batchSize);

      const progress = simulation.completedPaths / simulation.totalPaths;
      if (progress - lastReport >= 0.01 || simulation.isComplete) {
        lastReport = progress;
        callbacks.onProgress?.(progress, simulation.completedPaths);
      }

      await yieldToEventLoop();
    }

    const elapsed =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;
    return simulation.finish(elapsed);
  })();

  return {
    completed,
    cancel: () => {
      cancelRequested = true;
    },
    strategy: "main-thread",
  };
}

function runInWorker(
  worker: Worker,
  config: SimulationConfig,
  callbacks: SimulationCallbacks,
): SimulationHandle {
  const requestId = nextRequestId();
  let settled = false;

  const completed = new Promise<SimulationSummary>((resolve, reject) => {
    const cleanup = (): void => {
      settled = true;
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();
    };

    const handleMessage = (event: MessageEvent<SimulationResponse>): void => {
      const message = event.data;
      if (message.requestId !== requestId) return;

      switch (message.type) {
        case "progress":
          callbacks.onProgress?.(message.progress, message.completedPaths);
          return;
        case "done":
          cleanup();
          resolve(message.summary);
          return;
        case "cancelled":
          cleanup();
          reject(new SimulationCancelledError());
          return;
        case "error":
          cleanup();
          reject(message.error);
          return;
      }
    };

    const handleError = (): void => {
      cleanup();
      const error: EngineError = {
        code: "EVAL_ERROR",
        message: "The simulation worker stopped unexpectedly.",
      };
      reject(error);
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({ type: "run", requestId, config });
  });

  return {
    completed,
    cancel: () => {
      if (settled) return;
      worker.postMessage({ type: "cancel", requestId });
    },
    strategy: "worker",
  };
}

/**
 * Start a simulation, preferring a Web Worker and transparently falling back
 * to the cooperative main-thread scheduler.
 */
export function runSimulation(
  config: SimulationConfig,
  callbacks: SimulationCallbacks = {},
): SimulationHandle {
  const worker = createWorker();
  if (worker === null) return runOnMainThread(config, callbacks);
  return runInWorker(worker, config, callbacks);
}

/** Whether the current environment can offload work to a Web Worker. */
export function supportsWorkerOffload(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined" && workerSupported !== false;
}

/** Narrow an unknown rejection value to an EngineError-shaped object. */
export function toEngineError(error: unknown): EngineError {
  if (error instanceof SimulationCancelledError) {
    return { code: "EVAL_ERROR", message: error.message };
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return error as EngineError;
  }
  return {
    code: "EVAL_ERROR",
    message: error instanceof Error ? error.message : "The simulation failed.",
  };
}
