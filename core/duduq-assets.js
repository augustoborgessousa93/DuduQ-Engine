/* =========================================================
   DUDUQ CORE — ASSETS
   Fonte central de mascotes, sons, backgrounds e conteúdo.

   Versão 1.2.1

   Conteúdo oficial adicionado:
   - English — Year 1 — Module 01
   - HELLO / GOODBYE / GOOD MORNING / GOOD AFTERNOON
   - GOOD NIGHT / BOY / GIRL / MY NAME
   ========================================================= */
param(
    [string]$RepoPath = "."
)

$ErrorActionPreference = "Stop"

$repo = (Resolve-Path $RepoPath).Path

$required = @(
    "core\duduq-assets.js",
    "core\duduq-intro.js",
    "content\english\year-1\module-01\module-01.js",
    "content\english\year-1\module-01\index.html",
    "content\english\year-2\module-01\module-01.js",
    "content\english\year-2\module-01\index.html"
)

foreach ($rel in $required) {
    $full = Join-Path $repo $rel
    if (-not (Test-Path $full)) {
        throw "Arquivo obrigatório não encontrado: $rel`nExecute este script na raiz do DuduQ-Engine ou informe -RepoPath."
    }
}

$base = "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/"

# Arquivos que agora vivem em Imagens Ilustrativa/
$imageFiles = @(
    "Boy.png",
    "Bye.png",
    "DUDUQ_ACERTO.png",
    "DUDUQ_ERRO.png",
    "DUDUQ_IDLE.png",
    "Duduq_Li%C3%A7%C3%A3o%20concluida.png",
    "Duduq_Lição concluida.png",
    "Fish_Girl.png",
    "Girl.png",
    "Good%20Afternoon.png",
    "Good Afternoon.png",
    "Good%20Morning.png",
    "Good Morning.png",
    "Good%20Night.png",
    "Good Night.png",
    "Hello.png",
    "LOGO%20DA%20EMPRESA_COLORIDO.png",
    "LOGO DA EMPRESA_COLORIDO.png",
    "LOGO%20DUDUQ.png",
    "LOGO DUDUQ.png",
    "Logo%20EduQ%20Play.png",
    "Logo EduQ Play.png",
    "My%20name.png",
    "My name.png",
    "Rain.png",
    "nervous.png",
    "wheelchair_boy.png"
)

# Arquivos que agora vivem em Efeitos sonoros/
$soundFiles = @(
    "Ops_feedback_erro.mp3",
    "bubble-pop.mp3",
    "click.mp3",
    "correct.mp3",
    "ding.mp3",
    "error.mp3",
    "feedback_correto.mp3",
    "happy-fun-EduQ_Play.mp3",
    "pop.mp3",
    "swoosh-sound-effect--transitions.mp3",
    "swoosh.mp3",
    "you%20win.mp3",
    "you win.mp3"
)

# Arquivos que agora vivem em Templates/
$templateFiles = @(
    "1%C2%BA%20ano%20-whispering-woods.png",
    "2%C2%BA%20ano%20-chroma-canyons.png",
    "3%C2%BA%20ano%20-clockwork-valley.png",
    "4%C2%BA%20ano%20-papercraft-campus.png",
    "5%C2%BA%20ano%20-sky-lab.png",
    "1º ano -whispering-woods.png",
    "2º ano -chroma-canyons.png",
    "3º ano -clockwork-valley.png",
    "4º ano -papercraft-campus.png",
    "5º ano -sky-lab.png"
)

function Encode-Folder([string]$folder) {
    return $folder.Replace(" ", "%20")
}

