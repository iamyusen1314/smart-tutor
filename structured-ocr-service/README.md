# Structured OCR Service

FastAPI microservice that wraps **PaddleOCR PP-Structure** for worksheet parsing.  
The service accepts base64-encoded images, runs layout + OCR analysis, and returns
questions in the unified schema required by the Smart Tutor pipeline.

## Features

- Loads `PPStructure` once at startup (GPU optional via `PPS_USE_GPU=true`)
- `/parse` endpoint for single image, `/batch-parse` for multiple images
- Emits normalized `questionId/type/prompt/assets/answers` structure
- Docker image for easy deployment to staging/production

## Quick Start

```bash
cd structured-ocr-service
docker build -t structured-ocr-service .
docker run -p 8080:8080 structured-ocr-service
```

Then send a request:

```bash
curl -X POST http://localhost:8080/parse \
  -H "Content-Type: application/json" \
  -d '{"image": "<base64>", "options": {"image_id": "img1"}}'
```

## Environment Variables

| Variable      | Default | Description                                  |
|---------------|---------|----------------------------------------------|
| `LOG_LEVEL`   | `INFO`  | Python logging level                         |
| `PPS_USE_GPU` | `false` | Set `true` to enable GPU (requires CUDA)     |
| `PPS_LANG`    | `ch`    | Default language passed to `PPStructure`     |
| `PPS_VERSION` | `0.1.0` | Reported in `/health` response               |

## Deployment Notes

- Prefer running inside Docker (avoid macOS LibreSSL / local resource limits)
- Ensure the runtime has at least 4 GB RAM; PP-Structure downloads weights on first run
- If you use a GPU base image, add CUDA/cuDNN libs before installing PaddlePaddle

## Schema Overview

Each question in the response includes:

- `questionId`: unique identifier (`{image_id}_q{n}`)
- `type`: `word_problem`, `table_fill`, `connect`, or `unknown`
- `prompt`: extracted text when available
- `assets.layout`: layout type + bbox, plus table metadata if present
- `answers`: placeholder blanks for table cells (extend for other types later)

Future improvements (not yet implemented):

- Dedicated detectors for connection/graph questions
- Fine-grained blank detection inside text paragraphs
- Confidence scoring and per-blank verification metadata
