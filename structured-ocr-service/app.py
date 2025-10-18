import base64
import binascii
import logging
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
  from paddleocr import PPStructure  # type: ignore
except ImportError as exc:  # pragma: no cover - service will fail fast at runtime
  raise RuntimeError(
      "PPStructure is required. Install paddleocr==2.9.1 and its dependencies."
  ) from exc


LOGGER = logging.getLogger("structured-ocr-service")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


class ParseOptions(BaseModel):
  image_id: Optional[str] = Field(
      None, alias="imageId", description="Custom image identifier"
  )
  language: Optional[str] = Field(
      None, alias="language", description="Override PaddleOCR language"
  )
  return_word_boxes: Optional[bool] = Field(
      None,
      alias="returnWordBoxes",
      description="Whether to return word-level boxes",
  )

  class Config:
    allow_population_by_field_name = True


class ParseRequest(BaseModel):
  image: str = Field(..., description="Base64 encoded image content")
  options: Optional[ParseOptions] = None


class BlockAsset(BaseModel):
  bbox: List[float]
  type: str
  text: Optional[str] = None
  layout: Optional[Dict[str, Any]] = None
  table: Optional[Dict[str, Any]] = None


class Question(BaseModel):
  questionId: str
  type: str
  prompt: str
  assets: Dict[str, Any]
  answers: List[Dict[str, Any]]


class ParseResponse(BaseModel):
  page: Dict[str, Any]
  statistics: Dict[str, Any]
  questions: List[Question]


class HealthResponse(BaseModel):
  status: str
  engine: str
  version: str


def decode_image(image_b64: str) -> np.ndarray:
  try:
    binary = base64.b64decode(image_b64, validate=True)
  except (ValueError, binascii.Error) as exc:
    raise HTTPException(status_code=400, detail=f"Invalid base64 image: {exc}") from exc

  data = np.frombuffer(binary, dtype=np.uint8)
  image = cv2.imdecode(data, cv2.IMREAD_COLOR)

  if image is None:
    raise HTTPException(status_code=400, detail="Unable to decode image data")

  return image


def map_layout_type(layout_type: str) -> str:
  layout_type = (layout_type or "").lower()

  if layout_type in {"table"}:
    return "table_fill"
  if layout_type in {"title", "text", "paragraph", "formula"}:
    return "word_problem"
  if layout_type in {"figure", "image"}:
    return "connect"
  return "unknown"


def extract_text_from_res(res: Any) -> str:
  if isinstance(res, str):
    return res

  if isinstance(res, list):
    texts: List[str] = []
    for item in res:
      if isinstance(item, dict) and item.get("text"):
        texts.append(item["text"])
    return "\n".join(texts).strip()

  if isinstance(res, dict):
    text = res.get("text")
    if isinstance(text, str):
      return text

  return ""


def sanitize_res(res: Any) -> Any:
  if isinstance(res, list):
    return [sanitize_res(item) for item in res]
  if isinstance(res, dict):
    sanitized: Dict[str, Any] = {}
    for key, value in res.items():
      if key in {"img", "image", "img_crop"}:
        continue
      sanitized_value = sanitize_res(value)
      if sanitized_value is not None:
        sanitized[key] = sanitized_value
    return sanitized
  if isinstance(res, np.ndarray):
    return res.tolist()

  return res


