from collections import defaultdict
from datetime import date, timedelta


def totals(records):
    return {
        "cases": len(records),
        "total_late": sum(r["late_min"] for r in records),
        "employees": len({r["employee_no"] for r in records}),
        "routes": len({r["route"] for r in records}),
        "days": len({r["date"] for r in records}),
    }


def _week_start(iso):
    d = date.fromisoformat(iso)
    # Воскресенье — начало недели. Python: Mon=0..Sun=6 -> сдвиг до вс.
    offset = (d.weekday() + 1) % 7
    return (d - timedelta(days=offset)).isoformat()


_KEY = {
    "employee": lambda r: (r["employee_no"], r["first_name"], r["last_name"],
                           r["city"], r["route"]),
    "route": lambda r: (r["route"],),
    "date": lambda r: (r["date"],),
    "week": lambda r: (_week_start(r["date"]),),
    "weekday": lambda r: (r["weekday"],),
}


def aggregate_by(records, view):
    keyfn = _KEY[view]
    groups = defaultdict(list)
    for r in records:
        groups[keyfn(r)].append(r)
    out = []
    for key, recs in groups.items():
        late = [x["late_min"] for x in recs]
        total = sum(late)
        out.append({
            "key": list(key),
            "cases": len(recs),
            "total_late": total,
            "avg_late": round(total / len(late), 1),
            "employees": len({x["employee_no"] for x in recs}),
            "routes": len({x["route"] for x in recs}),
        })
    out.sort(key=lambda x: x["total_late"], reverse=True)
    return out
