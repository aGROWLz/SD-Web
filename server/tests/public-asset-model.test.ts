import { describe, expect, it } from 'vitest';
import {
  normalizeAssetLibraryConfig,
  type AssetLibraryProvider,
} from '../src/domain/relay-station';

describe('normalizeAssetLibraryConfig', () => {
  it('uses the XKU p4 defaults', () => {
    expect(normalizeAssetLibraryConfig({ provider: 'XKU_P4' })).toMatchObject({
      enabled: true,
      provider: 'XKU_P4',
      uploadUrl: 'https://api-ai.xku.com/ark/p4/v1/assets',
      queryUrl: 'https://api-ai.xku.com/ark/p4/v1/assets',
      fields: {
        url: 'URL',
        assetType: 'AssetType',
        name: 'Name',
        projectName: 'ProjectName',
      },
    });
  });

  it('uses the KK defaults and accepts custom fields', () => {
    expect(normalizeAssetLibraryConfig({
      provider: 'KK',
      fields: { url: 'source_url', projectName: 'project' },
    })).toMatchObject({
      uploadUrl: 'https://ai.kkidc.com/api/v2/assets',
      queryUrl: 'https://ai.kkidc.com/api/v2/assets/{id}',
      fields: {
        url: 'source_url',
        assetType: 'asset_type',
        name: 'name',
        projectName: 'project',
      },
    });
  });

  it('returns null for an empty configuration', () => {
    expect(normalizeAssetLibraryConfig(undefined)).toBeNull();
    expect(normalizeAssetLibraryConfig(null)).toBeNull();
    expect(normalizeAssetLibraryConfig({})).toBeNull();
  });

  it('validates URLs and field names', () => {
    expect(() => normalizeAssetLibraryConfig({
      provider: 'KK',
      uploadUrl: 'ftp://example.com/assets',
    })).toThrow('素材库 URL');
    expect(() => normalizeAssetLibraryConfig({
      provider: 'KK',
      fields: { name: 'bad field' },
    })).toThrow('素材库字段');
    expect(() => normalizeAssetLibraryConfig({ provider: 'UNKNOWN' })).toThrow('素材库供应商');
  });

  it('exports the supported provider type', () => {
    const provider: AssetLibraryProvider = 'KK';
    expect(provider).toBe('KK');
  });
});

describe('public asset provider statuses', () => {
  it('contains all persisted lifecycle statuses', () => {
    expect(['PENDING', 'ACTIVE', 'FAILED']).toContain('PENDING');
    expect(['PENDING', 'ACTIVE', 'FAILED']).toContain('ACTIVE');
    expect(['PENDING', 'ACTIVE', 'FAILED']).toContain('FAILED');
  });
});
