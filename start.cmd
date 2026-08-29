@echo off
rem ============================================================
rem  Writing Galaxy - one-click PROD launcher (backend 8080 + frontend preview 4173)
rem  Usage: double-click start.cmd ; first run builds backend & frontend
rem ============================================================
setlocal
cd /d "%~dp0"

set JAR=backend\target\writer-backend.jar

echo === Writing Galaxy - One-click Startup ===

rem ---- 1. backend jar ----
if not exist "%JAR%" (
  echo [1/3] backend jar missing, building...
  call backend\mvnw.cmd -q -DskipTests package
  if errorlevel 1 ( echo BACKEND BUILD FAILED & pause & exit /b 1 )
) else (
  echo [1/3] backend jar ready
)

rem ---- 2. frontend dist ----
if not exist "ui\writer-app\dist\index.html" (
  echo [2/3] frontend build missing, building...
  pushd ui\writer-app
  call npm install 2>nul
  call npm run build
  set BCK=%errorlevel%
  popd
  if not "%BCK%"=="0" ( echo FRONTEND BUILD FAILED & pause & exit /b 1 )
) else (
  echo [2/3] frontend dist ready
)

rem ---- 3. start ----
echo [3/3] starting backend and frontend...
start "wx-backend" cmd /k "cd /d %~dp0backend && java -jar target\writer-backend.jar"
pushd ui\writer-app
start "wx-frontend" cmd /k "npm run preview -- --port 4173 --open"
popd

echo.
echo Backend on 8080, frontend preview on 4173 (browser should open).
echo For day-to-day dev use dev.cmd (5173, hot reload).
echo To stop: close the two console windows.
pause
