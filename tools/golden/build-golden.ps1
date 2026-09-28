#requires -Version 5
<#
.SYNOPSIS
  构建 golden 工具（用原 Cangjie 的 C# 实现产出 XML 基准）。

.DESCRIPTION
  本机 NuGet restore 是坏的：任何**新建**项目都报
  `MSB4181: "RestoreTask" 任务返回了 false`（原 Cangjie 能编译只是因为它的
  obj/project.assets.json 早就存在）。所以这里绕开 MSBuild 的 restore：

    1. 用 `--no-restore` 复用原 Cangjie 已有的 assets，编译出 Cangjie.dll；
    2. 用 SDK 自带的 Roslyn (csc.dll) 直接把 Program.cs + Cangjie.dll 编成 Golden.dll；
    3. 手写 Golden.runtimeconfig.json。

  全程离线、不碰 NuGet、不改动原 Cangjie 仓库的源码（只写它已有的 bin/obj）。

.NOTES
  一旦本机 restore 恢复正常，`tools/golden/Golden.csproj` 才是正统入口；
  本脚本只是当前环境下的等价替代，两者都产出同一个 Golden 可执行体。
#>
param(
    [string]$CangjieProject = (Join-Path (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))) 'cangjie-publish\cangjie'),
    [string]$Configuration = 'Release'
)

$ErrorActionPreference = 'Stop'

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

$CangjieProject = (Resolve-Path $CangjieProject).Path
$outDir = Join-Path $PSScriptRoot 'out'
$dotnetRoot = Split-Path -Parent (Get-Command dotnet).Source

# --- 1. 原 Cangjie（复用已有 assets，禁止 restore） ---
Write-Host "[1/3] 构建 Cangjie ($Configuration, net10.0, --no-restore) ..."
& dotnet build (Join-Path $CangjieProject 'Cangjie.csproj') `
    -c $Configuration --no-restore --nologo -v:q `
    -p:TargetFrameworks=net10.0 -p:GeneratePackageOnBuild=false | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Cangjie 构建失败 (exit $LASTEXITCODE)" }

$cangjieDll = Join-Path $CangjieProject "bin\$Configuration\net10.0\Cangjie.dll"
if (-not (Test-Path $cangjieDll)) { throw "找不到 $cangjieDll" }

# --- 2. 定位 SDK 自带的 Roslyn 与 net10.0 引用程序集 ---
$sdk = & dotnet --list-sdks | ForEach-Object {
    if ($_ -match '^(\S+)\s+\[(.+)\]$') {
        New-Object psobject -Property @{ Version = $Matches[1]; Root = $Matches[2] }
    }
} | Sort-Object { [version]$_.Version } | Select-Object -Last 1
if (-not $sdk) { throw '找不到 .NET SDK' }

$csc = Join-Path $sdk.Root "$($sdk.Version)\Roslyn\bincore\csc.dll"
if (-not (Test-Path $csc)) { throw "找不到 csc.dll: $csc" }

$refPack = Get-ChildItem (Join-Path $dotnetRoot 'packs\Microsoft.NETCore.App.Ref') -Directory |
    Sort-Object { [version]$_.Name } | Select-Object -Last 1
$refDir = Join-Path $refPack.FullName 'ref\net10.0'
if (-not (Test-Path $refDir)) { throw "找不到引用程序集目录: $refDir" }

# --- 3. 编译 golden ---
Write-Host "[2/3] 编译 Golden.dll ..."
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$refs = @((Get-ChildItem $refDir -Filter *.dll).FullName) + @($cangjieDll)
$cscArgs = @($csc, '-nologo', '-noconfig', '-target:exe', '-nullable:enable', '-langversion:latest',
    "-out:$(Join-Path $outDir 'Golden.dll')") +
    ($refs | ForEach-Object { "-r:$_" }) +
    @((Join-Path $PSScriptRoot 'Program.cs'))

& dotnet @cscArgs | Out-Host
if ($LASTEXITCODE -ne 0) { throw "csc 编译失败 (exit $LASTEXITCODE)" }

Write-Host "[3/3] 写 Golden.runtimeconfig.json ..."
Copy-Item $cangjieDll (Join-Path $outDir 'Cangjie.dll') -Force
$runtimeConfig = @"
{
  "runtimeOptions": {
    "tfm": "net10.0",
    "framework": {
      "name": "Microsoft.NETCore.App",
      "version": "$($refPack.Name)"
    }
  }
}
"@
Write-Utf8NoBom (Join-Path $outDir 'Golden.runtimeconfig.json') $runtimeConfig

Write-Host "OK -> $outDir\Golden.dll"
Write-Host "用法: dotnet `"$outDir\Golden.dll`" <输入文件> [输出文件]"
