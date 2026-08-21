import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

export const thumbnailPathFor = (videoPath: string) => {
  const parsed = path.parse(videoPath);
  return path.join(parsed.dir, `${parsed.name}.jpg`);
};

// 图片原文件可能本身就是 .jpg，不能复用原图路径，否则缩略图请求会直接返回原图。
export const imageThumbnailPathFor = (imagePath: string) => {
  const parsed = path.parse(imagePath);
  return path.join(parsed.dir, `${parsed.name}.thumbnail.jpg`);
};

export const ensureImageThumbnail = async (imagePath: string, outputPath = imageThumbnailPathFor(imagePath)) => {
  try { await access(outputPath); return outputPath; } catch { await mkdir(path.dirname(outputPath), { recursive: true }); }
  const executable = ffmpegPath || 'ffmpeg';
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, ['-y', '-i', imagePath, '-vf', 'scale=480:-2', '-frames:v', '1', '-q:v', '4', outputPath], { stdio: 'ignore' });
    child.once('error', reject); child.once('close', code => code === 0 ? resolve() : reject(new Error('图片缩略图生成失败')));
  });
  return outputPath;
};

export const buildThumbnailArguments = (videoPath: string, thumbnailPath: string) => [
  '-y',
  '-ss', '0.05',
  '-i', videoPath,
  '-frames:v', '1',
  '-vf', 'scale=480:-2',
  '-q:v', '3',
  thumbnailPath,
];

export const ensureVideoThumbnail = async (videoPath: string, outputPath = thumbnailPathFor(videoPath)) => {
  try {
    await access(outputPath);
    return outputPath;
  } catch {
    await mkdir(path.dirname(outputPath), { recursive: true });
  }

  const executable = ffmpegPath || 'ffmpeg';
  const args = buildThumbnailArguments(videoPath, outputPath);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'ignore' });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`视频首帧提取失败（ffmpeg 退出码 ${code ?? 'unknown'}）`));
      }
    });
  });

  return outputPath;
};
