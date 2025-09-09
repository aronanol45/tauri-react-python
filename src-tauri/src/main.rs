// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::command;
use std::io::Write;
use std::process::{Command, Stdio};
use serde::Deserialize;
// Learn more about Tauri commands at https://v1.tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn run_python(name: String) -> Result<String, String> {
    use std::io::Write;

    let mut child = std::process::Command::new("python") // or "python"
        .arg("scripts/script.py")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let input = format!(r#"{{"name":"{}"}}"#, name);
    child.stdin.as_mut().unwrap().write_all(input.as_bytes()).map_err(|e| e.to_string())?;
    drop(child.stdin.take()); // close stdin so Python finishes reading

    let output = child.wait_with_output().map_err(|e| e.to_string())?;

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
    let mut py_process = Command::new("python") // or "python" on Windows
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
        .invoke_handler(tauri::generate_handler![
            greet,
            run_python,
            process_audio_chunk
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}