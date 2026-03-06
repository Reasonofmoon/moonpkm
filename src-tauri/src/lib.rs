// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::Manager;
use walkdir::WalkDir;

// ── 파일 노드 구조체 ──────────────────────────
#[derive(Serialize, Deserialize, Clone)]
struct FileNode {
    name: String,
    path: String,
    #[serde(rename = "type")]
    node_type: String,
    children: Option<Vec<FileNode>>,
}

// ── Vault 파일 트리 ──────────────────────────
#[tauri::command]
fn list_vault(vault_path: String) -> Result<Vec<FileNode>, String> {
    let root = Path::new(&vault_path);
    if !root.exists() {
        return Err(format!("Vault not found: {}", vault_path));
    }
    Ok(build_tree(root, root))
}

fn build_tree(path: &Path, root: &Path) -> Vec<FileNode> {
    let mut nodes: Vec<FileNode> = Vec::new();

    let entries = match fs::read_dir(path) {
        Ok(e) => e,
        Err(_) => return nodes,
    };

    let mut dirs: Vec<FileNode> = Vec::new();
    let mut files: Vec<FileNode> = Vec::new();

    for entry in entries.flatten() {
        let p = entry.path();
        let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();

        // 숨김 파일/폴더 제외
        if name.starts_with('.') {
            continue;
        }

        let rel = p.strip_prefix(root).unwrap_or(&p).to_string_lossy().replace('\\', "/");

        if p.is_dir() {
            dirs.push(FileNode {
                name: name.clone(),
                path: rel,
                node_type: "directory".into(),
                children: Some(build_tree(&p, root)),
            });
        } else if p.extension().map(|e| e == "md").unwrap_or(false) {
            files.push(FileNode {
                name,
                path: rel,
                node_type: "file".into(),
                children: None,
            });
        }
    }

    dirs.sort_by(|a, b| a.name.cmp(&b.name));
    files.sort_by(|a, b| a.name.cmp(&b.name));
    dirs.extend(files);
    dirs
}

// ── 파일 읽기 ────────────────────────────────
#[tauri::command]
fn read_file(vault_path: String, rel_path: String) -> Result<String, String> {
    let full = Path::new(&vault_path).join(&rel_path);
    fs::read_to_string(&full).map_err(|e| format!("Read error: {e}"))
}

// ── 파일 저장 ─────────────────────────────────
#[tauri::command]
fn write_file(vault_path: String, rel_path: String, content: String) -> Result<(), String> {
    let full = Path::new(&vault_path).join(&rel_path);
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Dir error: {e}"))?;
    }
    fs::write(&full, content).map_err(|e| format!("Write error: {e}"))
}

// ── 새 파일 생성 ──────────────────────────────
#[tauri::command]
fn create_file(vault_path: String, rel_path: String, template: String) -> Result<String, String> {
    let title = Path::new(&rel_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let content = match template.as_str() {
        "brain" => format!(
            "---\ntitle: {title}\ntype: brain\ndikm: knowledge\ntags: []\ncreated: {}\n---\n\n# {title}\n\n## Background\n\n## Resonance\n\n## Amplify\n\n## Integrate\n\n## Navigate\n",
            chrono_now()
        ),
        "evergreen" => format!(
            "---\ntitle: {title}\ntype: evergreen\ndikm: meaning\ntags: []\ncreated: {}\n---\n\n# {title}\n\n",
            chrono_now()
        ),
        _ => format!(
            "---\ntitle: {title}\ntype: note\ndikm: data\ntags: []\ncreated: {}\n---\n\n# {title}\n\n",
            chrono_now()
        ),
    };

    write_file(vault_path, rel_path, content.clone())?;
    Ok(content)
}

fn chrono_now() -> String {
    // YYYY-MM-DD 형식
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let days = now / 86400;
    let (y, m, d) = days_to_ymd(days as i64 + 719468);
    format!("{y}-{m:02}-{d:02}")
}

fn days_to_ymd(z: i64) -> (i64, i64, i64) {
    let era = (if z >= 0 { z } else { z - 146096 }) / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

// ── 전체 텍스트 검색 ──────────────────────────
#[tauri::command]
fn search_vault(vault_path: String, query: String, limit: usize) -> Result<Vec<serde_json::Value>, String> {
    let query_lower = query.to_lowercase();
    let mut results: Vec<serde_json::Value> = Vec::new();

    for entry in WalkDir::new(&vault_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|x| x == "md").unwrap_or(false))
    {
        let path = entry.path();
        if path.to_string_lossy().contains('.') {
            let parts: Vec<&str> = path.to_string_lossy().split('.').collect();
            if parts.len() >= 2 && parts[parts.len() - 2].starts_with('.') {
                continue;
            }
        }

        let content = fs::read_to_string(path).unwrap_or_default();
        let content_lower = content.to_lowercase();

        if content_lower.contains(&query_lower) {
            let rel = path
                .strip_prefix(&vault_path)
                .unwrap_or(path)
                .to_string_lossy()
                .replace('\\', "/");

            let title = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
            let score = content_lower.matches(&query_lower).count();

            results.push(serde_json::json!({
                "path": rel,
                "title": title,
                "type": "note",
                "dikm": "data",
                "score": score
            }));

            if results.len() >= limit {
                break;
            }
        }
    }

    results.sort_by(|a, b| {
        b["score"].as_u64().unwrap_or(0).cmp(&a["score"].as_u64().unwrap_or(0))
    });

    Ok(results)
}

// ── 라이선스 키 검증 ──────────────────────────
#[tauri::command]
fn verify_license(key: String) -> bool {
    if key.trim().is_empty() {
        return false;
    }
    // Gumroad 라이선스 API 검증 (blocking)
    let client = match reqwest::blocking::Client::builder().timeout(std::time::Duration::from_secs(10)).build() {
        Ok(c) => c,
        Err(_) => return false,
    };
    let resp = client
        .post("https://api.gumroad.com/v2/licenses/verify")
        .form(&[
            ("product_permalink", "moonpkm"),
            ("license_key", key.trim()),
            ("increment_uses_count", "false"),
        ])
        .send();

    match resp {
        Ok(r) => {
            if let Ok(json) = r.json::<serde_json::Value>() {
                return json["success"].as_bool().unwrap_or(false);
            }
            false
        }
        Err(_) => false,
    }
}

// ── 앱 진입점 ────────────────────────────────
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            list_vault,
            read_file,
            write_file,
            create_file,
            search_vault,
            verify_license,
        ])
        .run(tauri::generate_context!())
        .expect("error while running moonpkm");
}
