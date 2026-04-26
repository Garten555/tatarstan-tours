@echo off
chcp 65001 >nul
echo ========================================
echo Создание аналитической части ВКР
echo ========================================
echo.

py --version >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Python не установлен
    pause
    exit /b 1
)

py -c "import docx" >nul 2>&1
if errorlevel 1 (
    echo Установка библиотеки python-docx...
    py -m pip install python-docx
)

echo Запуск скрипта...
py create_analytical_part.py

if errorlevel 1 (
    echo ОШИБКА при создании документа!
    pause
    exit /b 1
)

echo.
echo Документ создан: АНАЛИТИЧЕСКАЯ_ЧАСТЬ.docx
echo.
pause







