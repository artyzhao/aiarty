#!/usr/bin/env python3
"""Daily classical (Hellenistic / whole-sign) nativity for 每日精选.

Birth data are public Rodden-rated facts, mainly Astro-Databank AA/A.
The write-up follows traditional technique (sect, domicile, exaltation,
whole-sign houses, Lot of Fortune) and is original — not copied from a
copyrighted delineation. Always cite the databank page.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fetch_stars import PLANET_EL, ang_sep, cosd, lons_at, norm360, sind, to_jd

ZODIAC = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"]
ZODIAC_EN = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]
DOMICILE = {
    "白羊": "火星", "天蝎": "火星",
    "金牛": "金星", "天秤": "金星",
    "双子": "水星", "处女": "水星",
    "巨蟹": "月亮", "狮子": "太阳",
    "射手": "木星", "双鱼": "木星",
    "摩羯": "土星", "水瓶": "土星",
}
EXALT = {
    "白羊": "太阳", "金牛": "月亮", "巨蟹": "木星",
    "处女": "水星", "天秤": "土星", "摩羯": "火星", "双鱼": "金星",
}
FALL = {sign: planet for sign, planet in {
    "天秤": "太阳", "天蝎": "月亮", "摩羯": "木星",
    "双鱼": "水星", "白羊": "土星", "巨蟹": "火星", "处女": "金星",
}.items()}
TRAD_BODIES = ["太阳", "月亮", "水星", "金星", "火星", "木星", "土星"]
GLYPH = {"太阳": "☉", "月亮": "☽", "水星": "☿", "金星": "♀", "火星": "♂", "木星": "♃", "土星": "♄"}
PLANET_EN = {
    "太阳": "Sun", "月亮": "Moon", "水星": "Mercury", "金星": "Venus",
    "火星": "Mars", "木星": "Jupiter", "土星": "Saturn",
}
ASPECT_EN = {"合相": "conjunction", "六分相": "sextile", "刑相": "square", "拱相": "trine", "冲相": "opposition"}
DIGNITY_EN = {"入庙": "domicile", "擢升": "exaltation", "落陷": "fall", "失势": "detriment"}
HOUSE_ZH = {
    1: "命宫", 2: "财帛", 3: "兄弟", 4: "田宅", 5: "子女", 6: "疾病",
    7: "夫妻", 8: "疾厄", 9: "迁移", 10: "官禄", 11: "福德", 12: "玄秘",
}
HOUSE_EN = {
    1: "the 1st (life/body)", 2: "the 2nd (livelihood)", 3: "the 3rd (siblings/short trips)",
    4: "the 4th (home/parents)", 5: "the 5th (children/creation)", 6: "the 6th (toil/illness)",
    7: "the 7th (partners)", 8: "the 8th (shared resources)", 9: "the 9th (travel/doctrine)",
    10: "the 10th (action/reputation)", 11: "the 11th (friends/gains)", 12: "the 12th (withdrawal)",
}
ASPECTS = (("合相", 0, 8), ("六分相", 60, 5), ("刑相", 90, 6), ("拱相", 120, 6), ("冲相", 180, 8))

# Public AA/A birth data (local civil time + IANA tz, or LMT via longitude).
# source: Astro-Databank page URL.
PEOPLE = [
    {
        "id": "einstein",
        "name": "阿尔伯特·爱因斯坦",
        "nameEn": "Albert Einstein",
        "role": "物理学家",
        "roleEn": "Physicist",
        "local": "1879-03-14T11:30:00",
        "tz": "Europe/Berlin",
        "place": "乌尔姆，德国",
        "placeEn": "Ulm, Germany",
        "lat": 48.401, "lon": 9.987,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Einstein,_Albert",
        "sourceName": "Astro-Databank",
        "bio": "狭义与广义相对论的提出者。出生时间取自乌尔姆出生登记，Astro-Databank 评为 AA。",
        "bioEn": "Originator of special and general relativity. Birth time from the Ulm civil register (Rodden AA).",
    },
    {
        "id": "curie",
        "name": "玛丽·居里",
        "nameEn": "Marie Curie",
        "role": "物理学家、化学家",
        "roleEn": "Physicist and chemist",
        "local": "1867-11-07T12:00:00",
        "tz": "Europe/Warsaw",
        "place": "华沙，波兰",
        "placeEn": "Warsaw, Poland",
        "lat": 52.230, "lon": 21.011,
        "rating": "A",
        "source": "https://www.astro.com/astro-databank/Curie,_Marie",
        "sourceName": "Astro-Databank",
        "bio": "两度诺贝尔奖得主。出生记录给出中午时分，Astro-Databank 评为 A。",
        "bioEn": "Two-time Nobel laureate. Birth record gives noon; Rodden rating A.",
    },
    {
        "id": "jung",
        "name": "卡尔·荣格",
        "nameEn": "Carl Gustav Jung",
        "role": "分析心理学家",
        "roleEn": "Analytical psychologist",
        "local": "1875-07-26T19:20:00",
        "tz": "Europe/Zurich",
        "place": "凯斯维尔，瑞士",
        "placeEn": "Kesswil, Switzerland",
        "lat": 47.593, "lon": 9.339,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Jung,_Carl",
        "sourceName": "Astro-Databank",
        "bio": "分析心理学创立者。瑞士出生登记 19:20，Astro-Databank 评为 AA。",
        "bioEn": "Founder of analytical psychology. Swiss civil register 19:20 (Rodden AA).",
    },
    {
        "id": "kahlo",
        "name": "弗里达·卡罗",
        "nameEn": "Frida Kahlo",
        "role": "画家",
        "roleEn": "Painter",
        "local": "1907-07-06T08:30:00",
        "tz": "America/Mexico_City",
        "place": "科约阿坎，墨西哥",
        "placeEn": "Coyoacán, Mexico",
        "lat": 19.350, "lon": -99.162,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Kahlo,_Frida",
        "sourceName": "Astro-Databank",
        "bio": "墨西哥画家。出生证明 8:30，Astro-Databank 评为 AA。",
        "bioEn": "Mexican painter. Birth certificate 8:30 (Rodden AA).",
    },
    {
        "id": "picasso",
        "name": "巴勃罗·毕加索",
        "nameEn": "Pablo Picasso",
        "role": "画家",
        "roleEn": "Painter",
        "local": "1881-10-25T23:15:00",
        "tz": "Europe/Madrid",
        "place": "马拉加，西班牙",
        "placeEn": "Málaga, Spain",
        "lat": 36.721, "lon": -4.421,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Picasso,_Pablo",
        "sourceName": "Astro-Databank",
        "bio": "立体主义代表人物。马拉加出生登记 23:15，Astro-Databank 评为 AA。",
        "bioEn": "A leading Cubist. Málaga civil register 23:15 (Rodden AA).",
    },
    {
        "id": "woolf",
        "name": "弗吉尼亚·伍尔夫",
        "nameEn": "Virginia Woolf",
        "role": "作家",
        "roleEn": "Writer",
        "local": "1882-01-25T12:15:00",
        "tz": "Europe/London",
        "place": "伦敦，英国",
        "placeEn": "London, England",
        "lat": 51.507, "lon": -0.128,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Woolf,_Virginia",
        "sourceName": "Astro-Databank",
        "bio": "意识流小说家。家庭记录 12:15，Astro-Databank 评为 AA。",
        "bioEn": "Novelist of the stream of consciousness. Family record 12:15 (Rodden AA).",
    },
    {
        "id": "lovelace",
        "name": "艾达·洛夫莱斯",
        "nameEn": "Ada Lovelace",
        "role": "数学家",
        "roleEn": "Mathematician",
        "local": "1815-12-10T13:00:00",
        "tz": "Europe/London",
        "place": "伦敦，英国",
        "placeEn": "London, England",
        "lat": 51.507, "lon": -0.128,
        "rating": "A",
        "source": "https://www.astro.com/astro-databank/Lovelace,_Ada",
        "sourceName": "Astro-Databank",
        "bio": "早期计算思想的写下者。出生时间取自家族记载，Astro-Databank 评为 A。",
        "bioEn": "Early writer on computing. Family record; Rodden rating A.",
    },
    {
        "id": "turing",
        "name": "艾伦·图灵",
        "nameEn": "Alan Turing",
        "role": "数学家、密码学家",
        "roleEn": "Mathematician and cryptanalyst",
        "local": "1912-06-23T02:15:00",
        "tz": "Europe/London",
        "place": "伦敦，英国",
        "placeEn": "London, England",
        "lat": 51.529, "lon": -0.185,
        "rating": "A",
        "source": "https://www.astro.com/astro-databank/Turing,_Alan",
        "sourceName": "Astro-Databank",
        "bio": "现代计算理论先驱。出生记录约 2:15，Astro-Databank 评为 A。",
        "bioEn": "Pioneer of computing theory. Birth record about 2:15 (Rodden A).",
    },
    {
        "id": "nightingale",
        "name": "弗洛伦斯·南丁格尔",
        "nameEn": "Florence Nightingale",
        "role": "护士、统计学家",
        "roleEn": "Nurse and statistician",
        "local": "1820-05-12T13:00:00",
        "tz": "Europe/Rome",
        "place": "佛罗伦萨，意大利",
        "placeEn": "Florence, Italy",
        "lat": 43.770, "lon": 11.254,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Nightingale,_Florence",
        "sourceName": "Astro-Databank",
        "bio": "现代护理先驱，并非舞台名人。佛罗伦萨出生记录 13:00，Astro-Databank 评为 AA。",
        "bioEn": "Founder of modern nursing — not a stage celebrity. Florence civil time 13:00 (Rodden AA).",
    },
    {
        "id": "carson",
        "name": "蕾切尔·卡森",
        "nameEn": "Rachel Carson",
        "role": "海洋生物学家、作家",
        "roleEn": "Marine biologist and writer",
        "local": "1907-05-27T02:00:00",
        "tz": "America/New_York",
        "place": "斯普林代尔，美国",
        "placeEn": "Springdale, Pennsylvania",
        "lat": 40.541, "lon": -79.784,
        "rating": "A",
        "source": "https://www.astro.com/astro-databank/Carson,_Rachel",
        "sourceName": "Astro-Databank",
        "bio": "《寂静的春天》作者，职业科学家。出生时间取自传记记载，Astro-Databank 评为 A。",
        "bioEn": "Author of Silent Spring, a working scientist. Biography time; Rodden A.",
    },
    {
        "id": "jobs",
        "name": "史蒂夫·乔布斯",
        "nameEn": "Steve Jobs",
        "role": "企业家",
        "roleEn": "Entrepreneur",
        "local": "1955-02-24T19:15:00",
        "tz": "America/Los_Angeles",
        "place": "旧金山，美国",
        "placeEn": "San Francisco, USA",
        "lat": 37.775, "lon": -122.419,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Jobs,_Steve",
        "sourceName": "Astro-Databank",
        "bio": "苹果公司联合创始人。出生证明 19:15，Astro-Databank 评为 AA。",
        "bioEn": "Co-founder of Apple. Birth certificate 19:15 (Rodden AA).",
    },
    {
        "id": "oprah",
        "name": "奥普拉·温弗瑞",
        "nameEn": "Oprah Winfrey",
        "role": "媒体人",
        "roleEn": "Broadcaster",
        "local": "1954-01-29T19:28:00",
        "tz": "America/Chicago",
        "place": "科修斯科，美国",
        "placeEn": "Kosciusko, Mississippi",
        "lat": 33.058, "lon": -89.587,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Winfrey,_Oprah",
        "sourceName": "Astro-Databank",
        "bio": "脱口秀主持人与制作人。出生证明 19:28，Astro-Databank 评为 AA。",
        "bioEn": "Talk-show host and producer. Birth certificate 19:28 (Rodden AA).",
    },
    {
        "id": "obama",
        "name": "贝拉克·奥巴马",
        "nameEn": "Barack Obama",
        "role": "美国前总统",
        "roleEn": "Former U.S. president",
        "local": "1961-08-04T19:24:00",
        "tz": "Pacific/Honolulu",
        "place": "檀香山，美国",
        "placeEn": "Honolulu, Hawaii",
        "lat": 21.307, "lon": -157.858,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Obama,_Barack",
        "sourceName": "Astro-Databank",
        "bio": "美国第 44 任总统。夏威夷出生证明 19:24，Astro-Databank 评为 AA。",
        "bioEn": "44th president of the United States. Hawaiʻi birth certificate 19:24 (Rodden AA).",
    },
    {
        "id": "merkel",
        "name": "安格拉·默克尔",
        "nameEn": "Angela Merkel",
        "role": "德国前总理",
        "roleEn": "Former German chancellor",
        "local": "1954-07-17T18:00:00",
        "tz": "Europe/Berlin",
        "place": "汉堡，德国",
        "placeEn": "Hamburg, Germany",
        "lat": 53.551, "lon": 9.993,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Merkel,_Angela",
        "sourceName": "Astro-Databank",
        "bio": "德国前总理、物理学家出身。出生记录 18:00，Astro-Databank 评为 AA。",
        "bioEn": "Former chancellor of Germany, trained as a physicist. Birth record 18:00 (Rodden AA).",
    },
    {
        "id": "brucelee",
        "name": "李小龙",
        "nameEn": "Bruce Lee",
        "role": "武术家、演员",
        "roleEn": "Martial artist and actor",
        "local": "1940-11-27T07:12:00",
        "tz": "America/Los_Angeles",
        "place": "旧金山，美国",
        "placeEn": "San Francisco, USA",
        "lat": 37.775, "lon": -122.419,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Lee,_Bruce",
        "sourceName": "Astro-Databank",
        "bio": "武术家与演员。旧金山出生证明 7:12，Astro-Databank 评为 AA。",
        "bioEn": "Martial artist and actor. San Francisco birth certificate 7:12 (Rodden AA).",
    },
    {
        "id": "hepburn",
        "name": "奥黛丽·赫本",
        "nameEn": "Audrey Hepburn",
        "role": "演员",
        "roleEn": "Actor",
        "local": "1929-05-04T03:00:00",
        "tz": "Europe/Brussels",
        "place": "伊克塞尔，比利时",
        "placeEn": "Ixelles, Belgium",
        "lat": 50.833, "lon": 4.367,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Hepburn,_Audrey",
        "sourceName": "Astro-Databank",
        "bio": "演员与 UNICEF 特使。比利时出生记录 3:00，Astro-Databank 评为 AA。",
        "bioEn": "Actor and UNICEF envoy. Belgian birth record 3:00 (Rodden AA).",
    },
    {
        "id": "bowie",
        "name": "大卫·鲍伊",
        "nameEn": "David Bowie",
        "role": "音乐人",
        "roleEn": "Musician",
        "local": "1947-01-08T09:00:00",
        "tz": "Europe/London",
        "place": "布里克斯顿，英国",
        "placeEn": "Brixton, England",
        "lat": 51.461, "lon": -0.116,
        "rating": "A",
        "source": "https://www.astro.com/astro-databank/Bowie,_David",
        "sourceName": "Astro-Databank",
        "bio": "英国音乐人。母亲回忆约 9:00，Astro-Databank 评为 A。",
        "bioEn": "English musician. Mother’s memory of about 9:00 (Rodden A).",
    },
    {
        "id": "lennon",
        "name": "约翰·列侬",
        "nameEn": "John Lennon",
        "role": "音乐人",
        "roleEn": "Musician",
        "local": "1940-10-09T18:30:00",
        "tz": "Europe/London",
        "place": "利物浦，英国",
        "placeEn": "Liverpool, England",
        "lat": 53.408, "lon": -2.992,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Lennon,_John",
        "sourceName": "Astro-Databank",
        "bio": "披头士成员。利物浦出生证明 18:30，Astro-Databank 评为 AA。",
        "bioEn": "Member of the Beatles. Liverpool birth certificate 18:30 (Rodden AA).",
    },
    {
        "id": "tesla",
        "name": "尼古拉·特斯拉",
        "nameEn": "Nikola Tesla",
        "role": "发明家",
        "roleEn": "Inventor",
        "local": "1856-07-10T00:00:00",
        "tz": "Europe/Belgrade",
        "place": "斯米良，克罗地亚",
        "placeEn": "Smiljan, Croatia",
        "lat": 44.566, "lon": 15.318,
        "rating": "A",
        "source": "https://www.astro.com/astro-databank/Tesla,_Nikola",
        "sourceName": "Astro-Databank",
        "bio": "交流电与感应电机先驱。家族记载为午夜，Astro-Databank 评为 A。",
        "bioEn": "Pioneer of AC power. Family record of midnight (Rodden A).",
    },
    {
        "id": "beauvoir",
        "name": "西蒙娜·德·波伏瓦",
        "nameEn": "Simone de Beauvoir",
        "role": "哲学家、作家",
        "roleEn": "Philosopher and writer",
        "local": "1908-01-09T04:00:00",
        "tz": "Europe/Paris",
        "place": "巴黎，法国",
        "placeEn": "Paris, France",
        "lat": 48.857, "lon": 2.351,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Beauvoir,_Simone_de",
        "sourceName": "Astro-Databank",
        "bio": "存在主义与女性主义重要作者。巴黎出生记录 4:00，Astro-Databank 评为 AA。",
        "bioEn": "Existentialist and feminist writer. Paris birth record 4:00 (Rodden AA).",
    },
    {
        "id": "luxun",
        "name": "鲁迅",
        "nameEn": "Lu Xun",
        "role": "作家",
        "roleEn": "Writer",
        "local": "1881-09-25T01:00:00",
        "tz": "Asia/Shanghai",
        "place": "绍兴，中国",
        "placeEn": "Shaoxing, China",
        "lat": 30.002, "lon": 120.581,
        "rating": "A",
        "source": "https://www.astro.com/astro-databank/Lu_Xun",
        "sourceName": "Astro-Databank",
        "bio": "中国现代文学代表作家。传记记载约凌晨 1 时，Astro-Databank 评为 A。",
        "bioEn": "Central figure of modern Chinese literature. Biography time about 1:00 (Rodden A).",
    },
    {
        "id": "swift",
        "name": "泰勒·斯威夫特",
        "nameEn": "Taylor Swift",
        "role": "音乐人",
        "roleEn": "Musician",
        "local": "1989-12-13T08:36:00",
        "tz": "America/New_York",
        "place": "雷丁，美国",
        "placeEn": "Reading, Pennsylvania",
        "lat": 40.336, "lon": -75.927,
        "rating": "AA",
        "source": "https://www.astro.com/astro-databank/Swift,_Taylor",
        "sourceName": "Astro-Databank",
        "bio": "流行音乐人。出生证明 8:36，Astro-Databank 评为 AA。",
        "bioEn": "Popular musician. Birth certificate 8:36 (Rodden AA).",
    },
]


def sign_of(lon: float) -> tuple[str, float, int]:
    lon = norm360(lon)
    idx = int(lon // 30) % 12
    return ZODIAC[idx], lon % 30, idx


def sign_en(zh: str) -> str:
    return ZODIAC_EN[ZODIAC.index(zh)] if zh in ZODIAC else zh


def fmt_pos(lon: float) -> str:
    sign, deg, _ = sign_of(lon)
    d = int(deg)
    m = int(round((deg - d) * 60))
    if m == 60:
        d += 1
        m = 0
    return f"{sign} {d}°{m:02d}′"


def fmt_pos_en(lon: float) -> str:
    sign, deg, _ = sign_of(lon)
    d = int(deg)
    m = int(round((deg - d) * 60))
    if m == 60:
        d += 1
        m = 0
    return f"{sign_en(sign)} {d}°{m:02d}′"


def whole_house(body_lon: float, asc_lon: float) -> int:
    _, _, b = sign_of(body_lon)
    _, _, a = sign_of(asc_lon)
    return (b - a) % 12 + 1


def obliquity(jd: float) -> float:
    t = (jd - 2451545.0) / 36525.0
    return 23.439291 - 0.0130042 * t


def gmst_deg(jd: float) -> float:
    t = (jd - 2451545.0) / 36525.0
    return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t)


def ascendant(lst: float, lat: float, eps: float) -> float:
    ramc = lst
    y = cosd(ramc)
    x = -(sind(ramc) * cosd(eps) + math.tan(math.radians(lat)) * sind(eps))
    return norm360(math.degrees(math.atan2(y, x)))


def midheaven(lst: float, eps: float) -> float:
    ramc = lst
    y = sind(ramc)
    x = cosd(ramc) * cosd(eps)
    return norm360(math.degrees(math.atan2(y, x)))


def birth_utc(person: dict) -> datetime:
    naive = datetime.fromisoformat(person["local"])
    tzname = person.get("tz") or "UTC"
    if tzname == "LMT":
        delta = timedelta(hours=person["lon"] / 15.0)
        return naive.replace(tzinfo=timezone.utc) - delta
    return naive.replace(tzinfo=ZoneInfo(tzname)).astimezone(timezone.utc)


def dignity(name: str, sign: str) -> str:
    if DOMICILE.get(sign) == name:
        return "入庙"
    if EXALT.get(sign) == name:
        return "擢升"
    if FALL.get(sign) == name:
        return "落陷"
    for home, lord in DOMICILE.items():
        if lord == name:
            opp = ZODIAC[(ZODIAC.index(home) + 6) % 12]
            if sign == opp:
                return "失势"
    return ""


def pick_person(day: datetime) -> dict:
    key = int(day.strftime("%Y%j"))
    return PEOPLE[key % len(PEOPLE)]


def lot_of_fortune(asc: float, sun: float, moon: float, day_sect: bool) -> float:
    if day_sect:
        return norm360(asc + moon - sun)
    return norm360(asc + sun - moon)


def major_aspects(lons: dict[str, float]) -> list[dict]:
    names = TRAD_BODIES
    out = []
    for i, a in enumerate(names):
        for b in names[i + 1 :]:
            sep = ang_sep(lons[a], lons[b])
            for label, exact, orb in ASPECTS:
                if abs(sep - exact) <= orb:
                    out.append({"a": a, "b": b, "aspect": label, "orb": round(abs(sep - exact), 1)})
                    break
    tense = {"刑相", "冲相"}
    out.sort(key=lambda x: (0 if x["aspect"] in tense else 1, x["orb"]))
    return out[:6]


def analyze(person: dict, bodies: list[dict], asc: float, mc: float, day_sect: bool, fortune: float, aspects: list[dict]) -> dict:
    by = {b["name"]: b for b in bodies}
    sun, moon = by["太阳"], by["月亮"]
    asc_sign, _, _ = sign_of(asc)
    ruler = DOMICILE[asc_sign]
    ruler_b = by[ruler]
    fort_h = whole_house(fortune, asc)
    sect_zh = "昼生盘" if day_sect else "夜生盘"
    sect_en = "a day chart" if day_sect else "a night chart"
    lum = sun if day_sect else moon
    other = moon if day_sect else sun

    findings_zh = []
    findings_en = []

    findings_zh.append(
        f"此为{sect_zh}。命主星为上升{asc_sign}的庙主{ruler}，落在第{ruler_b['house']}宫（{HOUSE_ZH[ruler_b['house']]}）{ruler_b['sign']}。"
        + (f"{ruler}{ruler_b['dignity']}，力量较整。" if ruler_b["dignity"] in ("入庙", "擢升") else "")
        + (f"{ruler}{ruler_b['dignity']}，行事需多一层约束。" if ruler_b["dignity"] in ("落陷", "失势") else "")
    )
    findings_en.append(
        f"This is {sect_en}. The chart ruler is {PLANET_EN[ruler]}, domicile lord of the {sign_en(asc_sign)} Ascendant, "
        f"placed in {HOUSE_EN[ruler_b['house']]} in {sign_en(ruler_b['sign'])}."
        + (
            f" {PLANET_EN[ruler]} is in {DIGNITY_EN[ruler_b['dignity']]}, a stronger condition."
            if ruler_b["dignity"] in ("入庙", "擢升")
            else ""
        )
        + (
            f" {PLANET_EN[ruler]} is in {DIGNITY_EN[ruler_b['dignity']]}, so the native works under more constraint."
            if ruler_b["dignity"] in ("落陷", "失势")
            else ""
        )
    )

    findings_zh.append(
        f"日光在{sun['sign']}第{sun['house']}宫，月亮在{moon['sign']}第{moon['house']}宫。"
        f"昼星以太阳为证，夜星以月亮为证：本盘见证星为{lum['name']}，在第{lum['house']}宫说话更响；另一光体{other['name']}则偏辅助。"
    )
    findings_en.append(
        f"The Sun is in {sign_en(sun['sign'])} in house {sun['house']}, the Moon in {sign_en(moon['sign'])} in house {moon['house']}. "
        f"The luminary of sect is the {PLANET_EN[lum['name']]}, which speaks more loudly from house {lum['house']}."
    )

    if day_sect and sun["house"] in (9, 10, 11):
        findings_zh.append("太阳在九、十或十一宫，古典上利于公开名声、远行与同道；事业线往往走得见光。")
        findings_en.append("A sect-light Sun in the 9th, 10th or 11th favours visible work, travel of the mind, and allies.")
    elif not day_sect and moon["house"] in (1, 3, 4, 7):
        findings_zh.append("夜盘月亮落在一、三、四或七宫，情绪与亲近关系会成为命运的主战场，决定比宣言更重要。")
        findings_en.append("A night-chart Moon in 1, 3, 4 or 7 makes mood and close bonds the main field of fate.")
    else:
        topic = HOUSE_ZH[lum["house"]]
        findings_zh.append(f"见证星落在{topic}，一生较容易在「{topic}」这一主题上被看见、也容易在这里消耗。")
        findings_en.append(
            f"The luminary of sect falls in {HOUSE_EN[lum['house']]}, so that topic both reveals and spends the native."
        )

    tense = [a for a in aspects if a["aspect"] in ("刑相", "冲相")]
    easy = [a for a in aspects if a["aspect"] in ("拱相", "六分相")]
    if tense:
        a = tense[0]
        findings_zh.append(
            f"紧张主轴是{a['a']}与{a['b']}的{a['aspect']}（误差约{a['orb']}°），古典上这是需要时间炼的角力，而不是性格缺陷。"
        )
        findings_en.append(
            f"The main tension is a {ASPECT_EN[a['aspect']]} of {PLANET_EN[a['a']]} and {PLANET_EN[a['b']]} (orb {a['orb']}°): in the old texts this is work to be tempered, not a flaw of character."
        )
    if easy:
        a = easy[0]
        findings_zh.append(
            f"支持来自{a['a']}与{a['b']}的{a['aspect']}，做事时这两颗星的主题容易互相借力。"
        )
        findings_en.append(
            f"Support comes from a {ASPECT_EN[a['aspect']]} of {PLANET_EN[a['a']]} and {PLANET_EN[a['b']]}; those two topics lend each other a hand."
        )

    findings_zh.append(
        f"福点在第{fort_h}宫（{HOUSE_ZH[fort_h]}）。希腊化传统里，福点所在宫显示身体运气与资源从何处来；本盘更宜从「{HOUSE_ZH[fort_h]}」一途积累。"
    )
    findings_en.append(
        f"The Lot of Fortune falls in {HOUSE_EN[fort_h]}. In the Hellenistic scheme that house shows where bodily luck and means accrue."
    )

    technique_zh = (
        "技法取希腊化／传统占星：整宫制、昼夜盘、庙旺落陷、福点。论述依盘推演，"
        "不是某专栏的逐字转载。出生数据见 Astro-Databank（Rodden 评级）。"
        "可对照 Chris Brennan《Hellenistic Astrology》、德博拉·霍尔丁 Skyscript 的传统宫主与尊贵表。"
    )
    technique_en = (
        "Technique: Hellenistic / traditional — whole-sign houses, sect, essential dignity, Lot of Fortune. "
        "The notes are computed from the chart, not copied from a column. Birth data: Astro-Databank (Rodden rating). "
        "See Chris Brennan, Hellenistic Astrology, and Deb Houlding’s dignity tables on Skyscript."
    )
    return {
        "findingsZh": findings_zh[:5],
        "findingsEn": findings_en[:5],
        "techniqueZh": technique_zh,
        "techniqueEn": technique_en,
        "ascSign": asc_sign,
        "ruler": ruler,
        "sectZh": sect_zh,
        "sectEn": sect_en,
        "fortuneHouse": fort_h,
    }


def svg_wheel(asc: float, bodies: list[dict]) -> str:
    cx = cy = 160
    r_out, r_in, r_pl = 148, 118, 92
    parts = [
        f'<svg viewBox="0 0 320 320" class="nat-svg" role="img" aria-label="natal chart">',
        f'<circle cx="{cx}" cy="{cy}" r="{r_out}" fill="#fff" stroke="#111" stroke-width="1.4"/>',
        f'<circle cx="{cx}" cy="{cy}" r="{r_in}" fill="none" stroke="#111" stroke-width="1"/>',
        f'<circle cx="{cx}" cy="{cy}" r="28" fill="none" stroke="#ccc" stroke-width="0.8"/>',
    ]
    for i in range(12):
        lon0 = i * 30
        ang = math.radians(180 - lon0)
        x1, y1 = cx + r_in * math.cos(ang), cy - r_in * math.sin(ang)
        x2, y2 = cx + r_out * math.cos(ang), cy - r_out * math.sin(ang)
        parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#111" stroke-width="0.8"/>')
        mid = math.radians(180 - (lon0 + 15))
        tx = cx + (r_in + 14) * math.cos(mid)
        ty = cy - (r_in + 14) * math.sin(mid)
        parts.append(
            f'<text x="{tx:.1f}" y="{ty:.1f}" text-anchor="middle" dominant-baseline="middle" '
            f'font-size="9" fill="#111">{ZODIAC[i][:1]}</text>'
        )
    # ASC line
    a = math.radians(180 - asc)
    parts.append(
        f'<line x1="{cx + 28 * math.cos(a):.1f}" y1="{cy - 28 * math.sin(a):.1f}" '
        f'x2="{cx + r_out * math.cos(a):.1f}" y2="{cy - r_out * math.sin(a):.1f}" '
        f'stroke="#e07000" stroke-width="1.6"/>'
    )
    used = {}
    for b in bodies:
        key = int(round(b["lon"] / 8))
        bump = used.get(key, 0)
        used[key] = bump + 1
        ang = math.radians(180 - b["lon"])
        rr = r_pl - bump * 12
        x, y = cx + rr * math.cos(ang), cy - rr * math.sin(ang)
        parts.append(
            f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" dominant-baseline="middle" '
            f'font-size="13" fill="#111">{GLYPH[b["name"]]}</text>'
        )
    parts.append(
        f'<text x="{cx}" y="{cy + 4}" text-anchor="middle" font-size="9" fill="#6b6b6b">ASC</text>'
    )
    parts.append("</svg>")
    return "".join(parts)


def compute(person: dict) -> dict:
    utc = birth_utc(person)
    jd = to_jd(utc)
    lons = lons_at(utc)
    eps = obliquity(jd)
    lst = norm360(gmst_deg(jd) + person["lon"])
    asc = ascendant(lst, person["lat"], eps)
    mc = midheaven(lst, eps)
    sun_h = whole_house(lons["太阳"], asc)
    day_sect = sun_h >= 7
    bodies = []
    for name in TRAD_BODIES:
        lon = lons[name]
        sign, deg, _ = sign_of(lon)
        bodies.append({
            "name": name,
            "lon": round(lon, 2),
            "sign": sign,
            "signEn": sign_en(sign),
            "deg": round(deg, 1),
            "label": fmt_pos(lon),
            "labelEn": fmt_pos_en(lon),
            "house": whole_house(lon, asc),
            "dignity": dignity(name, sign),
            "dignityEn": DIGNITY_EN.get(dignity(name, sign), ""),
            "glyph": GLYPH[name],
        })
    fortune = lot_of_fortune(asc, lons["太阳"], lons["月亮"], day_sect)
    aspects = major_aspects(lons)
    note = analyze(person, bodies, asc, mc, day_sect, fortune, aspects)
    local = datetime.fromisoformat(person["local"])
    return {
        "id": person["id"],
        "name": person["name"],
        "nameEn": person["nameEn"],
        "role": person["role"],
        "roleEn": person["roleEn"],
        "bio": person["bio"],
        "bioEn": person["bioEn"],
        "place": person["place"],
        "placeEn": person["placeEn"],
        "rating": person["rating"],
        "source": person["source"],
        "sourceName": person["sourceName"],
        "birthLocal": local.strftime("%Y-%m-%d %H:%M"),
        "tz": person["tz"],
        "asc": round(asc, 2),
        "ascLabel": fmt_pos(asc),
        "ascLabelEn": fmt_pos_en(asc),
        "mcLabel": fmt_pos(mc),
        "mcLabelEn": fmt_pos_en(mc),
        "sectZh": note["sectZh"],
        "sectEn": note["sectEn"],
        "ruler": note["ruler"],
        "fortuneHouse": note["fortuneHouse"],
        "fortuneLabel": HOUSE_ZH[note["fortuneHouse"]],
        "fortuneLabelEn": HOUSE_EN[note["fortuneHouse"]],
        "bodies": bodies,
        "aspects": aspects,
        "findingsZh": note["findingsZh"],
        "findingsEn": note["findingsEn"],
        "techniqueZh": note["techniqueZh"],
        "techniqueEn": note["techniqueEn"],
        "svg": svg_wheel(asc, bodies),
        "houseSystem": "整宫制 Whole-sign",
    }


def build_nativity(now: datetime) -> dict:
    person = pick_person(now)
    data = compute(person)
    data["date"] = now.strftime("%Y-%m-%d")
    return data
