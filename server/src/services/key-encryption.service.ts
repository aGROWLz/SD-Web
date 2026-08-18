import CryptoJS from 'crypto-js';
import { config } from '../config/env';

export class KeyEncryptionService {
  private static readonly SECRET_KEY = config.encryptionKey;

  static encrypt(apiKey: string): string {
    return CryptoJS.AES.encrypt(apiKey, this.SECRET_KEY).toString();
  }

  static decrypt(encryptedKey: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, this.SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
