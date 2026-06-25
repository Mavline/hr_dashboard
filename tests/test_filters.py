from src import filters

def _recs():
    return [
        {"employee_no": 12, "first_name": "אלונה", "last_name": "שאמלי",
         "city": "יהוד", "route": "יהוד- קרית אונו", "date": "2026-06-01",
         "weekday": "Mon", "late_min": 25.0, "arrival": "07:45"},
        {"employee_no": 370, "first_name": "ילנה", "last_name": "בוטוב",
         "city": "אריאל", "route": "פתח תקווה", "date": "2026-06-02",
         "weekday": "Tue", "late_min": 20.0, "arrival": "07:40"},
        {"employee_no": 456, "first_name": "Ivan", "last_name": "Petrov",
         "city": "פתח תקווה", "route": "תל אביב", "date": "2026-06-03",
         "weekday": "Wed", "late_min": 15.0, "arrival": "08:00"},
    ]

def test_no_filter_returns_all():
    assert len(filters.apply_filters(_recs(), {})) == 3

def test_filter_by_route():
    r = filters.apply_filters(_recs(), {"routes": ["פתח תקווה"]})
    assert len(r) == 1 and r[0]["employee_no"] == 370

def test_filter_by_date_range():
    r = filters.apply_filters(_recs(), {"date_from": "2026-06-02"})
    assert len(r) == 2 and r[0]["date"] == "2026-06-02"

def test_filter_by_employee_search():
    r = filters.apply_filters(_recs(), {"employee": "370"})
    assert len(r) == 1 and r[0]["employee_no"] == 370

def test_filter_by_weekday():
    r = filters.apply_filters(_recs(), {"weekdays": ["Mon"]})
    assert len(r) == 1 and r[0]["weekday"] == "Mon"

def test_filter_by_cities():
    r = filters.apply_filters(_recs(), {"cities": ["יהוד"]})
    assert len(r) == 1 and r[0]["city"] == "יהוד" and r[0]["employee_no"] == 12

def test_filter_by_date_to_inclusive():
    r = filters.apply_filters(_recs(), {"date_to": "2026-06-01"})
    assert len(r) == 1 and r[0]["date"] == "2026-06-01"

def test_filter_by_employee_name_substring_case_insensitive():
    # Test lowercase substring match on Latin name
    r = filters.apply_filters(_recs(), {"employee": "ivan"})
    assert len(r) == 1 and r[0]["employee_no"] == 456 and r[0]["first_name"] == "Ivan"
