import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  decrypt: vi.fn(),
  encrypt: vi.fn(),
  probe: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  default: {
    relayStation: {
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
      update: mocks.update,
    },
    $transaction: (callback: (tx: any) => unknown) => callback({
      relayStation: {
        create: mocks.create,
        updateMany: mocks.updateMany,
      },
    }),
  },
}));
vi.mock('../src/services/key-encryption.service', () => ({
  KeyEncryptionService: { decrypt: mocks.decrypt, encrypt: mocks.encrypt },
}));
vi.mock('../src/services/relay-station-connection.service', () => ({
  testRelayStationConnection: mocks.probe,
}));

import {
  createRelayStation,
  getRelayStations,
  testRelayStation,
  updateRelayStation,
} from '../src/controllers/relay-station.controller';

describe('testRelayStation controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('probes the configured station without creating a task or exposing its key', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'station-1', baseUrl: 'https://relay.example.com/api/v3', apiKeyEncrypted: 'encrypted' });
    mocks.decrypt.mockReturnValue('secret-key');
    mocks.probe.mockResolvedValue({ ok: true });
    const response = { json: vi.fn() } as any;

    await testRelayStation({ params: { id: 'station-1' } } as any, response);

    expect(mocks.probe).toHaveBeenCalledWith('https://relay.example.com/api/v3', 'secret-key');
    expect(response.json).toHaveBeenCalledWith({ ok: true });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('secret-key');
  });

  it('returns a not-found error for an unknown station', async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(testRelayStation({ params: { id: 'missing' } } as any, {} as any))
      .rejects.toMatchObject({ message: '中转站不存在', statusCode: 404 });
    expect(mocks.probe).not.toHaveBeenCalled();
  });
});

describe('relay station model redirects controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.decrypt.mockReturnValue('secret-key');
    mocks.encrypt.mockReturnValue('encrypted');
  });

  it('returns saved model redirects in the station list', async () => {
    mocks.findMany.mockResolvedValue([{
      id: 'station-1',
      name: '主站',
      baseUrl: 'https://relay.example.com/api/v3',
      appendApiV3: true,
      apiKeyEncrypted: 'encrypted',
      modelRedirects: { 'doubao-seedance-2-5': 'seed2' },
      isActive: true,
      isPrimary: true,
      createdAt: new Date('2026-08-19T00:00:00.000Z'),
      updatedAt: new Date('2026-08-19T00:00:00.000Z'),
      _count: { tasks: 0 },
    }]);
    const response = { json: vi.fn() } as any;

    await getRelayStations({} as any, response);

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      stations: [expect.objectContaining({
        modelRedirects: { 'doubao-seedance-2-5': 'seed2' },
      })],
    }));
  });

  it('normalizes and saves model redirects when creating a station', async () => {
    mocks.create.mockImplementation(async ({ data }: any) => ({
      id: 'station-1',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { tasks: 0 },
    }));
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    await createRelayStation({ body: {
      name: '主站',
      baseUrl: 'https://relay.example.com',
      keyValue: 'secret-key-value',
      modelRedirects: {
        'doubao-seedance-2-5': ' seed2 ',
        'doubao-seedance-2-0': '',
      },
    } } as any, response);

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        modelRedirects: { 'doubao-seedance-2-5': 'seed2' },
      }),
    }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      station: expect.objectContaining({
        modelRedirects: { 'doubao-seedance-2-5': 'seed2' },
      }),
    }));
  });

  it('normalizes and saves model redirects when updating a station', async () => {
    const current = {
      id: 'station-1',
      name: '主站',
      baseUrl: 'https://relay.example.com/api/v3',
      appendApiV3: true,
      modelRedirects: { 'doubao-seedance-2-5': 'old-seed2' },
      apiKeyEncrypted: 'encrypted',
      isActive: true,
      isPrimary: false,
    };
    mocks.findUnique.mockResolvedValue(current);
    mocks.update.mockImplementation(async ({ data }: any) => ({
      ...current,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { tasks: 0 },
    }));
    const response = { json: vi.fn() } as any;

    await updateRelayStation({
      params: { id: 'station-1' },
      body: {
        name: '主站',
        baseUrl: 'https://relay.example.com/api/v3',
        modelRedirects: { 'doubao-seedance-2-5': ' new-seed2 ' },
      },
    } as any, response);

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        modelRedirects: { 'doubao-seedance-2-5': 'new-seed2' },
      }),
    }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      station: expect.objectContaining({
        modelRedirects: { 'doubao-seedance-2-5': 'new-seed2' },
      }),
    }));
  });

  it('does not clear existing model redirects when an update omits them', async () => {
    const current = {
      id: 'station-1',
      name: '主站',
      baseUrl: 'https://relay.example.com/api/v3',
      appendApiV3: true,
      modelRedirects: { 'doubao-seedance-2-5': 'seed2' },
      apiKeyEncrypted: 'encrypted',
      isActive: true,
      isPrimary: false,
    };
    mocks.findUnique.mockResolvedValue(current);
    mocks.update.mockImplementation(async ({ data }: any) => ({
      ...current,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { tasks: 0 },
    }));
    const response = { json: vi.fn() } as any;

    await updateRelayStation({
      params: { id: 'station-1' },
      body: { name: '主站', baseUrl: 'https://relay.example.com/api/v3', isActive: false },
    } as any, response);

    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty('modelRedirects');
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      station: expect.objectContaining({
        modelRedirects: { 'doubao-seedance-2-5': 'seed2' },
      }),
    }));
  });
});

