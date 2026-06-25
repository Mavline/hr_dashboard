# Дашборд опозданий развозок — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Десктоп-приложение, которое по сохранённому пути читает `HR report.xlsx`, разворачивает таблицу опозданий развозок в «длинный» формат и показывает интерактивный дашборд (фильтры, разрезы, агрегаты, экспорт).

**Architecture:** Python-бэкенд (доступ к ФС, парсинг, фильтры, агрегация, экспорт) + тонкий HTML/JS-дашборд в окне `pywebview`. Вся логика — в Python, тестируется через `pytest`. UI вызывает методы бэкенда через `js_api`.

**Tech Stack:** Python 3.11+, `openpyxl`, `pywebview`, `pyinstaller`, `pytest`; HTML/CSS/ваниль-JS; упаковка в один `.exe`.

## Global Constraints

- Python 3.11+; зависимости только: `openpyxl`, `pywebview`, `pyinstaller`, `pytest`.
- Подписи и заголовки UI — **английский**; значения (имена, города, маршруты) — иврит из данных. Русский в выходе не используется.
- Рабочая неделя — **воскресенье–пятница** (суббота выходная). Неделя для группировки начинается с воскресенья.
- Парсер привязан к формату `HR report.xlsx`. Ивритские заголовки строки 2: `מספר עובד` (employee_no), `שם פרטי` (first_name), `שם משפחה` (last_name), `עיר` (city), `הסעה` (route), `זמן איחור` (late), `זמן הגעה` (arrival).
- `.exe` самодостаточный (`pyinstaller --onefile`); внешняя зависимость — WebView2 (на Windows 11 предустановлен).
- Контрольные числа (для тестов агрегации по всему файлу, разрез `route`):
  - `פתח תקווה` (Петах-Тиква): cases 28, total_late 560 (01.06: 28×20).
  - `יהוד- קרית אונו` (Йехуд–Кирьят-Оно): cases 14, total_late 315 (01.06 7×25=175 + 02.06 7×20=140).
  - `לוד` (Лод): cases 11, total_late 242 (02.06: 11×22).
- Частые коммиты после каждой задачи.

## Record model (общий интерфейс данных)

Все модули оперируют списком записей `Record` (dict):

```python
{
    "employee_no": int | str,   # מספר עובד
    "first_name": str,          # שם פרטי
    "last_name": str,           # שם משפחה
    "city": str,                # עיר
    "route": str,               # הסעה
    "date": str,                # "YYYY-MM-DD" (ISO)
    "weekday": str,             # "Sun".."Sat"
    "late_min": float,          # זמן איחור, минуты
    "arrival": str | None,      # "HH:MM" из זמן הגעה
}
```

## File Structure

```
Отдел кадров/
  HR report.xlsx              # источник (read-only, не изменяем)
  requirements.txt
  README.md
  .gitignore
  config.json                # создаётся в рантайме (в .gitignore)
  src/
    __init__.py
    config.py                # путь к источнику (config.json)
    excel_reader.py          # парсинг формата + unpivot -> list[Record]
    filters.py               # apply_filters(records, filt)
    aggregate.py             # totals(records), aggregate_by(records, view)
    export.py                # write(path, rows, view, fmt)
    api.py                   # класс Api (js_api для pywebview)
    main.py                  # окно, логика старта
    web/
      index.html
      styles.css
      ui.js
  tests/
    __init__.py
    conftest.py              # путь к реальному HR report.xlsx
    test_config.py
    test_excel_reader.py
    test_filters.py
    test_aggregate.py
    test_export.py
```

---

### Task 1: Каркас проекта, зависимости, git

**Files:**
- Create: `requirements.txt`, `.gitignore`, `README.md`, `src/__init__.py`, `tests/__init__.py`, `tests/conftest.py`

**Interfaces:**
- Produces: установленное окружение; `tests/conftest.py` с фикстурой `real_xlsx` (абсолютный путь к `HR report.xlsx`).

