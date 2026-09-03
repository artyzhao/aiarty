#!/usr/bin/env python3
"""Compute today's sky for 星星日历 and write stars-data.js."""

from __future__ import annotations

import json
import math
import random
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
TZ = ZoneInfo("Asia/Shanghai")

WEEKDAYS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
ZODIAC = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"]
MONTH_CN = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"]
DAY_CN = [
    "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
]

# 1900–2100 lunar bit table (jjonline)
LUNAR_INFO = [
    0x04BD8, 0x04AE0, 0x0A570, 0x054D5, 0x0D260, 0x0D950, 0x16554, 0x056A0, 0x09AD0, 0x055D2,
    0x04AE0, 0x0A5B6, 0x0A4D0, 0x0D250, 0x1D255, 0x0B540, 0x0D6A0, 0x0ADA2, 0x095B0, 0x14977,
    0x04970, 0x0A4B0, 0x0B4B5, 0x06A50, 0x06D40, 0x1AB54, 0x02B60, 0x09570, 0x052F2, 0x04970,
    0x06566, 0x0D4A0, 0x0EA50, 0x06E95, 0x05AD0, 0x02B60, 0x186E3, 0x092E0, 0x1C8D7, 0x0C950,
    0x0D4A0, 0x1D8A6, 0x0B550, 0x056A0, 0x1A5B4, 0x025D0, 0x092D0, 0x0D2B2, 0x0A950, 0x0B557,
    0x06CA0, 0x0B550, 0x15355, 0x04DA0, 0x0A5B0, 0x14573, 0x052B0, 0x0A9A8, 0x0E950, 0x06AA0,
    0x0AEA6, 0x0AB50, 0x04B60, 0x0AAE4, 0x0A570, 0x05260, 0x0F263, 0x0D950, 0x05B57, 0x056A0,
    0x096D0, 0x04DD5, 0x04AD0, 0x0A4D0, 0x0D4D4, 0x0D250, 0x0D558, 0x0B540, 0x0B6A0, 0x195A6,
    0x095B0, 0x049B0, 0x0A974, 0x0A4B0, 0x0B27A, 0x06A50, 0x06D40, 0x0AF46, 0x0AB60, 0x09570,
    0x04AF5, 0x04970, 0x064B0, 0x074A3, 0x0EA50, 0x06B58, 0x05AC0, 0x0AB60, 0x096D5, 0x092E0,
    0x0C960, 0x0D954, 0x0D4A0, 0x0DA50, 0x07552, 0x056A0, 0x0ABB7, 0x025D0, 0x092D0, 0x0CAB5,
    0x0A950, 0x0B4A0, 0x0BAA4, 0x0AD50, 0x055D9, 0x04BA0, 0x0A5B0, 0x15176, 0x052B0, 0x0A930,
    0x07954, 0x06AA0, 0x0AD50, 0x05B52, 0x04B60, 0x0A6E6, 0x0A4E0, 0x0D260, 0x0EA65, 0x0D530,
    0x05AA0, 0x076A3, 0x096D0, 0x04AFB, 0x04AD0, 0x0A4D0, 0x1D0B6, 0x0D250, 0x0D520, 0x0DD45,
    0x0B5A0, 0x056D0, 0x055B2, 0x049B0, 0x0A577, 0x0A4B0, 0x0AA50, 0x1B255, 0x06D20, 0x0ADA0,
    0x14B63, 0x09370, 0x049F8, 0x04970, 0x064B0, 0x168A6, 0x0EA50, 0x06B20, 0x1A6C4, 0x0AAE0,
    0x0A2E0, 0x0D2E3, 0x0C960, 0x0D557, 0x0D4A0, 0x0DA50, 0x05D55, 0x056A0, 0x0A6D0, 0x055D4,
    0x052D0, 0x0A9B8, 0x0A950, 0x0B4A0, 0x0B6A6, 0x0AD50, 0x055A0, 0x0ABA4, 0x0A5B0, 0x052B0,
    0x0B273, 0x06930, 0x07337, 0x06AA0, 0x0AD50, 0x14B55, 0x04B60, 0x0A570, 0x054E4, 0x0D160,
    0x0E968, 0x0D520, 0x0DAA0, 0x16AA6, 0x056D0, 0x04AE0, 0x0A9D4, 0x0A2D0, 0x0D150, 0x0F252,
    0x0D520,
]

BRIGHT_STARS = [("心宿二", 249.8), ("角宿一", 203.8), ("毕宿五", 69.8), ("轩辕十四", 149.8)]
METEORS = [
    ("象限仪座流星雨", 1, 3),
    ("天琴座流星雨", 4, 22),
    ("宝瓶座η流星雨", 5, 6),
    ("英仙座流星雨", 8, 12),
    ("猎户座流星雨", 10, 21),
    ("狮子座流星雨", 11, 17),
    ("双子座流星雨", 12, 14),
]
ECLIPSES = [
    (date(2026, 8, 28), "月偏食"),
    (date(2027, 2, 21), "月偏食"),
    (date(2027, 8, 17), "月偏食"),
    (date(2028, 1, 12), "月全食"),
    (date(2028, 7, 6), "月偏食"),
]
PLANET_EL = {
    "水星": dict(N=48.3313, Ni=3.24587e-5, i=7.0047, ii=5.00e-8, w=29.1241, wi=1.01444e-5,
                a=0.387098, e=0.205635, ei=5.59e-10, M=168.6562, Mi=4.0923344368),
    "金星": dict(N=76.6799, Ni=2.46590e-5, i=3.3946, ii=2.75e-8, w=54.8910, wi=1.38374e-5,
                a=0.723330, e=0.006773, ei=-1.302e-9, M=48.0052, Mi=1.6021302244),
    "火星": dict(N=49.5574, Ni=2.11081e-5, i=1.8497, ii=-1.78e-8, w=286.5016, wi=2.92961e-5,
                a=1.523688, e=0.093405, ei=2.516e-9, M=18.6021, Mi=0.5240207766),
    "木星": dict(N=100.4542, Ni=2.76854e-5, i=1.3030, ii=-1.557e-7, w=273.8777, wi=1.64505e-5,
                a=5.20256, e=0.048498, ei=4.469e-9, M=19.8950, Mi=0.0830853001),
    "土星": dict(N=113.6634, Ni=2.38980e-5, i=2.4886, ii=-1.081e-7, w=339.3939, wi=2.97661e-5,
                a=9.55475, e=0.055546, ei=-9.499e-9, M=316.9670, Mi=0.0334442282),
    "天王星": dict(N=74.0005, Ni=1.3978e-5, i=0.7733, ii=1.9e-8, w=96.6612, wi=3.0565e-5,
                 a=19.18171, e=0.047318, ei=7.45e-9, M=142.5905, Mi=0.011725806),
    "海王星": dict(N=131.7806, Ni=3.0173e-5, i=1.7700, ii=-2.55e-7, w=272.8461, wi=-6.027e-6,
                 a=30.05826, e=0.008606, ei=2.15e-9, M=260.2471, Mi=0.005995147),
    "冥王星": dict(N=110.30347, Ni=1.390e-6, i=17.14175, ii=8.42e-8, w=113.76329, wi=1.549e-5,
                 a=39.48168677, e=0.24880766, ei=6.0e-9, M=14.86205, Mi=0.003975),
}

