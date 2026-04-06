# ─────────────────────────────────────────────────────────────
# Fruta — LOCAL NETWORK mode startup script
# Run this instead of "npm run dev" when you have no internet.
# The API must also be running with the "Local Network" profile:
#   dotnet run --project ..\frutaaaaa\frutaaaaa.csproj --launch-profile "Local Network"
# ─────────────────────────────────────────────────────────────

$env:VITE_API_BASE_URL = 'http://192.168.1.200:5005'
npm run dev