- [ ] **Step 1: Создать `requirements.txt`**

```
openpyxl>=3.1
pywebview>=5.0
pyinstaller>=6.0
pytest>=8.0
```

- [ ] **Step 2: Создать `.gitignore`**

```
__pycache__/
*.pyc
config.json
build/
dist/
*.spec
.pytest_cache/
```

- [ ] **Step 3: Создать пустые `src/__init__.py` и `tests/__init__.py`**

(пустые файлы)

- [ ] **Step 4: Создать `tests/conftest.py`**

```python
import os
import pytest

@pytest.fixture
def real_xlsx():
    # Реальный файл лежит в корне проекта рядом с папкой src/
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, "HR report.xlsx")
    assert os.path.exists(path), f"Не найден {path}"
    return path
```

- [ ] **Step 5: Создать `README.md`**

```markdown
# Дашборд опозданий развозок

Десктоп-приложение для анализа опозданий служебной развозки из `HR report.xlsx`.

## Разработка
- `pip install -r requirements.txt`
- Тесты: `python -m pytest -v`
- Запуск: `python -m src.main`

## Сборка .exe
`pyinstaller --onefile --noconsole --add-data "src/web;src/web" --name razvozki src/main.py`
```

- [ ] **Step 6: Установить зависимости и инициализировать git**

Run:
```bash
pip install -r requirements.txt
git init
git add -A
git commit -m "chore: project scaffold, deps, gitignore"
```
Expected: установка без ошибок; `git log` показывает один коммит.

- [ ] **Step 7: Проверить, что pytest запускается**

Run: `python -m pytest -v`
Expected: `no tests ran` (0 тестов), без ошибок импорта.

---

### Task 2: Модуль config

**Files:**
- Create: `src/config.py`, `tests/test_config.py`

**Interfaces:**
- Produces:
  - `config.CONFIG_PATH: str` — путь к `config.json` (можно подменить в тестах).
  - `config.get_source_path() -> str | None`
  - `config.set_source_path(path: str) -> None`

- [ ] **Step 1: Написать падающий тест `tests/test_config.py`**

```python
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
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `python -m pytest tests/test_config.py -v`
Expected: FAIL (`ModuleNotFoundError` / `AttributeError: CONFIG_PATH`).

- [ ] **Step 3: Реализовать `src/config.py`**

```python
import json
import os

CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.json"
)

def get_source_path():
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            return json.load(f).get("source_path")
    except (FileNotFoundError, json.JSONDecodeError):
        return None

def set_source_path(path):
    data = {}
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError:
            data = {}
    data["source_path"] = path
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `python -m pytest tests/test_config.py -v`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/config.py tests/test_config.py
git commit -m "feat: config module for persistent source path"
```

---

### Task 3: excel_reader — парсинг формата и unpivot

**Files:**
- Create: `src/excel_reader.py`, `tests/test_excel_reader.py`

**Interfaces:**
- Consumes: ничего из проекта.
- Produces:
  - `excel_reader.read_records(path: str) -> list[Record]`
  - `excel_reader.UnrecognizedFormatError` (Exception)

- [ ] **Step 1: Написать падающие тесты `tests/test_excel_reader.py`**

```python
import pytest
from src import excel_reader as er

def test_reads_records_from_real_file(real_xlsx):
    recs = er.read_records(real_xlsx)
    assert len(recs) > 0
    r = recs[0]
    for key in ("employee_no", "first_name", "last_name", "city",
                "route", "date", "weekday", "late_min", "arrival"):
        assert key in r

def test_unpivot_dates_are_rows_not_columns(real_xlsx):
    recs = er.read_records(real_xlsx)
    dates = {r["date"] for r in recs}
    # В файле есть данные за 01.06 и 02.06.2026
    assert "2026-06-01" in dates
    assert "2026-06-02" in dates

def test_known_counts(real_xlsx):
    recs = er.read_records(real_xlsx)
    pt = [r for r in recs if r["route"] == "פתח תקווה"]
    assert len(pt) == 28
    assert sum(r["late_min"] for r in pt) == 560

