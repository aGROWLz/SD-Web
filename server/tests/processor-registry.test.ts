import { describe, expect, it } from 'vitest';
import { markProcessorConfigured } from '../src/queue/processor-registry';

describe('markProcessorConfigured', () => {
  it('marks each queue only once', () => {
    const queue = {};
    expect(markProcessorConfigured(queue)).toBe(true);
    expect(markProcessorConfigured(queue)).toBe(false);
    expect(markProcessorConfigured({})).toBe(true);
  });
});
