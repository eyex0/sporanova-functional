# NOVA Cloud Training

## GPU Requirements by Tier

| Tier | GPU | VRAM | Use Case | Est. Cost/Hour |
|------|-----|------|----------|----------------|
| Development | 1x RTX 4090 | 24 GB | Testing, debugging | $0.30 |
| LoRA/QLoRA | 1x A100 80GB | 80 GB | Regular training | $2.50 |
| Full FT | 4x A100 80GB | 320 GB total | Production training | $10.00 |
| Inference | 2x H100 80GB | 160 GB total | Model serving | $6.00 |

### Detailed requirements per training method

| Method | Min GPU | Recommended GPU | Batch Size | Training Time | Est. Total Cost |
|--------|---------|-----------------|-----------|---------------|----------------|
| QLoRA | 1x RTX 4090 | 1x A100 80GB | 4-8 | 4-16 hrs | $10-40 |
| LoRA | 1x A100 40GB | 1x A100 80GB | 4-8 | 8-16 hrs | $20-40 |
| Full FT | 4x A100 40GB | 4x A100 80GB | 16-32 | 24-48 hrs | $240-480 |
| DPO | 1x A100 80GB | 1x A100 80GB | 4-8 | 4-8 hrs | $10-20 |

## Cloud Providers

### AWS

**Instance types:**

| Instance | GPUs | VRAM | $/hr (on-demand) | $/hr (spot) |
|----------|------|------|-------------------|-------------|
| g5.xlarge | 1x A10G | 24 GB | $1.01 | $0.35 |
| p4d.24xlarge | 8x A100 | 320 GB | $32.77 | $11.00 |
| p5.48xlarge | 8x H100 | 640 GB | $98.32 | $35.00 |

**Setup:**

```bash
# Install AWS CLI
pip install awscli

# Configure
aws configure

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type p4d.24xlarge \
  --key-name nova-training \
  --security-group-ids sg-xxx \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":500,"VolumeType":"gp3"}}]'

# SSH and setup
ssh -i nova-training.pem ubuntu@<ip>
```

**Requirements checklist:**

- [ ] AWS account with appropriate service limits
- [ ] EC2 instance limit for p4d/p5 instances (request increase)
- [ ] S3 bucket for checkpoints
- [ ] VPC with proper security groups
- [ ] IAM role with S3 and CloudWatch access

### GCP

**Instance types:**

| Instance | GPUs | VRAM | $/hr (on-demand) | $/hr (preemptible) |
|----------|------|------|-------------------|-------------------|
| a2-highgpu-1g | 1x A100 | 40 GB | $3.67 | $1.10 |
| a2-highgpu-4g | 4x A100 | 160 GB | $14.69 | $4.40 |
| a2-ultragpu-8g | 8x A100 | 320 GB | $29.39 | $8.80 |
| a3-highgpu-8g | 8x H100 | 640 GB | $101.22 | $30.37 |

**Setup:**

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
gcloud init

# Create instance
gcloud compute instances create nova-training \
  --zone=us-central1-a \
  --machine-type=a2-highgpu-4g \
  --accelerator=type=nvidia-tesla-a100,count=4 \
  --image-family=pytorch-latest-gpu \
  --image-project=deeplearning-platform-release \
  --boot-disk-size=500GB \
  --maintenance-policy=TERMINATE \
  --preemptible

# SSH
gcloud compute ssh nova-training --zone=us-central1-a
```

### Azure

**Instance types:**

| Instance | GPUs | VRAM | $/hr (on-demand) | $/hr (spot) |
|----------|------|------|-------------------|-------------|
| Standard_NC4as_T4_v3 | 1x T4 | 16 GB | $0.53 | $0.16 |
| Standard_NC24ads_A100_v4 | 1x A100 | 80 GB | $3.67 | $1.10 |
| Standard_ND96asr_v4 | 8x A100 | 320 GB | $27.20 | $8.16 |
| Standard_ND96amsr_A100_v4 | 8x A100 | 320 GB | $27.20 | $8.16 |

**Setup:**

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLI | bash
az login

# Create resource group
az group create --name nova-training --location eastus

# Create VM
az vm create \
  --resource-group nova-training \
  --name nova-gpu \
  --image MicrosoftCognitiveServices:standard-pytorch:pytorch-2-3:latest \
  --size Standard_NC24ads_A100_v4 \
  --admin-username azureuser \
  --ssh-key-value ~/.ssh/id_rsa.pub \
  --os-disk-size-gb 500
```

## Cost Estimation

### Per-training-run costs

