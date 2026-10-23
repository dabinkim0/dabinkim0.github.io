"""Static file server for the Playwright suite.

`python3 -m http.server` listens with a backlog of 5, which drops connections
when several Playwright workers load pages at once (missing CSS, JS, or images
then show up as random layout and screenshot failures).
"""

import argparse
import functools
import http.server
from pathlib import Path


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))

    with Server((args.bind, args.port), handler) as server:
        print(f"Serving {root} at http://{args.bind}:{args.port}/", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
