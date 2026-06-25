import json
import os
import sys

if getattr(sys, "frozen", False):
    # Упакованный .exe: храним config рядом с исполняемым файлом, чтобы путь
    # переживал перезапуск (_MEIPASS — временная распаковка, не годится).
    _BASE = os.path.dirname(sys.executable)
else:
    # Запуск из исходников: корень проекта.
    _BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(_BASE, "config.json")

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
