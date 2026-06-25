from src import filters

def _recs():
    return [
        {"employee_no": 12, "first_name": "אלונה", "last_name": "שאמלי",
         "city": "יהוד", "route": "יהוד- קרית אונו", "date": "2026-06-01",
         "weekday": "Mon", "late_min": 25.0, "arrival": "07:45"},
        {"employee_no": 370, "first_name": "ילנה", "last_name": "בוטוב",
         "city": "אריאל", "route": "פתח תקווה", "date": "2026-06-02",
         "weekday": "Tue", "late_min": 20.0, "arrival": "07:40"},
    ]

def test_no_filter_returns_all():
    assert len(filters.apply_filters(_recs(), {})) == 2

def test_filter_by_route():
    r = filters.apply_filters(_recs(), {"routes": ["פתח תקווה"]})
    assert len(r) == 1 and r[0]["employee_no"] == 370

def test_filter_by_date_range():
    r = filters.apply_filters(_recs(), {"date_from": "2026-06-02"})
    assert len(r) == 1 and r[0]["date"] == "2026-06-02"

def test_filter_by_employee_search():
    r = filters.apply_filters(_recs(), {"employee": "370"})
    assert len(r) == 1 and r[0]["employee_no"] == 370

def test_filter_by_weekday():
    r = filters.apply_filters(_recs(), {"weekdays": ["Mon"]})
    assert len(r) == 1 and r[0]["weekday"] == "Mon"
