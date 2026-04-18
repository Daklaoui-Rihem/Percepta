#!/usr/bin/env python3
"""
train_anomaly.py — Binary Anomaly Detection (Normal vs Anomaly)
================================================================
Much better approach when you have limited data with only a few categories.

Instead of 14-class classification (needs hundreds of videos per category),
we train a BINARY model: Normal vs Anomaly.

This is also more practical for real deployment:
  - You don't need perfectly balanced multi-class data
  - Any crime video = "Anomaly" regardless of specific type
  - Works great with as few as 20-30 videos per class

Data structure required:
    data/
    ├── train/
    │   ├── Normal/     <- normal / non-incident videos (80%)
    │   └── Anomaly/    <- crime videos: Abuse, Arson, Arrest, Assault all go here (80%)
    └── val/
        ├── Normal/     <- normal / non-incident videos (20%)
        └── Anomaly/    <- crime videos (20%)

OR you can keep multi-class folders and this script will auto-merge them:
    data/
    ├── train/
    │   ├── Normal/
    │   ├── Abuse/      <- auto-merged into Anomaly
    │   ├── Arrest/     <- auto-merged into Anomaly
    │   ├── Arson/      <- auto-merged into Anomaly
    │   └── Assault/    <- auto-merged into Anomaly
    └── val/
        └── ...

Usage:
    python train_anomaly.py --data_dir ./data --epochs 30 --batch_size 4

Output:
    ./models/anomaly_classifier.pth
    Copy this to: backend/models/anomaly_classifier.pth
"""

import os
import sys
import random
import argparse
import math
from pathlib import Path

import cv2
import numpy as np

# ── Config ──────────────────────────────────────────────────────
CLIP_LEN    = 16
FRAME_SIZE  = 112
MEAN        = [0.43216, 0.394666, 0.37645]
STD         = [0.22803, 0.22145,  0.216989]

# Categories that count as "Anomaly"
ANOMALY_CATEGORIES = {
    "Abuse", "Arrest", "Arson", "Assault", "Burglary",
    "Explosion", "Fighting", "RoadAccident", "Robbery",
    "Shooting", "Shoplifting", "Stealing", "Vandalism",
    "Anomaly", "Crime",
    # lowercase variants
    "abuse", "arrest", "arson", "assault", "burglary",
    "explosion", "fighting", "roadaccident", "robbery",
    "shooting", "shoplifting", "stealing", "vandalism",
    "anomaly", "crime",
}

NORMAL_CATEGORIES = {"Normal", "normal", "Background", "background"}


def parse_args():
    p = argparse.ArgumentParser(description="Train binary anomaly detector")
    p.add_argument("--data_dir",   default="./data",   help="Root dir with train/ and val/")
    p.add_argument("--epochs",     type=int, default=30)
    p.add_argument("--batch_size", type=int, default=4)
    p.add_argument("--lr",         type=float, default=5e-6, help="Learning rate")
    p.add_argument("--output_dir", default="./models")
    p.add_argument("--clips_per_video", type=int, default=4,
                   help="How many clips to sample per video during training")
    return p.parse_args()


# ── Dataset ──────────────────────────────────────────────────────

class AnomalyDataset:
    """
    Loads videos from folder structure, maps them to binary labels.
    Supports both:
      - Binary folders (Normal/, Anomaly/)
      - Multi-class folders (Normal/, Abuse/, Arson/, ...) — auto-merged
    """
    def __init__(self, root_dir, clips_per_video=8, augment=False):
        self.clips_per_video = clips_per_video
        self.augment = augment
        self.samples = []  # list of (video_path, label_int)  0=Normal, 1=Anomaly

        exts = {".mp4", ".avi", ".mov", ".mkv", ".wmv"}
        root = Path(root_dir)

        if not root.exists():
            print(f"[ERROR] Directory not found: {root_dir}")
            sys.exit(1)

        normal_count  = 0
        anomaly_count = 0

        for category_dir in sorted(root.iterdir()):
            if not category_dir.is_dir():
                continue
            name = category_dir.name

            if name in ANOMALY_CATEGORIES:
                label = 1
            elif name in NORMAL_CATEGORIES:
                label = 0
            else:
                print(f"[WARN] Unknown category '{name}', skipping. "
                      f"Rename to 'Normal' or 'Anomaly' or a known crime category.")
                continue

            for vf in category_dir.rglob("*"):
                if vf.suffix.lower() in exts:
                    self.samples.append((str(vf), label))
                    if label == 0:
                        normal_count += 1
                    else:
                        anomaly_count += 1

        print(f"[Dataset] {root_dir}: Normal={normal_count} | Anomaly={anomaly_count}")

        if len(self.samples) == 0:
            print(f"[ERROR] No videos found in {root_dir}")
            sys.exit(1)

        # Balance classes by oversampling minority
        normals   = [s for s in self.samples if s[1] == 0]
        anomalies = [s for s in self.samples if s[1] == 1]

        if normals and anomalies:
            max_n = max(len(normals), len(anomalies))
            # Use random.choices instead of extend to avoid exact duplicate sequences
            normals   = random.choices(normals,   k=max_n)
            anomalies = random.choices(anomalies, k=max_n)
            self.samples = normals + anomalies
            random.shuffle(self.samples)
            print(f"[Dataset] After balancing: {max_n} normal + {max_n} anomaly samples")

    def __len__(self):
        return len(self.samples) * self.clips_per_video

    def __getitem__(self, idx):
        import torch
        video_idx  = idx // self.clips_per_video
        video_path, label = self.samples[video_idx % len(self.samples)]

        frames = load_random_clip(video_path, CLIP_LEN, FRAME_SIZE, augment=self.augment)
        tensor = frames_to_tensor(frames)
        return tensor, torch.tensor(label, dtype=torch.long)


