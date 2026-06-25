def apply_filters(records, filt):
    res = records
    emp = (filt.get("employee") or "").strip().lower()
    if emp:
        res = [r for r in res
               if emp in str(r["employee_no"]).lower()
               or emp in (r["first_name"] or "").lower()
               or emp in (r["last_name"] or "").lower()]
    cities = filt.get("cities")
    if cities:
        res = [r for r in res if r["city"] in cities]
    routes = filt.get("routes")
    if routes:
        res = [r for r in res if r["route"] in routes]
    date_from = filt.get("date_from")
    if date_from:
        res = [r for r in res if r["date"] >= date_from]
    date_to = filt.get("date_to")
    if date_to:
        res = [r for r in res if r["date"] <= date_to]
    weekdays = filt.get("weekdays")
    if weekdays:
        res = [r for r in res if r["weekday"] in weekdays]
    return res
