#!/usr/bin/env python3
"""
train_anomaly.py — Binary Anomaly Detection (Normal vs Violence)
================================================================
Adapted for dataset structure:
    video/
    ├── dataset_video_violence/     <- 1150 violence videos
    └── data_video_non_violence/    <- 1150 normal videos

The script auto-splits into 80% train / 20% val.

Usage:
    python train_anomaly.py --data_dir ./video --epochs 30 --batch_size 4

Output:
    ./models/anomaly_classifier.pth
"""

import os
import sys
import random
import argparse
from pathlib import Path

import cv2
import numpy as np

# ── Config ──────────────────────────────────────────────────────
CLIP_LEN    = 16
FRAME_SIZE  = 112
MEAN        = [0.43216, 0.394666, 0.37645]
STD         = [0.22803, 0.22145,  0.216989]

# Folder names in your dataset that map to each class
VIOLENCE_FOLDERS = {"dataset_video_violence"}
NORMAL_FOLDERS   = {"data_video_non_violence"}


def parse_args():
    p = argparse.ArgumentParser(description="Train binary violence detector")
    p.add_argument("--data_dir",        default="./video",
                   help="Root dir containing dataset_video_violence/ and data_video_non_violence/")
    p.add_argument("--epochs",          type=int,   default=30)
    p.add_argument("--batch_size",      type=int,   default=4)
    p.add_argument("--lr",              type=float, default=5e-6)
    p.add_argument("--output_dir",      default="./models")
    p.add_argument("--clips_per_video", type=int,   default=4,
                   help="Clips sampled per video per epoch")
    p.add_argument("--val_split",       type=float, default=0.2,
                   help="Fraction of videos held out for validation")
    return p.parse_args()


# ── Dataset helpers ───────────────────────────────────────────────

def collect_video_paths(data_dir):
    """
    Scan data_dir for the two class folders.
    Returns two lists: (violence_paths, normal_paths)
    """
    exts  = {".mp4", ".avi", ".mov", ".mkv", ".wmv"}
    root  = Path(data_dir)

    if not root.exists():
        print(f"[ERROR] Directory not found: {data_dir}")
        sys.exit(1)

    violence_paths = []
    normal_paths   = []

    for folder in sorted(root.iterdir()):
        if not folder.is_dir():
            continue
        name = folder.name

        if name in VIOLENCE_FOLDERS:
            target = violence_paths
            label_str = "Violence"
        elif name in NORMAL_FOLDERS:
            target = normal_paths
            label_str = "Normal"
        else:
            print(f"[WARN] Unknown folder '{name}', skipping.")
            continue

        found = [str(f) for f in folder.rglob("*") if f.suffix.lower() in exts]
        print(f"[Dataset] Found {len(found)} videos in '{name}' → {label_str}")
        target.extend(found)

    if not violence_paths:
        print("[ERROR] No violence videos found. Check --data_dir and folder names.")
        sys.exit(1)
    if not normal_paths:
        print("[ERROR] No normal videos found. Check --data_dir and folder names.")
        sys.exit(1)

    return violence_paths, normal_paths


def split_paths(paths, val_fraction, seed=42):
    """Reproducible train/val split."""
    rng = random.Random(seed)
    shuffled = paths[:]
    rng.shuffle(shuffled)
    cut = int(len(shuffled) * (1 - val_fraction))
    return shuffled[:cut], shuffled[cut:]


# ── Dataset ──────────────────────────────────────────────────────

class VideoDataset:
    """
    Binary dataset: 0 = Normal, 1 = Violence
    Balances classes automatically.
    """
    def __init__(self, normal_paths, violence_paths, clips_per_video=4, augment=False):
        self.clips_per_video = clips_per_video
        self.augment         = augment

        # Balance by oversampling the minority class
        max_n = max(len(normal_paths), len(violence_paths))
        rng   = random.Random(0)
        n_balanced = rng.choices(normal_paths,   k=max_n)
        v_balanced = rng.choices(violence_paths, k=max_n)

        self.samples = [(p, 0) for p in n_balanced] + [(p, 1) for p in v_balanced]
        random.shuffle(self.samples)
        print(f"[Dataset] After balancing: {max_n} normal + {max_n} violence = {len(self.samples)} videos")

    def __len__(self):
        return len(self.samples) * self.clips_per_video

    def __getitem__(self, idx):
        import torch
        video_idx           = idx // self.clips_per_video
        video_path, label   = self.samples[video_idx % len(self.samples)]
        frames = load_random_clip(video_path, CLIP_LEN, FRAME_SIZE, augment=self.augment)
        tensor = frames_to_tensor(frames)
        return tensor, torch.tensor(label, dtype=torch.long)


