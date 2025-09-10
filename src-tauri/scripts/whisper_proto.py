import whisperx
import torch
import argparse
import json
import logging
import sys
import os
import shutil
from pathlib import Path
from datetime import datetime

# ------------------------------- 
# Logging setup
# ------------------------------- 
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

# ------------------------------- 
# Parse command line
# ------------------------------- 
parser = argparse.ArgumentParser(description="Local transcription with WhisperX")
parser.add_argument("audio_file", type=str, help="Path to audio file (e.g., audio.mp3)")
parser.add_argument("model_size", type=str, help="Whisper model size (tiny, base, small, medium, large)")
parser.add_argument("--output-root", type=str, default="./public", help="Root output directory (default: ./public)")
args = parser.parse_args()

audio_file = args.audio_file
model_size = args.model_size.lower()
output_root = args.output_root

logging.info(f"Audio file: {audio_file}")
logging.info(f"Whisper model size: {model_size}")
logging.info(f"Output root: {output_root}")

# ------------------------------- 
# Create project folder structure
# ------------------------------- 
def create_project_folder(audio_path, root_dir):
    """Create a unique project folder and return paths"""
    audio_path = Path(audio_path)
    root_path = Path(root_dir)
    
    # Create root directory if it doesn't exist
    root_path.mkdir(parents=True, exist_ok=True)
    
    # Generate project folder name: filename_timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    audio_name = audio_path.stem  # filename without extension
    project_name = f"{audio_name}_{timestamp}"
    
    project_dir = root_path / project_name
    project_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy audio file to project directory
    audio_copy_path = project_dir / audio_path.name
    try:
        shutil.copy2(audio_path, audio_copy_path)
        logging.info(f"Audio file copied to: {audio_copy_path}")
    except Exception as e:
        logging.error(f"Failed to copy audio file: {e}")
        raise
    
    # Define JSON output path
    json_output_path = project_dir / "transcript.json"
    
    return str(audio_copy_path), str(json_output_path), str(project_dir)

# Create project structure
try:
    copied_audio_path, json_output_path, project_dir = create_project_folder(audio_file, output_root)
    logging.info(f"Project directory created: {project_dir}")
except Exception as e:
    logging.error(f"Failed to create project structure: {e}")
    sys.exit(1)

# ------------------------------- 
# Load WhisperX model
# ------------------------------- 
device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if device == "cuda" else "float32"

logging.info(f"Loading Whisper model '{model_size}' on {device} with compute_type={compute_type}...")
try:
    asr_model = whisperx.load_model(model_size, device=device, compute_type=compute_type)
except Exception as e:
    logging.error(f"Failed to load Whisper model: {e}")
    sys.exit(1)

# ------------------------------- 
# Transcribe audio (use original file for processing)
# ------------------------------- 
logging.info("Transcribing audio with WhisperX...")
try:
    result = asr_model.transcribe(audio_file)  # Use original file for transcription
    logging.info(f"Detected language: {result['language']}")
except Exception as e:
    logging.error(f"Transcription failed: {e}")
    sys.exit(1)

# ------------------------------- 
# Align words with probabilities
# ------------------------------- 
logging.info("Aligning words with confidence...")
try:
    align_model, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
    result_aligned = whisperx.align(
        result["segments"], 
        align_model, 
        metadata, 
        audio_file,  # Use original file for alignment
        device,
        return_char_alignments=False
    )
except Exception as e:
    logging.error(f"Word alignment failed: {e}")
    sys.exit(1)

# ------------------------------- 
# Convert to JSON-friendly structure
# ------------------------------- 
logging.info("Formatting results for JSON export...")
sentences_json = []

for segment in result_aligned.get("segments", []):
    sentence = {
        "start": segment.get("start", None),
        "end": segment.get("end", None),
        "sentence": segment.get("text", ""),
        "words": []
    }
    
    for word_info in segment.get("words", []):
        confidence = word_info.get("probability", word_info.get("confidence", word_info.get("score", None)))
        sentence["words"].append({
            "word": word_info.get("word", ""),
            "start": word_info.get("start", None),
            "end": word_info.get("end", None),
            "confidence": confidence
        })
    
    sentences_json.append(sentence)

# ------------------------------- 
# Add metadata to JSON
# ------------------------------- 
output_data = {
    "metadata": {
        "original_file": os.path.basename(audio_file),
        "copied_file": os.path.basename(copied_audio_path),
        "model_size": model_size,
        "language": result.get("language", "unknown"),
        "transcription_date": datetime.now().isoformat(),
        "device": device,
        "compute_type": compute_type
    },
    "transcription": sentences_json
}

# ------------------------------- 
# Save JSON
# ------------------------------- 
try:
    with open(json_output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=4, ensure_ascii=False)
    
    logging.info(f"Transcription JSON saved to: {json_output_path}")
    logging.info(f"Project folder: {project_dir}")
    logging.info("Pipeline complete.")
    
    # Print the project directory path for Tauri to capture
    print(f"PROJECT_DIR:{project_dir}")
    
except Exception as e:
    logging.error(f"Failed to save JSON file: {e}")
    sys.exit(1)