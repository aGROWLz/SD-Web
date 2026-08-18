import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

export class VideoDownloaderService {
  static async downloadVideo(videoUrl: string, taskId: string): Promise<string> {
    const uploadDir = config.uploadDir;

    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${taskId}.mp4`;
    const filePath = path.join(uploadDir, fileName);

    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      timeout: 120000, // 2 分钟
    });

    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  }
}
