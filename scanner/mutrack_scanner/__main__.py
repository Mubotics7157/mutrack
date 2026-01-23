"""
MuTrack BLE Beacon Scanner - Entry point.

Usage:
    python -m mutrack_scanner --config config.yaml
"""

import argparse
import asyncio
import logging
import signal
import sys
from pathlib import Path

from .api import ConvexApiClient
from .config import ScannerConfig
from .presence import PresenceTracker
from .scanner import BeaconScanner

logger = logging.getLogger("mutrack_scanner")


async def upload_loop(
    config: ScannerConfig,
    presence: PresenceTracker,
    api: ConvexApiClient,
    stop_event: asyncio.Event,
) -> None:
    """Periodically upload present beacons to the server."""
    while not stop_event.is_set():
        try:
            await asyncio.sleep(config.upload_interval)
            if stop_event.is_set():
                break

            beacons = presence.get_all_for_upload()
            if beacons:
                success = await api.send_sightings(beacons)
                if not success:
                    logger.warning(
                        f"Failed to upload {len(beacons)} beacons, will retry"
                    )
            else:
                logger.debug("No beacons to upload")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Upload loop error: {e}")
            await asyncio.sleep(config.retry_interval)


async def heartbeat_loop(
    api: ConvexApiClient,
    stop_event: asyncio.Event,
    interval: float = 60.0,
) -> None:
    """Periodically send heartbeat to the server."""
    while not stop_event.is_set():
        try:
            await asyncio.sleep(interval)
            if stop_event.is_set():
                break

            success = await api.send_heartbeat()
            if not success:
                logger.warning("Heartbeat failed")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Heartbeat loop error: {e}")


async def main_async(config: ScannerConfig) -> None:
    """Main async entry point."""
    stop_event = asyncio.Event()

    # Setup signal handlers
    loop = asyncio.get_event_loop()

    def signal_handler():
        logger.info("Shutdown signal received")
        stop_event.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, signal_handler)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            signal.signal(sig, lambda s, f: signal_handler())

    presence = PresenceTracker(ttl=config.presence_ttl)

    async with ConvexApiClient(config) as api:
        scanner = BeaconScanner(config, presence)

        # Send initial heartbeat
        await api.send_heartbeat()

        # Create tasks
        scanner_task = asyncio.create_task(scanner.start())
        upload_task = asyncio.create_task(upload_loop(config, presence, api, stop_event))
        heartbeat_task = asyncio.create_task(heartbeat_loop(api, stop_event))

        # Wait for stop signal
        await stop_event.wait()

        # Stop scanner
        scanner.stop()

        # Cancel tasks
        for task in [scanner_task, upload_task, heartbeat_task]:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        # Send final heartbeat
        await api.send_heartbeat()

    logger.info("Scanner shutdown complete")


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="MuTrack BLE Beacon Scanner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python -m mutrack_scanner --config config.yaml
    python -m mutrack_scanner -c /etc/mutrack/config.yaml
        """,
    )
    parser.add_argument(
        "--config",
        "-c",
        type=Path,
        default=Path("config.yaml"),
        help="Path to configuration file (default: config.yaml)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose (DEBUG) logging",
    )

    args = parser.parse_args()

    # Load configuration
    try:
        config = ScannerConfig.from_yaml(args.config)
        config.validate()
    except FileNotFoundError:
        print(f"Error: Config file not found: {args.config}", file=sys.stderr)
        print("Copy config.example.yaml to config.yaml and configure it.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error loading config: {e}", file=sys.stderr)
        sys.exit(1)

    # Setup logging
    log_level = "DEBUG" if args.verbose else config.log_level
    logging.basicConfig(
        level=getattr(logging, log_level),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    logger.info(f"MuTrack Beacon Scanner starting...")
    logger.info(f"API URL: {config.api_url}")
    logger.info(f"Upload interval: {config.upload_interval}s")
    logger.info(f"Presence TTL: {config.presence_ttl}s")

    # Run the scanner
    try:
        asyncio.run(main_async(config))
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