def test_weekday_is_short_name(real_xlsx):
    recs = er.read_records(real_xlsx)
    assert all(r["weekday"] in
               ("Sun","Mon","Tue","Wed","Thu","Fri","Sat") for r in recs)

def test_unrecognized_format_raises(tmp_path):
    import openpyxl
    p = tmp_path / "bad.xlsx"
    wb = openpyxl.Workbook(); wb.active["A1"] = "nonsense"; wb.save(p)
    with pytest.raises(er.UnrecognizedFormatError):
        er.read_records(str(p))
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run: `python -m pytest tests/test_excel_reader.py -v`
Expected: FAIL (модуль/функция отсутствуют).

- [ ] **Step 3: Реализовать `src/excel_reader.py`**

```python
from datetime import datetime, date, time
import openpyxl

class UnrecognizedFormatError(Exception):
    pass

META = {
    "מספר עובד": "employee_no",
    "שם פרטי": "first_name",
    "שם משפחה": "last_name",
    "עיר": "city",
    "הסעה": "route",
}
LATE_HDR = "זמן איחור"
ARRIVAL_HDR = "זמן הגעה"
_PY2SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

def _weekday(d):
    return _PY2SHORT[d.weekday()]

def _fmt_time(v):
    if isinstance(v, (datetime, time)):
        return v.strftime("%H:%M")
    return None

def _as_date(v):
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    return None

def _find_sheet(wb):
    for ws in wb.worksheets:
        rows = list(ws.iter_rows(min_row=2, max_row=2, values_only=True))
        if rows and any(c in META for c in rows[0] if c is not None):
            return ws
    raise UnrecognizedFormatError("Лист с ожидаемыми заголовками не найден")

def _meta_columns(header):
    idx = {}
    for i, cell in enumerate(header):
        if cell in META:
            idx[META[cell]] = i
    missing = set(META.values()) - set(idx)
    if missing:
        raise UnrecognizedFormatError(f"Не найдены колонки: {missing}")
    return idx

def _day_columns(date_row, header):
    days = []
    for i, cell in enumerate(header):
        if cell == LATE_HDR:
            d = _as_date(date_row[i]) if i < len(date_row) else None
            if d is None:
                continue
            arr = i + 1 if (i + 1 < len(header) and header[i + 1] == ARRIVAL_HDR) else None
            days.append((d, i, arr))
    return days

def read_records(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = _find_sheet(wb)
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 3:
        raise UnrecognizedFormatError("Недостаточно строк")
    date_row, header = rows[0], rows[1]
    meta = _meta_columns(header)
    days = _day_columns(date_row, header)
    records = []
    for row in rows[2:]:
        if row[meta["employee_no"]] in (None, ""):
            continue
        for d, lc, ac in days:
            late = row[lc] if lc < len(row) else None
            if late is None or str(late).strip() == "":
                continue
            try:
                late_min = float(late)
            except (TypeError, ValueError):
                continue
            records.append({
                "employee_no": row[meta["employee_no"]],
                "first_name": row[meta["first_name"]],
                "last_name": row[meta["last_name"]],
                "city": row[meta["city"]],
                "route": row[meta["route"]],
                "date": d.isoformat(),
                "weekday": _weekday(d),
                "late_min": late_min,
                "arrival": _fmt_time(row[ac]) if ac is not None and ac < len(row) else None,
            })
    return records
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `python -m pytest tests/test_excel_reader.py -v`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/excel_reader.py tests/test_excel_reader.py
git commit -m "feat: excel_reader parses format and unpivots dates to rows"
```

---

### Task 4: filters — применение фильтров

**Files:**
- Create: `src/filters.py`, `tests/test_filters.py`

