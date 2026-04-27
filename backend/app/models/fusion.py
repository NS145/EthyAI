"""
Layer 3: Multi-Head Attention Fusion

Fuses features from multiple modalities (text, image, video, graph)
using multi-head cross-attention, producing a unified representation.
"""

import torch
import torch.nn as nn
import numpy as np
from typing import Optional
from app.config import settings


class MultiHeadAttentionFusion(nn.Module):
    """
    Multi-head attention fusion module.
    Takes embeddings from different modalities and fuses them
    into a single unified representation via cross-attention.
    """

    def __init__(
        self,
        text_dim: int = 768,
        image_dim: int = 2048,
        video_dim: int = 512,
        graph_dim: int = 256,
        fusion_dim: int = 512,
        num_heads: int = 8,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.fusion_dim = fusion_dim

        # Project each modality to fusion_dim
        self.text_proj = nn.Linear(text_dim, fusion_dim)
        self.image_proj = nn.Linear(image_dim, fusion_dim)
        self.video_proj = nn.Linear(video_dim, fusion_dim)
        self.graph_proj = nn.Linear(graph_dim, fusion_dim)

        # Multi-head self-attention over projected modalities
        self.multihead_attn = nn.MultiheadAttention(
            embed_dim=fusion_dim,
            num_heads=num_heads,
            dropout=dropout,
            batch_first=True,
        )

        # Feed-forward network after attention
        self.ffn = nn.Sequential(
            nn.Linear(fusion_dim, fusion_dim * 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(fusion_dim * 2, fusion_dim),
        )

        self.layer_norm1 = nn.LayerNorm(fusion_dim)
        self.layer_norm2 = nn.LayerNorm(fusion_dim)
        self.dropout = nn.Dropout(dropout)

        # Modality importance weights (learnable)
        self.modality_gate = nn.Linear(fusion_dim * 4, 4)

    def forward(
        self,
        text_feat: Optional[torch.Tensor] = None,
        image_feat: Optional[torch.Tensor] = None,
        video_feat: Optional[torch.Tensor] = None,
        graph_feat: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """
        Fuse available modality features.
        Each input: (batch, feature_dim) or None if modality not available.
        Returns: (batch, fusion_dim)
        """
        projected = []
        if text_feat is not None:
            projected.append(self.text_proj(text_feat))
        if image_feat is not None:
            projected.append(self.image_proj(image_feat))
        if video_feat is not None:
            projected.append(self.video_proj(video_feat))
        if graph_feat is not None:
            projected.append(self.graph_proj(graph_feat))

        if not projected:
            raise ValueError("At least one modality feature must be provided")

        # Stack modalities as sequence: (batch, num_modalities, fusion_dim)
        x = torch.stack(projected, dim=1)

        # Self-attention across modalities
        attn_out, attn_weights = self.multihead_attn(x, x, x)
        x = self.layer_norm1(x + self.dropout(attn_out))

        # Feed-forward
        ffn_out = self.ffn(x)
        x = self.layer_norm2(x + self.dropout(ffn_out))

        # Weighted aggregation of modality outputs
        # Mean pool across modalities
        fused = x.mean(dim=1)  # (batch, fusion_dim)

        return fused


class FusionEngine:
    """High-level fusion engine that manages the attention module."""

    def __init__(self):
        self.device = torch.device("cuda" if settings.use_gpu and torch.cuda.is_available() else "cpu")
        self.model = MultiHeadAttentionFusion().to(self.device)
        self.model.eval()

    @torch.no_grad()
    def fuse(
        self,
        text_embedding: Optional[np.ndarray] = None,
        image_embedding: Optional[np.ndarray] = None,
        video_embedding: Optional[np.ndarray] = None,
        graph_embedding: Optional[np.ndarray] = None,
    ) -> dict:
        """
        Fuse multimodal features into a unified representation.
        Returns fused embedding + metadata.
        """

        def _to_tensor(arr, expected_dim, proj_fn):
            if arr is None:
                return None
            t = torch.from_numpy(arr).float().unsqueeze(0).to(self.device)
            # Pad or truncate to expected dimension
            if t.shape[-1] != expected_dim:
                pad = nn.Linear(t.shape[-1], expected_dim).to(self.device)
                t = pad(t)
            return t

        text_t = _to_tensor(text_embedding, 768, self.model.text_proj)
        image_t = _to_tensor(image_embedding, 2048, self.model.image_proj)
        video_t = _to_tensor(video_embedding, 512, self.model.video_proj)
        graph_t = _to_tensor(graph_embedding, 256, self.model.graph_proj)

        fused = self.model(text_t, image_t, video_t, graph_t)
        fused_np = fused.squeeze(0).cpu().numpy()

        modalities_used = []
        if text_embedding is not None:
            modalities_used.append("text")
        if image_embedding is not None:
            modalities_used.append("image")
        if video_embedding is not None:
            modalities_used.append("video")
        if graph_embedding is not None:
            modalities_used.append("graph")

        return {
            "fused_embedding": fused_np,
            "embedding_dim": fused_np.shape[0],
            "modalities_used": modalities_used,
        }


# Singleton
_fusion_engine: Optional[FusionEngine] = None


def get_fusion_engine() -> FusionEngine:
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = FusionEngine()
    return _fusion_engine