| Scenario | Method | GPU | Hours | Cost |
|----------|--------|-----|-------|------|
| Quick test | QLoRA | 1x RTX 4090 (local) | 2 | $0.60 |
| Standard run | QLoRA | 1x A100 80GB (spot) | 8 | $20 |
| Production | LoRA | 1x A100 80GB (spot) | 12 | $30 |
| Full production | Full FT | 4x A100 80GB (spot) | 36 | $158 |
| Heavy training | Full FT | 4x A100 80GB (on-demand) | 48 | $480 |

### Monthly cost projection

| Usage Level | Method | Runs/Month | Est. Monthly Cost |
|-------------|--------|------------|-------------------|
| Light | QLoRA only | 4 | $80 |
| Medium | QLoRA + LoRA | 8 | $250 |
| Heavy | Mix of methods | 15 | $600 |
| Production | All methods | 20+ | $1,200+ |

### Cost optimization

| Strategy | Savings | Trade-off |
|----------|---------|-----------|
| Spot/preemptible instances | 60-70% | Can be interrupted |
| Reserved instances (1yr) | 30-40% | Upfront commitment |
| Development on RTX 4090 | 90%+ | Slower, smaller batches |
| Mixed precision (bf16) | 20% | Minimal quality loss |
| Gradient checkpointing | 30% memory | 20% slower |

## Infrastructure Setup

### Prerequisites

```bash
# System requirements
# - Ubuntu 22.04 LTS
# - CUDA 12.1+
# - Python 3.11
# - NVIDIA driver 535+

# Verify GPU
nvidia-smi

# Install CUDA toolkit
wget https://developer.download.nvidia.com/compute/cuda/12.1.0/local_installers/cuda_12.1.0_530.30.02_linux.run
sudo sh cuda_12.1.0_530.30.02_linux.run

# Set environment
export PATH=/usr/local/cuda/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
```

### Training environment setup

```bash
# Create conda environment
conda create -n nova python=3.11
conda activate nova

# Install PyTorch
pip install torch==2.2.0 --index-url https://download.pytorch.org/whl/cu121

# Install NOVA dependencies
pip install -r requirements.txt

# Verify setup
python -c "
import torch
print(f'CUDA available: {torch.cuda.is_available()}')
print(f'GPU count: {torch.cuda.device_count()}')
print(f'GPU name: {torch.cuda.get_device_name(0)}')
print(f'VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB')
"
```

### Storage setup

```bash
# Create directories
mkdir -p /data/nova/{datasets,checkpoints,logs,models}

# Mount high-speed storage (if available)
# AWS: EBS gp3 with 1000 IOPS
# GCP: Persistent SSD
# Azure: Premium SSD

# Verify I/O speed
dd if=/dev/zero of=/data/nova/test bs=1G count=1 oflag=direct
```

### Monitoring setup

```bash
# Install monitoring tools
pip install nvitop gpustat

# Real-time GPU monitoring
watch -n 1 gpustat

# Or use nvitop
nvitop
```

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| GPU | RTX 4090 (local) | A100/H100 (cloud) |
| Dataset | Subset (10k samples) | Full (285k+ samples) |
| Training time | 1-2 hours | 8-48 hours |
| Cost | $0.50-2 | $20-500 |
| Purpose | Debug, iterate | Final training |
| Checkpointing | Every 100 steps | Every 500 steps |

## Troubleshooting

### GPU not detected

```bash
# Check driver
nvidia-smi

# If driver missing
sudo apt install nvidia-driver-535
sudo reboot

# If CUDA version mismatch
nvcc --version
pip install torch==2.2.0 --index-url https://download.pytorch.org/whl/cu121
```

### Out of memory

```bash
# Check GPU memory
nvidia-smi --query-gpu=memory.used,memory.total --format=csv

# Solutions
# 1. Reduce batch size
# 2. Enable gradient checkpointing
# 3. Use mixed precision (bf16)
# 4. Use QLoRA instead of LoRA
# 5. Reduce max_length
```

### Slow training

```bash
# Check GPU utilization
nvidia-smi

# If utilization < 80%:
# 1. Increase batch size
# 2. Use DataLoader with num_workers=4
# 3. Enable TF32: export NVIDIA_TF32_OVERRIDE=1
# 4. Check for CPU bottleneck
```

### Spot instance interruption

```bash
# Save checkpoint before interruption
# The trainer saves checkpoints automatically

# Resume from last checkpoint
python training/train.py \
  --config training/configs/nova-qlora.yaml \
  --resume training/checkpoints/nova-7b-qlora-v0.3/checkpoint-1500/
```
