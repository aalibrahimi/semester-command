//! Binary entry point.
//!
//! Job: decide whether this process is a desktop app or an MCP server, then
//! hand off. Everything else lives in `lib.rs` and below.
//!
//! Called by: the OS.
//! Calls: `semester_command_lib::run`.
//!
//! The `windows_subsystem` attribute stops a console window from appearing
//! behind the app on Windows in release builds. It is conditional on
//! `not(debug_assertions)` because during development that console is where the
//! `tracing` output goes, and losing it makes debugging sync much worse.

#![cfg_attr(
    not(debug_assertions),
    cfg_attr(target_os = "windows", windows_subsystem = "windows")
)]

fn main() {
    // `--mcp` starts the stdio MCP server against the same database instead
    // of opening a window. Parsed here, before Tauri initialises, because an
    // MCP server must not touch the windowing system at all — a headless
    // agent host has no display to attach to.
    if std::env::args().any(|a| a == "--mcp") {
        if let Err(e) = semester_command_lib::mcp::serve() {
            eprintln!("mcp server error: {e}");
            std::process::exit(1);
        }
        return;
    }
    semester_command_lib::run()
}
