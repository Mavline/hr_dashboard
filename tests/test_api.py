from src.api import Api

def test_load_and_state(real_xlsx, tmp_path, monkeypatch):
    from src import config
    monkeypatch.setattr(config, "CONFIG_PATH", str(tmp_path / "c.json"))
    api = Api()
    state = api.load(real_xlsx)
    assert state["loaded"] is True
    assert state["date_min"] == "2026-06-01"
    assert "פתח תקווה" in state["routes"]

def test_get_view_route(real_xlsx, tmp_path, monkeypatch):
    from src import config
    monkeypatch.setattr(config, "CONFIG_PATH", str(tmp_path / "c.json"))
    api = Api()
    api.load(real_xlsx)
    view = api.get_view({}, "route")
    by = {tuple(r["key"]): r for r in view["rows"]}
    assert by[("פתח תקווה",)]["total_late"] == 560
    assert view["totals"]["cases"] == len(api._records)
