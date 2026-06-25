import os
import pytest

@pytest.fixture
def real_xlsx():
    # Реальный файл лежит в корне проекта рядом с папкой src/
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, "HR report.xlsx")
    assert os.path.exists(path), f"Не найден {path}"
    return path