def load_random_clip(video_path, clip_len, frame_size, augment=False):
    cap   = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    if total <= 0:
        return [np.zeros((frame_size, frame_size, 3), dtype=np.uint8)] * clip_len

    max_start = max(0, total - clip_len)
    start     = random.randint(0, max_start)

    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, start)

    frames = []
    for _ in range(clip_len):
        ret, frame = cap.read()
        if not ret:
            frames.append(frames[-1].copy() if frames else
                          np.zeros((frame_size, frame_size, 3), dtype=np.uint8))
        else:
            frame = cv2.resize(frame, (frame_size, frame_size))
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame)
    cap.release()

    if augment:
        if random.random() < 0.5:
            frames = [cv2.flip(f, 1) for f in frames]
        alpha  = random.uniform(0.7, 1.3)
        beta   = random.randint(-20, 20)
        frames = [np.clip(f.astype(np.float32) * alpha + beta, 0, 255).astype(np.uint8)
                  for f in frames]
        if random.random() < 0.15:
            frames = [np.stack([cv2.cvtColor(f, cv2.COLOR_RGB2GRAY)] * 3, axis=-1)
                      for f in frames]
        if random.random() < 0.3:
            frames = frames[::-1]
        if random.random() < 0.3:
            angle = random.uniform(-10, 10)
            M     = cv2.getRotationMatrix2D((FRAME_SIZE // 2, FRAME_SIZE // 2), angle, 1.0)
            frames = [cv2.warpAffine(f, M, (FRAME_SIZE, FRAME_SIZE)) for f in frames]

    return frames


def frames_to_tensor(frames):
    import torch
    arr  = np.stack(frames, axis=0).astype(np.float32) / 255.0
    mean = np.array(MEAN, dtype=np.float32)
    std  = np.array(STD,  dtype=np.float32)
    arr  = (arr - mean) / std
    return torch.from_numpy(arr).permute(3, 0, 1, 2)   # (3, T, H, W)


# ── Model ────────────────────────────────────────────────────────

def build_model(device):
    import torch.nn as nn
    from torchvision.models.video import r3d_18, R3D_18_Weights

    model = r3d_18(weights=R3D_18_Weights.DEFAULT)
    print("[Model] Loaded Kinetics-pretrained R3D-18 weights")

    for param in model.parameters():
        param.requires_grad = False

    for param in model.layer4.parameters():
        param.requires_grad = True

    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.5),
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Dropout(p=0.3),
        nn.Linear(256, 2),      # 0 = Normal, 1 = Violence
    )

    model = model.to(device)

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total     = sum(p.numel() for p in model.parameters())
    print(f"[Model] Trainable params: {trainable:,} / {total:,} ({100 * trainable / total:.1f}%)")
    return model


# ── Training ─────────────────────────────────────────────────────

