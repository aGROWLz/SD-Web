export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  uploadDir: process.env.UPLOAD_DIR || './uploads/videos',
  seedance2ApiBaseUrl: process.env.SEEDANCE2_API_BASE_URL!,
  encryptionKey: process.env.ENCRYPTION_KEY!,
};