**Interfaces:**
- Consumes: `Record` из excel_reader.
- Produces: `filters.apply_filters(records: list[Record], filt: dict) -> list[Record]`
  где `filt` может содержать: `employee` (str), `cities` (list[str]), `routes` (list[str]), `date_from` (str ISO), `date_to` (str ISO), `weekdays` (list[str]).

- [ ] **Step 1: Написать падающие тесты `tests/test_filters.py`**

```python
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
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run: `python -m pytest tests/test_filters.py -v`
Expected: FAIL (модуль отсутствует).

- [ ] **Step 3: Реализовать `src/filters.py`**

```python
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
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `python -m pytest tests/test_filters.py -v`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/filters.py tests/test_filters.py
git commit -m "feat: filters module"
```

---

### Task 5: aggregate — итоги и разрезы

**Files:**
- Create: `src/aggregate.py`, `tests/test_aggregate.py`

**Interfaces:**
- Consumes: `Record`.
- Produces:
  - `aggregate.totals(records) -> dict` с ключами `cases, total_late, employees, routes, days`.
  - `aggregate.aggregate_by(records, view) -> list[dict]`, `view` ∈ `{employee, route, date, week, weekday}`; каждая строка: `{key: list, cases, total_late, avg_late, employees, routes}`, сортировка по `total_late` ↓.

- [ ] **Step 1: Написать падающие тесты `tests/test_aggregate.py`**

```python
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
    assert by_route[("פתח תקווה",)]["total_late"] == 560
    assert by_route[("פתח תקווה",)]["cases"] == 28
    assert by_route[("יהוד- קרית אונו",)]["total_late"] == 315
    assert by_route[("יהוד- קרית אונו",)]["cases"] == 14
    assert by_route[("לוד",)]["total_late"] == 242

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
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run: `python -m pytest tests/test_aggregate.py -v`
Expected: FAIL (модуль отсутствует).

- [ ] **Step 3: Реализовать `src/aggregate.py`**

```python
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
        out.append({
            "key": list(key),
            "cases": len(recs),
            "total_late": sum(late),
            "avg_late": round(sum(late) / len(late), 1),
            "employees": len({x["employee_no"] for x in recs}),
            "routes": len({x["route"] for x in recs}),
        })
    out.sort(key=lambda x: x["total_late"], reverse=True)
    return out
```

Примечание: `test_totals_basic` и `test_week_starts_sunday` используют записи без всех полей `Record` — это допустимо, функции читают только нужные ключи.

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `python -m pytest tests/test_aggregate.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/aggregate.py tests/test_aggregate.py
git commit -m "feat: aggregate totals and views (employee/route/date/week/weekday)"
```

---

### Task 6: export — выгрузка среза в Excel/CSV

**Files:**
- Create: `src/export.py`, `tests/test_export.py`

**Interfaces:**
- Consumes: строки из `aggregate.aggregate_by` (`{key, cases, total_late, avg_late, employees, routes}`), `view` (str).
- Produces: `export.write(path: str, rows: list[dict], view: str, fmt: str) -> None`, `fmt` ∈ `{xlsx, csv}`.

- [ ] **Step 1: Написать падающие тесты `tests/test_export.py`**

```python
import csv
import openpyxl
from src import export

ROWS = [
    {"key": ["פתח תקווה"], "cases": 28, "total_late": 560,
     "avg_late": 20.0, "employees": 28, "routes": 1},
]

def test_write_xlsx(tmp_path):
    p = tmp_path / "out.xlsx"
    export.write(str(p), ROWS, "route", "xlsx")
    wb = openpyxl.load_workbook(p)
    ws = wb.active
    headers = [c.value for c in ws[1]]
    assert "Total Late (min)" in headers
    assert ws.max_row == 2  # шапка + 1 строка

def test_write_csv(tmp_path):
    p = tmp_path / "out.csv"
    export.write(str(p), ROWS, "route", "csv")
    with open(p, encoding="utf-8-sig", newline="") as f:
        data = list(csv.reader(f))
    assert data[0][0] == "Route"
    assert data[1][1] == "28"
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run: `python -m pytest tests/test_export.py -v`
Expected: FAIL (модуль отсутствует).

- [ ] **Step 3: Реализовать `src/export.py`**

```python
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
        raise ValueError(f"Неизвестный формат: {fmt}")
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `python -m pytest tests/test_export.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/export.py tests/test_export.py
git commit -m "feat: export filtered slice to xlsx/csv"
```

