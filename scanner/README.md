# MuTrack BLE Beacon Scanner

A companion app for MuTrack that continuously scans for iBeacon advertisements and automatically logs attendance to the backend.

## Requirements

- Python 3.9+
- Bluetooth LE capable device
- Raspberry Pi (recommended) or macOS

## Installation

### Raspberry Pi

1. Clone or copy the scanner directory to your Pi:
   ```bash
   scp -r scanner/ pi@raspberrypi:~/mutrack-scanner/
   ```

2. SSH into your Pi and set up the environment:
   ```bash
   cd ~/mutrack-scanner
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Configure the scanner:
   ```bash
   cp config.example.yaml config.yaml
   nano config.yaml
   ```

   Set your `api_url` and `api_key` (get the API key from Admin > Scanners in MuTrack).

4. Test the scanner:
   ```bash
   python -m mutrack_scanner -c config.yaml -v
   ```

5. Install as a service:
   ```bash
   sudo cp systemd/mutrack-scanner.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable mutrack-scanner
   sudo systemctl start mutrack-scanner
   ```

6. Check status:
   ```bash
   sudo systemctl status mutrack-scanner
   sudo journalctl -u mutrack-scanner -f
   ```

### macOS (for development/testing)

1. Create and activate a virtual environment:
   ```bash
   cd scanner
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Configure:
   ```bash
   cp config.example.yaml config.yaml
   # Edit config.yaml with your API key
   ```

3. Run:
   ```bash
   python -m mutrack_scanner -c config.yaml -v
   ```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `api_url` | (required) | Your Convex deployment URL + `/api/scanner` |
| `api_key` | (required) | Scanner API key from MuTrack admin |
| `scan_interval` | 1.0 | Seconds between BLE scan cycles |
| `upload_interval` | 10.0 | Seconds between batch uploads |
| `presence_ttl` | 30.0 | Seconds before beacon is considered "gone" |
| `retry_interval` | 60.0 | Seconds between retries on failure |
| `log_level` | INFO | Logging level (DEBUG, INFO, WARNING, ERROR) |

### Environment Variables

You can override config values with environment variables:
- `MUTRACK_API_URL` - API URL
- `MUTRACK_API_KEY` - API key

## How It Works

1. The scanner continuously listens for BLE advertisements
2. When an iBeacon is detected, it's tracked in a presence buffer
3. Every `upload_interval` seconds, present beacons are sent to the server
4. The server matches beacons to members and logs attendance for active meetings
5. If a beacon isn't seen for `presence_ttl` seconds, it's considered departed

## Troubleshooting

### No beacons detected

1. Check Bluetooth is enabled:
   ```bash
   # Raspberry Pi
   sudo hciconfig hci0 up
   bluetoothctl power on
   ```

2. Verify beacon is broadcasting (use a phone app like "nRF Connect")

3. Run with verbose logging:
   ```bash
   python -m mutrack_scanner -c config.yaml -v
   ```

### Permission denied

On Linux, you may need to run as root or add capabilities:
```bash
sudo setcap 'cap_net_raw,cap_net_admin+eip' $(which python3)
```

Or run with sudo (not recommended for production).

### API errors

1. Verify your API key is correct
2. Check the scanner is enabled in MuTrack admin
3. Ensure your network can reach the Convex URL

## License

MIT
