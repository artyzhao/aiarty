#!/usr/bin/env python3
"""Fetch subscribed RSS (and a few HTML listings) for 每日精选."""

from __future__ import annotations

import gzip
import hashlib
import json
import re
import ssl
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
TZ = ZoneInfo("Asia/Shanghai")
SSL_CTX = ssl.create_default_context()
SSL_CTX_TLS12 = ssl.create_default_context()
try:
    SSL_CTX_TLS12.minimum_version = ssl.TLSVersion.TLSv1_2
    SSL_CTX_TLS12.maximum_version = ssl.TLSVersion.TLSv1_2
except Exception:
    SSL_CTX_TLS12 = SSL_CTX
ITEM_LIMIT = 8
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "close",
}

# 用户提供的部分链接已 404 / 换源，这里用当前仍可用的官方镜像。
SECTIONS = [
    {
        "id": "astrology",
        "name": "占星",
        "nameEn": "Astrology",
        "kicker": "星象与订阅",
        "feeds": [
            {
                "id": "tap",
                "name": "The Astrology Podcast",
                "kind": "podcast",
                "url": "https://theastrologypodcast.com/feed/podcast/",
                "home": "https://theastrologypodcast.com/",
            },
            {
                "id": "ghost",
                "name": "Ghost of a Podcast",
                "kind": "podcast",
                "url": "https://feeds.megaphone.fm/JESSICALANYADOOGHOSTOFAPODCAST3541145811",
                "home": "https://www.lovelanyadoo.com/ghost-of-a-podcast",
            },
            {
                "id": "alice",
                "name": "Astrology with Alice Bell",
                "kind": "newsletter",
                "url": "https://alicebell.substack.com/feed",
                "home": "https://alicebell.substack.com/",
            },
        ],
    },
    {
        "id": "invest",
        "name": "投资",
        "nameEn": "Investing",
        "kicker": "长期资金与宏观",
        "feeds": [
            {
                "id": "housel",
                "name": "Morgan Housel（Collaborative Fund）",
                "kind": "newsletter",
                "url": "https://collabfund.com/blog/authors/morgan/",
                "home": "https://collabfund.com/blog/authors/morgan/",
                "mode": "housel",
            },
            {
                "id": "doomberg",
                "name": "Doomberg",
                "kind": "newsletter",
                "url": "https://doomberg.substack.com/feed",
                "home": "https://doomberg.substack.com/",
            },
            {
                "id": "maggiulli",
                "name": "Nick Maggiulli（Of Dollars and Data）",
                "kind": "newsletter",
                "url": "https://ofdollarsanddata.com/feed/",
                "home": "https://ofdollarsanddata.com/",
            },
        ],
    },
    {
        "id": "ai",
        "name": "AI",
        "nameEn": "AI",
        "kicker": "模型、工程与产业",
        "feeds": [
            {
                "id": "dwarkesh",
                "name": "Dwarkesh Podcast",
                "kind": "podcast",
                "url": "https://dwarkesh.substack.com/feed",
                "home": "https://dwarkesh.substack.com/",
            },
            {
                "id": "latent",
                "name": "Latent Space",
                "kind": "newsletter",
                "url": "https://www.latent.space/feed",
                "home": "https://www.latent.space/",
            },
            {
                "id": "nopriors",
                "name": "No Priors",
                "kind": "podcast",
                "url": "https://feeds.megaphone.fm/nopriors",
                "home": "https://www.no-priors.com/",
            },
            {
                "id": "chinai",
                "name": "ChinAI",
                "kind": "newsletter",
                "url": "https://chinai.substack.com/feed",
                "home": "https://chinai.substack.com/",
            },
        ],
    },
    {
        "id": "work",
        "name": "工作",
        "nameEn": "Work",
        "kicker": "市场、利率与宏观现场",
        "feeds": [
            {
                "id": "oddlots",
                "name": "The Odd Lots",
                "kind": "podcast",
                "url": (
                    "https://www.omnycontent.com/d/playlist/"
                    "e73c998e-6e60-432f-8610-ae210140c5b1/"
                    "8a94442e-5a74-4fa2-8b8d-ae27003a8d6b/"
                    "982f5071-765c-403d-969d-ae27003a8d83/podcast.rss"
                ),
                "home": "https://www.bloomberg.com/oddlots",
            },
            {
                "id": "bond",
                "name": "Bond Vigilantes",
                "kind": "newsletter",
                "url": "https://bondvigilantes.com/feed/",
                "home": "https://bondvigilantes.com/",
            },
            {
                "id": "alhambra",
                "name": "Alhambra Investments",
                "kind": "newsletter",
                "url": "https://www.alhambrapartners.com/feed/",
                "home": "https://www.alhambrapartners.com/",
            },
        ],
    },
]


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._chunks: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in ("script", "style", "noscript"):
            self._skip += 1
        elif tag in ("p", "br", "div", "li", "h1", "h2", "h3"):
            self._chunks.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style", "noscript") and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if self._skip:
            return
        self._chunks.append(data)

    def text(self) -> str:
        return unescape("".join(self._chunks))


