import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/env';

const uploadRoot = () => path.resolve(config.uploadDir);

/** Resolves both new filename-only records and older path-valued records safely. */
export const resolveStoredVideoPath = (localPath: string) => {
  const root = uploadRoot();
  const candidate = path.isAbsolute(localPath)
    ? path.resolve(localPath)
    : path.resolve(process.cwd(), localPath);
  const rootPrefix = `${root}${path.sep}`;
  return candidate === root || candidate.startsWith(rootPrefix)
    ? candidate
    : path.join(root, path.basename(localPath));
};

export const storedVideoExists = (localPath: string) => fs.existsSync(resolveStoredVideoPath(localPath));