---

### Task 7: HTML-макет дашборда (визуальный, с ревью)

**Files:**
- Create: `src/web/index.html`, `src/web/styles.css`, `src/web/mock.js`

**Interfaces:**
- Produces: статический макет на моковых данных для согласования внешнего вида. `mock.js` определяет `window.MOCK_VIEW = {rows:[...], totals:{...}, state:{...}}` и временно используется вместо бэкенда.

Это визуальная задача — вместо pytest проверяется глазами и согласуется с заказчиком.

- [ ] **Step 1: Создать `src/web/mock.js` с примером данных**

```javascript
window.MOCK_VIEW = {
  state: {
    source_path: "C:\\...\\HR report.xlsx",
    date_min: "2026-06-01", date_max: "2026-06-02",
    cities: ["יהוד", "אריאל"], routes: ["פתח תקווה", "יהוד- קרית אונו", "לוד"]
  },
  totals: { cases: 53, total_late: 1117, employees: 46, routes: 3, days: 2 },
  rows: [
    { key: [12, "אלונה", "שאמלי", "יהוד", "יהוד- קרית אונו"],
      cases: 2, total_late: 45, avg_late: 22.5, employees: 1, routes: 1 },
    { key: [370, "ילנה", "בוטוב", "אריאל", "פתח תקווה"],
      cases: 1, total_late: 20, avg_late: 20, employees: 1, routes: 1 }
  ]
};
```

- [ ] **Step 2: Создать `src/web/styles.css`**

```css
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.4 "Segoe UI", system-ui, sans-serif;
       color: #1f2937; background: #f3f4f6; }
header { display: flex; align-items: center; gap: 12px; padding: 10px 16px;
         background: #111827; color: #fff; }
header .path { font-size: 12px; opacity: .8; margin-left: auto;
               max-width: 40%; overflow: hidden; text-overflow: ellipsis;
               white-space: nowrap; }
button { padding: 6px 12px; border: 0; border-radius: 6px; cursor: pointer;
         background: #2563eb; color: #fff; }
button.secondary { background: #374151; }
.cards { display: flex; gap: 12px; padding: 12px 16px; flex-wrap: wrap; }
.card { background: #fff; border-radius: 8px; padding: 10px 14px; min-width: 120px;
        box-shadow: 0 1px 2px rgba(0,0,0,.06); }
.card .v { font-size: 22px; font-weight: 700; }
.card .l { font-size: 12px; color: #6b7280; }
.filters { display: flex; gap: 10px; padding: 8px 16px; flex-wrap: wrap;
           align-items: center; }
.filters label { font-size: 12px; color: #6b7280; display: flex;
                 flex-direction: column; gap: 2px; }
table { width: calc(100% - 32px); margin: 8px 16px; border-collapse: collapse;
        background: #fff; }
th, td { padding: 7px 10px; text-align: start; border-bottom: 1px solid #e5e7eb; }
th { position: sticky; top: 0; background: #f9fafb; cursor: pointer;
     user-select: none; }
tbody tr:nth-child(even) { background: #fafafa; }
tbody tr.detail { background: #eef2ff; font-size: 13px; }
```

- [ ] **Step 3: Создать `src/web/index.html`**

