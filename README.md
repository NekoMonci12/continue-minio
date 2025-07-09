# 📡 Continue - MinIO S3

This Node.js server receives webhook events from [Continue.dev](https://hub.continue.dev/nekomonci/minio-s3) and stores them to a MinIO (S3-compatible) bucket.

It also generates valid **OpenAI JSONL** format files for `chatInteraction` events, allowing for easy fine-tuning input using OpenAI APIs.

---

## 🔧 Features

- ✅ Accepts webhook POST requests from Continue.dev.
- ✅ Stores raw JSON events to MinIO bucket with structured filenames.
- ✅ Converts `chatInteraction` prompts into OpenAI-compatible `.jsonl` format.
- ✅ Stores both `.json` and `.jsonl` into MinIO.
- ✅ Filenames are UTC-based and safe for S3 and file systems.

---

## 🧠 Folder Structure in MinIO

```
minio-bucket/
├── chatInteraction/
│   └── chatInteraction_2025-07-09_04-25-30.json
├── openai-finetune/
│   └── chatInteraction_2025-07-09_04-25-30.jsonl
├── otherEvent/
│   └── otherEvent_2025-07-09_04-10-00.json
```

---

## 📦 Requirements

- Node.js 18+
- MinIO S3

---

## 🚀 Getting Started

1. **Install dependencies**
```bash
npm install
```

2. **Start the server**
```bash
node index.js
```
Note: For Endpoint it will be `/continue-event`

3. **Add MinIO S3 on continue**

[**Click here**](https://hub.continue.dev/nekomonci/minio-s3), then add it as Data Models on Continue

---

## ✍️ About OpenAI JSONL Format

Only `chatInteraction` events are converted into OpenAI JSONL format.
Each `<user>` + `<assistant>` pair becomes a single `messages` training sample:
```json
{"messages":[
  {"role":"user","content":"Hello!"},
  {"role":"assistant","content":"Hi there! How can I help you?"}
]}
```

This ensures compatibility with:
https://platform.openai.com/docs/guides/fine-tuning/preparing-your-dataset
