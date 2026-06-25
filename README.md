# Дашборд опозданий развозок

Десктоп-приложение для анализа опозданий служебной развозки из `HR report.xlsx`.

## Разработка
- `pip install -r requirements.txt`
- Тесты: `python -m pytest -v`
- Запуск: `python -m src.main`

## Сборка .exe
`pyinstaller --onefile --noconsole --add-data "src/web;src/web" --name razvozki src/main.py`