```html
<!doctype html>
<html dir="auto">
<head>
  <meta charset="utf-8">
  <title>Bus Delays Dashboard</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <strong>Bus Delays Dashboard</strong>
    <button id="btn-refresh" class="secondary">Refresh</button>
    <button id="btn-file" class="secondary">Change file…</button>
    <button id="btn-export">Export</button>
    <span class="path" id="path">—</span>
  </header>
  <section class="cards" id="cards"></section>
  <section class="filters" id="filters">
    <label>View by
      <select id="view">
        <option value="employee">Employee</option>
        <option value="route">Route</option>
        <option value="date">Date</option>
        <option value="week">Week</option>
        <option value="weekday">Weekday</option>
      </select>
    </label>
    <label>Employee <input id="f-emp" type="search" placeholder="name / no"></label>
    <label>From <input id="f-from" type="date"></label>
    <label>To <input id="f-to" type="date"></label>
  </section>
  <table id="grid"><thead></thead><tbody></tbody></table>

  <script src="mock.js"></script>
  <script src="ui.js"></script>
</body>
</html>
```

- [ ] **Step 4: Открыть макет в браузере и показать заказчику**

Run: `start src/web/index.html` (PowerShell) — откроется в браузере на моковых данных (после Task 8 `ui.js` отрисует таблицу/карточки).
Показать заказчику, собрать правки по внешнему виду, внести и согласовать.

- [ ] **Step 5: Commit**

```bash
git add src/web/
git commit -m "feat: dashboard HTML/CSS mockup"
```

---

### Task 8: ui.js — отрисовка и взаимодействие

**Files:**
- Create: `src/web/ui.js`

**Interfaces:**
- Consumes: при наличии `window.pywebview.api` — методы `get_view(filt, view)`, `get_state()`, `choose_file()`, `refresh()`, `export(filt, view, fmt)`; иначе — `window.MOCK_VIEW` (для макета вне приложения).
- Produces: глобальный объект `App` с методами `init()`, `needFile()`, `render(view)`.

- [ ] **Step 1: Реализовать `src/web/ui.js`**

```javascript
const App = (() => {
  const api = () => (window.pywebview && window.pywebview.api) || null;
  let sortCol = "total_late", sortDir = -1;

  function filt() {
    return {
      employee: document.getElementById("f-emp").value,
      date_from: document.getElementById("f-from").value || null,
      date_to: document.getElementById("f-to").value || null,
    };
  }
  function view() { return document.getElementById("view").value; }

  async function getView() {
    if (api()) return await api().get_view(filt(), view());
    return window.MOCK_VIEW; // макет
  }

  function keyHeaders(v) {
    return ({
      employee: ["Employee No", "First Name", "Last Name", "City", "Route"],
      route: ["Route"], date: ["Date"], week: ["Week (Sun)"], weekday: ["Weekday"],
    })[v];
  }
  const METRICS = ["cases", "total_late", "avg_late", "employees", "routes"];
  const METRIC_LABELS = ["Cases", "Total Late (min)", "Avg Late (min)",
                         "Employees", "Routes"];

  function renderCards(t) {
    const defs = [["cases","Cases"],["total_late","Total Late (min)"],
      ["employees","Employees"],["routes","Routes"],["days","Days"]];
    document.getElementById("cards").innerHTML = defs.map(([k,l]) =>
      `<div class="card"><div class="v">${t[k] ?? 0}</div><div class="l">${l}</div></div>`
    ).join("");
  }

  function renderTable(v, rows) {
    const kh = keyHeaders(v);
    const thead = document.querySelector("#grid thead");
    const tbody = document.querySelector("#grid tbody");
    thead.innerHTML = "<tr>" +
      kh.map(h => `<th>${h}</th>`).join("") +
      METRIC_LABELS.map((l,i) => `<th data-col="${METRICS[i]}">${l}</th>`).join("") +
      "</tr>";
    const sorted = [...rows].sort((a,b) =>
      (a[sortCol] > b[sortCol] ? 1 : -1) * sortDir);
    tbody.innerHTML = sorted.map(r =>
      "<tr>" + r.key.map(c => `<td>${c ?? ""}</td>`).join("") +
      METRICS.map(m => `<td>${r[m]}</td>`).join("") + "</tr>"
    ).join("");
    thead.querySelectorAll("th[data-col]").forEach(th =>
      th.onclick = () => {
        const c = th.dataset.col;
        sortDir = (sortCol === c) ? -sortDir : -1; sortCol = c;
        renderTable(v, rows);
      });
  }

  async function render() {
    const data = await getView();
    if (data.state) document.getElementById("path").textContent =
      data.state.source_path || "—";
    renderCards(data.totals);
    renderTable(view(), data.rows);
  }

  function wire() {
    ["view","f-emp","f-from","f-to"].forEach(id =>
      document.getElementById(id).addEventListener("input", render));
    document.getElementById("btn-file").onclick = async () => {
      if (api()) { await api().choose_file(); render(); }
    };
    document.getElementById("btn-refresh").onclick = async () => {
      if (api()) { await api().refresh(); render(); }
    };
    document.getElementById("btn-export").onclick = async () => {
      if (api()) await api().export(filt(), view(), "xlsx");
    };
  }

  return {
    init() { wire(); render(); },
    needFile() { document.getElementById("path").textContent =
      "No file selected — use “Change file…”"; },
    render,
  };
})();

// Вне pywebview (открытие index.html напрямую) — сразу показать макет.
if (!(window.pywebview && window.pywebview.api)) {
  window.addEventListener("DOMContentLoaded", () => App.init());
}
```

