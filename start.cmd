@echo off
chcp 65001 >nul
rem ============================================================
rem  写作星河 · 一键生产运行(后端 jar + 前端 dist 静态托管)
rem  用法: 双击 start.cmd 即可; 首次会构建后端与前端
rem ============================================================
setlocal
cd /d "%~dp0"

set JAR=backend\target\writer-backend.jar

echo === 写作星河 一键启动 ===

rem ---- 1. 后端 jar ----
if not exist "%JAR%" (
  echo [1/3] 后端 jar 不存在, 编译中...
  call backend\mvnw.cmd -q -DskipTests package
  if errorlevel 1 ( echo 后端编译失败 & pause & exit /b 1 )
) else (
  echo [1/3] 后端 jar 已就绪
)

rem ---- 2. 前端 dist ----
if not exist "ui\writer-app\dist\index.html" (
  echo [2/3] 前端产物缺失, 构建中...
  pushd ui\writer-app
  call npm install 2>nul
  call npm run build
  set BCK=%errorlevel%
  popd
  if not "%BCK%"=="0" ( echo 前端构建失败 & pause & exit /b 1 )
) else (
  echo [2/3] 前端 dist 已就绪
)

rem ---- 3. 启动 ----
echo [3/3] 启动后端与前端...
start "写作星河-后端" cmd /k "cd /d %~dp0backend && java -jar target\writer-backend.jar"
pushd ui\writer-app
start "写作星河-前端" cmd /k "npm run preview -- --port 4173 --open"
popd

echo.
echo 后端监听 8080, 前端预览端口 4173(已尝试打开浏览器)
echo 日常开发请用 dev.cmd (5173 自动刷新)。
echo 停止: 关闭弹出的两个命令行窗口。
pause
