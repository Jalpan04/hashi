$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$sdkRoot = "D:\android-sdk"
$toolsDir = "D:\android-sdk\downloads"

if (-not (Test-Path $sdkRoot)) {
    New-Item -ItemType Directory -Path $sdkRoot -Force | Out-Null
}
if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
}

Write-Host "=== Hashi Android Headless Setup ==="

# 1. Verify / Setup OpenJDK 17
$jdkDest = Join-Path $sdkRoot "jdk-17"
if (-not (Test-Path (Join-Path $jdkDest "bin\javac.exe"))) {
    Write-Host "Downloading OpenJDK 17..."
    $jdkZip = Join-Path $toolsDir "jdk-17.zip"
    $jdkUrl = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse"
    & curl.exe -L -o $jdkZip $jdkUrl
    
    Write-Host "Extracting OpenJDK 17..."
    $jdkTemp = Join-Path $toolsDir "jdk-temp"
    if (Test-Path $jdkTemp) { Remove-Item -Recurse -Force $jdkTemp }
    New-Item -ItemType Directory -Path $jdkTemp -Force | Out-Null
    & tar.exe -xf $jdkZip -C $jdkTemp
    
    $extractedJdk = Get-ChildItem -Path $jdkTemp -Directory | Select-Object -First 1
    if (Test-Path $jdkDest) { Remove-Item -Recurse -Force $jdkDest }
    Move-Item -Path $extractedJdk.FullName -Destination $jdkDest
    Remove-Item -Recurse -Force $jdkTemp
    if (Test-Path $jdkZip) { Remove-Item -Force $jdkZip }
}
Write-Host "OpenJDK 17 ready at $jdkDest"

# 2. Download and extract Android Command-line tools
$cmdlineLatest = Join-Path $sdkRoot "cmdline-tools\latest"
if (-not (Test-Path (Join-Path $cmdlineLatest "bin\sdkmanager.bat"))) {
    Write-Host "Downloading Android Command-Line Tools (146 MB)..."
    $cmdlineZip = Join-Path $toolsDir "commandlinetools.zip"
    $cmdlineUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    & curl.exe -L --progress-bar -o $cmdlineZip $cmdlineUrl
    
    Write-Host "Extracting Command-Line Tools..."
    $cmdlineTemp = Join-Path $toolsDir "cmdline-temp"
    if (Test-Path $cmdlineTemp) { Remove-Item -Recurse -Force $cmdlineTemp }
    New-Item -ItemType Directory -Path $cmdlineTemp -Force | Out-Null
    & tar.exe -xf $cmdlineZip -C $cmdlineTemp
    
    $extractedCmdline = Join-Path $cmdlineTemp "cmdline-tools"
    $cmdlineParent = Join-Path $sdkRoot "cmdline-tools"
    if (-not (Test-Path $cmdlineParent)) {
        New-Item -ItemType Directory -Path $cmdlineParent -Force | Out-Null
    }
    if (Test-Path $cmdlineLatest) { Remove-Item -Recurse -Force $cmdlineLatest }
    Move-Item -Path $extractedCmdline -Destination $cmdlineLatest
    Remove-Item -Recurse -Force $cmdlineTemp
    if (Test-Path $cmdlineZip) { Remove-Item -Force $cmdlineZip }
}
Write-Host "Command-Line Tools ready at $cmdlineLatest"

# 3. Configure environment variables for this process
$env:JAVA_HOME = $jdkDest
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_USER_HOME = Join-Path $sdkRoot ".android"
$env:PATH = "$jdkDest\bin;$cmdlineLatest\bin;$sdkRoot\platform-tools;$env:PATH"

Write-Host "Configured environment:"
Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"

# Verify java version
& "$jdkDest\bin\java.exe" -version

# 4. Accept licenses
Write-Host "Accepting Android SDK licenses..."
$sdkmanagerBat = Join-Path $cmdlineLatest "bin\sdkmanager.bat"
$yes = "y`ny`ny`ny`ny`ny`ny`ny`ny`ny`n"
$yes | & $sdkmanagerBat --licenses --sdk_root=$sdkRoot

# 5. Install platform-tools, platforms;android-34, build-tools;34.0.0, and ndk;26.1.10909125
Write-Host "Installing platform-tools, platforms;android-34, build-tools;34.0.0, and ndk..."
& $sdkmanagerBat --sdk_root=$sdkRoot "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;26.1.10909125"

# Find installed NDK directory
$ndkDir = Join-Path $sdkRoot "ndk\26.1.10909125"
if (-not (Test-Path $ndkDir)) {
    $foundNdk = Get-ChildItem -Path (Join-Path $sdkRoot "ndk") -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundNdk) { $ndkDir = $foundNdk.FullName }
}

if (Test-Path $ndkDir) {
    $env:NDK_HOME = $ndkDir
    Write-Host "NDK installed at $ndkDir"
}

# 6. Persist environment variables to User environment
Write-Host "Persisting environment variables for Windows User..."
[Environment]::SetEnvironmentVariable("JAVA_HOME", $jdkDest, "User")
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkRoot, "User")
[Environment]::SetEnvironmentVariable("ANDROID_USER_HOME", (Join-Path $sdkRoot ".android"), "User")
if ($ndkDir -and (Test-Path $ndkDir)) {
    [Environment]::SetEnvironmentVariable("NDK_HOME", $ndkDir, "User")
}

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathsToAdd = @(
    "$jdkDest\bin",
    "$cmdlineLatest\bin",
    "$sdkRoot\platform-tools"
)
foreach ($p in $pathsToAdd) {
    if ($userPath -notlike "*$p*") {
        $userPath = "$p;$userPath"
    }
}
[Environment]::SetEnvironmentVariable("Path", $userPath, "User")

# 7. Install Rust Android targets
Write-Host "Installing Rust Android target aarch64-linux-android..."
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android

Write-Host "=== Headless Android Setup Finished Successfully! ==="
