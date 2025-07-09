import express from 'express';
import { config } from 'dotenv';
import { Client } from 'minio';

config();

const app = express();
app.use(express.json());

const useSSL = process.env.MINIO_USE_SSL === 'true';
const debug = process.env.DEBUG === 'true';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const bucket = process.env.MINIO_BUCKET;

app.post('/continue-event', async (req, res) => {
  if (debug) {
    console.log('\n🛰️  Incoming request from Continue.dev');
    console.log('🔍 Raw Payload:\n', JSON.stringify(req.body, null, 2));
  }

  const raw = req.body;
  const eventType = raw?.name || 'UnknownEvent';
  const timestamp = new Date().toISOString();
  const key = `${eventType}/${timestamp}.json`;
  const data = Buffer.from(JSON.stringify(raw, null, 2), 'utf-8');

  try {
    await minioClient.putObject(bucket, key, data);
    console.log(`[✓] Stored to MinIO at: ${key}`);
    res.status(200).json({ status: 'stored', key });
  } catch (err) {
    console.error('[x] MinIO write failed:', err);
    res.status(500).json({ error: 'Failed to store to MinIO' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  if (debug) console.log('🐛 Debug mode is ON');
});