def local_name(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag


def strip_html(raw: str, limit: int = 160) -> str:
    if not raw:
        return ""
    parser = _TextExtractor()
    try:
        parser.feed(raw)
        parser.close()
        text = parser.text()
    except Exception:
        text = re.sub(r"<[^>]+>", " ", raw)
    text = unescape(text)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > limit:
        text = text[: limit - 1].rstrip() + "…"
    return text


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    s = value.strip()
    try:
        dt = parsedate_to_datetime(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(TZ)
    except Exception:
        pass
    iso = s
    if iso.endswith("Z"):
        iso = iso[:-1] + "+00:00"
    iso = iso.replace(" ", "T", 1) if "T" not in iso[:20] and " " in iso[:20] else iso
    try:
        dt = datetime.fromisoformat(iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(TZ)
    except Exception:
        return None


def duration_minutes(raw: str | None) -> int:
    if not raw:
        return 0
    s = raw.strip()
    if not s:
        return 0
    if s.isdigit():
        total = int(s)
    elif re.fullmatch(r"\d+:\d{1,2}(:\d{1,2})?", s):
        parts = [int(x) for x in s.split(":")]
        while len(parts) < 3:
            parts.insert(0, 0)
        total = parts[0] * 3600 + parts[1] * 60 + parts[2]
    else:
        return 0
    if total <= 0:
        return 0
    return max(1, round(total / 60))


def child_text(node: ET.Element, names: tuple[str, ...]) -> str:
    for child in list(node):
        if local_name(child.tag) in names:
            if child.text and child.text.strip():
                return child.text.strip()
            # some titles wrap in nested tags
            inner = "".join(child.itertext()).strip()
            if inner:
                return inner
    return ""


def child_attr(node: ET.Element, names: tuple[str, ...], attr: str) -> str:
    for child in list(node):
        if local_name(child.tag) in names:
            val = child.attrib.get(attr) or child.attrib.get(attr.lower())
            if val:
                return val.strip()
    return ""


def find_enclosure(node: ET.Element) -> str:
    for child in list(node):
        if local_name(child.tag) == "enclosure":
            href = child.attrib.get("url") or ""
            typ = (child.attrib.get("type") or "").lower()
            if href and (typ.startswith("audio") or href.endswith((".mp3", ".m4a", ".aac"))):
                return href
        if local_name(child.tag) == "link":
            rel = (child.attrib.get("rel") or "").lower()
            typ = (child.attrib.get("type") or "").lower()
            href = child.attrib.get("href") or ""
            if href and (rel == "enclosure" or typ.startswith("audio")):
                return href
    return ""


def http_get_curl(url: str) -> bytes:
    import subprocess

    cmd = [
        "curl", "-fsSL", "--max-time", "45", "--retry", "2", "--retry-delay", "1",
        "--http1.1", "--compressed",
        "-A", HEADERS["User-Agent"],
        "-H", "Accept: " + HEADERS["Accept"],
        url,
    ]
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0 or not proc.stdout:
        err = (proc.stderr or b"").decode("utf-8", errors="replace").strip()[:240]
        raise RuntimeError(err or f"curl exit {proc.returncode}")
    raw = proc.stdout
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    return raw


def http_get(url: str, retries: int = 2) -> bytes:
    last_err: Exception | None = None
    for ctx in (SSL_CTX, SSL_CTX_TLS12):
        for i in range(retries):
            req = urllib.request.Request(url, headers=HEADERS)
            try:
                with urllib.request.urlopen(req, timeout=45, context=ctx) as resp:
                    raw = resp.read()
                    enc = (resp.headers.get("Content-Encoding") or "").lower()
                    if enc == "gzip" or raw[:2] == b"\x1f\x8b":
                        raw = gzip.decompress(raw)
                    return raw
            except Exception as exc:
                last_err = exc
                time.sleep(0.5 * (i + 1))
    try:
        return http_get_curl(url)
    except Exception as exc:
        last_err = exc
    raise RuntimeError(f"{url} -> {last_err}")


def parse_xml(raw: bytes) -> ET.Element:
    text = raw.decode("utf-8", errors="replace")
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    try:
        return ET.fromstring(text)
    except ET.ParseError:
        text = re.sub(r"&(?!#?\w+;)", "&amp;", text)
        return ET.fromstring(text)


def entry_to_item(node: ET.Element, default_kind: str) -> dict | None:
    title = unescape(child_text(node, ("title",)))
    if not title:
        return None
    link = child_text(node, ("link",))
    if not link:
        link = child_attr(node, ("link",), "href")
    if not link:
        link = child_text(node, ("guid", "id"))
    summary_src = (
        child_text(node, ("description", "summary", "subtitle"))
        or child_text(node, ("encoded", "content"))
    )
    published = (
        child_text(node, ("pubDate", "published", "updated", "date"))
        or child_text(node, ("created",))
    )
    dt = parse_datetime(published)
    minutes = duration_minutes(child_text(node, ("duration",)))
    audio = find_enclosure(node)
    kind = "podcast" if (audio or minutes or default_kind == "podcast") else "newsletter"
    if default_kind == "newsletter" and not audio and not minutes:
        kind = "newsletter"
    item = {
        "title": re.sub(r"\s+", " ", title).strip(),
        "url": link,
        "summary": strip_html(summary_src),
        "published": dt.isoformat() if dt else "",
        "ts": int(dt.timestamp()) if dt else 0,
        "kind": kind,
        "durationMin": minutes,
    }
    if not item["url"]:
        return None
    return item


def parse_feed(raw: bytes, default_kind: str) -> list[dict]:
    root = parse_xml(raw)
    nodes: list[ET.Element] = []
    for node in root.iter():
        if local_name(node.tag) == "channel":
            nodes = [child for child in list(node) if local_name(child.tag) == "item"]
            break
    if not nodes:
        nodes = [node for node in root.iter() if local_name(node.tag) in ("item", "entry")]
    items: list[dict] = []
    for node in nodes:
        row = entry_to_item(node, default_kind)
        if row:
            items.append(row)
        if len(items) >= ITEM_LIMIT:
            break
    return items


def scrape_housel(html: str) -> list[dict]:
    items: list[dict] = []
    seen: set[str] = set()
    blocks = re.findall(r'<section class="post-preview">(.*?)</section>', html, re.S | re.I)
    for block in blocks:
        tm = re.search(
            r'<h2[^>]*class="post-preview__title"[^>]*>\s*<a href="([^"]+)">([^<]+)</a>',
            block,
            re.S | re.I,
        )
        if not tm:
            tm = re.search(r'<a href="(/blog/[^"]+/)">([^<]+)</a>', block)
        if not tm:
            continue
        href, title = tm.group(1).strip(), unescape(tm.group(2).strip())
        if href.startswith("/"):
            href = "https://collabfund.com" + href
        if href in seen or "/authors/" in href:
            continue
        seen.add(href)
        excerpt = ""
        em = re.search(
            r'class="(?:post-preview__excerpt|post-preview__content|excerpt)"[^>]*>(.*?)</(?:div|p|section)>',
            block,
            re.S | re.I,
        )
        if em:
            excerpt = strip_html(em.group(1))
        if not excerpt:
            paras = re.findall(r"<p[^>]*>(.*?)</p>", block, re.S | re.I)
            for p in paras:
                excerpt = strip_html(p)
                if excerpt:
                    break
        dm = re.search(r'datetime="([^"]+)"', block) or re.search(
            r'class="[^"]*date[^"]*"[^>]*>([^<]+)', block, re.I
        )
        dt = parse_datetime(dm.group(1).strip()) if dm else None
        items.append(
            {
                "title": re.sub(r"\s+", " ", title).strip(),
                "url": href,
                "summary": excerpt,
                "published": dt.isoformat() if dt else "",
                "ts": int(dt.timestamp()) if dt else 0,
                "kind": "newsletter",
                "durationMin": 0,
            }
        )
        if len(items) >= ITEM_LIMIT:
            break
    return items


def fetch_one(spec: dict) -> dict:
    out = {
        "id": spec["id"],
        "name": spec["name"],
        "home": spec["home"],
        "kind": spec["kind"],
        "ok": False,
        "error": None,
        "items": [],
    }
    try:
        raw = http_get(spec["url"])
        if spec.get("mode") == "housel":
            items = scrape_housel(raw.decode("utf-8", errors="replace"))
            if not items:
                # 作者页改版时退到 Collaborative Fund 通讯
                raw = http_get("https://collabfund.substack.com/feed")
                items = parse_feed(raw, "newsletter")
        else:
            items = parse_feed(raw, spec["kind"])
        out["items"] = items
        out["ok"] = bool(items)
        if not items:
            out["error"] = "订阅源无条目"
    except Exception as exc:
        out["error"] = str(exc)
        if spec.get("mode") == "housel":
            try:
                raw = http_get("https://collabfund.substack.com/feed")
                items = parse_feed(raw, "newsletter")
                out["items"] = items
                out["ok"] = bool(items)
                out["error"] = None if items else out["error"]
            except Exception as exc2:
                out["error"] = str(exc2)
    return out


def weekday_cn(dt: datetime) -> str:
    return ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"][dt.weekday()]


CACHE_PATH = ROOT / "digest-i18n-cache.json"
CACHE_LOCK = threading.Lock()
TR_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    )
}
MOON_EN = {
    "新月": "New Moon", "娥眉月": "Waxing Crescent", "上弦月": "First Quarter",
    "盈凸月": "Waxing Gibbous", "满月": "Full Moon", "亏凸月": "Waning Gibbous",
    "下弦月": "Last Quarter", "残月": "Waning Crescent",
}
PLANET_EN = {
    "太阳": "Sun", "月亮": "Moon", "水星": "Mercury", "金星": "Venus", "火星": "Mars",
    "木星": "Jupiter", "土星": "Saturn", "天王星": "Uranus", "海王星": "Neptune", "冥王星": "Pluto",
}
SIGN_EN = {
    "白羊": "Aries", "金牛": "Taurus", "双子": "Gemini", "巨蟹": "Cancer",
    "狮子": "Leo", "处女": "Virgo", "天秤": "Libra", "天蝎": "Scorpio",
    "射手": "Sagittarius", "摩羯": "Capricorn", "水瓶": "Aquarius", "双鱼": "Pisces",
}
ASPECT_EN = {
    "合相": "Conjunction", "六分相": "Sextile", "刑相": "Square",
    "拱相": "Trine", "冲相": "Opposition",
}


def cjk_ratio(text: str) -> float:
    if not text:
        return 0.0
    n = sum(1 for ch in text if "\u4e00" <= ch <= "\u9fff")
    return n / max(1, len(text))


def cache_key(sl: str, tl: str, text: str) -> str:
    digest = hashlib.sha1(f"{sl}|{tl}|{text}".encode("utf-8")).hexdigest()
    return digest


def load_tr_cache() -> dict:
    if not CACHE_PATH.exists():
        return {}
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_tr_cache(cache: dict) -> None:
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")


def parse_tr_payload(raw: str) -> str:
    data = json.loads(raw)
    if isinstance(data, str):
        return data.strip()
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, str):
            return first.strip()
        if isinstance(first, list):
            bits = []
            for part in data[0]:
                if isinstance(part, list) and part and isinstance(part[0], str):
                    bits.append(part[0])
            return "".join(bits).strip()
    if isinstance(data, dict):
        rd = data.get("responseData") or {}
        return str(rd.get("translatedText") or "").strip()
    return ""


