use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
    },
    thread::{self, JoinHandle},
    time::Duration,
};

use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, State,
};

struct WatchInner {
    cancel: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

pub struct WatchState {
    inner: Mutex<WatchInner>,
}

#[derive(Clone, Serialize)]
struct WatchReadyPayload {
    path: String,
}

fn post_ingest(path: &str) {
    let client = match reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
    {
        Ok(c) => c,
        Err(_) => return,
    };
    let body = serde_json::json!({ "filePath": path });
    match client
        .post("http://127.0.0.1:4000/api/ingest")
        .json(&body)
        .send()
    {
        Ok(r) if r.status().is_success() => {}
        Ok(r) => eprintln!("[sift] ingest HTTP {}", r.status()),
        Err(e) => eprintln!("[sift] ingest failed: {e}"),
    }
}

#[tauri::command]
fn set_watch_folder(
    app: AppHandle,
    path: String,
    state: State<'_, WatchState>,
) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() || !p.is_dir() {
        return Err("Path must be an existing directory".into());
    }

    let mut inner = state.inner.lock().map_err(|e| e.to_string())?;
    inner.cancel.store(true, Ordering::SeqCst);
    if let Some(h) = inner.handle.take() {
        let _ = h.join();
    }
    inner.cancel.store(false, Ordering::SeqCst);

    let cancel = Arc::clone(&inner.cancel);
    let path_clone = p.clone();
    let handle = thread::spawn(move || {
        let (tx, rx) = mpsc::channel();
        let mut watcher: RecommendedWatcher = match RecommendedWatcher::new(
            move |res| {
                let _ = tx.send(res);
            },
            Config::default(),
        ) {
            Ok(w) => w,
            Err(e) => {
                eprintln!("[sift] watcher create failed: {e}");
                return;
            }
        };

        if let Err(e) = watcher.watch(&path_clone, RecursiveMode::Recursive) {
            eprintln!("[sift] watch failed: {e}");
            return;
        }

        loop {
            if cancel.load(Ordering::SeqCst) {
                break;
            }
            match rx.recv_timeout(Duration::from_millis(400)) {
                Ok(Ok(event)) => {
                    let interesting = matches!(
                        event.kind,
                        EventKind::Create(_) | EventKind::Modify(_)
                    );
                    if !interesting {
                        continue;
                    }
                    for fp in event.paths {
                        if fp.is_file() {
                            post_ingest(fp.to_string_lossy().as_ref());
                        }
                    }
                }
                Ok(Err(e)) => eprintln!("[sift] watch event error: {e}"),
                Err(mpsc::RecvTimeoutError::Timeout) => {}
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
        drop(watcher);
    });

    inner.handle = Some(handle);
    let _ = app.emit(
        "watch-ready",
        WatchReadyPayload {
            path: path.clone(),
        },
    );
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(WatchState {
            inner: Mutex::new(WatchInner {
                cancel: Arc::new(AtomicBool::new(false)),
                handle: None,
            }),
        })
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let icon = app
                .default_window_icon()
                .ok_or("missing default window icon")?
                .clone();

            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![set_watch_folder])
        .run(tauri::generate_context!())
        .expect("error while running Sift");
}