def load_random_clip(video_path, clip_len, frame_size, augment=False):
    """Load a random clip of clip_len frames from the video."""
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    if total <= 0:
        return [np.zeros((frame_size, frame_size, 3), dtype=np.uint8)] * clip_len

    # Random start position
    max_start = max(0, total - clip_len)
    start     = random.randint(0, max_start)

    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, start)

    frames = []
    for _ in range(clip_len):
        ret, frame = cap.read()
        if not ret:
            if frames:
                frames.append(frames[-1].copy())
            else:
                frames.append(np.zeros((frame_size, frame_size, 3), dtype=np.uint8))
        else:
            frame = cv2.resize(frame, (frame_size, frame_size))
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame)
    cap.release()

    # Augmentation
    if augment:
        # Random horizontal flip
        if random.random() < 0.5:
            frames = [cv2.flip(f, 1) for f in frames]
        # Random brightness/contrast
        alpha = random.uniform(0.7, 1.3)  # contrast
        beta  = random.randint(-20, 20)   # brightness
        frames = [np.clip(f.astype(np.float32) * alpha + beta, 0, 255).astype(np.uint8)
                  for f in frames]
        # Random grayscale (helps generalization)
        if random.random() < 0.15:
            frames = [np.stack([cv2.cvtColor(f, cv2.COLOR_RGB2GRAY)] * 3, axis=-1) for f in frames]
        # Random temporal reversal (play clip backwards)
        if random.random() < 0.3:
            frames = frames[::-1]
        # Random small rotation
        if random.random() < 0.3:
            angle = random.uniform(-10, 10)
            M = cv2.getRotationMatrix2D((FRAME_SIZE//2, FRAME_SIZE//2), angle, 1.0)
            frames = [cv2.warpAffine(f, M, (FRAME_SIZE, FRAME_SIZE)) for f in frames]

    return frames


def frames_to_tensor(frames):
    """Convert list of (H,W,3) uint8 RGB frames → (3, T, H, W) float tensor."""
    import torch
    arr = np.stack(frames, axis=0).astype(np.float32) / 255.0  # (T,H,W,3)
    mean = np.array(MEAN, dtype=np.float32)
    std  = np.array(STD,  dtype=np.float32)
    arr  = (arr - mean) / std
    tensor = torch.from_numpy(arr).permute(3, 0, 1, 2)  # (3,T,H,W)
    return tensor


# ── Model ────────────────────────────────────────────────────────

def build_model(device):
    """
    R3D-18 with:
    - All layers frozen except layer4 + classifier head
    - Dropout for regularization
    - Binary output (2 classes)
    """
    import torch
    import torch.nn as nn
    from torchvision.models.video import r3d_18, R3D_18_Weights

    model = r3d_18(weights=R3D_18_Weights.DEFAULT)
    print("[Model] Loaded Kinetics-pretrained R3D-18 weights")

    # Freeze everything
    for param in model.parameters():
        param.requires_grad = False

    # Unfreeze layer4 only
    for param in model.layer4.parameters():
        param.requires_grad = True

    # Replace head: add Dropout + 2-class linear
    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Dropout(p=0.3),
        nn.Linear(256, 2),  # Binary: Normal (0) vs Anomaly (1)
    )

    model = model.to(device)

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total     = sum(p.numel() for p in model.parameters())
    print(f"[Model] Trainable params: {trainable:,} / {total:,} ({100*trainable/total:.1f}%)")

    return model


# ── Training loop ────────────────────────────────────────────────

def train(args):
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Train] Using device: {device}")
    if device.type == "cuda":
        print(f"[Train] GPU: {torch.cuda.get_device_name(0)}")

    # Datasets
    train_ds = AnomalyDataset(
        os.path.join(args.data_dir, "train"),
        clips_per_video=args.clips_per_video,
        augment=True,
    )
    val_ds = AnomalyDataset(
        os.path.join(args.data_dir, "val"),
        clips_per_video=4,
        augment=False,
    )

    train_loader = DataLoader(
        train_ds, batch_size=args.batch_size,
        shuffle=True, num_workers=2, pin_memory=(device.type == "cuda"),
        drop_last=True,
    )
    val_loader = DataLoader(
        val_ds, batch_size=args.batch_size,
        shuffle=False, num_workers=2, pin_memory=(device.type == "cuda"),
    )

    model = build_model(device)

    # Loss: label smoothing to reduce overconfidence
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    # Optimizer — only trainable params, small LR
    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr,
        weight_decay=1e-3,
    )

    # Scheduler — reduce LR when val loss plateaus
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="max", factor=0.5, patience=3, verbose=True
    )

    os.makedirs(args.output_dir, exist_ok=True)
    best_val_acc   = 0.0
    best_epoch     = 0
    no_improve     = 0
    EARLY_STOP_PAT = 8  # Stop if no improvement for 8 epochs

    for epoch in range(1, args.epochs + 1):
        # ── Progressive unfreeze: after epoch 5, also unfreeze layer3 ──
        if epoch == 6:
            print("[Train] Unfreezing layer3 with lower LR...")
            for param in model.layer3.parameters():
                param.requires_grad = True
            # Add layer3 params to optimizer with smaller LR
            optimizer.add_param_group({
                "params": model.layer3.parameters(),
                "lr": args.lr * 0.05,  # very small LR for deeper layers
            })

        # ── Train ──
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total   = 0

        for batch_idx, (clips, labels) in enumerate(train_loader):
            clips  = clips.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            logits = model(clips)
            loss   = criterion(logits, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            preds  = logits.argmax(dim=1)
            train_correct += (preds == labels).sum().item()
            train_total   += labels.size(0)
            train_loss    += loss.item()

            if (batch_idx + 1) % 10 == 0:
                acc = 100 * train_correct / train_total
                avg_loss = train_loss / (batch_idx + 1)
                print(f"  Epoch {epoch}/{args.epochs}  "
                      f"Batch {batch_idx+1}/{len(train_loader)}  "
                      f"Loss: {avg_loss:.4f}  Acc: {acc:.1f}%")

        train_acc = 100 * train_correct / max(train_total, 1)

        # ── Validate ──
        model.eval()
        val_correct = 0
        val_total   = 0
        val_loss    = 0.0
        tp = tn = fp = fn = 0  # For precision/recall of anomaly class

        with torch.no_grad():
            for clips, labels in val_loader:
                clips  = clips.to(device)
                labels = labels.to(device)
                logits = model(clips)
                loss   = criterion(logits, labels)
                preds  = logits.argmax(dim=1)

                val_correct += (preds == labels).sum().item()
                val_total   += labels.size(0)
                val_loss    += loss.item()

                # Confusion matrix for anomaly class
                for pred, true in zip(preds.cpu().numpy(), labels.cpu().numpy()):
                    if true == 1 and pred == 1: tp += 1
                    if true == 0 and pred == 0: tn += 1
                    if true == 0 and pred == 1: fp += 1
                    if true == 1 and pred == 0: fn += 1

        val_acc  = 100 * val_correct / max(val_total, 1)
        avg_val  = val_loss / max(len(val_loader), 1)
        precision = tp / max(tp + fp, 1)
        recall    = tp / max(tp + fn, 1)
        f1        = 2 * precision * recall / max(precision + recall, 1e-8)

        gap = train_acc - val_acc

        print(f"\n=== Epoch {epoch}/{args.epochs} ===")
        print(f"  Train Acc: {train_acc:.1f}%   Val Acc: {val_acc:.1f}%   Gap: {gap:.1f}%")
        print(f"  Train Loss: {train_loss/len(train_loader):.4f}   Val Loss: {avg_val:.4f}")
        print(f"  Anomaly → Precision: {precision:.3f}  Recall: {recall:.3f}  F1: {f1:.3f}")
        print(f"  TP={tp} TN={tn} FP={fp} FN={fn}\n")

        scheduler.step(val_acc)

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch   = epoch
            no_improve   = 0
            ckpt_path    = os.path.join(args.output_dir, "anomaly_classifier.pth")
            torch.save(model.state_dict(), ckpt_path)
            print(f"  ✅ New best! Saved to {ckpt_path}")
        else:
            no_improve += 1
            print(f"  No improvement ({no_improve}/{EARLY_STOP_PAT}). Best: {best_val_acc:.1f}% @ epoch {best_epoch}")

        if no_improve >= EARLY_STOP_PAT:
            print(f"\n[EarlyStop] No improvement for {EARLY_STOP_PAT} epochs. Stopping.")
            break

    print(f"\n{'='*50}")
    print(f"Training complete! Best Val Acc: {best_val_acc:.1f}% at epoch {best_epoch}")
    print(f"Checkpoint saved: {args.output_dir}/anomaly_classifier.pth")
    print(f"\nNext steps:")
    print(f"  cp {args.output_dir}/anomaly_classifier.pth backend/models/")
    print(f"  The video_analyze.py will auto-load it on next run.")


if __name__ == "__main__":
    # Fix seeds for reproducibility
    random.seed(42)
    np.random.seed(42)
    args = parse_args()
    train(args)