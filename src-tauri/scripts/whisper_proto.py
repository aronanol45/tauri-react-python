import whisperx
import torch
import argparse
import json
import logging
import sys

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
args = parser.parse_args()

audio_file = args.audio_file
model_size = args.model_size.lower()

logging.info(f"Audio file: {audio_file}")
logging.info(f"Whisper model size: {model_size}")

# ------------------------------- 
# Load WhisperX model
# ------------------------------- 
device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if device == "cuda" else "float32"

logging.info(f"Loading Whisper model '{model_size}' on {device} with compute_type={compute_type}...")
asr_model = whisperx.load_model(model_size, device=device, compute_type=compute_type)

# ------------------------------- 
# Transcribe audio
# ------------------------------- 
logging.info("Transcribing audio with WhisperX...")
result = asr_model.transcribe(audio_file)
logging.info(f"Detected language: {result['language']}")

# ------------------------------- 
# Align words with probabilities
# ------------------------------- 
logging.info("Aligning words with confidence...")
align_model, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
result_aligned = whisperx.align(
    result["segments"], 
    align_model, 
    metadata, 
    audio_file, 
    device,
    return_char_alignments=False
)

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
# Save JSON
# ------------------------------- 
json_file = audio_file.rsplit(".", 1)[0] + "_transcript.json"
with open(json_file, "w", encoding="utf-8") as f:
    json.dump(sentences_json, f, indent=4, ensure_ascii=False)

logging.info(f"Transcription JSON saved to {json_file}")
logging.info("Pipeline complete.")
