# make-sfx.ps1 - 将 release/gantt-chart/ 打包成单个 GanttChart.exe
# 用法: powershell -File scripts/make-sfx.ps1

$srcDir = "$PSScriptRoot\..\release\gantt-chart"
$output  = "$PSScriptRoot\..\release\GanttChart.exe"

if (-not (Test-Path "$srcDir\gantt-chart.exe")) {
    Write-Host "[ERROR] Run 'npm run neu:build' first" -ForegroundColor Red
    exit 1
}

Write-Host "Packing: $srcDir -> $output"

# Step 1: Create zip of release files
$zipFile = "$env:TEMP\gantt_pack.zip"
Compress-Archive -Path "$srcDir\*" -DestinationPath $zipFile -Force

# Step 2: Read zip bytes
$zipBytes = [System.IO.File]::ReadAllBytes($zipFile)

# Step 3: Create SFX launcher C# code
$csCode = @'
using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;

class Program {
    [STAThread]
    static void Main() {
        string self = Assembly.GetExecutingAssembly().Location;
        string tmp = Path.Combine(Path.GetTempPath(), "gantt_" + Guid.NewGuid().ToString("N"));
        
        // Find the zip data embedded after the EXE
        byte[] exeBytes = File.ReadAllBytes(self);
        int zipStart = FindZipHeader(exeBytes);
        if (zipStart < 0) { return; }
        
        Directory.CreateDirectory(tmp);
        try {
            byte[] zipData = new byte[exeBytes.Length - zipStart];
            Array.Copy(exeBytes, zipStart, zipData, 0, zipData.Length);
            
            using (var ms = new MemoryStream(zipData))
            using (var archive = new ZipArchive(ms)) {
                foreach (var entry in archive.Entries) {
                    string dest = Path.Combine(tmp, entry.FullName);
                    Directory.CreateDirectory(Path.GetDirectoryName(dest));
                    entry.ExtractToFile(dest, true);
                }
            }
            
            string exe = Path.Combine(tmp, "gantt-chart.exe");
            if (File.Exists(exe)) {
                Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true });
            }
        } catch (Exception ex) {
            File.WriteAllText(Path.Combine(tmp, "error.log"), ex.ToString());
        }
    }
    
    static int FindZipHeader(byte[] data) {
        for (int i = 0; i < data.Length - 4; i++) {
            if (data[i] == 0x50 && data[i+1] == 0x4B && data[i+2] == 0x03 && data[i+3] == 0x04)
                return i;
        }
        return -1;
    }
}
'@

# Step 4: Compile C# to EXE
$csFile = "$env:TEMP\gantt_sfx.cs"
$outExe = "$env:TEMP\gantt_launcher.exe"
[System.IO.File]::WriteAllText($csFile, $csCode)

$csc = "$env:windir\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    # Try .NET 4.8 path
    $csc = (Get-ChildItem "$env:windir\Microsoft.NET\Framework\v4.*\csc.exe" -ErrorAction SilentlyContinue | Select-Object -Last 1).FullName
}
if (-not $csc) {
    Write-Host "[ERROR] C# compiler not found. Install .NET Framework SDK." -ForegroundColor Red
    Remove-Item $zipFile -Force
    exit 1
}

Write-Host "Compiling launcher..."
& $csc /target:exe /out:$outExe /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll $csFile 2>&1

if (-not (Test-Path $outExe)) {
    Write-Host "[ERROR] Compilation failed" -ForegroundColor Red
    Remove-Item $zipFile -Force
    exit 1
}

# Step 5: Append zip to launcher EXE
$launcherBytes = [System.IO.File]::ReadAllBytes($outExe)
$combinedBytes = $launcherBytes + $zipBytes
[System.IO.File]::WriteAllBytes($output, $combinedBytes)

# Cleanup
Remove-Item $zipFile -Force
Remove-Item $csFile -Force
Remove-Item $outExe -Force
Remove-Item "$env:TEMP\gantt_sfx.cs" -Force -ErrorAction SilentlyContinue

$sizeKB = [math]::Round((Get-Item $output).Length / 1KB, 0)
Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "  $output"
Write-Host "  Size: $sizeKB KB"
Write-Host "  Double-click to run!"
