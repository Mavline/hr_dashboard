import json
import os

CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.json"
)

def get_source_path():
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            return json.load(f).get("source_path")
    except (FileNotFoundError, json.JSONDecodeError):
        return None

def set_source_path(path):
    data = {}
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError:
            data = {}
    data["source_path"] = path
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