- [ ] **Step 2: Проверить макет в браузере**

Run: `start src/web/index.html`
Expected: видны карточки-итоги, таблица из моков, переключатель View by, сортировка по клику на числовые заголовки.

- [ ] **Step 3: Commit**

```bash
git add src/web/ui.js
git commit -m "feat: dashboard rendering, filters, sorting, view switch"
```

---

### Task 9: api — мост между UI и логикой

**Files:**
- Create: `src/api.py`, `tests/test_api.py`

**Interfaces:**
- Consumes: `config`, `excel_reader`, `filters`, `aggregate`, `export`.
- Produces: класс `Api` с методами:
  - `load(path) -> dict` (state) — читает записи, сохраняет путь.
  - `get_state() -> dict`
  - `get_view(filt, view) -> {"rows": [...], "totals": {...}}`
  - `choose_file() -> dict | None` (использует webview-диалог)
  - `refresh() -> dict | None`
  - `export(filt, view, fmt) -> str | None`

- [ ] **Step 1: Написать падающие тесты `tests/test_api.py`** (тестируем чистую часть — load/get_view/get_state без webview-диалогов)

```python
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
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run: `python -m pytest tests/test_api.py -v`
Expected: FAIL (модуль отсутствует).

- [ ] **Step 3: Реализовать `src/api.py`**

```python
import webview
from src import config, excel_reader, filters, aggregate, export

