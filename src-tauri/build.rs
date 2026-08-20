//! Build script. Job: run `tauri-build`, which generates the context the
//! `tauri::generate_context!()` macro expands into (config, icons, capability
//! definitions) and, on Windows, embeds the manifest and resources.
//!
//! Called by: cargo, before compiling the crate.
//! Calls: tauri-build.

fn main() {
    tauri_build::build()
}
