import { describe, expect, it } from 'vitest';
import { buildTaskHistoryWhere } from '../src/domain/task-query';

describe('task history user scope', () => {
  it('forces mine=true queries to only return the authenticated user tasks', () => {
    expect(buildTaskHistoryWhere('user-1', 'ADMIN', true)).toEqual({ userId: 'user-1' });
  });

  it('keeps administrator-wide history available when mine is not requested', () => {
    expect(buildTaskHistoryWhere('admin-1', 'ADMIN', false)).toEqual({});
    expect(buildTaskHistoryWhere('user-1', 'USER', false)).toEqual({ userId: 'user-1' });
  });
});