def convert_block_to_question(
    block: Dict[str, Any], index: int, image_id: str
) -> Question:
  layout_type = block.get("type", "unknown")
  question_type = map_layout_type(layout_type)
  res = sanitize_res(block.get("res"))
  prompt = extract_text_from_res(res)

  bbox = block.get("bbox") or []
  bbox_list = [float(x) for x in bbox] if isinstance(bbox, (list, tuple)) else []

  assets: Dict[str, Any] = {
      "layout": {
          "type": layout_type,
          "bbox": bbox_list,
      },
      "texts": [],
      "images": [],
  }

  if isinstance(res, list):
    text_assets = []
    for item in res:
      if isinstance(item, dict):
        entry = {
            "text": item.get("text"),
            "confidence": item.get("confidence"),
            "bbox": item.get("bbox"),
        }
        text_assets.append(entry)
    assets["texts"] = text_assets
  elif isinstance(res, dict):
    if res.get("structure"):
      assets["layout"]["structure"] = res.get("structure")
    if res.get("html"):
      assets["layout"]["html"] = res.get("html")
    if res.get("cell_bbox"):
      assets["layout"]["cellBBox"] = res.get("cell_bbox")
    if res.get("text"):
      assets["texts"] = [{"text": res["text"]}]

  answers: List[Dict[str, Any]] = []

  if question_type == "table_fill" and isinstance(res, dict):
    cell_bboxes = res.get("cell_bbox") or []
    answers = [
        {
            "blankId": f"{image_id}_q{index + 1}_cell_{idx}",
            "position": cell_bbox,
            "value": None,
        }
        for idx, cell_bbox in enumerate(cell_bboxes)
    ]

  question = Question(
      questionId=f"{image_id}_q{index + 1}",
      type=question_type,
      prompt=prompt,
      assets=assets,
      answers=answers,
  )

  return question


@lru_cache()
def get_engine(lang: Optional[str] = None, return_word_box: Optional[bool] = None):
  LOGGER.info("Initializing PPStructure (lang=%s, return_word_box=%s)", lang, return_word_box)
  engine = PPStructure(
      show_log=False,
      use_gpu=os.getenv("PPS_USE_GPU", "false").lower() == "true",
      lang=lang or os.getenv("PPS_LANG", "ch"),
      return_word_box=return_word_box or False,
  )
  LOGGER.info("PPStructure ready")
  return engine


def run_structure(
    image: np.ndarray, options: Optional[ParseOptions]
) -> List[Dict[str, Any]]:
  engine = get_engine(
      lang=options.language if options else None,
      return_word_box=options.return_word_boxes if options else None,
  )
  return engine(image)  # type: ignore[no-any-return]


app = FastAPI(
    title="Structured OCR Service",
    version="0.1.0",
    description="PaddleOCR PP-Structure microservice for worksheet parsing.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health_check():
  return HealthResponse(
      status="ok",
      engine="PPStructure",
      version=os.getenv("PPS_VERSION", "0.1.0"),
  )


@app.post("/parse", response_model=ParseResponse)
def parse(req: ParseRequest):
  LOGGER.info("Received parse request")

  image = decode_image(req.image)
  h, w = image.shape[:2]
  options = req.options
  image_id = options.image_id if options and options.image_id else "img"

  try:
    blocks = run_structure(image, options)
  except Exception as exc:  # pragma: no cover - runtime path
    LOGGER.exception("PPStructure inference failed")
    raise HTTPException(status_code=500, detail=str(exc)) from exc

  questions = [
      convert_block_to_question(block, idx, image_id)
      for idx, block in enumerate(blocks or [])
  ]

  response = ParseResponse(
      page={
          "width": w,
          "height": h,
          "imageId": image_id,
      },
      statistics={
          "blockCount": len(blocks),
          "questionCount": len(questions),
      },
      questions=questions,
  )

  return response


class BatchParseItem(BaseModel):
  image: str
  fileName: Optional[str] = None
  options: Optional[ParseOptions] = None

  class Config:
    allow_population_by_field_name = True


class BatchParseRequest(BaseModel):
  images: List[BatchParseItem]


class BatchParseResult(BaseModel):
  fileName: Optional[str]
  success: bool
  data: Optional[ParseResponse]
  error: Optional[str]


class BatchParseResponse(BaseModel):
  total: int
  results: List[BatchParseResult]


@app.post("/batch-parse", response_model=BatchParseResponse)
def batch_parse(req: BatchParseRequest):
  results: List[BatchParseResult] = []

  for item in req.images:
    try:
      single_req = ParseRequest(image=item.image, options=item.options)
      result = parse(single_req)  # reuse single endpoint logic
      results.append(
          BatchParseResult(
              fileName=item.fileName,
              success=True,
              data=result,
              error=None,
          )
      )
    except HTTPException as exc:
      results.append(
          BatchParseResult(
              fileName=item.fileName,
              success=False,
              data=None,
              error=exc.detail if isinstance(exc.detail, str) else str(exc.detail),
          )
      )

  return BatchParseResponse(total=len(results), results=results)
