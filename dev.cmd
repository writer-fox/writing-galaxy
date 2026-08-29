@echo off
chcp 65001 >nul
rem ============================================================
rem  写作星河 · 一键开发运行(前后端 dev 模式, 自动刷新)
rem  用法: 双击 dev.cmd  或  命令行 dev.cmd [rebuild]
rem    rebuild 参数: 强制重新编译后端 jar 后再启动
rem ============================================================
setlocal
cd /d "%~dp0"

set JAR=backend\target\writer-backend.jar
set FORCE_REBUILD=%~1

rem ---- 1. 确保后端 jar 存在(可选强制重建) ----
if "%FORCE_REBUILD%"=="rebuild" (
  echo [1/4] 重新编译后端...
  call backend\mvnw.cmd -q -DskipTests package
  if errorlevel 1 ( echo 后端编译失败 & pause & exit /b 1 )
) else (
  if not exist "%JAR%" (
    echo [1/4] 后端 jar 不存在, 首次编译...
    call backend\mvnw.cmd -q -DskipTests package
    if errorlevel 1 ( echo 后端编译失败 & pause & exit /b 1 )
  ) else (
    echo [1/4] 使用现有后端 jar (如改过后端代码, 请用 dev.cmd rebuild)
  )
)

rem ---- 2. 确保前端依赖已安装 ----
if not exist ui\writer-app\node_modules (
  echo [2/4] 首次安装前端依赖...
  pushd ui\writer-app
  call npm install
  popd
) else (
  echo [2/4] 前端依赖已就绪
)

rem ---- 3. 后台启动后端(独立窗口) ----
echo [3/4] 启动后端 (8080)...
start "写作星河-后端" cmd /k "cd /d %~dp0backend && java -jar target\writer-backend.jar"

rem ---- 4. 启动前端 dev 并打开浏览器 ----
echo [4/4] 启动前端 dev (5173) 并打开浏览器...
pushd ui\writer-app
start "写作星河-前端" cmd /k "npm run dev"
start http://localhost:5173
popd

echo.
echo 已启动! 若浏览器未自动打开, 请手动访问 http://localhost:5173
echo 停止: 关闭弹出的两个命令行窗口即可。
pause
