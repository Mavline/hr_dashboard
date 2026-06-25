import pytest
from src import aggregate, excel_reader


def test_totals_basic():
    recs = [
        {"employee_no": 1, "route": "A", "date": "2026-06-01", "late_min": 10.0},
        {"employee_no": 1, "route": "A", "date": "2026-06-02", "late_min": 5.0},
        {"employee_no": 2, "route": "B", "date": "2026-06-01", "late_min": 7.0},
    ]
    t = aggregate.totals(recs)
    assert t == {"cases": 3, "total_late": 22.0,
                 "employees": 2, "routes": 2, "days": 2}


def test_aggregate_by_route_known(real_xlsx):
    recs = excel_reader.read_records(real_xlsx)
    rows = aggregate.aggregate_by(recs, "route")
    by_route = {tuple(r["key"]): r for r in rows}
    assert by_route[("פתח תקווה",)]["total_late"] == pytest.approx(560)
    assert by_route[("פתח תקווה",)]["cases"] == 28
    assert by_route[("יהוד- קרית אונו",)]["total_late"] == pytest.approx(315)
    assert by_route[("יהוד- קרית אונו",)]["cases"] == 14
    assert by_route[("לוד",)]["total_late"] == pytest.approx(242)
    assert by_route[("לוד",)]["cases"] == 11


def test_aggregate_sorted_desc(real_xlsx):
    recs = excel_reader.read_records(real_xlsx)
    rows = aggregate.aggregate_by(recs, "route")
    totals = [r["total_late"] for r in rows]
    assert totals == sorted(totals, reverse=True)


def test_week_starts_sunday():
    # 2026-06-01 — понедельник; начало недели (вс) = 2026-05-31
    recs = [{"employee_no": 1, "route": "A", "date": "2026-06-01",
             "late_min": 10.0}]
    rows = aggregate.aggregate_by(recs, "week")
    assert rows[0]["key"] == ["2026-05-31"]


def test_aggregate_by_employee_basic():
    recs = [
        {"employee_no": 1, "first_name": "John", "last_name": "Doe",
         "city": "Tel Aviv", "route": "A", "date": "2026-06-01",
         "weekday": "Mon", "late_min": 10.0},
        {"employee_no": 1, "first_name": "John", "last_name": "Doe",
         "city": "Tel Aviv", "route": "A", "date": "2026-06-02",
         "weekday": "Tue", "late_min": 5.0},
        {"employee_no": 2, "first_name": "Jane", "last_name": "Smith",
         "city": "Ramat Gan", "route": "B", "date": "2026-06-01",
         "weekday": "Mon", "late_min": 7.0},
    ]
    rows = aggregate.aggregate_by(recs, "employee")
    # Two unique employees: (1, John, Doe, Tel Aviv, A) and (2, Jane, Smith, Ramat Gan, B)
    assert len(rows) == 2
    assert rows[0]["cases"] == 2  # John has 2 records
    assert rows[1]["cases"] == 1  # Jane has 1 record


def test_aggregate_by_date_basic():
    recs = [
        {"employee_no": 1, "first_name": "John", "last_name": "Doe",
         "city": "Tel Aviv", "route": "A", "date": "2026-06-01",
         "weekday": "Mon", "late_min": 10.0},
        {"employee_no": 2, "first_name": "Jane", "last_name": "Smith",
         "city": "Ramat Gan", "route": "B", "date": "2026-06-01",
         "weekday": "Mon", "late_min": 7.0},
        {"employee_no": 1, "first_name": "John", "last_name": "Doe",
         "city": "Tel Aviv", "route": "A", "date": "2026-06-02",
         "weekday": "Tue", "late_min": 5.0},
    ]
    rows = aggregate.aggregate_by(recs, "date")
    # Two unique dates: 2026-06-01 and 2026-06-02
    assert len(rows) == 2
    by_date = {tuple(r["key"]): r for r in rows}
    assert by_date[("2026-06-01",)]["cases"] == 2
    assert by_date[("2026-06-02",)]["cases"] == 1


def test_aggregate_by_weekday_basic():
    recs = [
        {"employee_no": 1, "first_name": "John", "last_name": "Doe",
         "city": "Tel Aviv", "route": "A", "date": "2026-06-01",
         "weekday": "Mon", "late_min": 10.0},
        {"employee_no": 2, "first_name": "Jane", "last_name": "Smith",
         "city": "Ramat Gan", "route": "B", "date": "2026-06-02",
         "weekday": "Mon", "late_min": 7.0},
        {"employee_no": 3, "first_name": "Bob", "last_name": "Jones",
         "city": "Petah Tikva", "route": "C", "date": "2026-06-03",
         "weekday": "Tue", "late_min": 5.0},
    ]
    rows = aggregate.aggregate_by(recs, "weekday")
    # Two unique weekdays: Mon and Tue
    assert len(rows) == 2
    by_weekday = {tuple(r["key"]): r for r in rows}
    assert by_weekday[("Mon",)]["cases"] == 2
    assert by_weekday[("Tue",)]["cases"] == 1
