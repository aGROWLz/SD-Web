import { describe, expect, it } from 'vitest';
import { config } from '../src/config/env';

describe('server configuration', () => {
  it('loads the server env file when started from the repository root', () => {
    expect(config.databaseUrl).toBeTruthy();
    expect(config.jwt.secret).toBeTruthy();
    expect(config.encryptionKey).toBeTruthy();
  });
});
