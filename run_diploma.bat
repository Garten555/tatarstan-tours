@echo off
chcp 65001 >nul
title Генератор диплома - Ахунов Данил

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║           ГЕНЕРАТОР ДИПЛОМА - Word (.docx)                   ║
echo ║                    Ахунов Данил                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Переходим в папку скрипта
cd /d "%~dp0"

REM Проверяем наличие Python
echo [1/3] Проверка Python...
python --version >nul 2>&1
if error    echo ❌level 1 (
 Python не найден!
    echo Установите Python с сайта https://python.org
    echo Нажмите любую клавишу для выхода...
    pause >nul
    exit /b 1
)
echo ✅ Python найден

REM Устанавливаем зависимости
echo [2/3] Установка зависимостей (python-docx)...
pip install python-docx --quiet --disable-pip-version-check
if errorlevel 1 (
    echo ⚠️ Не удалось установить зависимости
    echo Попробуйте вручную: pip install python-docx
    echo Нажмите любую клавишу для продолжения...
    pause >nul
)

REM Создаём папку для вывода
if not exist "diploma_output" mkdir diploma_output

REM Запускаем генератор
echo [3/3] Запуск генератора диплома...
echo.

python src\generate_introduction_docx.py

echo.
if errorlevel 1 (
    echo ❌ Произошла ошибка!
    echo Проверьте сообщения выше
) else (
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║                    ✅ ГОТОВО!                                ║
    echo ╚══════════════════════════════════════════════════════════════╝
    echo.
    echo 📁 Файл создан: diploma_output\Введение_Ахунов.docx
    echo.
    echo Открыть файл? (Y/N)
    set /p choice=""
    if /i "%choice%"=="Y" (
        start "" "diploma_output\Введение_Ахунов.docx"
    )
)

echo.
pause