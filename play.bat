@echo off
setlocal enabledelayedexpansion
title Ninefold

rem ===========================================================================
rem  Double-click this to play.
rem
rem  It looks for Godot, remembers where it found it, and starts the game.
rem  If it cannot find Godot it explains what to do instead of flashing shut.
rem ===========================================================================

set "ROOT=%~dp0"
set "PROJECT=%ROOT%godot"
set "CACHE=%ROOT%.godot-path.txt"
set "GODOT="

rem --- 0. dragged a Godot exe onto this file? then that is the answer ----------
if not "%~1"=="" (
    if exist "%~1" (
        set "GODOT=%~1"
        >"%CACHE%" echo %~1
        echo   Using the Godot you dropped on this file, and remembering it.
    )
)

echo.
echo   Ninefold
echo   ------------------------------------------------------------
echo.

rem --- 1. where we found it last time ----------------------------------------
if exist "%CACHE%" (
    set /p CACHED=<"%CACHE%"
    if exist "!CACHED!" (
        set "GODOT=!CACHED!"
    ) else (
        echo   The Godot we remembered has moved. Looking again.
        del "%CACHE%" >nul 2>&1
    )
)

rem --- 2. an override you set yourself ---------------------------------------
if not defined GODOT if defined NINEFOLD_GODOT (
    if exist "%NINEFOLD_GODOT%" set "GODOT=%NINEFOLD_GODOT%"
)

rem --- 3. anything already on PATH -------------------------------------------
if not defined GODOT call :onpath godot.exe
if not defined GODOT call :onpath godot4.exe
if not defined GODOT call :onpath Godot.exe

rem --- 4. next to this file, then the usual install spots ---------------------
rem  Searched in order. The repo folder first, so dropping the exe beside this
rem  file always wins and is the instruction given below when nothing is found.
if not defined GODOT call :scandeep "%ROOT%."
if not defined GODOT call :scandeep "%LOCALAPPDATA%\Godot"
if not defined GODOT call :scandeep "%LOCALAPPDATA%\Programs\Godot"
if not defined GODOT call :scandeep "%ProgramFiles%\Godot"
if not defined GODOT call :scandeep "%ProgramFiles(x86)%\Godot"
if not defined GODOT call :scandeep "%ProgramFiles(x86)%\Steam\steamapps\common\Godot Engine"
if not defined GODOT call :scanflat "%LOCALAPPDATA%\Microsoft\WindowsApps"
if not defined GODOT call :scanflat "%USERPROFILE%\Downloads"
if not defined GODOT call :scandeep "%USERPROFILE%\Downloads\Godot"
if not defined GODOT call :scanflat "%USERPROFILE%\Desktop"
if not defined GODOT call :scandeep "C:\Godot"

rem --- 5. ask PowerShell, which can do what batch cannot --------------------------
rem  Registry App Paths, the installed-programs list, Start Menu shortcuts, Steam's
rem  library folders and the Store's app aliases. A shortcut in the Start menu is the
rem  usual reason Windows search shows Godot as an Application while a folder scan
rem  finds nothing at all.
if not defined GODOT (
    echo   Looking properly ^(registry, Start menu, Steam, Store^)...
    for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\find-godot.ps1" 2^>nul`) do (
        if not defined GODOT if exist "%%P" set "GODOT=%%P"
    )
)

if not defined GODOT goto :nogodot

rem --- remember it, so next time is instant -----------------------------------
if not exist "%CACHE%" (
    >"%CACHE%" echo !GODOT!
)

if not exist "%PROJECT%\project.godot" (
    echo   Could not find the game files at:
    echo     %PROJECT%
    echo.
    echo   This file has to sit in the top folder of the project, next to the
    echo   folder called "godot". If it was moved, move it back.
    echo.
    pause
    exit /b 1
)

echo   Godot:  !GODOT!
echo.
echo   Starting. The very first run takes a few extra seconds to import.
echo.
"!GODOT!" --path "%PROJECT%"
set "CODE=!ERRORLEVEL!"

if not "!CODE!"=="0" (
    echo.
    echo   Godot closed with an error ^(code !CODE!^).
    echo   If no window ever appeared, the Godot found may not be version 4.3.
    echo   Delete .godot-path.txt next to this file and run this again.
    echo.
    pause
)
endlocal & exit /b 0


rem ===========================================================================
:onpath
for /f "delims=" %%P in ('where %~1 2^>nul') do (
    if not defined GODOT set "GODOT=%%P"
)
exit /b 0

rem Recursive: for folders that are Godot's own, or small.
:scandeep
if not exist "%~1" exit /b 0
for /f "delims=" %%F in ('dir /b /s "%~1\Godot*.exe" 2^>nul') do (
    if not defined GODOT call :take "%%F"
)
exit /b 0

rem Top level only: Downloads and Desktop can be enormous, and a recursive
rem scan of them is how a launcher ends up appearing to hang on startup.
:scanflat
if not exist "%~1" exit /b 0
for /f "delims=" %%F in ('dir /b "%~1\Godot*.exe" 2^>nul') do (
    if not defined GODOT call :take "%~1\%%F"
)
exit /b 0

rem Skips the console build, which opens a second black window and confuses things.
:take
set "CAND=%~1"
set "NAME=%~n1"
if /i not "!NAME:console=!"=="!NAME!" exit /b 0
set "GODOT=!CAND!"
exit /b 0


rem ===========================================================================
:nogodot
echo   Godot was not found - and that may well be my fault rather than yours.
echo.
echo   If Godot DOES open from the Start menu on this computer, the quickest fix
echo   needs no typing at all:
echo.
echo     * Find Godot in the Start menu, right-click it,
echo       choose "Open file location", and in the folder that opens
echo       DRAG the Godot .exe onto this play.bat file.
echo.
echo   It will start, and remember where it is from then on.
echo.
echo   Don't have Godot yet?
echo     1. godotengine.org/download/windows
echo     2. Godot 4.3, the normal build ^(not .NET^)
echo     3. Unzip, and put the .exe in THIS folder
echo     4. Double-click this file again
echo.
echo   To see everywhere I looked, run this in the same folder:
echo     powershell -NoProfile -ExecutionPolicy Bypass -File tools\find-godot.ps1 -Verbose
echo.
pause
exit /b 1
