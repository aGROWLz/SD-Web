import { describe, expect, it } from 'vitest';
import {
  buildWorkerUploadUrl,
  parseDataUrl,
  maskStorageKey,
} from '../src/services/r2-storage.service';

describe('R2 storage helpers', () => {
  it('parses base64 Data URLs into content type and bytes', () => {
    expect(parseDataUrl('data:image/png;base64,SGk=')).toEqual({
      contentType: 'image/png',
      bytes: Buffer.from('Hi'),
    });
  });

  it('rejects non-base64 Data URLs', () => {
    expect(() => parseDataUrl('data:text/plain,hello')).toThrow('仅支持 Base64 Data URL');
  });

  it('encodes filenames and keys in Worker upload requests', () => {
    expect(buildWorkerUploadUrl('https://worker.example.com/', 'a b.png', 'key/x'))
      .toBe('https://worker.example.com/get-upload-url?file=a%20b.png&api_key=key%2Fx');
  });

  it('masks storage keys without exposing the full value', () => {
    expect(maskStorageKey('secret-key-123')).toBe('•••••••••••123');
    expect(maskStorageKey('short')).toBe('••••••••');
  });
});