describe('relay station asset library controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.decrypt.mockReturnValue('secret-key');
    mocks.encrypt.mockReturnValue('encrypted');
  });

  const assetLibraryConfig = {
    enabled: true,
    provider: 'XKU_P4',
    uploadUrl: 'https://api-ai.xku.com/ark/p4/v1/assets',
    queryUrl: 'https://api-ai.xku.com/ark/p4/v1/assets/{id}',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    fields: { url: 'URL', assetType: 'AssetType', name: 'Name', projectName: 'ProjectName' },
    projectNameValue: 'demo',
  };

  it('normalizes and persists asset library config on create without exposing station API key', async () => {
    mocks.create.mockImplementation(async ({ data }: any) => ({
      id: 'station-asset', ...data, createdAt: new Date(), updatedAt: new Date(), _count: { tasks: 0 },
    }));
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    await createRelayStation({ body: {
      name: '素材站', baseUrl: 'https://relay.example.com', keyValue: 'secret-key-value', assetLibraryConfig,
    } } as any, response);

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ assetLibraryConfig }),
    }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      station: expect.objectContaining({ assetLibraryConfig }),
    }));
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('secret-key-value');
  });

  it('returns null for omitted asset library config on create', async () => {
    mocks.create.mockImplementation(async ({ data }: any) => ({
      id: 'station-no-asset', ...data, createdAt: new Date(), updatedAt: new Date(), _count: { tasks: 0 },
    }));
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    await createRelayStation({ body: {
      name: '普通站', baseUrl: 'https://relay.example.com', keyValue: 'secret-key-value',
    } } as any, response);

    expect(mocks.create.mock.calls[0][0].data).not.toHaveProperty('assetLibraryConfig');
    expect(response.json.mock.calls[0][0].station.assetLibraryConfig).toBeNull();
  });

  it('updates asset library config when supplied and preserves it when omitted', async () => {
    const current = {
      id: 'station-asset', name: '素材站', baseUrl: 'https://relay.example.com/api/v3', appendApiV3: true,
      modelRedirects: {}, assetLibraryConfig, apiKeyEncrypted: 'encrypted', isActive: true, isPrimary: false,
    };
    mocks.findUnique.mockResolvedValue(current);
    mocks.update.mockImplementation(async ({ data }: any) => ({ ...current, ...data, createdAt: new Date(), updatedAt: new Date(), _count: { tasks: 0 } }));
    const response = { json: vi.fn() } as any;

    await updateRelayStation({ params: { id: current.id }, body: {
      name: current.name, baseUrl: current.baseUrl, assetLibraryConfig: { ...assetLibraryConfig, enabled: false },
    } } as any, response);
    expect(mocks.update.mock.calls[0][0].data.assetLibraryConfig.enabled).toBe(false);

    mocks.update.mockClear(); response.json.mockClear();
    await updateRelayStation({ params: { id: current.id }, body: {
      name: current.name, baseUrl: current.baseUrl,
    } } as any, response);
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty('assetLibraryConfig');
    expect(response.json.mock.calls[0][0].station.assetLibraryConfig).toEqual(assetLibraryConfig);
  });

  it('clears asset library config when update explicitly supplies null', async () => {
    const current = {
      id: 'station-asset', name: '素材站', baseUrl: 'https://relay.example.com/api/v3', appendApiV3: true,
      modelRedirects: {}, assetLibraryConfig, apiKeyEncrypted: 'encrypted', isActive: true, isPrimary: false,
    };
    mocks.findUnique.mockResolvedValue(current);
    mocks.update.mockImplementation(async ({ data }: any) => ({ ...current, ...data, createdAt: new Date(), updatedAt: new Date(), _count: { tasks: 0 } }));
    const response = { json: vi.fn() } as any;

    await updateRelayStation({ params: { id: current.id }, body: {
      name: current.name, baseUrl: current.baseUrl, assetLibraryConfig: null,
    } } as any, response);

    expect(mocks.update.mock.calls[0][0].data.assetLibraryConfig).toBeNull();
    expect(response.json.mock.calls[0][0].station.assetLibraryConfig).toBeNull();
  });

  it('rejects invalid asset library config with a 400 error', async () => {
    await expect(createRelayStation({ body: {
      name: '素材站', baseUrl: 'https://relay.example.com', keyValue: 'secret-key-value',
      assetLibraryConfig: { provider: 'BAD' },
    } } as any, {} as any)).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