function Replace-AssetPaths([string]$text) {
    $result = $text

    foreach ($name in $imageFiles) {
        $encodedName = $name.Replace(" ", "%20")
        $result = $result.Replace(
            $base + $name,
            $base + "Imagens%20Ilustrativa/" + $encodedName
        )

        # BASE + "arquivo" / BASE + 'arquivo'
        $result = $result.Replace(
            'BASE + "' + $name + '"',
            'BASE + "Imagens%20Ilustrativa/' + $encodedName + '"'
        )
        $result = $result.Replace(
            "BASE + '" + $name + "'",
            "BASE + 'Imagens%20Ilustrativa/" + $encodedName + "'"
        )
    }

    foreach ($name in $soundFiles) {
        $encodedName = $name.Replace(" ", "%20")
        $result = $result.Replace(
            $base + $name,
            $base + "Efeitos%20sonoros/" + $encodedName
        )

        $result = $result.Replace(
            'BASE + "' + $name + '"',
            'BASE + "Efeitos%20sonoros/' + $encodedName + '"'
        )
        $result = $result.Replace(
            "BASE + '" + $name + "'",
            "BASE + 'Efeitos%20sonoros/" + $encodedName + "'"
        )
    }

    foreach ($name in $templateFiles) {
        $encodedName = $name.Replace(" ", "%20")
        $result = $result.Replace(
            $base + $name,
            $base + "Templates/" + $encodedName
        )

        $result = $result.Replace(
            'BASE + "' + $name + '"',
            'BASE + "Templates/' + $encodedName + '"'
        )
        $result = $result.Replace(
            "BASE + '" + $name + "'",
            "BASE + 'Templates/" + $encodedName + "'"
        )
    }

    return $result
}

function Update-File([string]$path, [scriptblock]$transform) {
    $full = Join-Path $repo $path
    $before = [System.IO.File]::ReadAllText($full)
    $after = & $transform $before

    if ($after -ne $before) {
        [System.IO.File]::WriteAllText(
            $full,
            $after,
            (New-Object System.Text.UTF8Encoding($false))
        )
        Write-Host "[ALTERADO] $path" -ForegroundColor Green
        return $true
    }

    Write-Host "[SEM ALTERAÇÃO] $path" -ForegroundColor DarkGray
    return $false
}

$changed = 0

# 1) Corrige referências literais espalhadas pelo Engine.
# Inclui os runtimes DUDUQ_*.html, necessários para mascote, fundo e efeitos
# continuarem funcionando dentro dos iframes.
$files = Get-ChildItem -Path $repo -Recurse -File |
    Where-Object {
        $_.Extension -in @(".js", ".html", ".css") -and
        $_.FullName -notmatch '[\\/]\.git[\\/]'
    }

