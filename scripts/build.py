#!/usr/bin/env python3
"""
Builds the gallery website from the files in photos/.

For every image in photos/ it:
  * makes a small thumbnail and a screen-sized copy (fast to load for visitors)
  * optionally keeps the original for the "Download full size" link
  * reads the photo's details from a matching .txt file (same name), if present,
    falling back to whatever the camera wrote into the file (EXIF)

Everything is written to _site/, which is what gets published.

Run locally:   python scripts/build.py
Preview:       python -m http.server -d _site 8000
"""

from __future__ import annotations

import html
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps, ExifTags

Image.MAX_IMAGE_PIXELS = None  # big mosaics are welcome here

ROOT = Path(__file__).resolve().parent.parent
PHOTOS = ROOT / "photos"
SRC = ROOT / "src"
OUT = ROOT / "_site"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}
BROWSER_SAFE = {".jpg", ".jpeg", ".png", ".webp"}
THUMB_SIZE = 800
DISPLAY_SIZE = 2560

# Keys in the .txt files that the site treats specially. Every other
# "Key: value" line is shown as a row in the photo's details panel.
SPECIAL_KEYS = {"title", "date", "category", "featured", "hidden"}


# ---------------------------------------------------------------- text files

def parse_text_file(path: Path) -> tuple[dict, list[tuple[str, str]], str]:
    """Read a simple 'Key: value' file.

    Lines like "Telescope: Redcat 51" become fields. The first line that isn't
    "Key: value" (or anything after a blank line following the fields) is the
    start of the free-text description.
    Returns (special_fields, detail_rows, description).
    """
    special: dict[str, str] = {}
    details: list[tuple[str, str]] = []
    body: list[str] = []
    in_body = False
    seen_field = False
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw.rstrip()
        if in_body:
            body.append(line)
            continue
        if not line.strip():
            if seen_field:
                in_body = True
            continue
        if line.lstrip().startswith("#"):
            continue  # comment
        m = re.match(r"^\s*([A-Za-z][\w /&()-]{0,40}?)\s*:\s*(.*)$", line)
        if m and not line.lower().startswith(("http:", "https:")):
            key, value = m.group(1).strip(), m.group(2).strip()
            seen_field = True
            if not value:
                continue  # left blank in the template -> ignore
            if key.lower() in SPECIAL_KEYS:
                special[key.lower()] = value
            else:
                details.append((key, value))
        else:
            in_body = True
            body.append(line)
    description = "\n".join(body).strip()
    return special, details, description


def yes(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"yes", "y", "true", "1"}


# ---------------------------------------------------------------- EXIF

EXIF_TAGS = {v: k for k, v in ExifTags.TAGS.items()}


def read_exif(img: Image.Image) -> dict:
    out: dict[str, str] = {}
    try:
        exif = img.getexif()
    except Exception:
        return out
    if not exif:
        return out
    try:
        sub = exif.get_ifd(ExifTags.IFD.Exif)
    except Exception:
        sub = {}

    def get(name):
        tag = EXIF_TAGS.get(name)
        return sub.get(tag) if tag in sub else exif.get(tag)

    dt = get("DateTimeOriginal") or get("DateTime")
    if dt:
        try:
            out["date"] = datetime.strptime(str(dt).strip(), "%Y:%m:%d %H:%M:%S").strftime("%Y-%m-%d")
        except ValueError:
            pass
    make, model = get("Make"), get("Model")
    if model:
        model = str(model).strip().strip("\x00")
        make = str(make or "").strip().strip("\x00")
        out["Camera"] = model if make and model.lower().startswith(make.split()[0].lower()) else f"{make} {model}".strip()
    exp = get("ExposureTime")
    if exp:
        try:
            exp = float(exp)
            out["Exposure"] = f"{exp:g} s" if exp >= 1 else f"1/{round(1 / exp)} s"
        except (TypeError, ValueError, ZeroDivisionError):
            pass
    iso = get("ISOSpeedRatings") or get("PhotographicSensitivity")
    if iso:
        out["ISO"] = str(iso[0] if isinstance(iso, (tuple, list)) else iso)
    fl = get("FocalLength")
    if fl:
        try:
            out["Focal length"] = f"{float(fl):g} mm"
        except (TypeError, ValueError):
            pass
    return out


# ---------------------------------------------------------------- images

def to_rgb(img: Image.Image) -> Image.Image:
    if img.mode in ("I;16", "I;16B", "I;16L", "I"):
        img = img.point(lambda v: v * (1 / 256)).convert("L")
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, (0, 0, 0))
        bg.paste(img, mask=img.split()[-1])
        return bg
    return img.convert("RGB")


def resized(img: Image.Image, longest: int) -> Image.Image:
    copy = img.copy()
    copy.thumbnail((longest, longest), Image.LANCZOS)
    return copy


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "photo"


def nice_title(stem: str) -> str:
    t = re.sub(r"[_-]+", " ", stem).strip()
    t = re.sub(r"^\d{4}[ .]?\d{2}[ .]?\d{2}\s*", "", t) or t  # drop leading dates
    return t[:1].upper() + t[1:]


