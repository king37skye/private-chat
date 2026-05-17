# Zero-Dependency PowerShell Local Web Server
# Serves the private-chat app on http://localhost:8000 to bypass browser file:/// CORS limitations.

$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "`n===============================================" -ForegroundColor Cyan
    Write-Host " 🚀 Secure E2EE Chat Server is Active!" -ForegroundColor Green
    Write-Host " 🌐 Address: http://localhost:$port/" -ForegroundColor Green -NoNewline
    Write-Host " (Ctrl+Click to Open)" -ForegroundColor Yellow
    Write-Host "===============================================\n" -ForegroundColor Cyan
    Write-Host "Press [Ctrl + C] in this window to stop the server.`n" -ForegroundColor Gray

    # Automatically launch the default web browser
    Start-Process "http://localhost:$port/"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/") { 
            $urlPath = "/index.html" 
        }
        
        # Clean query parameters or trailing slashes
        if ($urlPath.Contains("?")) {
            $urlPath = $urlPath.Substring(0, $urlPath.IndexOf("?"))
        }

        # Resolve exact local file path
        $currentDir = Get-Location
        $filePath = Join-Path $currentDir $urlPath

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Smart Content-Type headers mapping
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            if ($ext -eq ".html" -or $ext -eq ".htm") { $contentType = "text/html; charset=utf-8" }
            elseif ($ext -eq ".css") { $contentType = "text/css; charset=utf-8" }
            elseif ($ext -eq ".js") { $contentType = "application/javascript; charset=utf-8" }
            elseif ($ext -eq ".png") { $contentType = "image/png" }
            elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg") { $contentType = "image/jpeg" }
            elseif ($ext -eq ".gif") { $contentType = "image/gif" }
            elseif ($ext -eq ".svg") { $contentType = "image/svg+xml" }
            elseif ($ext -eq ".ico") { $contentType = "image/x-icon" }
            elseif ($ext -eq ".mp4") { $contentType = "video/mp4" }
            elseif ($ext -eq ".webm") { $contentType = "video/webm" }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            
            # CORS support (allows local requests)
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            # Fallback for SPA routing: serve index.html for unknown routes
            $spaPath = Join-Path $currentDir "index.html"
            if (Test-Path $spaPath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($spaPath)
                $response.ContentType = "text/html; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("File Not Found")
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
        }
        $response.Close()
    }
}
catch {
    Write-Error $_
}
finally {
    $listener.Stop()
}