BODY_ORDER = ["太阳", "月亮", "水星", "金星", "火星", "木星", "土星", "天王星", "海王星", "冥王星"]
PLANET_MEANING = {
    "太阳": "自我",
    "月亮": "情绪",
    "水星": "沟通",
    "金星": "感情",
    "火星": "行动",
    "木星": "机遇",
    "土星": "责任",
    "天王星": "变数",
    "海王星": "直觉",
    "冥王星": "转化",
}
ASPECT_DEFS = [
    {"angle": 0, "name": "合相", "orb": 8.0, "nature": "融合", "tone": "blend"},
    {"angle": 60, "name": "六分相", "orb": 4.0, "nature": "顺畅", "tone": "easy"},
    {"angle": 90, "name": "刑相", "orb": 6.0, "nature": "张力", "tone": "tense"},
    {"angle": 120, "name": "拱相", "orb": 6.0, "nature": "和谐", "tone": "easy"},
    {"angle": 180, "name": "冲相", "orb": 8.0, "nature": "对峙", "tone": "tense"},
]
SPECIAL_ASPECTS = {
    ("太阳", "月亮", "合相"): "日月同度，内外合一，适合开启新循环。",
    ("太阳", "月亮", "冲相"): "满月对拉，情绪与意志易顶牛，宜疏导。",
    ("太阳", "月亮", "刑相"): "心口不一，做事别硬撑，先安顿心情。",
    ("太阳", "月亮", "拱相"): "内外顺气，适合把感觉落成行动。",
    ("太阳", "水星", "合相"): "脑子亮、话也密，适合想清楚再开口。",
    ("太阳", "金星", "合相"): "魅力外放，交际与审美都容易加分。",
    ("太阳", "火星", "合相"): "行动欲强，宜把火力用在一件正事上。",
    ("太阳", "火星", "刑相"): "急性子上身，争执来得快，先降温。",
    ("太阳", "土星", "合相"): "责任压肩，宜做扎实的事，少逞能。",
    ("太阳", "土星", "冲相"): "想冲又被绊，接受节奏限制反而顺。",
    ("月亮", "金星", "合相"): "心软、想被温柔对待，适合联络感情。",
    ("月亮", "火星", "合相"): "情绪带火，反应快，避免迁怒亲近的人。",
    ("月亮", "土星", "合相"): "安全感变紧，宜自我打气，勿苛责。",
    ("水星", "金星", "合相"): "说话好听，适合谈合作、谈价钱、谈心意。",
    ("水星", "火星", "刑相"): "言辞带刺，发出去前先停一秒。",
    ("水星", "木星", "合相"): "想法放大，适合学习规划，忌夸口。",
    ("金星", "火星", "合相"): "爱与欲同燃，吸引力强，花钱也易跟着热。",
    ("金星", "火星", "刑相"): "情感易急躁，口角来得快，宜降温再沟通。",
    ("金星", "火星", "冲相"): "喜欢与脾气对拉，亲密中记得留空间。",
    ("金星", "土星", "合相"): "感情偏冷静，适合认真承诺，勿冷淡伤人。",
    ("火星", "土星", "刑相"): "想动被卡住，宜拆成小步，忌硬闯。",
    ("火星", "土星", "冲相"): "冲动撞上规则，先问代价再出手。",
    ("木星", "土星", "合相"): "扩张遇上收束，适合定长期规矩。",
}
PHASE_COPY = {
    "新月": dict(mood="心绪蓄势，适合独处与清理。", wealth="宜规划预算，勿急于加仓。",
              work="适合立项构思，暂缓铺开。", love="给彼此空间，先安顿自己。",
              advice="静下来盘点，为后半月留力。"),
    "蛾眉月": dict(mood="念头初萌，心情轻盈可试新。", wealth="小额尝试即可，忌大举加码。",
               work="适合起步试水，步伐宜小。", love="善意示好即可，不必急于确认。",
               advice="轻装向前，先走一步再看。"),
    "上弦月": dict(mood="意志渐明，宜把情绪说清楚。", wealth="可做中期安排，仍需留余量。",
               work="适合推进关键项，及时对齐。", love="把期待讲明白，减少猜测。",
               advice="过半未满，稳住节奏继续。"),
    "盈凸月": dict(mood="感受放大，宜疏导不宜硬撑。", wealth="宜收不宜追，落袋更为安。",
               work="适合收尾核对，冲刺见分寸。", love="热情升温，表达温柔即可。",
               advice="月将圆满，少争多成，早些歇息。"),
    "满月": dict(mood="情绪易满溢，见人见事宜缓。", wealth="忌追高，适合复盘与止盈。",
              work="收成果、做交接，勿再加码。", love="坦诚相见，避免翻旧账。",
              advice="月圆则亏，今晚宜看月少争执。"),
    "亏凸月": dict(mood="热度回落，适合消化与复盘。", wealth="收缩开支，整理账户更稳。",
               work="适合复盘修正，砍掉冗余。", love="把话说完即可，给对方台阶。",
               advice="由满转亏，做减法比加码好。"),
    "下弦月": dict(mood="心绪半卸，适合放下执念。", wealth="宜守成，避免临时决策。",
               work="收尾扫尾，把流程写清楚。", love="少辩对错，多留余地。",
               advice="过半将尽，把该放的放下。"),
    "残月": dict(mood="适合内收休息，不必强撑。", wealth="盘点损耗，来月再开新账。",
              work="收束归档，为下一轮留白。", love="温柔陪伴即可，少谈结论。",
              advice="月尽则生，今晚早睡养精神。"),
}

PERSONAL_BODIES = ["太阳", "月亮", "水星", "金星", "火星"]
OUTER_BODIES = ["木星", "土星", "天王星", "海王星", "冥王星"]
SIGN_MOOD = {
    "白羊": "锐利主动", "金牛": "沉稳务实", "双子": "灵动多思", "巨蟹": "柔软顾家",
    "狮子": "明亮自信", "处女": "细致清明", "天秤": "讲究和谐", "天蝎": "深沉专注",
    "射手": "开阔向远", "摩羯": "克制有序", "水瓶": "跳脱独立", "双鱼": "温柔感性",
}
SIGN_DO = {
    "白羊": "宜起步、少犹豫", "金牛": "宜守成、重品质", "双子": "宜交流、多记录",
    "巨蟹": "宜照顾、安内心", "狮子": "宜表达、被看见", "处女": "宜整理、求精确",
    "天秤": "宜协商、求平衡", "天蝎": "宜深耕、少试探", "射手": "宜学习、看远方",
    "摩羯": "宜规划、扛责任", "水瓶": "宜创新、留空间", "双鱼": "宜休息、用感受",
}
KIND_LABEL = {
    "moon": "月相", "moon-star": "月与恒星", "moon-planet": "月与行星",
    "planet": "行星可见", "retro": "视运动", "eclipse": "月食",
    "meteor": "流星", "sun": "太阳",
}


