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

#[tauri::command]
fn run_whisper_proto_bg(filepath: String, model_size: String, window: tauri::Window) -> Result<String, String> {
    use std::process::{Command, Stdio};
    use std::thread;
    use std::path::Path;

    #[cfg(target_os = "windows")]
    let python_exe = "../python-env/venv/Scripts/python.exe";
    #[cfg(not(target_os = "windows"))]
    let python_exe = "../python-env/venv/bin/python";

    if !Path::new(python_exe).exists() {
        return Err(format!("Python executable not found at {}", python_exe));
    }

    // Clone the window handle to use in the thread
    let win = window.clone();

    thread::spawn(move || {
        let output = Command::new(python_exe)
            .arg("scripts/whisper_proto.py")
            .arg(&filepath)
            .arg(&model_size)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output();

        match output {
            Ok(out) => {
                let result_str = if out.status.success() {
                    String::from_utf8_lossy(&out.stdout).to_string()
                } else {
                    String::from_utf8_lossy(&out.stderr).to_string()
                };

                // Emit event to frontend
                let _ = win.emit("whisper-done", result_str);
            }
            Err(e) => {
                let _ = win.emit("whisper-error", e.to_string());
            }
        }
    });

    Ok("Transcription started...".into())
}



#[tauri::command]
fn run_whisper_proto_async(filepath: String, model_size: String) -> Result<String, String> {
    use std::process::{Command, Stdio};
    use std::thread;
    use std::path::Path;

    let handle = thread::spawn(move || {
        #[cfg(target_os = "windows")]
        let python_exe = "../python-env/venv/Scripts/python.exe";
        #[cfg(not(target_os = "windows"))]
        let python_exe = "../python-env/venv/bin/python";

        if !Path::new(python_exe).exists() {
            return Err(format!("Python executable not found at {}", python_exe));
        }

        // Run Python script
        let output = Command::new(python_exe)
            .arg("scripts/whisper_proto.py")
            .arg(&filepath)
            .arg(&model_size)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output();

        output.map_err(|e| e.to_string()) // Keep inner error as String
    });

    // Join the thread
    let output = handle.join().map_err(|e| format!("Thread panicked: {:?}", e))??; 
    // The `??` here first unwraps thread join, then the inner Command result

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}




#[tauri::command]
fn run_whisper_proto(filepath: String, model_size: String) -> Result<String, String> {
    use std::process::{Command, Stdio};
    use std::path::Path;

    // Determine Python executable inside venv
    #[cfg(target_os = "windows")]
    let python_exe = "python-env\\Scripts\\python.exe";
    #[cfg(not(target_os = "windows"))]
    let python_exe = "../python-env/venv/bin/python";


    // Make sure paths are valid
    if !Path::new(python_exe).exists() {
        return Err(format!("Python executable not found at {}", python_exe));
    }

    // Spawn Python process with command-line args
    //let output = Command::new("python")
    //let output = Command::new("venv/bin/python") // path to venv 
    let output = Command::new(python_exe)
        .arg("scripts/whisper_proto.py")
        .arg(&filepath)     // audio file path
        .arg(&model_size)   // model size (tiny, base, small, medium, large)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
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
            run_whisper_proto,
            run_whisper_proto_async,
            run_whisper_proto_bg,
            process_audio_chunk
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}