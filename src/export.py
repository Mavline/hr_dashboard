import csv
import openpyxl

_KEY_HEADERS = {
    "employee": ["Employee No", "First Name", "Last Name", "City", "Route"],
    "route": ["Route"],
    "date": ["Date"],
    "week": ["Week (Sun)"],
    "weekday": ["Weekday"],
}
_METRIC_HEADERS = ["Cases", "Total Late (min)", "Avg Late (min)",
                   "Employees", "Routes"]

def _header(view):
    if view not in _KEY_HEADERS:
        raise ValueError(f"Unknown view: {view!r}")
    return _KEY_HEADERS[view] + _METRIC_HEADERS

def _row_values(row):
    return list(row["key"]) + [row["cases"], row["total_late"],
                               row["avg_late"], row["employees"], row["routes"]]

def write(path, rows, view, fmt):
    header = _header(view)
    if fmt == "csv":
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(header)
            for r in rows:
                w.writerow(_row_values(r))
    elif fmt == "xlsx":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(header)
        for r in rows:
            ws.append(_row_values(r))
        wb.save(path)
    else:
        raise ValueError(f"Unknown format: {fmt!r}")
