import os
import sys
import webview
from src import config
from src.api import Api

def _web_dir():
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, "web" if hasattr(sys, "_MEIPASS") else "web")

def _index():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", "index.html")

def _on_start(window, api):
    path = config.get_source_path()
    if path and os.path.exists(path):
        api.load(path)
        window.evaluate_js("App.init()")
    else:
        window.evaluate_js("App.needFile()")

def main():
    api = Api()
    window = webview.create_window(
        "Bus Delays Dashboard", _index(), js_api=api,
        width=1150, height=760)
    webview.start(_on_start, (window, api))

if __name__ == "__main__":
    main()
