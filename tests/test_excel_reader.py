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
