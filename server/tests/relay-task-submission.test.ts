import { describe, expect, it, vi } from 'vitest';
import { submitRelayTask } from '../src/services/relay-task-submission.service';

describe('submitRelayTask', () => {
  it('submits the relay alias while preserving stored standard task params', async () => {
    const submitTask = vi.fn().mockResolvedValue('remote-task-1');
    const params = {
      model: 'doubao-seedance-2-5',
      content: [{ type: 'text', text: 'test' }],
    };

    const taskId = await submitRelayTask(
      { submitTask },
      params,
      { 'doubao-seedance-2-5': 'seed2' },
    );

    expect(taskId).toBe('remote-task-1');
    expect(submitTask).toHaveBeenCalledWith({ ...params, model: 'seed2' });
    expect(params.model).toBe('doubao-seedance-2-5');
  });

  it('submits the versioned API model name when no alias is configured', async () => {
    const submitTask = vi.fn().mockResolvedValue('remote-task-2');
    const params = {
      model: 'doubao-seedance-2-0-fast',
      content: [{ type: 'text', text: 'test' }],
    };

    await submitRelayTask({ submitTask }, params, {});

    expect(submitTask).toHaveBeenCalledWith({
      ...params,
      model: 'doubao-seedance-2-0-fast-260128',
    });
    expect(params.model).toBe('doubao-seedance-2-0-fast');
  });
});
