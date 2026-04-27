"""
Layer 2: Feature Extraction

Implements feature extractors for all modalities:
- Text: XLM-RoBERTa (high-resource) / RemBERT (low-resource)
- Image: ResNet-50
- Video: CNN + BiLSTM on extracted frames
- Graph: GraphSAGE-style aggregation for evidence networks
"""

import torch
import torch.nn as nn
import numpy as np
from typing import Optional
from transformers import (
    AutoTokenizer,
    AutoModel,
    AutoModelForSequenceClassification,
)
from app.config import settings

# Global model cache to avoid reloading
_model_cache = {}


def _get_device():
    if settings.use_gpu and torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


class TextFeatureExtractor:
    """
    Extracts text features using XLM-RoBERTa (high-resource langs)
    or RemBERT (low-resource langs) with auto-routing.
    """

    MODEL_MAP = {
        "xlm-roberta": "xlm-roberta-base",
        "rembert": "google/rembert",
    }

    def __init__(self):
        self.device = _get_device()
        self.models = {}
        self.tokenizers = {}

    def _load_model(self, model_key: str):
        if model_key in self.models:
            return
        model_name = self.MODEL_MAP[model_key]
        cache_dir = settings.model_cache_dir

        self.tokenizers[model_key] = AutoTokenizer.from_pretrained(
            model_name, cache_dir=cache_dir
        )
        self.models[model_key] = AutoModel.from_pretrained(
            model_name, cache_dir=cache_dir
        ).to(self.device)
        self.models[model_key].eval()

    @torch.no_grad()
    def extract(self, text: str, model_key: str = "xlm-roberta") -> dict:
        """Extract text features. Returns embedding vector + token-level outputs."""
        self._load_model(model_key)

        tokenizer = self.tokenizers[model_key]
        model = self.models[model_key]

        inputs = tokenizer(
            text,
            return_tensors="pt",
            max_length=512,
            truncation=True,
            padding=True,
        ).to(self.device)

        outputs = model(**inputs)
        # CLS token embedding as sentence representation
        cls_embedding = outputs.last_hidden_state[:, 0, :].cpu().numpy()
        # Mean pooling as alternative
        attention_mask = inputs["attention_mask"].unsqueeze(-1)
        token_embeddings = outputs.last_hidden_state
        mean_embedding = (
            (token_embeddings * attention_mask).sum(1)
            / attention_mask.sum(1)
        ).cpu().numpy()

        # Get token-level representations for LIME
        tokens = tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
        token_embeddings_np = outputs.last_hidden_state[0].cpu().numpy()

        return {
            "cls_embedding": cls_embedding[0],       # (hidden_size,)
            "mean_embedding": mean_embedding[0],     # (hidden_size,)
            "token_embeddings": token_embeddings_np, # (seq_len, hidden_size)
            "tokens": tokens,
            "model_used": model_key,
            "embedding_dim": cls_embedding.shape[-1],
        }


class ImageFeatureExtractor:
    """Extracts image features using ResNet-50 (pretrained on ImageNet)."""

    def __init__(self):
        self.device = _get_device()
        self.model = None

    def _load_model(self):
        if self.model is not None:
            return
        from torchvision import models
        self.model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
        # Remove the final classification layer to get features
        self.model = nn.Sequential(*list(self.model.children())[:-1])
        self.model.to(self.device)
        self.model.eval()

    @torch.no_grad()
    def extract(self, image_tensor: np.ndarray) -> dict:
        """Extract image features from preprocessed tensor."""
        self._load_model()
        tensor = torch.from_numpy(image_tensor).float().unsqueeze(0).to(self.device)
        features = self.model(tensor).squeeze().cpu().numpy()  # (2048,)
        return {
            "embedding": features,
            "embedding_dim": features.shape[0],
        }


