@echo off
echo VisualMind Frontend kurulumu baslatiliyor...
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo HATA: Node.js bulunamadi! https://nodejs.org adresinden yukleyin.
    pause
    exit /b 1
)

echo Node.js bulundu.
echo.

if not exist node_modules (
    echo Bagimliliklar yukleniyor...
    npm install
    if %errorlevel% neq 0 (
        echo HATA: npm install basarisiz oldu.
        pause
        exit /b 1
    )
    echo.
)

echo Gelistirme sunucusu baslatiliyor...
echo Tarayici: http://localhost:5173
echo.
npm run dev
pause