def translate_google(text: str, sl: str, tl: str) -> str:
    url = "https://clients5.google.com/translate_a/t?" + urllib.parse.urlencode(
        {"client": "dict-chrome-ex", "sl": sl, "tl": tl, "q": text}
    )
    req = urllib.request.Request(url, headers=TR_HEADERS)
    with urllib.request.urlopen(req, timeout=8, context=SSL_CTX) as resp:
        return parse_tr_payload(resp.read().decode("utf-8", errors="replace"))


def translate_mymemory(text: str, sl: str, tl: str) -> str:
    pair = f"{sl}|{tl}".replace("zh-CN", "zh-CN")
    url = "https://api.mymemory.translated.net/get?" + urllib.parse.urlencode(
        {"q": text[:500], "langpair": pair, "de": "digest@localhost.local"}
    )
    req = urllib.request.Request(url, headers=TR_HEADERS)
    with urllib.request.urlopen(req, timeout=8, context=SSL_CTX) as resp:
        return parse_tr_payload(resp.read().decode("utf-8", errors="replace"))


def translate_text(text: str, sl: str, tl: str, cache: dict) -> str:
    src = (text or "").strip()
    if not src:
        return ""
    if sl.startswith("en") and cjk_ratio(src) >= 0.3:
        return src
    if sl.startswith("zh") and cjk_ratio(src) < 0.08:
        return src
    key = cache_key(sl, tl, src)
    with CACHE_LOCK:
        hit = cache.get(key)
        if isinstance(hit, str) and hit:
            return hit
    last_err = None
    try:
        out = translate_google(src, sl, tl)
        if out:
            with CACHE_LOCK:
                cache[key] = out
            return out
    except Exception as exc:
        last_err = exc
    try:
        out = translate_mymemory(src, sl, tl)
        if out and "MYMEMORY" not in out.upper():
            with CACHE_LOCK:
                cache[key] = out
            return out
    except Exception as exc:
        last_err = exc
    print("  translate fail:", src[:48], last_err, flush=True)
    return src