class VideoFeatureExtractor:
    """
    CNN + BiLSTM for temporal video analysis.
    Uses ResNet-50 for per-frame features, then BiLSTM for temporal modeling.
    """

    def __init__(self, hidden_size: int = 256):
        self.device = _get_device()
        self.image_extractor = ImageFeatureExtractor()
        self.hidden_size = hidden_size
        self.lstm = None

    def _load_lstm(self, input_size: int):
        if self.lstm is not None:
            return
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=self.hidden_size,
            num_layers=2,
            batch_first=True,
            bidirectional=True,
            dropout=0.1,
        ).to(self.device)
        self.lstm.eval()

    @torch.no_grad()
    def extract(self, frame_tensors: list[np.ndarray]) -> dict:
        """Extract video features from a list of frame tensors."""
        if not frame_tensors:
            return {"embedding": np.zeros(self.hidden_size * 2), "embedding_dim": self.hidden_size * 2}

        # Extract per-frame features using ResNet
        frame_features = []
        for frame in frame_tensors:
            feat = self.image_extractor.extract(frame)
            frame_features.append(feat["embedding"])

        # Stack into sequence: (1, num_frames, feature_dim)
        seq = np.stack(frame_features)
        seq_tensor = torch.from_numpy(seq).float().unsqueeze(0).to(self.device)

        # BiLSTM temporal modeling
        self._load_lstm(seq_tensor.shape[-1])
        lstm_out, (h_n, _) = self.lstm(seq_tensor)

        # Concatenate final forward and backward hidden states
        forward_final = h_n[-2]  # Last layer forward
        backward_final = h_n[-1]  # Last layer backward
        video_embedding = torch.cat([forward_final, backward_final], dim=-1)
        video_embedding = video_embedding.squeeze(0).cpu().numpy()

        return {
            "embedding": video_embedding,
            "embedding_dim": video_embedding.shape[0],
            "num_frames": len(frame_tensors),
        }


class GraphFeatureExtractor:
    """
    GraphSAGE-style aggregation for evidence network features.
    Models relationships between claims and evidence sources.
    """

    def __init__(self, input_dim: int = 768, hidden_dim: int = 256, num_layers: int = 2):
        self.device = _get_device()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.aggregators = nn.ModuleList()
        self.combiners = nn.ModuleList()

        in_dim = input_dim
        for _ in range(num_layers):
            self.aggregators.append(
                nn.Linear(in_dim, hidden_dim).to(self.device)
            )
            self.combiners.append(
                nn.Linear(in_dim + hidden_dim, hidden_dim).to(self.device)
            )
            in_dim = hidden_dim

    @torch.no_grad()
    def extract(self, node_features: np.ndarray, adjacency: np.ndarray) -> dict:
        """
        GraphSAGE forward pass.
        node_features: (num_nodes, feature_dim)
        adjacency: (num_nodes, num_nodes) binary adjacency matrix
        """
        h = torch.from_numpy(node_features).float().to(self.device)
        adj = torch.from_numpy(adjacency).float().to(self.device)

        for agg, comb in zip(self.aggregators, self.combiners):
            # Aggregate neighbor features (mean aggregation)
            neighbor_sum = torch.mm(adj, h)
            neighbor_count = adj.sum(dim=1, keepdim=True).clamp(min=1)
            neighbor_mean = neighbor_sum / neighbor_count
            neighbor_agg = torch.relu(agg(neighbor_mean))

            # Combine self + neighbor
            h = torch.relu(comb(torch.cat([h, neighbor_agg], dim=-1)))

        # Global graph embedding via mean pooling
        graph_embedding = h.mean(dim=0).cpu().numpy()

        return {
            "embedding": graph_embedding,
            "node_embeddings": h.cpu().numpy(),
            "embedding_dim": graph_embedding.shape[0],
        }


# Singleton instances
_text_extractor: Optional[TextFeatureExtractor] = None
_image_extractor: Optional[ImageFeatureExtractor] = None
_video_extractor: Optional[VideoFeatureExtractor] = None
_graph_extractor: Optional[GraphFeatureExtractor] = None


def get_text_extractor() -> TextFeatureExtractor:
    global _text_extractor
    if _text_extractor is None:
        _text_extractor = TextFeatureExtractor()
    return _text_extractor


def get_image_extractor() -> ImageFeatureExtractor:
    global _image_extractor
    if _image_extractor is None:
        _image_extractor = ImageFeatureExtractor()
    return _image_extractor


def get_video_extractor() -> VideoFeatureExtractor:
    global _video_extractor
    if _video_extractor is None:
        _video_extractor = VideoFeatureExtractor()
    return _video_extractor


def get_graph_extractor() -> GraphFeatureExtractor:
    global _graph_extractor
    if _graph_extractor is None:
        _graph_extractor = GraphFeatureExtractor()
    return _graph_extractor
