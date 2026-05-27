@echo off
chcp 65001 >nul
echo ========================================
echo   Gantt Chart - 单文件打包工具
echo ========================================
echo.

set "SRC_DIR=%~dp0release\gantt-chart"
set "OUT_DIR=%~dp0release"
set "OUT_EXE=%OUT_DIR%\GanttChart.exe"

if not exist "%SRC_DIR%\gantt-chart.exe" (
    echo [错误] 找不到 release\gantt-chart\gantt-chart.exe
    echo 请先运行: npm run neu:build
    pause
    exit /b 1
)

echo 源文件:
dir "%SRC_DIR%" /b
echo.
echo 正在生成 SED 配置文件...

REM 写入 SED 文件
set "SED=%TEMP%\gantt_bundle.sed"
(
echo [Version]
echo Class=IEXPRESS
echo SEDVersion=3
echo [Options]
echo PackagePurpose=InstallApp
echo ShowInstallProgramWindow=0
echo HideExtractAnimation=1
echo UseLongFileName=1
echo InsideCompressed=0
echo CAB_FixedSize=0
echo CAB_ResvCodeSigning=0
echo RebootMode=N
echo InstallPrompt=%%InstallPrompt%%
echo DisplayLicense=%%DisplayLicense%%
echo FinishMessage=%%FinishMessage%%
echo TargetName=%%TargetName%%
echo FriendlyName=%%FriendlyName%%
echo AppLaunched=%%AppLaunched%%
echo PostInstallCmd=%%PostInstallCmd%%
echo AdminQuietInstCmd=%%AdminQuietInstCmd%%
echo UserQuietInstCmd=%%UserQuietInstCmd%%
echo SourceFiles=SourceFiles
echo [Strings]
echo InstallPrompt=""
echo DisplayLicense=""
echo FinishMessage=""
echo TargetName="%OUT_EXE:\=\\%"
echo FriendlyName="Gantt Chart"
echo AppLaunched="gantt-chart.exe"
echo PostInstallCmd=""
echo AdminQuietInstCmd=""
echo UserQuietInstCmd=""
echo [SourceFiles]
echo SourceFiles0=%SRC_DIR:\=\\%
echo [SourceFiles0]
) > "%SED%"

echo 正在打包...
iexpress /N /Q "%SED%"

if exist "%OUT_EXE%" (
    echo.
    echo ========================================
    echo   完成！
    echo   单文件: %OUT_EXE%
    for %%A in ("%OUT_EXE%") do echo   大小:   %%~zA 字节
    echo ========================================
) else (
    echo.
    echo [失败] IExpress 未生成文件，可能是路径包含特殊字符
    echo 备选方案: 直接压缩 release\gantt-chart\ 为 zip 发给用户即可
)

del "%SED%" 2>nul
pause
