function Test-ComplexFunction {
    param(
        [Parameter(Mandatory)]
        [string]$Input,
        [int]$Threshold = 10
    )

    $result = 0
    for ($i = 0; $i -lt $Input.Length; $i++) {
        if ($Input[$i] -match '\d') {
            $result += [int]::Parse($Input[$i])
            if ($result -gt $Threshold) {
                Write-Warning "Threshold exceeded"
                break
            }
        }
    }

    return $result
}

function Get-FileContent {
    param([string]$Path)
    
    if (Test-Path $Path) {
        return Get-Content $Path
    }
    throw "File not found: $Path"
}