def train(args):
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Train] Device: {device}")
    if device.type == "cuda":
        print(f"[Train] GPU: {torch.cuda.get_device_name(0)}")

    # ── Collect & split videos ──
    violence_paths, normal_paths = collect_video_paths(args.data_dir)
    v_train, v_val = split_paths(violence_paths, args.val_split)
    n_train, n_val = split_paths(normal_paths,   args.val_split)

    print(f"\n[Split] Train → {len(n_train)} normal + {len(v_train)} violence")
    print(f"[Split] Val   → {len(n_val)} normal + {len(v_val)} violence\n")

    train_ds = VideoDataset(n_train, v_train, clips_per_video=args.clips_per_video, augment=True)
    val_ds   = VideoDataset(n_val,   v_val,   clips_per_video=4,                    augment=False)

    train_loader = DataLoader(
        train_ds, batch_size=args.batch_size,
        shuffle=True,  num_workers=2, pin_memory=(device.type == "cuda"), drop_last=True,
    )
    val_loader = DataLoader(
        val_ds, batch_size=args.batch_size,
        shuffle=False, num_workers=2, pin_memory=(device.type == "cuda"),
    )

    model     = build_model(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr, weight_decay=1e-3,
    )
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="max", factor=0.5, patience=3, verbose=True,
    )

    os.makedirs(args.output_dir, exist_ok=True)
    best_val_acc   = 0.0
    best_epoch     = 0
    no_improve     = 0
    EARLY_STOP_PAT = 8

    for epoch in range(1, args.epochs + 1):
        # Progressive unfreeze: after epoch 5, also unfreeze layer3
        if epoch == 6:
            print("[Train] Unfreezing layer3 with lower LR...")
            for param in model.layer3.parameters():
                param.requires_grad = True
            optimizer.add_param_group({
                "params": model.layer3.parameters(),
                "lr":     args.lr * 0.05,
            })

        # ── Train ──
        model.train()
        train_loss = train_correct = train_total = 0

        for batch_idx, (clips, labels) in enumerate(train_loader):
            clips  = clips.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            logits = model(clips)
            loss   = criterion(logits, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            preds          = logits.argmax(dim=1)
            train_correct += (preds == labels).sum().item()
            train_total   += labels.size(0)
            train_loss    += loss.item()

            if (batch_idx + 1) % 10 == 0:
                acc      = 100 * train_correct / train_total
                avg_loss = train_loss / (batch_idx + 1)
                print(f"  Epoch {epoch}/{args.epochs}  "
                      f"Batch {batch_idx+1}/{len(train_loader)}  "
                      f"Loss: {avg_loss:.4f}  Acc: {acc:.1f}%")

        train_acc = 100 * train_correct / max(train_total, 1)

        # ── Validate ──
        model.eval()
        val_correct = val_total = 0
        val_loss    = 0.0
        tp = tn = fp = fn = 0

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

                for pred, true in zip(preds.cpu().numpy(), labels.cpu().numpy()):
                    if true == 1 and pred == 1: tp += 1
                    if true == 0 and pred == 0: tn += 1
                    if true == 0 and pred == 1: fp += 1
                    if true == 1 and pred == 0: fn += 1

        val_acc   = 100 * val_correct / max(val_total, 1)
        avg_val   = val_loss / max(len(val_loader), 1)
        precision = tp / max(tp + fp, 1)
        recall    = tp / max(tp + fn, 1)
        f1        = 2 * precision * recall / max(precision + recall, 1e-8)
        gap       = train_acc - val_acc

        print(f"\n=== Epoch {epoch}/{args.epochs} ===")
        print(f"  Train Acc: {train_acc:.1f}%   Val Acc: {val_acc:.1f}%   Gap: {gap:.1f}%")
        print(f"  Train Loss: {train_loss/len(train_loader):.4f}   Val Loss: {avg_val:.4f}")
        print(f"  Violence → Precision: {precision:.3f}  Recall: {recall:.3f}  F1: {f1:.3f}")
        print(f"  TP={tp} TN={tn} FP={fp} FN={fn}\n")

        scheduler.step(val_acc)

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch   = epoch
            no_improve   = 0
            ckpt_path    = os.path.join(args.output_dir, "anomaly_classifier.pth")
            torch.save(model.state_dict(), ckpt_path)
            print(f"  ✅ New best! Saved to {ckpt_path}")
        else:
            no_improve += 1
            print(f"  No improvement ({no_improve}/{EARLY_STOP_PAT}). "
                  f"Best: {best_val_acc:.1f}% @ epoch {best_epoch}")

        if no_improve >= EARLY_STOP_PAT:
            print(f"\n[EarlyStop] No improvement for {EARLY_STOP_PAT} epochs. Stopping.")
            break

    print(f"\n{'='*50}")
    print(f"Training complete! Best Val Acc: {best_val_acc:.1f}% at epoch {best_epoch}")
    print(f"Checkpoint saved: {args.output_dir}/anomaly_classifier.pth")
    print(f"\nNext step:")
    print(f"  cp {args.output_dir}/anomaly_classifier.pth backend/models/")


if __name__ == "__main__":
    random.seed(42)
    np.random.seed(42)
    args = parse_args()
    train(args)