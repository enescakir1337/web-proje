@echo off
title 66 Vizite PHP Sunucusu

echo ===================================================
echo    66 Vizite - PHP Backend Baslatiliyor
echo ===================================================
echo.

set PHP_BIN=php
where php >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :START_SERVER

if exist "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" (
    set "PHP_BIN=C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe"
    goto :START_SERVER
)

if exist "C:\xampp\php\php.exe" (
    set "PHP_BIN=C:\xampp\php\php.exe"
    goto :START_SERVER
)

echo [HATA] Sistemde PHP bulunamadi!
echo Lutfen Laragon veya PHP yolunu kontrol edin.
pause
exit /b 1

:START_SERVER
echo [1/2] PHP Calistirici: %PHP_BIN%
echo [2/2] Sunucu aciliyor: http://localhost:8000
echo.
echo Tarayici aciliyor...
echo Sunucuyu durdurmak icin bu pencereyi kapatabilirsiniz.
echo ===================================================
echo.

start http://localhost:8000
"%PHP_BIN%" -S localhost:8000 -t frontend backend\router.php
pause