def clip(text: str, n: int = 30) -> str:
    return text.replace("\n", "").strip()[:n]


def to_jd(dt: datetime) -> float:
    dt = dt.astimezone(timezone.utc)
    y, m, d = dt.year, dt.month, dt.day
    hour = dt.hour + dt.minute / 60 + dt.second / 3600
    if m <= 2:
        y -= 1
        m += 12
    a = y // 100
    b = 2 - a + a // 4
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + b - 1524.5 + hour / 24.0


def sind(x: float) -> float:
    return math.sin(math.radians(x))


def cosd(x: float) -> float:
    return math.cos(math.radians(x))


def norm360(x: float) -> float:
    return x % 360.0


def ang_sep(a: float, b: float) -> float:
    d = abs(norm360(a) - norm360(b))
    return min(d, 360 - d)


def kepler(m_deg: float, e: float) -> float:
    m = math.radians(norm360(m_deg))
    ecc = m
    for _ in range(12):
        ecc = m + e * math.sin(ecc)
    return math.degrees(ecc)


def sun_xyz(d: float) -> tuple[float, float, float, float]:
    w = 282.9404 + 4.70935e-5 * d
    e = 0.016709 - 1.151e-9 * d
    m = norm360(356.0470 + 0.9856002585 * d)
    ea = kepler(m, e)
    xv = cosd(ea) - e
    yv = math.sqrt(1 - e * e) * sind(ea)
    v = math.degrees(math.atan2(yv, xv))
    r = math.hypot(xv, yv)
    lon = norm360(v + w)
    return lon, r, r * cosd(lon), r * sind(lon)


def moon_lon(d: float) -> float:
    n = 125.1228 - 0.0529538083 * d
    i = 5.1454
    w = 318.0634 + 0.1643573223 * d
    e = 0.054900
    m = 115.3654 + 13.0649929509 * d
    ea = kepler(m, e)
    xv = 60.2666 * (cosd(ea) - e)
    yv = 60.2666 * math.sqrt(1 - e * e) * sind(ea)
    v = math.degrees(math.atan2(yv, xv))
    lon = norm360(v + w)
    xh = cosd(n) * cosd(lon) - sind(n) * sind(lon) * cosd(i)
    yh = sind(n) * cosd(lon) + cosd(n) * sind(lon) * cosd(i)
    return norm360(math.degrees(math.atan2(yh, xh)))


def planet_lon(name: str, d: float, xs: float, ys: float) -> float:
    p = PLANET_EL[name]
    n = p["N"] + p["Ni"] * d
    i = p["i"] + p["ii"] * d
    w = p["w"] + p["wi"] * d
    a, e = p["a"], p["e"] + p["ei"] * d
    m = p["M"] + p["Mi"] * d
    ea = kepler(m, e)
    xv = a * (cosd(ea) - e)
    yv = a * math.sqrt(1 - e * e) * sind(ea)
    v = math.degrees(math.atan2(yv, xv))
    r = math.hypot(xv, yv)
    lon = v + w
    xh = r * (cosd(n) * cosd(lon) - sind(n) * sind(lon) * cosd(i))
    yh = r * (sind(n) * cosd(lon) + cosd(n) * sind(lon) * cosd(i))
    return norm360(math.degrees(math.atan2(yh + ys, xh + xs)))


def phase_name(illum: float, waxing: bool) -> str:
    pct = illum * 100
    if pct < 3:
        return "新月"
    if pct < 47:
        return "蛾眉月" if waxing else "残月"
    if pct < 53:
        return "上弦月" if waxing else "下弦月"
    if pct < 97:
        return "盈凸月" if waxing else "亏凸月"
    return "满月"


def leap_month(year: int) -> int:
    return LUNAR_INFO[year - 1900] & 0xF


def leap_days(year: int) -> int:
    if leap_month(year):
        return 30 if LUNAR_INFO[year - 1900] & 0x10000 else 29
    return 0


def month_days(year: int, month: int) -> int:
    return 30 if LUNAR_INFO[year - 1900] & (0x10000 >> month) else 29


def year_days(year: int) -> int:
    total = 348
    i = 0x8000
    while i > 0x8:
        if LUNAR_INFO[year - 1900] & i:
            total += 1
        i >>= 1
    return total + leap_days(year)


def lunar_parts(d: date) -> tuple[int, int, int, bool]:
    offset = (d - date(1900, 1, 31)).days
    year = 1900
    while year < 2101:
        ydays = year_days(year)
        if offset < ydays:
            break
        offset -= ydays
        year += 1
    leap = leap_month(year)
    is_leap = False
    month = 1
    while month < 13:
        if leap > 0 and month == leap + 1 and not is_leap:
            month -= 1
            is_leap = True
            days = leap_days(year)
        else:
            days = month_days(year, month)
        if offset < days:
            break
        offset -= days
        if is_leap and month == leap + 1:
            is_leap = False
        month += 1
    return year, month, offset + 1, is_leap


def lunar_label(d: date) -> str:
    _y, month, day, is_leap = lunar_parts(d)
    return f"农历{'闰' if is_leap else ''}{MONTH_CN[month - 1]}月{DAY_CN[day - 1]}"


def star_field(rng: random.Random) -> str:
    bits = []
    for _ in range(70):
        x, y = rng.uniform(8, 792), rng.uniform(8, 442)
        r, o = rng.uniform(0.6, 1.8), rng.uniform(0.25, 0.9)
        bits.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="#fff" opacity="{o:.2f}"/>')
    return "\n".join(bits)


def moon_graphic(cx: float, cy: float, r: float, illum: float, waxing: bool) -> str:
    k = max(0.0, min(1.0, illum))
    lit, dark = "#f4e6c4", "#14162a"
    clip_id = f"m{abs(hash((round(cx, 1), round(cy, 1), round(k, 3), waxing))) % 10**8}"
    base = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{{}}" stroke="#e8c98a" stroke-width="2"/>'
    if k < 0.02:
        return base.format(dark)
    if k > 0.98:
        return base.format(lit)
    offset = (2 * k - 1) * r
    if not waxing:
        offset = -offset
    if k >= 0.5:
        dark_cx = cx - offset
        return f'''
        <defs><clipPath id="{clip_id}"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath></defs>
        {base.format(lit)}
        <g clip-path="url(#{clip_id})"><circle cx="{dark_cx}" cy="{cy}" r="{r}" fill="{dark}" opacity="0.92"/></g>
        '''
    lit_cx = cx + offset
    return f'''
    <defs><clipPath id="{clip_id}"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath></defs>
    {base.format(dark)}
    <g clip-path="url(#{clip_id})"><circle cx="{lit_cx}" cy="{cy}" r="{r}" fill="{lit}"/></g>
    '''