def load_stars() -> dict:
    path = ROOT / "stars-data.js"
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    i, j = text.find("{"), text.rfind("}")
    if i < 0 or j < 0:
        return {}
    try:
        return json.loads(text[i : j + 1])
    except Exception:
        return {}


def planet_en(name: str) -> str:
    return PLANET_EN.get(name, name)


def sign_label_en(label: str, sign: str) -> str:
    en = SIGN_EN.get(sign or "", "")
    if not label:
        return f"{en} {sign}" if en else sign
    if en:
        return re.sub(r"[\u4e00-\u9fff]+座", en + " ", label).strip()
    return label


def ends_in_en(text: str) -> str:
    if not text:
        return ""
    m = re.search(r"(\d+)\s*天", text)
    if m:
        return f"ends in about {m.group(1)} days"
    if "分离" in text:
        return "separating"
    if "接近" in text:
        return "applying"
    return text


def attach_translations(data: dict) -> dict:
    cache = load_tr_cache()
    jobs: list[tuple[str, str, str]] = []
    seen: set[str] = set()

    def queue(text: str, sl: str, tl: str) -> None:
        src = (text or "").strip()
        if not src:
            return
        key = cache_key(sl, tl, src)
        if key in cache or key in seen:
            return
        seen.add(key)
        jobs.append((src, sl, tl))

    for sec in data.get("sections") or []:
        for feed in sec.get("feeds") or []:
            for item in feed.get("items") or []:
                queue(item.get("title") or "", "en", "zh-CN")
                queue(item.get("summary") or "", "en", "zh-CN")

    stars = load_stars()
    diary = stars.get("diary") or {}
    line = (diary.get("mod1") or {}).get("line") or ""
    blessing = diary.get("blessing") or stars.get("advice") or ""
    advice = stars.get("advice") or ""
    queue(line, "zh-CN", "en")
    queue(blessing, "zh-CN", "en")
    queue(advice, "zh-CN", "en")
    for row in (diary.get("astronomy") or [])[:8]:
        queue(row.get("title") or "", "zh-CN", "en")
        queue(row.get("caption") or row.get("detail") or "", "zh-CN", "en")
    for b in (diary.get("personalSigns") or stars.get("bodies") or [])[:5]:
        queue(b.get("influence") or "", "zh-CN", "en")
    for a in (diary.get("personalAspects") or stars.get("aspects") or [])[:6]:
        queue(a.get("influence") or "", "zh-CN", "en")
    inf = stars.get("influence") or {}
    for key in ("mood", "wealth", "work", "love"):
        queue(inf.get(key) or "", "zh-CN", "en")

    print(f"translating {len(jobs)} strings...", flush=True)
    done = 0

    def run(job: tuple[str, str, str]) -> None:
        src, sl, tl = job
        translate_text(src, sl, tl, cache)

    with ThreadPoolExecutor(max_workers=6) as pool:
        futs = [pool.submit(run, job) for job in jobs]
        for fut in as_completed(futs):
            fut.result()
            done += 1
            if done % 25 == 0 or done == len(jobs):
                save_tr_cache(cache)
                print(f"  translated {done}/{len(jobs)}", flush=True)

    for sec in data.get("sections") or []:
        for feed in sec.get("feeds") or []:
            for item in feed.get("items") or []:
                item["titleZh"] = translate_text(item.get("title") or "", "en", "zh-CN", cache)
                item["summaryZh"] = translate_text(item.get("summary") or "", "en", "zh-CN", cache)

    astro_en = {
        "moonPhase": MOON_EN.get(stars.get("moonPhase") or "", stars.get("moonPhase") or ""),
        "moonLine": translate_text(line, "zh-CN", "en", cache) if line else "",
        "blessing": translate_text(blessing, "zh-CN", "en", cache) if blessing else "",
        "advice": translate_text(advice, "zh-CN", "en", cache) if advice else "",
        "astronomy": [],
        "signs": [],
        "aspects": [],
        "influence": {},
    }
    for row in (diary.get("astronomy") or [])[:8]:
        title = row.get("title") or ""
        cap = row.get("caption") or row.get("detail") or ""
        astro_en["astronomy"].append(
            {
                "title": translate_text(title, "zh-CN", "en", cache) if title else "",
                "caption": translate_text(cap, "zh-CN", "en", cache) if cap else "",
            }
        )
    for b in (diary.get("personalSigns") or stars.get("bodies") or [])[:5]:
        astro_en["signs"].append(
            {
                "name": planet_en(b.get("name") or ""),
                "label": sign_label_en(b.get("label") or "", b.get("sign") or ""),
                "influence": translate_text(b.get("influence") or "", "zh-CN", "en", cache),
            }
        )
    for a in (diary.get("personalAspects") or stars.get("aspects") or [])[:6]:
        astro_en["aspects"].append(
            {
                "a": planet_en(a.get("a") or ""),
                "b": planet_en(a.get("b") or ""),
                "aspect": ASPECT_EN.get(a.get("aspect") or "", a.get("aspect") or ""),
                "tone": a.get("tone") or "blend",
                "influence": translate_text(a.get("influence") or "", "zh-CN", "en", cache),
                "endsIn": ends_in_en(a.get("endsIn") or ""),
            }
        )
    astro_en["influence"] = {
        "mood": translate_text(inf.get("mood") or "", "zh-CN", "en", cache),
        "wealth": translate_text(inf.get("wealth") or "", "zh-CN", "en", cache),
        "work": translate_text(inf.get("work") or "", "zh-CN", "en", cache),
        "love": translate_text(inf.get("love") or "", "zh-CN", "en", cache),
    }
    data["astroEn"] = astro_en
    save_tr_cache(cache)
    return data


