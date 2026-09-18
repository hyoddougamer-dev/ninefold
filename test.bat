@echo off
setlocal enabledelayedexpansion
title Ninefold - tests

rem ---------------------------------------------------------------------------
rem  Runs the checks without opening the game. Nothing here needs a screen.
rem
rem  The one that matters is the second: it proves that closing the app for
rem  thirty days leaves you in exactly the state that leaving it open would.
rem ---------------------------------------------------------------------------

set "ROOT=%~dp0"
set "CACHE=%ROOT%.godot-path.txt"
set "GODOT="

if exist "%CACHE%" (
	set /p CACHED=<"%CACHE%"
	if exist "!CACHED!" set "GODOT=!CACHED!"
)
if not defined GODOT (
	for /f "delims=" %%P in ('where godot.exe 2^>nul') do if not defined GODOT set "GODOT=%%P"
)
if not defined GODOT (
	echo.
	echo   Godot was not found. Run play.bat once first — it will find it
	echo   and remember where it is.
	echo.
	pause
	exit /b 1
)

echo.
echo   ============================================================
echo    1 of 2  ^|  the numbers
echo   ============================================================
"%GODOT%" --headless --path "%ROOT%godot" --script res://tests/TestSim.gd
set "A=%ERRORLEVEL%"

echo.
echo   ============================================================
echo    2 of 2  ^|  closing the app must equal leaving it open
echo   ============================================================
"%GODOT%" --headless --path "%ROOT%godot" --script res://tests/TestOffline.gd
set "B=%ERRORLEVEL%"

echo.
if "%A%"=="0" if "%B%"=="0" (
	echo   Everything holds.
) else (
	echo   Something FAILED. Scroll up — the failing line says what it wanted.
)
echo.
pause
