import { describe, expect, it } from 'vitest';
import {
  assertGenerationAccessUpdate,
  assertRelayStationCanDelete,
  assertRelayStationState,
  normalizeModelRedirects,
  normalizeRelayBaseUrl,
  redirectSeedanceModel,
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

  it('preserves a custom API prefix when automatic completion is disabled', () => {
    expect(normalizeRelayBaseUrl('https://relay.example.com/custom/v1/?source=admin#route', false))
      .toBe('https://relay.example.com/custom/v1');
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

describe('relay station model redirects', () => {
  it('redirects the selected standard model without mutating stored task params', () => {
    const params = { model: 'doubao-seedance-2-5', duration: 4 };

    const redirected = redirectSeedanceModel(params, {
      'doubao-seedance-2-5': 'seed2',
    });

    expect(redirected).toEqual({ model: 'seed2', duration: 4 });
    expect(params.model).toBe('doubao-seedance-2-5');
  });

  it('uses the versioned API model when its custom redirect is blank or missing', () => {
    expect(redirectSeedanceModel(
      { model: 'doubao-seedance-2-0-fast' },
      { 'doubao-seedance-2-0-fast': '   ' },
    )).toEqual({ model: 'doubao-seedance-2-0-fast-260128' });
  });

  it.each([
    ['doubao-seedance-2-0', 'doubao-seedance-2-0-260128'],
    ['doubao-seedance-2-0-fast', 'doubao-seedance-2-0-fast-260128'],
    ['doubao-seedance-2-0-mini', 'doubao-seedance-2-0-mini-260615'],
    ['doubao-seedance-2-5', 'doubao-seedance-2-5-260628'],
  ])('maps %s to API model %s by default', (model, expected) => {
    expect(redirectSeedanceModel({ model }, {})).toEqual({ model: expected });
  });

  it('trims aliases and removes blank entries before persistence', () => {
    expect(normalizeModelRedirects({
      'doubao-seedance-2-5': ' seed2 ',
      'doubao-seedance-2-0': '',
    })).toEqual({ 'doubao-seedance-2-5': 'seed2' });
  });

  it('rejects unsupported model keys and control characters', () => {
    expect(() => normalizeModelRedirects({ unknown: 'seed2' }))
      .toThrow('模型重定向');
    expect(() => normalizeModelRedirects({ 'doubao-seedance-2-5': 'seed\n2' }))
      .toThrow('模型重定向');
    expect(() => normalizeModelRedirects({ 'doubao-seedance-2-5': 'seed\u00852' }))
      .toThrow('模型重定向');
  });
});