def load_saved_digest() -> dict:
    path = ROOT / "digest-data.js"
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    match = re.match(r"window\.DIGEST_DATA = (.*);\s*$", text, re.S)
    if not match:
        return {}
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def keep_previous_items(sections: list[dict], saved: dict) -> list[dict]:
    prev = {}
    for sec in saved.get("sections") or []:
        for feed in sec.get("feeds") or []:
            fid = feed.get("id")
            if fid:
                prev[fid] = feed
    for sec in sections:
        for feed in sec.get("feeds") or []:
            old = prev.get(feed.get("id"))
            if feed.get("items"):
                continue
            if old and old.get("items"):
                feed["items"] = old["items"]
                feed["ok"] = True
                feed["error"] = None
    return sections


def build() -> dict:
    now = datetime.now(TZ)
    jobs = []
    for sec in SECTIONS:
        for feed in sec["feeds"]:
            jobs.append(feed)

    results: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(fetch_one, spec): spec["id"] for spec in jobs}
        for fut in as_completed(futs):
            fid = futs[fut]
            try:
                results[fid] = fut.result()
            except Exception as exc:
                spec = next(s for s in jobs if s["id"] == fid)
                results[fid] = {
                    "id": fid,
                    "name": spec["name"],
                    "home": spec["home"],
                    "kind": spec["kind"],
                    "ok": False,
                    "error": str(exc),
                    "items": [],
                }

    sections = []
    for sec in SECTIONS:
        feeds = [results[f["id"]] for f in sec["feeds"]]
        sections.append(
            {
                "id": sec["id"],
                "name": sec["name"],
                "nameEn": sec.get("nameEn") or sec["name"],
                "kicker": sec["kicker"],
                "feeds": feeds,
            }
        )
    from digest_nativity import build_nativity

    saved = load_saved_digest()
    sections = keep_previous_items(sections, saved)
    nativity = build_nativity(now)
    if saved.get("nativity") and not nativity.get("name"):
        nativity = saved["nativity"]

    return {
        "date": now.strftime("%Y-%m-%d"),
        "weekday": weekday_cn(now),
        "fetchedAt": now.strftime("%Y-%m-%d %H:%M"),
        "freshHours": 36,
        "sections": sections,
        "nativity": nativity,
    }


