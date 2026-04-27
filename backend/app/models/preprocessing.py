"""
Layer 1: Input & Preprocessing

Handles text, image, and video preprocessing:
- Text: cleaning, language detection, tokenization
- Image: resizing, normalization
- Video: frame extraction → image pipeline
"""

import re
import numpy as np
from typing import Optional
from langdetect import detect, LangDetectException
from PIL import Image
import io
import cv2
import tempfile
import os


# Language families for model routing
HIGH_RESOURCE_LANGS = {
    "en", "de", "fr", "es", "it", "pt", "nl", "ru", "zh-cn", "zh-tw",
    "ja", "ko", "ar", "tr", "pl", "vi", "th", "id", "cs", "ro",
}


def detect_language(text: str) -> dict:
    """Detect the language of input text and determine model routing."""
    try:
        lang = detect(text)
    except LangDetectException:
        lang = "en"  # fallback

    is_high_resource = lang in HIGH_RESOURCE_LANGS
    return {
        "language": lang,
        "is_high_resource": is_high_resource,
        "model": "xlm-roberta" if is_high_resource else "rembert",
    }


def clean_text(text: str) -> str:
    """Clean and normalize text input."""
    # Remove excessive whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Remove URLs (keep them as [URL] marker for the model)
    text = re.sub(r"https?://\S+", "[URL]", text)
    # Remove excessive punctuation
    text = re.sub(r"([!?.]){3,}", r"\1\1", text)
    return text


def preprocess_text(text: str, max_length: int = 2048) -> dict:
    """
    Full text preprocessing pipeline.
    Returns cleaned text, language info, and metadata.
    """
    cleaned = clean_text(text)
    truncated = cleaned[:max_length]
    lang_info = detect_language(truncated)

    return {
        "original": text,
        "cleaned": truncated,
        "char_count": len(truncated),
        "word_count": len(truncated.split()),
        "language": lang_info,
    }


def preprocess_image(image_bytes: bytes, target_size: tuple = (224, 224)) -> dict:
    """
    Preprocess image for ResNet-50 feature extraction.
    Returns normalized numpy array and metadata.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    original_size = img.size

    # Resize to target
    img_resized = img.resize(target_size, Image.LANCZOS)

    # Convert to numpy and normalize for ResNet
    img_array = np.array(img_resized, dtype=np.float32) / 255.0
    # ImageNet normalization
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    img_normalized = (img_array - mean) / std
    # HWC -> CHW for PyTorch
    img_tensor = np.transpose(img_normalized, (2, 0, 1))

    return {
        "tensor": img_tensor,
        "original_size": original_size,
        "target_size": target_size,
    }


def extract_video_frames(
    video_bytes: bytes,
    max_frames: int = 16,
    target_size: tuple = (224, 224),
) -> dict:
    """
    Extract key frames from video for analysis.
    Uses uniform sampling across the video duration.
    """
    # Write to temp file for OpenCV
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total_frames / fps if fps > 0 else 0

        if total_frames == 0:
            return {"frames": [], "metadata": {"error": "No frames found"}}

        # Uniform sampling
        frame_indices = np.linspace(0, total_frames - 1, min(max_frames, total_frames), dtype=int)
        frames = []

        for idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(frame_rgb).resize(target_size, Image.LANCZOS)
                img_array = np.array(img, dtype=np.float32) / 255.0
                mean = np.array([0.485, 0.456, 0.406])
                std = np.array([0.229, 0.224, 0.225])
                img_normalized = (img_array - mean) / std
                img_tensor = np.transpose(img_normalized, (2, 0, 1))
                frames.append(img_tensor)

        cap.release()
        return {
            "frames": frames,
            "metadata": {
                "total_frames": total_frames,
                "extracted_frames": len(frames),
                "fps": fps,
                "duration_seconds": duration,
            },
        }
    finally:
        os.unlink(tmp_path)
