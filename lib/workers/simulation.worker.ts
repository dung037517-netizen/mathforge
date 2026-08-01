/// <reference lib="webworker" />

/**
 * Monte Carlo simulation worker.
 *
 * The worker owns the whole simulation loop so that even a two-million-path
 * run never occupies the main thread. Work is still chunked internally: after
 * each batch the worker posts progress, which keeps the UI's progress bar
 * honest and gives the `cancel` message a chance to be delivered between
 * batches.
 */

import { createSimulation, validateSimulationConfig } from "@/lib/math-engine";
import type {
  SimulationRequest,
  SimulationResponse,
  SimulationRunRequest,
} from "@/types/math";

const scope = self as unknown as DedicatedWorkerGlobalScope;

/** Request ids that received a `cancel` before or during execution. */
const cancelled = new Set<string>();

function post(message: SimulationResponse): void {
  scope.postMessage(message);
}

/** Batch size tuned so a batch costs a few milliseconds on a mid-range laptop. */
function batchSizeFor(totalPaths: number): number {
  return Math.max(250, Math.min(20_000, Math.ceil(totalPaths / 200)));
}

function run(request: SimulationRunRequest): void {
  const { requestId, config } = request;

  const validation = validateSimulationConfig(config);
  if (!validation.ok) {
    post({ type: "error", requestId, error: validation.error });
    return;
  }

  const started = Date.now();

  try {
    const simulation = createSimulation(validation.value);
    const batchSize = batchSizeFor(simulation.totalPaths);
    let lastReport = 0;

    while (!simulation.isComplete) {
      if (cancelled.has(requestId)) {
        cancelled.delete(requestId);
        post({ type: "cancelled", requestId });
        return;
      }

      simulation.runBatch(batchSize);

      // Throttle progress messages to ~1% granularity to avoid flooding the
      // structured-clone channel with thousands of tiny updates.
      const progress = simulation.completedPaths / simulation.totalPaths;
      if (progress - lastReport >= 0.01 || simulation.isComplete) {
        lastReport = progress;
        post({
          type: "progress",
          requestId,
          progress,
          completedPaths: simulation.completedPaths,
        });
      }
    }

    post({
      type: "done",
      requestId,
      summary: simulation.finish(Date.now() - started),
    });
  } catch (error) {
    post({
      type: "error",
      requestId,
      error: {
        code: "EVAL_ERROR",
        message: error instanceof Error ? error.message : "The simulation failed unexpectedly.",
      },
    });
  }
}

scope.addEventListener("message", (event: MessageEvent<SimulationRequest>) => {
  const request = event.data;
  if (request.type === "cancel") {
    cancelled.add(request.requestId);
    return;
  }
  if (request.type === "run") {
    run(request);
  }
});

export {};
