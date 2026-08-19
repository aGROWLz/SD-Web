import { describe, expect, it } from 'vitest';
import {
  assertGenerationAccessUpdate,
  assertRelayStationCanDelete,
  assertRelayStationState,
  normalizeRelayBaseUrl,
} from '../src/domain/relay-station';

describe('normalizeRelayBaseUrl', () => {
  it('removes trailing slashes without duplicating api/v3', () => {
    expect(normalizeRelayBaseUrl('https://relay.example.com/api/v3/'))
      .toBe('https://relay.example.com/api/v3');
  });

  it('accepts a relay origin and appends api/v3', () => {
    expect(normalizeRelayBaseUrl('https://relay.example.com'))
      .toBe('https://relay.example.com/api/v3');
  });

  it('rejects unsupported URL protocols', () => {
    expect(() => normalizeRelayBaseUrl('file:///tmp/api'))
      .toThrow('中转站 URL');
  });
});

describe('assertRelayStationCanDelete', () => {
  it('requires switching away from the primary station before deletion', () => {
    expect(() => assertRelayStationCanDelete(true, 0)).toThrow('请先切换主站');
  });

  it('rejects deleting a station with historical tasks', () => {
    expect(() => assertRelayStationCanDelete(false, 1)).toThrow('已有任务使用');
  });
});

describe('assertGenerationAccessUpdate', () => {
  it('does not allow disabling generation for an administrator', () => {
    expect(() => assertGenerationAccessUpdate('ADMIN', false))
      .toThrow('不能禁用管理员的生成权限');
  });

  it('allows toggling generation for a normal user', () => {
    expect(() => assertGenerationAccessUpdate('USER', false)).not.toThrow();
  });
});

describe('assertRelayStationState', () => {
  it('does not allow an inactive primary station', () => {
    expect(() => assertRelayStationState(true, false))
      .toThrow('主中转站不能停用');
  });

  it('allows inactive secondary stations', () => {
    expect(() => assertRelayStationState(false, false)).not.toThrow();
  });
});