# ---------------------------------------------------------------- build

def build() -> int:
    site_file = ROOT / "site.txt"
    site_special, site_rows, about = (parse_text_file(site_file) if site_file.exists() else ({}, [], ""))
    site = {k.lower(): v for k, v in site_rows}
    site.update(site_special)
    site_title = site.get("site title") or site.get("title") or "Astrophotography"
    allow_downloads = yes(site.get("allow downloads", "yes"))

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "img" / "thumb").mkdir(parents=True)
    (OUT / "img" / "display").mkdir(parents=True)
    (OUT / "img" / "full").mkdir(parents=True)

    photos = []
    used_ids: set[str] = set()
    problems = 0
    files = sorted(p for p in PHOTOS.rglob("*") if p.suffix.lower() in IMAGE_EXT and not p.name.startswith("."))

    for path in files:
        rel = path.relative_to(PHOTOS)
        info_path = path.with_suffix(".txt")
        special, details, description = (parse_text_file(info_path) if info_path.exists() else ({}, [], ""))
        if yes(special.get("hidden")):
            print(f"  hidden   {rel}")
            continue
        try:
            with Image.open(path) as im:
                exif = read_exif(im)
                im = ImageOps.exif_transpose(im)
                im = to_rgb(im)
                width, height = im.size
                base = slugify(str(rel.with_suffix("")))
                pid, n = base, 2
                while pid in used_ids:
                    pid, n = f"{base}-{n}", n + 1
                used_ids.add(pid)
                resized(im, THUMB_SIZE).save(OUT / "img" / "thumb" / f"{pid}.jpg", quality=82, optimize=True, progressive=True)
                resized(im, DISPLAY_SIZE).save(OUT / "img" / "display" / f"{pid}.jpg", quality=90, optimize=True, progressive=True)
                full = None
                if allow_downloads:
                    if path.suffix.lower() in BROWSER_SAFE:
                        full = f"img/full/{pid}{path.suffix.lower()}"
                        shutil.copy2(path, OUT / full)
                    else:  # e.g. TIFF: offer a maximum-quality JPEG instead
                        full = f"img/full/{pid}.jpg"
                        im.save(OUT / full, quality=95)
        except Exception as e:  # never let one bad file take the whole site down
            problems += 1
            print(f"  SKIPPED  {rel}: {e}", file=sys.stderr)
            continue

        # Details from the .txt file win; EXIF fills in what's missing.
        detail_keys = {k.lower() for k, _ in details}
        for k in ("Camera", "Exposure", "ISO", "Focal length"):
            if k in exif and k.lower() not in detail_keys and not (k == "Exposure" and "integration" in detail_keys):
                details.append((k, exif[k]))

        date = special.get("date") or exif.get("date") or ""
        photos.append({
            "id": pid,
            "title": special.get("title") or nice_title(path.stem),
            "date": date,
            "category": special.get("category", ""),
            "featured": yes(special.get("featured")),
            "details": [[k, v] for k, v in details],
            "description": description,
            "w": width,
            "h": height,
            "thumb": f"img/thumb/{pid}.jpg",
            "display": f"img/display/{pid}.jpg",
            "full": full,
        })
        print(f"  ok       {rel}  ({width}x{height})")

    # Newest first; featured photos go to the top.
    photos.sort(key=lambda p: p["date"] or "0000", reverse=True)
    photos.sort(key=lambda p: not p["featured"])

    gallery = {
        "site": {
            "title": site_title,
            "tagline": site.get("tagline", ""),
            "photographer": site.get("your name", ""),
            "location": site.get("based in", ""),
            "contact": site.get("contact", ""),
            "instagram": site.get("instagram", ""),
            "astrobin": site.get("astrobin", ""),
            "about": about,
        },
        "photos": photos,
        "built": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }

    # Copy the site's code and fill in the page header / link-preview tags.
    for f in SRC.iterdir():
        if f.is_file():
            shutil.copy2(f, OUT / f.name)
    site_url = os.environ.get("SITE_URL", "").rstrip("/")
    cover = photos[0]["display"] if photos else ""
    index = (OUT / "index.html").read_text(encoding="utf-8")
    replacements = {
        "{{TITLE}}": html.escape(site_title),
        "{{DESCRIPTION}}": html.escape(site.get("tagline") or f"Astrophotography by {site.get('your name', 'me')}"),
        "{{OG_IMAGE}}": html.escape(f"{site_url}/{cover}" if site_url and cover else cover),
        "{{GALLERY_JSON}}": json.dumps(gallery, ensure_ascii=False).replace("</", "<\\/"),
    }
    for k, v in replacements.items():
        index = index.replace(k, v)
    (OUT / "index.html").write_text(index, encoding="utf-8")
    (OUT / ".nojekyll").write_text("")

    print(f"\nBuilt {len(photos)} photo(s) into {OUT.relative_to(ROOT)}/" + (f"  ({problems} skipped - see above)" if problems else ""))
    return 0


if __name__ == "__main__":
    sys.exit(build())
