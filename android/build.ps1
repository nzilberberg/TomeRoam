# Build the self-contained TomeRoam APK (no Gradle — raw aapt2/javac/d8/apksigner).
# Prereqs (all user-scope, no admin):
#   - Android SDK at C:\Users\nzilb\android-sdk  (build-tools;35.0.0 + platforms;android-35)
#   - Any JDK on PATH (javac/keytool); Temurin 25 works.
# Signing keystore lives OUTSIDE the repo: C:\Users\nzilb\OneDrive\Desktop\tomeroam-android-keys\
# (created on first run; keep it — reinstalls/updates must be signed with the same key).
#
# When the web app changes: bump versionCode/versionName in AndroidManifest.xml,
# re-run this script, publish android\build\TomeRoam.apk as a GitHub release.

$ErrorActionPreference = 'Stop'

$android = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo    = Split-Path -Parent $android
$sdk     = 'C:\Users\nzilb\android-sdk'
$bt      = Join-Path $sdk 'build-tools\35.0.0'
$jar     = Join-Path $sdk 'platforms\android-35\android.jar'
$keys    = 'C:\Users\nzilb\OneDrive\Desktop\tomeroam-android-keys'
$build   = Join-Path $android 'build'

if (-not (Test-Path $jar)) { throw "Android SDK platform not found at $jar" }

# ---- clean staging ----
if (Test-Path $build) { Remove-Item -Recurse -Force $build }
New-Item -ItemType Directory -Force "$build\assets\www","$build\res\values","$build\res\mipmap-xxxhdpi","$build\classes","$build\dex" | Out-Null

# ---- stage web app into assets/www ----
Copy-Item "$repo\index.html","$repo\manifest.webmanifest","$repo\icon.svg","$repo\sw.js" "$build\assets\www\"
Copy-Item -Recurse "$repo\css","$repo\js","$repo\icons" "$build\assets\www\"

# ---- stage res + pinned root cert ----
Copy-Item -Recurse -Force "$android\res\*" "$build\res\"
Copy-Item "$repo\icons\icon-192.png" "$build\res\mipmap-xxxhdpi\ic_launcher.png"
New-Item -ItemType Directory -Force "$build\assets\certs" | Out-Null
Copy-Item "$android\certs\isrg-root-x1.cer" "$build\assets\certs\"

# ---- compile + link resources ----
& "$bt\aapt2.exe" compile --dir "$build\res" -o "$build\res.zip"
if ($LASTEXITCODE -ne 0) { throw 'aapt2 compile failed' }
# NOTE: assets are NOT passed to aapt2 (-A): on Windows it writes zip entries with
# backslashes (assets/www\js\app.js), which Android's AssetManager can't resolve.
# jar always normalizes to forward slashes, so assets are added with jar below.
& "$bt\aapt2.exe" link -o "$build\unsigned.apk" -I $jar --manifest "$android\AndroidManifest.xml" --auto-add-overlay "$build\res.zip"
if ($LASTEXITCODE -ne 0) { throw 'aapt2 link failed' }

# ---- compile java + dex ----
$javaSrc = Get-ChildItem -Recurse "$android\src" -Filter *.java | ForEach-Object { $_.FullName }
& javac --release 11 -classpath $jar -d "$build\classes" @javaSrc
if ($LASTEXITCODE -ne 0) { throw 'javac failed' }
$classes = Get-ChildItem -Recurse "$build\classes" -Filter *.class | ForEach-Object { $_.FullName }
& "$bt\d8.bat" --release --lib $jar --min-api 24 --output "$build\dex" @classes
if ($LASTEXITCODE -ne 0) { throw 'd8 failed' }

# ---- add classes.dex + assets to the apk (jar preserves existing entry compression) ----
Push-Location "$build\dex"
& jar -uf "$build\unsigned.apk" classes.dex
Pop-Location
if ($LASTEXITCODE -ne 0) { throw 'jar update failed' }
Push-Location $build
& jar -uf "$build\unsigned.apk" assets
Pop-Location
if ($LASTEXITCODE -ne 0) { throw 'jar assets update failed' }

# ---- align ----
& "$bt\zipalign.exe" -f 4 "$build\unsigned.apk" "$build\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw 'zipalign failed' }

# ---- keystore (created once, then reused forever) ----
New-Item -ItemType Directory -Force $keys | Out-Null
$ksFile = Join-Path $keys 'tomeroam.keystore'
$pwFile = Join-Path $keys 'keystore-password.txt'
if (-not (Test-Path $ksFile)) {
    $pw = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 24 | ForEach-Object {[char]$_})
    Set-Content -Path $pwFile -Value $pw -Encoding ascii -NoNewline
    & keytool -genkeypair -keystore $ksFile -alias tomeroam -keyalg RSA -keysize 2048 -validity 10000 `
        -storepass $pw -keypass $pw -dname 'CN=TomeRoam, O=nzilberberg'
    if ($LASTEXITCODE -ne 0) { throw 'keytool failed' }
}
$pw = Get-Content $pwFile -Raw

# ---- sign ----
& "$bt\apksigner.bat" sign --ks $ksFile --ks-key-alias tomeroam --ks-pass "pass:$pw" --key-pass "pass:$pw" --out "$build\TomeRoam.apk" "$build\aligned.apk"
if ($LASTEXITCODE -ne 0) { throw 'apksigner failed' }
& "$bt\apksigner.bat" verify "$build\TomeRoam.apk"
if ($LASTEXITCODE -ne 0) { throw 'apksigner verify failed' }

Write-Host "OK -> $build\TomeRoam.apk"
