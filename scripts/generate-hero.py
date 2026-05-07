#!/usr/bin/env python3
import base64
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ENDPOINT = "https://api.openai.com/v1/images/generations"
MODEL = "gpt-image-2"
SIZES = ("1792x1024", "1536x1024", "1024x1024")
MIN_BYTES = 20 * 1024

PROMPT = """Create a wide GitHub README hero banner for a project named deAIify.

Style: bold, high-energy, late-1990s / early-2000s TV infomercial aesthetic.
Palette: bright yellow and red, oversaturated colors, sharp contrast.
Visual elements: starburst graphics, an "AS SEEN ON TV" badge, exclamation marks,
action lines, lightning bolts, loud sale-burst energy, glossy print-ad intensity.
Subject: a giant Unicode em dash character (—) in the center being dramatically
struck through by a red X or smashed by a hammer. The em dash should be clear,
large, and unmistakable.
Text: bold sans-serif text reading "deAIify" prominently displayed and easy to
read at README banner size.
Energy: urgent infomercial pitchman intensity, but do not depict any specific
real person. Pure aesthetic only. Make it polished, legible, and suitable as the
top hero image on github.com.
"""


def request_image(api_key, size):
    body = {
        "model": MODEL,
        "prompt": PROMPT,
        "size": size,
        "n": 1,
    }
    data = json.dumps(body).encode("utf-8")
    request = Request(
        ENDPOINT,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urlopen(request, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))


def read_error(error):
    try:
        text = error.read().decode("utf-8", errors="replace")
    except Exception:
        return str(error)

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return text

    return json.dumps(parsed, indent=2)


def is_size_error(status, text):
    if status not in {400, 422}:
        return False

    lowered = text.lower()
    return any(token in lowered for token in ("size", "dimensions", "resolution"))


def decode_png(response):
    try:
        b64_png = response["data"][0]["b64_json"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(
            f"Response did not include data[0].b64_json: {json.dumps(response, indent=2)[:2000]}"
        ) from exc

    return base64.b64decode(b64_png)


def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY is not set", file=sys.stderr)
        return 1

    last_error = None
    used_size = None
    png_bytes = None

    for index, size in enumerate(SIZES):
        try:
            print(f"Generating hero image with size={size}...", flush=True)
            response = request_image(api_key, size)
            png_bytes = decode_png(response)
            used_size = size
            break
        except HTTPError as error:
            error_text = read_error(error)
            last_error = f"HTTP {error.code} for size={size}: {error_text}"
            if index < len(SIZES) - 1 and is_size_error(error.code, error_text):
                print(f"Size {size} rejected; retrying with {SIZES[index + 1]}.")
                continue
            print(last_error, file=sys.stderr)
            return 1
        except (URLError, TimeoutError) as error:
            print(f"Request failed for size={size}: {error}", file=sys.stderr)
            return 1

    if png_bytes is None or used_size is None:
        print(last_error or "Image generation failed.", file=sys.stderr)
        return 1

    out_path = Path(__file__).resolve().parents[1] / "assets" / "hero.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(png_bytes)

    file_size = out_path.stat().st_size
    if file_size <= MIN_BYTES:
        print(
            f"{out_path} is only {file_size} bytes; expected > {MIN_BYTES} bytes.",
            file=sys.stderr,
        )
        return 1

    print(f"Saved {out_path}")
    print(f"Size used: {used_size}")
    print(f"Final file size: {file_size} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