def planet_graphic(name: str) -> str:
    if name == "土星":
        return """
        <ellipse cx="400" cy="230" rx="150" ry="38" fill="none" stroke="#d7b57a" stroke-width="10" opacity="0.85"/>
        <circle cx="400" cy="230" r="72" fill="#e6c48a"/>
        <rect x="328" y="222" width="144" height="10" fill="#c9a66a" opacity="0.35"/>
        """
    if name == "木星":
        return """
        <circle cx="400" cy="230" r="86" fill="#e2c9a0"/>
        <rect x="314" y="188" width="172" height="14" fill="#c9a06a" opacity="0.45"/>
        <rect x="314" y="252" width="172" height="16" fill="#b8864e" opacity="0.35"/>
        """
    if name == "金星":
        return """
        <circle cx="400" cy="230" r="92" fill="#e8c98a" opacity="0.18"/>
        <circle cx="400" cy="230" r="70" fill="#f3e6c4"/>
        """
    if name == "火星":
        return '<circle cx="400" cy="230" r="64" fill="#c45b3a"/>'
    return '<circle cx="400" cy="230" r="48" fill="#cfc6b8"/>'


def write_svg(path: Path, body: str, rng: random.Random) -> None:
    path.write_text(
        f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#151a33"/>
      <stop offset="100%" stop-color="#07080f"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#sky)"/>
  {star_field(rng)}
  {body}
</svg>
''',
        encoding="utf-8",
    )


def influence_for(phase: str, extra: str | None) -> dict:
    copy = dict(PHASE_COPY.get(phase, PHASE_COPY["盈凸月"]))
    if extra == "土星":
        copy["work"] = "宜守纪律做深活，少换赛道。"
    elif extra == "金星":
        copy["love"] = "关系易被照见，温柔回应即可。"
    elif extra == "满月将近":
        copy["mood"] = "情绪渐满，感受放大，宜疏导。"
    return {k: clip(v) for k, v in copy.items()}


def sign_of(lon: float) -> tuple[str, float]:
    z = int(lon / 30.0) % 12
    return ZODIAC[z], lon % 30.0


def aspect_influence(a: str, b: str, aspect: str, nature: str) -> str:
    pair = (a, b, aspect)
    rev = (b, a, aspect)
    if pair in SPECIAL_ASPECTS:
        return clip(SPECIAL_ASPECTS[pair], 36)
    if rev in SPECIAL_ASPECTS:
        return clip(SPECIAL_ASPECTS[rev], 36)
    ka, kb = PLANET_MEANING.get(a, a), PLANET_MEANING.get(b, b)
    if nature == "融合":
        text = f"{a}合{b}，{ka}与{kb}叠在一起，主题被放大。"
    elif nature == "和谐":
        text = f"{a}拱{b}，{ka}能借{kb}的力，推进较顺。"
    elif nature == "顺畅":
        text = f"{a}六分{b}，{ka}与{kb}有机会衔接，稍动即可。"
    elif nature == "张力":
        text = f"{a}刑{b}，{ka}和{kb}容易别扭，宜放慢再决定。"
    else:
        text = f"{a}冲{b}，{ka}与{kb}拉扯，需找中间点。"
    return clip(text, 36)


def collect_bodies(sun: float, moon: float, planets: list[dict]) -> list[dict]:
    lons = {"太阳": sun, "月亮": moon}
    for p in planets:
        lons[p["name"]] = p["lon"]
    bodies = []
    for name in BODY_ORDER:
        lon = lons[name]
        sign, deg = sign_of(lon)
        bodies.append({
            "name": name,
            "lon": round(lon, 2),
            "sign": sign,
            "deg": round(deg, 1),
            "label": f"{sign}座{deg:.0f}°",
            "meaning": PLANET_MEANING[name],
        })
    return bodies


def collect_aspects(bodies: list[dict]) -> list[dict]:
    lons = {b["name"]: b["lon"] for b in bodies}
    found = []
    for i, a in enumerate(BODY_ORDER):
        for b in BODY_ORDER[i + 1:]:
            sep = ang_sep(lons[a], lons[b])
            best = None
            for asp in ASPECT_DEFS:
                delta = abs(sep - asp["angle"])
                if delta <= asp["orb"] and (best is None or delta < best["orbUsed"]):
                    best = {
                        "a": a,
                        "b": b,
                        "aspect": asp["name"],
                        "nature": asp["nature"],
                        "tone": asp["tone"],
                        "angle": asp["angle"],
                        "sep": round(sep, 1),
                        "orbUsed": round(delta, 1),
                        "orbMax": asp["orb"],
                        "influence": aspect_influence(a, b, asp["name"], asp["nature"]),
                    }
            if best:
                found.append(best)
    found.sort(key=lambda x: (x["orbUsed"], BODY_ORDER.index(x["a"]), BODY_ORDER.index(x["b"])))
    return found


def pick_events(today: date, moon: dict, planets: list[dict]) -> list[dict]:
    events: list[dict] = []
    zodiac = ZODIAC[int(moon["lon"] / 30) % 12]
    events.append({
        "kind": "moon", "score": 100, "draw": "moon",
        "title": f"{moon['phase']}在{zodiac}",
        "caption": f"{moon['phase']}约{moon['pct']}%，日落后南天可见。",
        "alt": f"{moon['phase']}位于{zodiac}座",
    })
    near = min(BRIGHT_STARS, key=lambda s: ang_sep(moon["lon"], s[1]))
    if ang_sep(moon["lon"], near[1]) <= 8:
        events.append({
            "kind": "moon-star", "score": 90, "draw": "moon-star",
            "title": f"月近{near[0]}",
            "caption": f"{moon['phase']}贴近{near[0]}，日落后可见。",
            "alt": f"月亮靠近{near[0]}",
        })
    for p in planets:
        if p["sep"] <= 8:
            events.append({
                "kind": "moon-planet", "score": 88, "draw": "planet", "planet": p["name"],
                "title": f"月伴{p['name']}",
                "caption": f"月亮靠近{p['name']}，相距约{p['sep']:.0f}度。",
                "alt": f"月亮与{p['name']}接近",
            })
        if p["sep_sun"] >= 18:
            side = "西天" if 20 < p["elong"] < 160 else "东天"
            bonus = 8 if p["name"] == "金星" else 3 if p["name"] in {"木星", "土星"} else 0
            events.append({
                "kind": "planet", "score": 70 + p["sep_sun"] / 10 + bonus, "draw": "planet",
                "planet": p["name"],
                "title": f"{p['name']}{side}可见",
                "caption": f"{p['name']}距日约{p['sep_sun']:.0f}度，{side}寻找即可。",
                "alt": f"{p['name']}位于{side}",
            })
    for ecl_date, ecl_name in ECLIPSES:
        delta = (ecl_date - today).days
        if 0 <= delta <= 6:
            events.append({
                "kind": "eclipse", "score": 95 - delta, "draw": "eclipse",
                "title": ecl_name if delta == 0 else f"{delta}日后{ecl_name}",
                "caption": "今夜月食，留意天气与时间。" if delta == 0 else "月盘将极圆，夜空偏亮，宜早看月。",
                "alt": ecl_name,
            })
    for name, mth, day in METEORS:
        peak = date(today.year, mth, day)
        delta = abs((today - peak).days)
        if delta <= 3:
            events.append({
                "kind": "meteor", "score": 80 - delta * 5, "draw": "meteor",
                "title": name.replace("流星雨", "流星"),
                "caption": f"{name}活跃，夜半后北天可见。",
                "alt": name,
            })

    ranked = sorted(events, key=lambda x: -x["score"])
    chosen: list[dict] = []
    seen_titles = set()
    seen_planets = set()
    for ev in ranked:
        if ev["title"] in seen_titles:
            continue
        if ev.get("planet") and ev["planet"] in seen_planets and ev["kind"] == "planet":
            continue
        if ev["kind"] == "moon" and any(c["kind"] == "moon" for c in chosen):
            continue
        chosen.append(ev)
        seen_titles.add(ev["title"])
        if ev.get("planet"):
            seen_planets.add(ev["planet"])
        if len(chosen) == 3:
            break
    while len(chosen) < 3:
        chosen.append({
            "kind": "stars", "score": 10, "draw": "stars",
            "title": "夜空星点", "caption": "无特别合相，宜看月相与亮星。", "alt": "夜空星点",
        })
    return chosen[:3]


def lons_at(dt: datetime) -> dict[str, float]:
    d = to_jd(dt) - 2451543.5
    sun, _r, xs, ys = sun_xyz(d)
    out = {"太阳": sun, "月亮": moon_lon(d)}
    for name in PLANET_EL:
        out[name] = planet_lon(name, d, xs, ys)
    return out


def remaining_label(start: datetime, end: datetime | None) -> str:
    if end is None:
        return "仍将持续较久"
    hours = (end - start).total_seconds() / 3600
    if hours <= 0:
        return "即将结束"
    if hours < 1.5:
        return "约 1 小时内结束"
    if hours < 24:
        return f"约 {int(round(hours))} 小时后结束"
    days = hours / 24
    if days < 1.5:
        return "约 1 天后结束"
    if days < 11:
        return f"约 {int(round(days))} 天后结束"
    weeks = days / 7
    if weeks < 8:
        return f"约 {int(round(weeks))} 周后结束"
    return f"约 {int(round(days / 30))} 个月后结束"


def find_aspect_end(a: str, b: str, angle: float, orb_max: float, start: datetime) -> datetime | None:
    involves_moon = a == "月亮" or b == "月亮"
    involves_personal = a in PERSONAL_BODIES or b in PERSONAL_BODIES
    if involves_moon:
        step, limit = timedelta(hours=1), timedelta(days=6)
    elif involves_personal:
        step, limit = timedelta(hours=6), timedelta(days=75)
    else:
        step, limit = timedelta(days=1), timedelta(days=420)
    t = start + step
    end_limit = start + limit
    while t <= end_limit:
        pos = lons_at(t)
        if abs(ang_sep(pos[a], pos[b]) - angle) > orb_max + 0.05:
            return t
        t += step
    return None


def aspect_motion(a: str, b: str, angle: float, start: datetime) -> str:
    now = lons_at(start)
    later = lons_at(start + timedelta(hours=8))
    o0 = abs(ang_sep(now[a], now[b]) - angle)
    o1 = abs(ang_sep(later[a], later[b]) - angle)
    if o1 < o0 - 0.02:
        return "趋近精确"
    if o1 > o0 + 0.02:
        return "正在分离"
    return "相位稳定"


def decorate_aspects(aspects: list[dict], when: datetime) -> list[dict]:
    out = []
    for asp in aspects:
        end = find_aspect_end(asp["a"], asp["b"], asp["angle"], asp["orbMax"], when)
        item = dict(asp)
        item["endsIn"] = remaining_label(when, end)
        item["motion"] = aspect_motion(asp["a"], asp["b"], asp["angle"], when)
        out.append(item)
    return out


def planet_in_sign(name: str, sign: str, n: int = 36) -> str:
    mood, do = SIGN_MOOD[sign], SIGN_DO[sign]
    topic = PLANET_MEANING.get(name, name)
    if name == "月亮":
        text = f"月亮在{sign}，心情偏{mood}，{do}。"
    elif name == "太阳":
        text = f"太阳在{sign}，自我气质偏{mood}，{do}。"
    elif name == "水星":
        text = f"水星在{sign}，沟通与思绪偏{mood}，{do}。"
    elif name == "金星":
        text = f"金星在{sign}，审美与感情偏{mood}，{do}。"
    elif name == "火星":
        text = f"火星在{sign}，行动欲偏{mood}，{do}。"
    else:
        text = f"{name}进入{sign}座，{topic}转向{mood}，{do}。"
    return clip(text, n)


def collect_all_astronomy(today: date, moon: dict, planets: list[dict], sun: float) -> list[dict]:
    events: list[dict] = []
    age = moon["elong"] / 360.0 * 29.530588
    wax = "渐盈" if moon["waxing"] else "渐亏"
    events.append({
        "kind": "moon", "label": KIND_LABEL["moon"],
        "title": moon["phase"],
        "caption": f"亮面约{moon['pct']}%，月龄约{age:.0f}日，{wax}。",
        "detail": "日落后向南天寻找最亮的月盘即可，今夜月色是主画面。",
    })
    near = min(BRIGHT_STARS, key=lambda s: ang_sep(moon["lon"], s[1]))
    if ang_sep(moon["lon"], near[1]) <= 10:
        sep = ang_sep(moon["lon"], near[1])
        events.append({
            "kind": "moon-star", "label": KIND_LABEL["moon-star"],
            "title": f"月近{near[0]}",
            "caption": f"相距约{sep:.0f}度，同在月旁夜空。",
            "detail": f"{near[0]}是较亮的恒星，月明时需稍避月光再辨认。",
        })
    for p in planets:
        if p["sep"] <= 8:
            events.append({
                "kind": "moon-planet", "label": KIND_LABEL["moon-planet"],
                "title": f"月伴{p['name']}",
                "caption": f"月亮靠近{p['name']}，相距约{p['sep']:.0f}度。",
                "detail": "两者同区出现，适合对照辨认行星。",
            })
        if p["name"] in {"水星", "金星", "火星", "木星", "土星"} and p["sep_sun"] >= 18:
            side = "西天" if 20 < p["elong"] < 160 else "东天"
            when = "日落后" if side == "西天" else "黎明前"
            events.append({
                "kind": "planet", "label": KIND_LABEL["planet"],
                "title": f"{p['name']}{side}可见",
                "caption": f"距日约{p['sep_sun']:.0f}度，{when}于{side}寻找。",
                "detail": f"{p['name']}是夜空里较稳的光点，可与月亮对照。",
            })
    yest = today - timedelta(days=1)
    yest_lons = lons_at(datetime(yest.year, yest.month, yest.day, 21, tzinfo=TZ))
    today_lons = lons_at(datetime(today.year, today.month, today.day, 21, tzinfo=TZ))
    for name in PLANET_EL:
        delta = (today_lons[name] - yest_lons[name] + 180) % 360 - 180
        if delta < -0.005:
            events.append({
                "kind": "retro", "label": KIND_LABEL["retro"],
                "title": f"{name}逆行中",
                "caption": f"{name}相对恒星背景缓缓西移。",
                "detail": "逆行是地球与该星相对运动造成的视现象，并非真的后退。",
            })
    for ecl_date, ecl_name in ECLIPSES:
        delta = (ecl_date - today).days
        if 0 <= delta <= 10:
            events.append({
                "kind": "eclipse", "label": KIND_LABEL["eclipse"],
                "title": ecl_name if delta == 0 else f"{delta}日后{ecl_name}",
                "caption": "今夜月食，留意天气与时间。" if delta == 0 else "满月将近，夜空偏亮，宜早看月。",
                "detail": f"月食日期 {ecl_date.isoformat()}，可见范围随地点而变。",
            })
    for name, mth, day in METEORS:
        peak = date(today.year, mth, day)
        delta = abs((today - peak).days)
        if delta <= 4:
            events.append({
                "kind": "meteor", "label": KIND_LABEL["meteor"],
                "title": name.replace("流星雨", "流星"),
                "caption": f"{name}活跃，夜半后北天可见。",
                "detail": "流星宜找暗处、躺平看天，城市灯光强时数量会变少。",
            })
    events.append({
        "kind": "sun", "label": KIND_LABEL["sun"],
        "title": "太阳位置",
        "caption": f"黄经约{sun:.0f}°，可据此判断晨星与昏星。",
        "detail": "距日太近的行星会淹没在晨昏光里，距日较远才容易看见。",
    })
    return events


def outer_sign_changes(today: date) -> list[dict]:
    found = []
    for name in OUTER_BODIES:
        series = []
        for back in range(7, -1, -1):
            day = today - timedelta(days=back)
            pos = lons_at(datetime(day.year, day.month, day.day, 12, tzinfo=TZ))
            series.append((day, sign_of(pos[name])[0]))
        for i in range(1, len(series)):
            day, sign_now = series[i]
            prev_from = series[i - 1][1]
            if sign_now == prev_from:
                continue
            found.append({
                "name": name,
                "from": prev_from,
                "to": sign_now,
                "date": day.isoformat(),
                "when": "今日换座" if day == today else f"{day.month}月{day.day}日换座",
                "influence": planet_in_sign(name, sign_now, 48),
            })
            break
    return found


BLESS_LEN_MIN = 40
BLESS_LEN_MAX = 45
CN_NUM = "零一二三四五六七八九十"
PHASE_PLAIN = {
    "新月": ["月亮才刚露面", "月亮还小小的"],
    "蛾眉月": ["月牙还细细的", "月亮才露出一小弯"],
    "上弦月": ["月亮已经半圆", "半个月亮挂着"],
    "盈凸月": ["月亮快圆了", "月亮越来越亮"],
    "满月": ["今晚月亮很圆", "满月挂在天上"],
    "亏凸月": ["圆月缺了一角", "月亮开始往回收"],
    "下弦月": ["月亮又剩半边", "下半月的月亮"],
    "残月": ["月牙快收了", "月亮只剩细细一弯"],
}
SIGN_FEEL = {
    "白羊": ["心里有点坐不住", "想动手做点事"],
    "金牛": ["想把日子过踏实", "心里求个稳"],
    "双子": ["脑子有点忙", "想法来来去去"],
    "巨蟹": ["想被人暖到", "心比较恋家"],
    "狮子": ["想被看见被夸", "心里想出出彩"],
    "处女": ["看什么都想理顺", "容易跟细节较劲"],
    "天秤": ["不想吵，想讲和", "心里求个公平"],
    "天蝎": ["心事藏得比较深", "不想被随便看穿"],
    "射手": ["想往远处看看", "心里有点闷，想透气"],
    "摩羯": ["想把责任扛住", "节奏想慢一点、稳一点"],
    "水瓶": ["心情想自由一点", "今晚有点心野"],
    "双鱼": ["心比较软，也容易累", "情绪来得细"],
}
SIGN_ADVICE = {
    "白羊": ["先迈一小步就好", "别一上来就冲太猛"],
    "金牛": ["慢慢来也没问题", "把该做的做扎实"],
    "双子": ["把想法写下来更踏实", "说清楚再行动"],
    "巨蟹": ["先把自己安顿好", "对亲近的人温柔点"],
    "狮子": ["大大方方表现就好", "也记得歇一口气"],
    "处女": ["别对自己太苛刻", "够好就行，别抠死"],
    "天秤": ["有话好好说", "先听完再表态"],
    "天蝎": ["不必一次挖到底", "给自己留点秘密也行"],
    "射手": ["给自己留点余地", "看远也记得脚落地"],
    "摩羯": ["一步一步来就稳", "别把弦绷太紧"],
    "水瓶": ["给自己留点空间", "换个法子试试也行"],
    "双鱼": ["今晚早点歇着", "别把别人的情绪全扛上"],
}
PLANET_FEEL = {
    "太阳": "自己那股劲",
    "水星": "说话和念头",
    "金星": "感情这件事",
    "火星": "脾气和行动",
    "木星": "运气和机会",
    "土星": "压力和责任",
    "天王星": "突然的变化",
    "海王星": "说不清的直觉",
    "冥王星": "藏得很深的情绪",
}
ASPECT_SPECIAL = {
    ("合相", "太阳"): ["心里和想法比较一致", "内外不太拧巴"],
    ("合相", "水星"): ["话会比较多，先想清楚再开口"],
    ("合相", "金星"): ["心里软软的，想被温柔对待"],
    ("合相", "火星"): ["脾气来得快，先别迁怒"],
    ("合相", "木星"): ["运气轻轻推你一把"],
    ("合相", "土星"): ["安全感有点紧，别苛责自己"],
    ("合相", "天王星"): ["容易突发奇想，先落地再做"],
    ("合相", "海王星"): ["直觉很响，也容易想多"],
    ("合相", "冥王星"): ["心事会被放大", "情绪来得比较深"],
    ("六分相", "太阳"): ["做事和心情对得上"],
    ("六分相", "金星"): ["跟人相处还挺顺"],
    ("六分相", "木星"): ["小机会不妨接一下"],
    ("六分相", "土星"): ["把事做扎实会比较安心"],
    ("六分相", "海王星"): ["跟着感觉走也无妨"],
    ("拱相", "太阳"): ["想做的事推得动"],
    ("拱相", "金星"): ["善意容易被接住"],
    ("拱相", "木星"): ["运气能帮你一把"],
    ("拱相", "土星"): ["稳住节奏就有底"],
    ("拱相", "天王星"): ["新点子用得上"],
    ("刑相", "太阳"): ["想做的和感觉的有点拧"],
    ("刑相", "水星"): ["话到嘴边先停一秒"],
    ("刑相", "金星"): ["感情上别急着下判断"],
    ("刑相", "火星"): ["容易急，先深呼吸"],
    ("刑相", "土星"): ["卡住了就拆成小步"],
    ("刑相", "冥王星"): ["情绪有点沉，先对自己好一点"],
    ("冲相", "太阳"): ["心里拉扯，先缓一缓"],
    ("冲相", "水星"): ["话说出口前再想想"],
    ("冲相", "金星"): ["亲密里记得留空间"],
    ("冲相", "火星"): ["别硬刚，退一步更清楚"],
    ("冲相", "土星"): ["想冲又被绊，接受慢一点"],
}
BLESS_CLOSES = [
    "好好歇着",
    "今晚早点睡",
    "对自己好一点",
    "慢慢来就好",
    "今晚把心放平",
    "歇一歇就好",
]


def cn_day_count(n: int) -> str:
    if 0 <= n <= 10:
        return CN_NUM[n]
    if n < 20:
        return "十" + (CN_NUM[n - 10] if n > 10 else "")
    return str(n)


def pick_sky_phrases(events: list[dict], aspect_other: str | None) -> list[str]:
    ranked: list[tuple[int, str]] = []
    for ev in events:
        kind = ev.get("kind")
        title = (ev.get("title") or "").strip()
        if kind in {"sun", "moon", "retro"} or not title:
            continue
        if kind == "eclipse":
            m = re.match(r"^(\d+)日后(.+)$", title)
            if m:
                n = cn_day_count(int(m.group(1)))
                ranked.append((0, f"再过{n}天有月食"))
                ranked.append((0, f"过{n}天就能看月食"))
            else:
                ranked.append((0, "今晚有月食"))
                ranked.append((0, "今晚能看月食"))
        elif kind == "meteor":
            ranked.append((1, "这几天能看流星"))
            ranked.append((1, "夜里也许能见到流星"))
        elif kind == "moon-planet":
            name = title.replace("月伴", "")
            prio = 6 if aspect_other and aspect_other in title else 2
            ranked.append((prio, f"月亮挨着{name}"))
        elif kind == "moon-star":
            ranked.append((3, "月亮靠近一颗亮星"))
            ranked.append((3, title.replace("月近", "月亮靠近")))
        elif kind == "planet":
            name = title[:2]
            side = "西边" if "西天" in title else "东边"
            when = "黄昏" if "西天" in title else "天亮前"
            if name == "金星":
                ranked.append((4, f"{side}能看到金星"))
                ranked.append((4, f"{when}能见到金星"))
            elif name in {"木星", "土星"}:
                ranked.append((5, f"{side}能看到{name}"))
            else:
                ranked.append((7, f"{side}能看到{name}"))
    ranked.sort(key=lambda x: x[0])
    out = []
    for _prio, phrase in ranked:
        if phrase not in out:
            out.append(phrase)
        if len(out) >= 5:
            break
    if not out:
        out = ["今晚月色不错", "抬头就能看见月亮"]
    elif "今晚月色不错" not in out:
        out.append("今晚月色不错")
    return out


def aspect_phrases(aspects: list[dict]) -> list[str]:
    if not aspects:
        return ["今晚心情比较由自己做主", "心绪没被拽着走"]
    top = aspects[0]
    other = top["b"] if top["a"] == "月亮" else top["a"]
    name = top.get("aspect") or "相位"
    special = ASPECT_SPECIAL.get((name, other), [])
    feel = PLANET_FEEL.get(other, other)
    generic = {
        "合相": [f"{feel}会被放大", f"{feel}今晚特别明显"],
        "六分相": [f"{feel}还挺顺", "小地方也走得通"],
        "拱相": [f"{feel}能帮你一把", "事情推着走还挺顺"],
        "刑相": [f"{feel}有点别扭", "先别硬撑，缓一缓"],
        "冲相": [f"{feel}在拉扯", "先缓一缓再决定"],
    }.get(name, [f"{feel}今晚比较明显"])
    out = []
    for phrase in [*special, *generic]:
        if phrase not in out:
            out.append(phrase)
    return out


def force_blessing_len(text: str) -> str:
    text = text.replace(" ", "").replace("\n", "").strip()
    if not text.endswith("。"):
        text += "。"
    if BLESS_LEN_MIN <= len(text) <= BLESS_LEN_MAX:
        return text
    if len(text) < BLESS_LEN_MIN:
        body = text[:-1]
        for word in ["好好歇着", "今晚早点睡", "对自己好一点", "慢慢来就好"]:
            cand = body + "，" + word + "。"
            if BLESS_LEN_MIN <= len(cand) <= BLESS_LEN_MAX:
                return cand
        while len(body) + 1 < BLESS_LEN_MIN:
            body += "呀"
            if len(body) + 1 >= BLESS_LEN_MIN:
                break
        return (body + "。")[:BLESS_LEN_MAX - 1] + "。"
    cut = text[:BLESS_LEN_MAX]
    if "，" in cut:
        shorter = cut.rsplit("，", 1)[0] + "。"
        if len(shorter) >= BLESS_LEN_MIN:
            return shorter
    return text[: BLESS_LEN_MAX - 1] + "。"


def make_blessing(phase: str, moon_sign: str, aspects: list[dict], astronomy: list[dict]) -> str:
    other = None
    if aspects:
        top = aspects[0]
        other = top["b"] if top["a"] == "月亮" else top["a"]
    heads = PHASE_PLAIN.get(phase, [phase])
    feels = SIGN_FEEL.get(moon_sign, ["心情起伏都正常"])
    skies = pick_sky_phrases(astronomy, other)
    mids = aspect_phrases(aspects)
    wishes = SIGN_ADVICE.get(moon_sign, ["对自己好一点"])
    patterns = [
        "{head}，{feel}。{sky}，{mid}，{wish}。",
        "{head}，{feel}。{sky}，{mid}，{close}。",
        "{head}，{sky}。{feel}，{mid}，{wish}。",
        "{head}，{feel}，{sky}。{mid}，{wish}。",
        "{head}，{feel}。{sky}，{mid}。{wish}，{close}。",
        "{head}，{sky}，{feel}。{mid}，{close}。",
        "{head}，{feel}，{sky}，{mid}。{wish}。",
        "{head}，{feel}。{mid}，{sky}，{wish}。",
    ]
    candidates = []
    for pat in patterns:
        for head in heads:
            for feel in feels:
                for sky in skies:
                    for mid in mids:
                        for wish in wishes:
                            for close in BLESS_CLOSES:
                                text = pat.format(
                                    head=head, feel=feel, sky=sky,
                                    mid=mid, wish=wish, close=close,
                                )
                                n = len(text)
                                if BLESS_LEN_MIN <= n <= BLESS_LEN_MAX:
                                    candidates.append(text)
    if candidates:
        special_bits = [p for lines in ASPECT_SPECIAL.values() for p in lines]
        hit = [c for c in candidates if any(b in c for b in special_bits)]
        pool = hit or candidates
        warm = [c for c in pool if any(k in c for k in ("歇", "好一点", "慢慢", "空间", "安顿"))]
        return (warm or pool)[0]
    fallback = f"{heads[0]}，{feels[0]}。{skies[0]}，{mids[0]}，{wishes[0]}。"
    return force_blessing_len(fallback)


def build_diary(
    today: date,
    when: datetime,
    moon: dict,
    planets: list[dict],
    sun: float,
    bodies: list[dict],
    aspects: list[dict],
) -> dict:
    decorated = decorate_aspects(aspects, when)
    moon_sign = next(b["sign"] for b in bodies if b["name"] == "月亮")
    moon_aspects = [a for a in decorated if a["a"] == "月亮" or a["b"] == "月亮"]
    personal_aspects = [
        a for a in decorated if a["a"] in PERSONAL_BODIES or a["b"] in PERSONAL_BODIES
    ]
    personal_signs = []
    for name in PERSONAL_BODIES:
        b = next(x for x in bodies if x["name"] == name)
        personal_signs.append({
            "name": name,
            "sign": b["sign"],
            "label": b["label"],
            "deg": b["deg"],
            "influence": planet_in_sign(name, b["sign"], 42),
        })
    wax = "渐盈" if moon["waxing"] else "渐亏"
    if moon_aspects:
        top = moon_aspects[0]
        other = top["b"] if top["a"] == "月亮" else top["a"]
        mod2_title = f"{top['aspect']}{other}"
        mod2_line = top["influence"]
    else:
        mod2_title = "无主要相位"
        mod2_line = "今日月亮未入主要相位，心绪较自主。"
    astronomy = collect_all_astronomy(today, moon, planets, sun)
    return {
        "blessing": make_blessing(moon["phase"], moon_sign, moon_aspects, astronomy),
        "mod1": {
            "kicker": "天文学 · 月相",
            "title": moon["phase"],
            "line": f"亮面 {moon['pct']}% · {wax}",
            "hint": "查看今夜全部天象",
        },
        "mod2": {
            "kicker": "占星 · 月相相位",
            "title": mod2_title,
            "line": clip(mod2_line, 30),
            "hint": "查看日月金水火相位",
            "items": moon_aspects[:3],
        },
        "mod3": {
            "kicker": "占星 · 月亮星座",
            "title": f"{moon_sign}座",
            "line": planet_in_sign("月亮", moon_sign, 30),
            "hint": "查看日月金水火星座",
            "sign": moon_sign,
        },
        "astronomy": astronomy,
        "moonAspects": moon_aspects,
        "personalAspects": personal_aspects,
        "personalSigns": personal_signs,
        "outerSignChanges": outer_sign_changes(today),
    }


def draw_event(ev: dict, moon: dict, rng: random.Random, path: Path) -> None:
    kind = ev["draw"]
    if kind in {"moon", "moon-star", "eclipse"}:
        extra = ""
        if kind == "moon-star":
            extra = '<circle cx="560" cy="160" r="10" fill="#e07a4a"/><circle cx="560" cy="160" r="22" fill="#e07a4a" opacity="0.2"/>'
        if kind == "eclipse":
            extra = '<circle cx="430" cy="220" r="86" fill="#07080f" opacity="0.55"/>'
        body = moon_graphic(400, 230, 86, moon["illum"], moon["waxing"]) + extra
    elif kind == "planet":
        body = planet_graphic(ev.get("planet", "金星"))
    elif kind == "meteor":
        body = """
        <line x1="120" y1="80" x2="520" y2="280" stroke="#f4efe4" stroke-width="2"/>
        <line x1="120" y1="80" x2="280" y2="155" stroke="#e8c98a" stroke-width="5" opacity="0.35"/>
        """
    else:
        body = ""
    write_svg(path, body, rng)


def build(today: date | None = None) -> dict:
    now = datetime.now(TZ)
    today = today or now.date()
    # 按当前时刻计算星体位置（launchd 每 3 小时刷新一次）
    when = now.replace(second=0, microsecond=0)
    d = to_jd(when) - 2451543.5
    sun, _r, xs, ys = sun_xyz(d)
    m_lon = moon_lon(d)
    elong = norm360(m_lon - sun)
    illum = (1 - cosd(elong)) / 2
    waxing = elong < 180
    phase = phase_name(illum, waxing)
    pct = int(round(illum * 100))
    moon = {"lon": m_lon, "illum": illum, "waxing": waxing, "phase": phase, "pct": pct, "elong": elong}

    planets = []
    for name in PLANET_EL:
        lon = planet_lon(name, d, xs, ys)
        el = norm360(lon - sun)
        planets.append({
            "name": name, "lon": lon, "elong": el,
            "sep_sun": ang_sep(lon, sun), "sep": ang_sep(lon, m_lon),
        })

    rng = random.Random(today.toordinal())
    chosen = pick_events(today, moon, planets)
    (ROOT / "stars").mkdir(exist_ok=True)
    sky = []
    for i, ev in enumerate(chosen, start=1):
        rel = f"stars/today-{i}.svg"
        draw_event(ev, moon, rng, ROOT / rel)
        sky.append({
            "title": clip(ev["title"], 12),
            "caption": clip(ev["caption"]),
            "image": rel,
            "alt": ev["alt"],
        })

    extra = None
    if any(p["name"] == "土星" and p["sep_sun"] > 40 for p in planets):
        extra = "土星"
    days_to_full = min((ecl[0] - today).days for ecl in ECLIPSES if ecl[0] >= today) if any(
        ecl[0] >= today for ecl in ECLIPSES
    ) else 99
    if 0 < days_to_full <= 6:
        extra = "满月将近"
    copy = influence_for(phase, extra)
    bodies = collect_bodies(sun, m_lon, planets)
    aspects = collect_aspects(bodies)
    diary = build_diary(today, when, moon, planets, sun, bodies, aspects)

    return {
        "date": today.isoformat(),
        "weekday": WEEKDAYS[today.weekday()],
        "lunar": lunar_label(today),
        "moonPhase": phase,
        "moonIllumination": f"{pct}%",
        "moonFraction": round(illum, 4),
        "waxing": waxing,
        "sky": sky,
        "influence": {
            "mood": copy["mood"], "wealth": copy["wealth"],
            "work": copy["work"], "love": copy["love"],
        },
        "advice": copy["advice"],
        "bodies": bodies,
        "aspects": aspects,
        "diary": diary,
        "updatedAt": now.strftime("%Y-%m-%d %H:%M"),
    }


def self_check() -> None:
    y, m, d, leap = lunar_parts(date(2026, 2, 17))
    if (m, d) != (1, 1):
        raise SystemExit(f"lunar check failed 2026-02-17 -> {(y, m, d, leap)}")
    y, m, d, leap = lunar_parts(date(2026, 8, 19))
    if (m, d) != (7, 7):
        raise SystemExit(f"lunar check failed 2026-08-19 -> {(y, m, d, leap)}")


def main() -> None:
    self_check()
    data = build()
    out = ROOT / "stars-data.js"
    out.write_text(
        "window.STARS_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    stamp = datetime.now().strftime("%Y%m%d%H%M%S")
    for html_name in ("stars.html", "diary.html", "digest.html"):
        html_path = ROOT / html_name
        if html_path.exists():
            html = html_path.read_text(encoding="utf-8")
            html_path.write_text(
                re.sub(r"stars-data\.js(\?v=\d+)?", f"stars-data.js?v={stamp}", html, count=1),
                encoding="utf-8",
            )
    for item in data["sky"]:
        print(" ", item["title"], item["caption"])
    print(f" bodies {len(data['bodies'])}  aspects {len(data['aspects'])}  diary astro {len(data['diary']['astronomy'])}")
    blessing = data["diary"]["blessing"]
    print(f" blessing({len(blessing)}): {blessing}")
    for asp in data["aspects"][:8]:
        print(f"  {asp['a']} {asp['aspect']} {asp['b']}  Δ{asp['orbUsed']}°  {asp['influence']}")


if __name__ == "__main__":
    main()
