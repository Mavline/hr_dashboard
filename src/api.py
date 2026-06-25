import webview
from src import config, excel_reader, filters, aggregate, export

class Api:
    def __init__(self):
        self._records = []
        self._roster = []
        self._source = None

    def load(self, path):
        self._records = excel_reader.read_records(path)
        self._roster = excel_reader.read_employees(path)
        self._source = path
        config.set_source_path(path)
        return self.get_state()

    def get_state(self):
        dates = sorted({r["date"] for r in self._records})
        employees = sorted({
            f"{r.get('last_name', '')} {r.get('first_name', '')}".strip()
            for r in self._records
            if r.get("last_name") or r.get("first_name")
        })
        return {
            "source_path": self._source,
            "date_min": dates[0] if dates else None,
            "date_max": dates[-1] if dates else None,
            "cities": sorted({r["city"] for r in self._records if r["city"]}),
            "routes": sorted({r["route"] for r in self._records if r["route"]}),
            "loaded": bool(self._records),
            "employees": employees,
        }

    def get_view(self, filt, view):
        recs = filters.apply_filters(self._records, filt or {})
        return {
            "rows": aggregate.aggregate_by(recs, view or "employee"),
            "totals": aggregate.totals(recs),
        }

    def choose_file(self):
        res = webview.windows[0].create_file_dialog(
            webview.OPEN_DIALOG, file_types=("Excel files (*.xlsx)",))
        if res:
            return self.load(res[0])
        return None

    def refresh(self):
        if self._source:
            return self.load(self._source)
        return None

    def get_dashboard(self, filt):
        recs = filters.apply_filters(self._records, filt or {})
        return {
            "totals": aggregate.totals(recs),
            "by_city": aggregate.cities_full(self._roster, recs),
            "by_date": aggregate.aggregate_by(recs, "date"),
            "employees": aggregate.aggregate_by(recs, "employee"),
            "records": recs,
            "roster": self._roster,
        }

    def export(self, filt, view, fmt):
        recs = filters.apply_filters(self._records, filt or {})
        rows = aggregate.aggregate_by(recs, view or "employee")
        res = webview.windows[0].create_file_dialog(
            webview.SAVE_DIALOG, save_filename=f"summary.{fmt}")
        if not res:
            return None
        path = res if isinstance(res, str) else res[0]
        export.write(path, rows, view or "employee", fmt)
        return path
