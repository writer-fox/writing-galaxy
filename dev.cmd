@echo off
rem ============================================================
rem  Writing Galaxy - one-click DEV launcher (backend 8080 + frontend 5173)
rem  Usage: double-click dev.cmd   or   run: dev.cmd [rebuild]
rem    rebuild : force recompile backend jar before starting
rem ============================================================
setlocal
cd /d "%~dp0"

set JAR=backend\target\writer-backend.jar
set FORCE_REBUILD=%~1

rem ---- 1. ensure backend jar (optional rebuild) ----
if "%FORCE_REBUILD%"=="rebuild" (
  echo [1/4] rebuilding backend...
  call backend\mvnw.cmd -q -DskipTests package
  if errorlevel 1 ( echo BACKEND BUILD FAILED & pause & exit /b 1 )
) else (
  if not exist "%JAR%" (
    echo [1/4] backend jar missing, building first time...
    call backend\mvnw.cmd -q -DskipTests package
    if errorlevel 1 ( echo BACKEND BUILD FAILED & pause & exit /b 1 )
  ) else (
    echo [1/4] using existing backend jar (use 'dev.cmd rebuild' if you changed Java code)
  )
)

rem ---- 2. ensure frontend deps ----
if not exist ui\writer-app\node_modules (
  echo [2/4] installing frontend dependencies...
  pushd ui\writer-app
  call npm install
  popd
) else (
  echo [2/4] frontend deps ready
)

rem ---- 3. start backend in its own window ----
echo [3/4] starting backend on 8080...
start "wx-backend" cmd /k "cd /d %~dp0backend && java -jar target\writer-backend.jar"

rem ---- 4. start frontend dev and open browser ----
echo [4/4] starting frontend dev on 5173 and opening browser...
pushd ui\writer-app
start "wx-frontend" cmd /k "npm run dev"
start http://localhost:5173
popd

echo.
echo Started! If the browser did not open, visit http://localhost:5173
echo To stop: close the two console windows.
pause
