import pytest
from src.api import Api

def test_load_and_state(real_xlsx, tmp_path, monkeypatch):
    from src import config
    monkeypatch.setattr(config, "CONFIG_PATH", str(tmp_path / "c.json"))
    api = Api()
    state = api.load(real_xlsx)
    assert state["loaded"] is True
    assert state["date_min"] == "2026-06-01"
    assert "פתח תקווה" in state["routes"]
    assert "employees" in state
    assert isinstance(state["employees"], list)
    assert len(state["employees"]) > 0

def test_get_view_route(real_xlsx, tmp_path, monkeypatch):
    from src import config
    monkeypatch.setattr(config, "CONFIG_PATH", str(tmp_path / "c.json"))
    api = Api()
    api.load(real_xlsx)
    view = api.get_view({}, "route")
    by = {tuple(r["key"]): r for r in view["rows"]}
    assert by[("פתח תקווה",)]["total_late"] == 560
    assert view["totals"]["cases"] == len(api._records)

def test_get_dashboard(real_xlsx, tmp_path, monkeypatch):
    from src import config
    monkeypatch.setattr(config, "CONFIG_PATH", str(tmp_path / "c.json"))
    api = Api()
    api.load(real_xlsx)
    dash = api.get_dashboard({})
    # Required keys present
    assert {"totals", "by_city", "by_date", "employees", "records", "roster"}.issubset(dash.keys())
    # city rows partition all lateness
    assert sum(r["total_late"] for r in dash["by_city"]) == pytest.approx(dash["totals"]["total_late"])
    # by_date row count equals number of distinct dates
    distinct_dates = len({r["date"] for r in api._records})
    assert len(dash["by_date"]) == distinct_dates
    # employees slice is non-empty
    assert len(dash["employees"]) > 0
    # records added and non-empty
    assert "records" in dash
    assert isinstance(dash["records"], list)
    assert len(dash["records"]) > 0
    # each record has required keys
    first_record = dash["records"][0]
    assert "date" in first_record
    assert "late_min" in first_record
    assert "arrival" in first_record
    # record count equals totals cases
    assert len(dash["records"]) == dash["totals"]["cases"]
    # all 15 cities appear
    assert len(dash["by_city"]) == 15
    # roster is present and has 223 entries
    assert "roster" in dash
    assert len(dash["roster"]) == 223
    # full-roster totals for KPI
    assert dash["totals"]["employees_total"] == 223
    assert dash["totals"]["cities_total"] == 15
    assert dash["totals"]["routes_total"] > 0
