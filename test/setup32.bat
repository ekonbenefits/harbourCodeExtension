SET HB_INSTALL_PREFIX=C:\harbour
SET HB_COMPILER_PREFIX=C:\harbour\bin\win\msvc
SET FWH_INSTALL=C:\FWH
SET TLPOSWIN_SRC=%CD%
CALL "c:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars32.bat"
if %ERRORLEVEL%==1 CALL "c:\Program Files\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars32.bat"
if %ERRORLEVEL%==1 CALL "c:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars32.bat"
SET PATH=%PATH%;%HB_COMPILER_PREFIX%
