/// <reference lib="webworker" />

import { generateScheduleAlgorithmically } from '../lib/algorithmic-scheduler';
import type { GenerateScheduleInput } from '../lib/types';

self.onmessage = (event: MessageEvent<Omit<GenerateScheduleInput, 'customInstructions'>>) => {
  const result = generateScheduleAlgorithmically(event.data);
  self.postMessage(result);
};

export {};