class Api:
    def __init__(self):
        self._records = []
        self._source = None

    def load(self, path):
        self._records = excel_reader.read_records(path)
        self._source = path
        config.set_source_path(path)
        return self.get_state()

    def get_state(self):
        dates = sorted({r["date"] for r in self._records})
        return {
            "source_path": self._source,
            "date_min": dates[0] if dates else None,
            "date_max": dates[-1] if dates else None,
            "cities": sorted({r["city"] for r in self._records if r["city"]}),
            "routes": sorted({r["route"] for r in self._records if r["route"]}),
            "loaded": bool(self._records),
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
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `python -m pytest tests/test_api.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/api.py tests/test_api.py
git commit -m "feat: Api bridge for UI"
```

---

### Task 10: main — окно и логика старта

**Files:**
- Create: `src/main.py`

**Interfaces:**
- Consumes: `Api`, `config`.
- Produces: `main()` — точка входа; запускает окно и при старте грузит файл по сохранённому пути либо просит выбрать.

- [ ] **Step 1: Реализовать `src/main.py`**

```python
import os
import sys
import webview
from src import config
from src.api import Api

def _web_dir():
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, "web" if hasattr(sys, "_MEIPASS") else "web")

def _index():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", "index.html")

def _on_start(window, api):
    path = config.get_source_path()
    if path and os.path.exists(path):
        api.load(path)
        window.evaluate_js("App.init()")
    else:
        window.evaluate_js("App.needFile()")

def main():
    api = Api()
    window = webview.create_window(
        "Bus Delays Dashboard", _index(), js_api=api,
        width=1150, height=760)
    webview.start(_on_start, (window, api))

if __name__ == "__main__":
    main()
```

Примечание: при упаковке PyInstaller путь к `web/` берётся из `sys._MEIPASS`; здесь `_index()` использует относительный путь — на шаге упаковки (Task 11) добавляется обработка `_MEIPASS`. Для запуска из исходников этого достаточно.

- [ ] **Step 2: Ручная проверка запуска (нет сохранённого пути)**

Run: `python -m src.main`
Expected: открывается окно; в шапке «No file selected»; кнопка «Change file…» открывает диалог; после выбора `HR report.xlsx` отображается таблица по сотрудникам с агрегатами, карточки-итоги, работает View by, фильтры, экспорт.

- [ ] **Step 3: Ручная проверка повторного запуска (путь сохранён)**

Run: `python -m src.main`
Expected: окно сразу открывает данные по сохранённому пути — **одно действие**, без выбора файла.

- [ ] **Step 4: Прогнать весь тест-набор**

Run: `python -m pytest -v`
Expected: все тесты зелёные.

- [ ] **Step 5: Commit**

```bash
git add src/main.py
git commit -m "feat: app window and startup logic (load saved path / prompt)"
```

---

### Task 11: Упаковка в .exe

**Files:**
- Modify: `src/main.py` (поддержка `sys._MEIPASS` для пути к `web/`)

**Interfaces:**
- Produces: `dist/razvozki.exe` — самодостаточный исполняемый файл.

- [ ] **Step 1: Обновить путь к web/ в `src/main.py` для упакованного режима**

Заменить функцию `_index()`:

```python
def _index():
    base = getattr(sys, "_MEIPASS",
                   os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, "web", "index.html")
```

(удалить неиспользуемую `_web_dir()`.)

- [ ] **Step 2: Собрать .exe**

Run (PowerShell):
```powershell
pyinstaller --onefile --noconsole --add-data "src/web;web" --name razvozki src/main.py
```
Expected: создан `dist/razvozki.exe`, сборка без ошибок.

- [ ] **Step 3: Проверить .exe на чистый запуск**

- Скопировать `dist/razvozki.exe` в отдельную папку (без исходников).
- Удалить `config.json` рядом, если есть.
- Запустить `razvozki.exe`.
Expected: окно открывается; просит выбрать файл; после выбора — дашборд работает; повторный запуск открывает сразу по сохранённому пути.

- [ ] **Step 4: Commit**

```bash
git add src/main.py
git commit -m "build: package as standalone .exe (PyInstaller)"
```

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** §3 запуск/путь → Task 2, 10; §4 формат/парсинг → Task 3; §5 unpivot/модель → Task 3; §6 представление/фильтры/разрезы/итоги/экспорт → Task 4, 5, 6, 7, 8; экспорт → Task 6, 9; §7 архитектура → все; §8 ошибки → Task 3 (UnrecognizedFormatError), Task 10 (нет файла); §9 допущения (неделя вс, англ. подписи) → Task 5, 6; §10 тесты/контрольные числа → Task 3, 5, 9; распространение .exe → Task 11.
- **Плейсхолдеры:** не обнаружены — в каждом шаге реальный код/команда.
- **Согласованность типов:** `Record`-ключи, `apply_filters(records, filt)`, `aggregate_by(records, view)`, `totals(records)`, `Api.get_view`/`load`/`export`, `App.init/needFile/render` — имена совпадают между задачами.

## Открытый вопрос для согласования на Task 7

Состав колонок дефолтного вида и оформление согласуются на HTML-макете (Task 7) до финальной отрисовки.
