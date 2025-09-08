// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::command;
use std::process::{Command, Stdio};
use serde::Deserialize;
// Learn more about Tauri commands at https://v1.tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn run_python(arg: String) -> Result<String, String> {
    let output = std::process::Command::new("python")
        .arg("scripts/script.py")
        .arg(&arg) // pass argument to Python
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[derive(Deserialize)]
struct AudioPayload {
    audioData: String, // Base64-encoded audio
}

#[tauri::command]
fn process_audio_chunk(payload: AudioPayload) -> Result<String, String> {
    // Call Python script
    let mut py_process = Command::new("python3") // or "python" on Windows
        .arg("scripts/whisper.py")
        .arg(&payload.audioData)
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let output = py_process.wait_with_output().map_err(|e| e.to_string())?;
    
    if output.status.success() {
        // Convert stdout to string and return
        let result = String::from_utf8(output.stdout).map_err(|e| e.to_string())?;
        Ok(result)
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(err)
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![run_python])
        .invoke_handler(tauri::generate_handler![process_audio_chunk])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
