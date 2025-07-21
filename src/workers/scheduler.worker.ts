/// <reference lib="webworker" />

import { eachDayOfInterval, format, parseISO, parse } from 'date-fns';
import { generateScheduleAlgorithmically } from '../lib/algorithmic-scheduler';
import type { GenerateScheduleInput } from '../lib/types';

self.onmessage = (event: MessageEvent<GenerateScheduleInput>) => {
  const result = generateScheduleAlgorithmically(event.data);
  self.postMessage(result);
};

export {};
