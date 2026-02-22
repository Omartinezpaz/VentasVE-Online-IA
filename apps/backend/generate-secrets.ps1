# ============================================================
#  generate-secrets.ps1
#  Genera JWT secrets seguros para usar en tu archivo .env
# ============================================================

[CmdletBinding()]
param(
    [int]$Bytes = 48,             # 48 bytes = 96 caracteres hex (más que suficiente)
    [string]$OutputFile = "",     # Opcional: ruta para guardar el resultado
    [switch]$NoPrompt             # Si se usa, no pregunta nada por consola
)

function Generate-Secret {
    param (
        [int]$Bytes = 48
    )
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $buffer = New-Object byte[] $Bytes
        $rng.GetBytes($buffer)
        return [BitConverter]::ToString($buffer).Replace("-", "").ToLower()
    }
    finally {
        $rng.Dispose()
    }
}

function Validate-Secret {
    param ([string]$Secret)
    if ($Secret.Length -lt 32) {
        return "Muy corto (mínimo 32 caracteres)"
    }
    elseif ($Secret.Length -lt 64) {
        return "Aceptable ($($Secret.Length) caracteres)"
    }
    else {
        return "Seguro ($($Secret.Length) caracteres)"
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host "   Generador de JWT Secrets seguros"
Write-Host "============================================"
Write-Host ""

$jwtSecret        = Generate-Secret -Bytes $Bytes
$jwtRefreshSecret = Generate-Secret -Bytes $Bytes

Write-Host "JWT_SECRET:"
Write-Host "  Valor  : $jwtSecret"
Write-Host "  Estado : $(Validate-Secret $jwtSecret)"
Write-Host ""

Write-Host "JWT_REFRESH_SECRET:"
Write-Host "  Valor  : $jwtRefreshSecret"
Write-Host "  Estado : $(Validate-Secret $jwtRefreshSecret)"
Write-Host ""

if ($jwtSecret -eq $jwtRefreshSecret) {
    Write-Host "ERROR: Los secrets generados son iguales. Ejecuta el script de nuevo." -ForegroundColor Red
    exit 1
}
else {
    Write-Host "OK: Los secrets son diferentes entre sí." -ForegroundColor Green
}

Write-Host ""
Write-Host "--- Copia esto en tu archivo .env ----------"
Write-Host "JWT_SECRET=`"$jwtSecret`""
Write-Host "JWT_REFRESH_SECRET=`"$jwtRefreshSecret`""
Write-Host "--------------------------------------------"
Write-Host ""

# Guardar opcionalmente en archivo
if ($OutputFile -or -not $NoPrompt) {
    if (-not $OutputFile) {
        $respuesta = Read-Host "¿Deseas guardar los secrets en un archivo (s/n)?"
        if ($respuesta -eq "s") {
            $OutputFile = "secrets_output.txt"
        }
    }

    if ($OutputFile) {
        $contenido = @"
# Generado el $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# NO subir este archivo a Git

JWT_SECRET="$jwtSecret"
JWT_REFRESH_SECRET="$jwtRefreshSecret"
"@
        $contenido | Out-File -FilePath $OutputFile -Encoding UTF8 -Force
        Write-Host "Guardado en '$OutputFile'." -ForegroundColor Green
        Write-Host "Recuerda agregar ese archivo a .gitignore."
    }
}

Write-Host ""