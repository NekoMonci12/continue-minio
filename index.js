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

function getSafeTimestamp() {
  const now = new Date();   // always in UTC internally
  return now.toISOString()
    .replace(/:/g, '-')     // Replace ":" with "-"
    .replace(/\..+/, '')    // Remove milliseconds and timezone
    .replace('T', '_');     // Replace "T" with "_"
}

function convertToOpenAIJsonl(promptBlock) {
  const pattern = /<(\w+)>\s*([\s\S]*?)(?=<\w+>|$)/g;
  const chunks = [];
  let match;

  while ((match = pattern.exec(promptBlock)) !== null) {
    const [, tag, content] = match;
    const roleMap = {
      system: 'system',
      user: 'user',
      assistant: 'assistant',
    };

    const role = roleMap[tag.trim()];
    if (role && content.trim()) {
      chunks.push({
        role,
        content: content.trim(),
      });
    }
  }

  const lines = [];
  for (let i = 0; i < chunks.length - 1; i++) {
    const curr = chunks[i];
    const next = chunks[i + 1];

    if (curr.role === 'user' && next.role === 'assistant') {
      lines.push(JSON.stringify({
        messages: [
          { role: 'user', content: curr.content },
          { role: 'assistant', content: next.content },
        ]
      }));
      i++;
    }
  }

  return lines.join('\n') + '\n';
}

app.post('/continue-event', async (req, res) => {
  if (debug) {
    console.log('\n🛰️  Incoming request from Continue.dev');
    console.log('🔍 Raw Payload:\n', JSON.stringify(req.body, null, 2));
  }

  const raw = req.body;
  const eventType = raw?.name || 'UnknownEvent';
  const safeTime = getSafeTimestamp();
  const key = `${eventType}/${eventType}_${safeTime}.json`;
  const data = Buffer.from(JSON.stringify(raw, null, 2), 'utf-8');

  try {
    await minioClient.putObject(bucket, key, data);
    console.log(`[✓] Stored to MinIO at: ${key}`);

    if (eventType === 'chatInteraction' && raw?.data?.prompt) {
      const jsonl = convertToOpenAIJsonl(raw.data.prompt);
      const jsonlKey = `openai-finetune/${eventType}_${safeTime}.jsonl`;

      await minioClient.putObject(bucket, jsonlKey, Buffer.from(jsonl, 'utf-8'));
      console.log(`[✓] Stored OpenAI JSONL at: ${jsonlKey}`);
    }

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