def write_digest(data: dict, stamp_html: bool = True) -> Path:
    js_path = ROOT / "digest-data.js"
    js_path.write_text(
        "window.DIGEST_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    if stamp_html:
        stamp = datetime.now().strftime("%Y%m%d%H%M%S")
        html_path = ROOT / "digest.html"
        if html_path.exists():
            html = html_path.read_text(encoding="utf-8")
            html = re.sub(
                r'((?:src|href)=")(digest-data\.js|stars-data\.js|digest-ui\.js|digest\.css)(\?v=\d+)?(")',
                rf"\1\2?v={stamp}\4",
                html,
            )
            html_path.write_text(html, encoding="utf-8")
    return js_path


def refresh(stamp_html: bool = True) -> dict:
    data = attach_translations(build())
    write_digest(data, stamp_html=stamp_html)
    return data


def main() -> None:
    print("fetching feeds...", flush=True)
    data = refresh()
    js_path = ROOT / "digest-data.js"
    total = 0
    for sec in data["sections"]:
        print(f"## {sec['name']}")
        for feed in sec["feeds"]:
            n = len(feed["items"])
            total += n
            flag = "ok" if feed["ok"] else "FAIL"
            extra = f"  {feed['error']}" if feed.get("error") else ""
            print(f"  [{flag}] {feed['name']}: {n}{extra}")
            if feed["items"]:
                print(f"       · {feed['items'][0]['title'][:72]}")
    print(f"wrote {js_path}  items={total}  {data['fetchedAt']}")


if __name__ == "__main__":
    main()
