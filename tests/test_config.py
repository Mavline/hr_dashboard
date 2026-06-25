import json
from src import config

def test_get_returns_none_when_missing(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "CONFIG_PATH", str(tmp_path / "config.json"))
    assert config.get_source_path() is None

def test_set_then_get_roundtrip(tmp_path, monkeypatch):
    cfg = str(tmp_path / "config.json")
    monkeypatch.setattr(config, "CONFIG_PATH", cfg)
    config.set_source_path(r"C:\data\HR report.xlsx")
    assert config.get_source_path() == r"C:\data\HR report.xlsx"

def test_get_returns_none_on_corrupt_file(tmp_path, monkeypatch):
    cfg = tmp_path / "config.json"
    cfg.write_text("{ not json", encoding="utf-8")
    monkeypatch.setattr(config, "CONFIG_PATH", str(cfg))
    assert config.get_source_path() is None
