// main.rs — Tauri 앱 진입점
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    moonpkm_lib::run();
}