foreach ($file in $files) {
    $rel = $file.FullName.Substring($repo.Length).TrimStart([char[]]@('\','/'))
    $did = Update-File $rel {
        param($text)
        Replace-AssetPaths $text
    }
    if ($did) { $changed++ }
}

# 2) Áudios do Módulo 01 — 1º ano.
$year1Module = "content\english\year-1\module-01\module-01.js"
if (Update-File $year1Module {
    param($text)
    $text = $text.Replace('BASE + "Audios/";', 'BASE + "Audios/1_ANO/M01/";')
    $text = $text.Replace("BASE + 'Audios/';", "BASE + 'Audios/1_ANO/M01/';")
    $text = $text.Replace('Versão 1.7.2', 'Versão 1.7.3')
    $text = $text.Replace('const VERSION = "1.7.2";', 'const VERSION = "1.7.3";')
    return $text
}) { $changed++ }

# 3) Áudios do Módulo 01 — 2º ano.
# O repositório Assets-DuduQ ainda não contém esta pasta em 14/08/2026.
# O caminho fica preparado para a mesma convenção do 1º ano; o fallback
# Speech Synthesis continua sendo usado enquanto os MP3s não forem publicados.
$year2Module = "content\english\year-2\module-01\module-01.js"
if (Update-File $year2Module {
    param($text)
    $text = $text.Replace('BASE + "Audios/";', 'BASE + "Audios/2_ANO/M01/";')
    $text = $text.Replace("BASE + 'Audios/';", "BASE + 'Audios/2_ANO/M01/';")
    $text = $text.Replace('Versão 1.1.0', 'Versão 1.1.1')
    $text = $text.Replace('const VERSION = "1.1.0";', 'const VERSION = "1.1.1";')
    return $text
}) { $changed++ }

# 4) Bump de versão dos assets centrais.
$coreAssets = "core\duduq-assets.js"
if (Update-File $coreAssets {
    param($text)
    $text = $text.Replace('Versão 1.2.1', 'Versão 1.2.2')
    $text = $text.Replace('const VERSION = "1.2.1";', 'const VERSION = "1.2.2";')
    return $text
}) { $changed++ }

# 5) Bump do Intro porque o logo padrão mudou de pasta.
$coreIntro = "core\duduq-intro.js"
if (Update-File $coreIntro {
    param($text)
    $text = $text.Replace('Versão 1.2.0', 'Versão 1.2.1')
    $text = $text.Replace('const VERSION = "1.2.0";', 'const VERSION = "1.2.1";')
    return $text
}) { $changed++ }

# 6) Cache-busting dos dois players.
$year1Index = "content\english\year-1\module-01\index.html"
if (Update-File $year1Index {
    param($text)
    $text = $text.Replace('duduq-assets.js?v=121', 'duduq-assets.js?v=122')
    $text = $text.Replace('duduq-intro.js?v=120', 'duduq-intro.js?v=121')
    $text = $text.Replace('./module-01.js?v=172', './module-01.js?v=173')
    return $text
}) { $changed++ }

$year2Index = "content\english\year-2\module-01\index.html"
if (Update-File $year2Index {
    param($text)
    $text = $text.Replace('duduq-assets.js?v=121', 'duduq-assets.js?v=122')
    $text = $text.Replace('duduq-intro.js?v=120', 'duduq-intro.js?v=121')
    $text = $text.Replace('./module-01.js?v=100', './module-01.js?v=111')
    $text = $text.Replace('./module-01.js?v=110', './module-01.js?v=111')
    return $text
}) { $changed++ }

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "AJUSTE DE ASSETS CONCLUÍDO" -ForegroundColor Cyan
Write-Host "Arquivos alterados: $changed"
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Validação básica de sintaxe JavaScript, se Node estiver instalado.
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $jsChecks = @(
        "core\duduq-assets.js",
        "core\duduq-intro.js",
        "content\english\year-1\module-01\module-01.js",
        "content\english\year-2\module-01\module-01.js"
    )

    foreach ($rel in $jsChecks) {
        & node --check (Join-Path $repo $rel)
        if ($LASTEXITCODE -ne 0) {
            throw "Falha de sintaxe JavaScript em: $rel"
        }
    }

    Write-Host "Node --check: OK" -ForegroundColor Green
}
else {
    Write-Host "Node não encontrado; validação JS automática foi ignorada." -ForegroundColor Yellow
}

# Verifica os caminhos principais que precisam estar presentes.
$checks = @(
    @{ File = $coreAssets; Text = "Imagens%20Ilustrativa/DUDUQ_IDLE.png" },
    @{ File = $coreAssets; Text = "Efeitos%20sonoros/correct.mp3" },
    @{ File = $coreAssets; Text = "Templates/1%C2%BA%20ano%20-whispering-woods.png" },
    @{ File = $year1Module; Text = "Audios/1_ANO/M01/" },
    @{ File = $year2Module; Text = "Audios/2_ANO/M01/" },
    @{ File = $year1Index; Text = "./module-01.js?v=173" },
    @{ File = $year2Index; Text = "./module-01.js?v=111" }
)

foreach ($check in $checks) {
    $full = Join-Path $repo $check.File
    $text = [System.IO.File]::ReadAllText($full)
    if (-not $text.Contains($check.Text)) {
        throw "Validação falhou: '$($check.Text)' não encontrado em $($check.File)"
    }
}

Write-Host "Validação dos novos caminhos: OK" -ForegroundColor Green
Write-Host ""

# Mostra o que será enviado ao GitHub.
$git = Get-Command git -ErrorAction SilentlyContinue
if ($git -and (Test-Path (Join-Path $repo ".git"))) {
    Push-Location $repo
    try {
        git diff --check
        if ($LASTEXITCODE -ne 0) {
            throw "git diff --check encontrou um problema."
        }

        Write-Host ""
        Write-Host "Arquivos modificados:" -ForegroundColor Cyan
        git status --short

        Write-Host ""
        Write-Host "Próximos comandos:" -ForegroundColor Cyan
        Write-Host 'git add .'
        Write-Host 'git commit -m "Atualiza caminhos após reorganização do Assets-DuduQ"'
        Write-Host 'git push origin main'
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "Git não encontrado ou a pasta não é um clone Git." -ForegroundColor Yellow
}
