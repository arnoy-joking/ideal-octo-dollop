/// <reference lib="webworker" />
import type { GenerateScheduleInput } from '../lib/types';
import { generateScheduleAlgorithmically } from '../lib/algorithmic-scheduler';


self.onmessage = async (event: MessageEvent<GenerateScheduleInput>) => {
  try {
    const finalSchedule = generateScheduleAlgorithmically(event.data);
    self.postMessage(finalSchedule);
  } catch (error) {
    console.error('Error in scheduler worker:', error);
    self.postMessage({ error: (error as Error).message || 'An unknown error occurred in the scheduler.' });
  }
};

export {};
