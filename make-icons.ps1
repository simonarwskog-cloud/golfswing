# Draws the app icon (golfer in mid-swing) as PNG files for phones.
# Same drawing as icons/icon.svg, in a 512x512 coordinate system.
Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot 'icons'

function New-Pen([int]$alpha, [float]$width) {
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb($alpha, 255, 255, 255)), $width
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
  return $pen
}
function P([float]$x, [float]$y) { New-Object System.Drawing.PointF $x, $y }

function Draw-Icon([int]$size, [string]$name) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.ScaleTransform($size / 512.0, $size / 512.0)

  $rect = New-Object System.Drawing.RectangleF 0, 0, 512, 512
  $top = [System.Drawing.Color]::FromArgb(255, 47, 163, 90)
  $bottom = [System.Drawing.Color]::FromArgb(255, 20, 90, 50)
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $top, $bottom, 90
  $g.FillRectangle($bg, $rect)

  $arc = New-Object System.Drawing.Drawing2D.GraphicsPath
  $arc.AddBezier((P 140 104), (P 60 290), (P 150 456), (P 262 456))
  $arc.AddBezier((P 262 456), (P 374 456), (P 452 316), (P 392 130))
  $g.DrawPath((New-Pen 89 14), $arc)

  $g.DrawLine((New-Pen 255 12), (P 176 128), (P 352 82))
  $g.DrawLine((New-Pen 255 18), (P 352 82), (P 374 96))
  $g.DrawLines((New-Pen 255 30), [System.Drawing.PointF[]]@((P 262 290), (P 222 360), (P 204 430)))
  $g.DrawLines((New-Pen 255 30), [System.Drawing.PointF[]]@((P 262 290), (P 300 360), (P 318 430)))
  $g.DrawLine((New-Pen 255 40), (P 244 186), (P 262 290))
  $g.DrawLine((New-Pen 255 28), (P 250 204), (P 176 128))

  $white = [System.Drawing.Brushes]::White
  $g.FillEllipse($white, 196, 104, 72, 72)
  $g.FillEllipse($white, 248, 418, 28, 28)

  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Draw-Icon 512 'icon-512.png'
Draw-Icon 192 'icon-192.png'
Draw-Icon 180 'apple-touch-icon.png'
Write-Host 'Icons created in' $out
