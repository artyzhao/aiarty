#!/usr/bin/env python3
"""Daily celebrity nativity for 每日精选.

Birth data: Astro-Databank AA/A. Houses: Placidus (same as 星星日记 natal.js).
Wheel: Almuten/宫神星-style (ASC at left, house spokes, aspectarium).
Readings follow 星星日记: overall / personality / career / wealth / love / health,
then check the notes against the person's public life.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fetch_stars import ang_sep, lons_at, norm360, sind, cosd, to_jd

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
TRAD_BODIES = ["太阳", "月亮", "水星", "金星", "火星", "木星", "土星", "天王星", "海王星", "冥王星"]
GLYPH = {
    "太阳": "☉", "月亮": "☽", "水星": "☿", "金星": "♀", "火星": "♂", "木星": "♃", "土星": "♄",
    "天王星": "♅", "海王星": "♆", "冥王星": "♇", "上升": "Asc",
}
PLANET_EN = {
    "太阳": "Sun", "月亮": "Moon", "水星": "Mercury", "金星": "Venus",
    "火星": "Mars", "木星": "Jupiter", "土星": "Saturn",
    "天王星": "Uranus", "海王星": "Neptune", "冥王星": "Pluto", "上升": "Asc",
}
ASPECT_EN = {"合相": "Conjunction", "六分相": "Sextile", "刑相": "Square", "拱相": "Trine", "冲相": "Opposition"}
ASPECT_NATURE = {"合相": "融合", "六分相": "顺畅", "刑相": "张力", "拱相": "和谐", "冲相": "对峙"}
ASPECT_COLOR = {"合相": "#e07000", "六分相": "#1a7f4c", "刑相": "#c4392a", "拱相": "#1d4f91", "冲相": "#8b1e3f"}
ASPECT_DEFS = (("合相", 0, 8), ("六分相", 60, 4), ("刑相", 90, 6), ("拱相", 120, 6), ("冲相", 180, 8))
DIGNITY_EN = {"入庙": "domicile", "擢升": "exaltation", "落陷": "fall", "失势": "detriment"}
HOUSE_TOPIC = {
    1: "自我气质", 2: "财富资源", 3: "学习沟通", 4: "家庭根基", 5: "恋爱创造", 6: "工作健康",
    7: "伴侣合作", 8: "共享资源", 9: "远行信念", 10: "事业声望", 11: "社群愿景", 12: "内在修复",
}
HOUSE_TOPIC_EN = {
    1: "self", 2: "money", 3: "communication", 4: "home", 5: "creation", 6: "work/health",
    7: "partners", 8: "shared resources", 9: "belief/travel", 10: "career", 11: "networks", 12: "retreat",
}
SIGN_MOOD = {
    "白羊": "主动果断", "金牛": "稳健务实", "双子": "灵活善言", "巨蟹": "细腻顾家",
    "狮子": "自信外放", "处女": "细致严谨", "天秤": "讲究和谐", "天蝎": "深沉专注",
    "射手": "开阔乐观", "摩羯": "务实克制", "水瓶": "独立创新", "双鱼": "温柔感性",
}
SIGN_MOOD_EN = {
    "白羊": "decisive", "金牛": "steady", "双子": "quick-witted", "巨蟹": "protective",
    "狮子": "radiant", "处女": "exacting", "天秤": "diplomatic", "天蝎": "intense",
    "射手": "expansive", "摩羯": "disciplined", "水瓶": "independent", "双鱼": "empathic",
}

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
        "bio": "现代护理学奠基人，克里米亚战争中改革战地医护，并以统计图说服政府改善卫生。佛罗伦萨出生记录 13:00，Astro-Databank 评为 AA。",
        "bioEn": "Founder of modern nursing. Florence civil time 13:00 (Rodden AA).",
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
        "bio": "《寂静的春天》作者，推动现代环保运动。出生时间取自传记记载，Astro-Databank 评为 A。",
        "bioEn": "Author of Silent Spring. Biography time; Rodden A.",
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


# Public-life checkpoints used after the chart reading (not copied from any column).
LIFE = {
    "einstein": {
        "overall": "相对论改写物理图像，却长期以独立思考者而非学院明星自居。",
        "personality": "对外温和、对问题极固执；晚年仍拒绝放弃统一场的个人路线。",
        "career": "从专利局职员走到普林斯顿，科学声誉与公共知识分子身份并行。",
        "wealth": "诺奖奖金处理谨慎，并不以财富闻名，成就主要来自智识声望。",
        "love": "两段婚姻波折，与米列娃、艾尔莎的关系都留下大量通信与争议。",
        "health": "晚年腹主动脉瘤，1955 年拒绝手术后离世。",
    },
    "curie": {
        "overall": "两度诺奖，把放射性研究做成可验证的实验室事业。",
        "personality": "极强自制与工作狂气质，公开场合话少、实验室里极硬。",
        "career": "巴黎大学教授、镭研究所，科学与机构建设并进。",
        "wealth": "拒绝为镭提炼申请专利，经济上并不宽裕。",
        "love": "与皮埃尔合作至其去世，其后的情感生活曾引发舆论风波。",
        "health": "长期辐射暴露，死于再生障碍性贫血。",
    },
    "jung": {
        "overall": "分析心理学自成一派，把个体化写成可实践的心理工作。",
        "personality": "内向深思，又热衷神话、炼金与集体象征。",
        "career": "从布格霍尔茨利医院走到国际分析心理学运动的中心。",
        "wealth": "执业与著作带来稳定中产以上生活，并非投机型财富。",
        "love": "婚姻之外有重要情感与工作伴侣（如托妮·沃尔夫）。",
        "health": "中年有过接近崩溃的自我实验期，晚年仍持续写作。",
    },
    "kahlo": {
        "overall": "把残体、身份与政治写进自画像，成为 20 世纪最可辨认的画家之一。",
        "personality": "公开的烈性与戏谑，不回避痛苦与身体残缺。",
        "career": "从墨西哥城走向巴黎、纽约展览，作品进入世界级美术馆。",
        "wealth": "经济常依赖里维拉与赞助，并非商业流水线型富豪。",
        "love": "与迭戈·里维拉结婚、离婚再婚，关系公开而反复。",
        "health": "车祸重伤后多次脊椎与截肢手术，仍坚持作画。",
    },
    "picasso": {
        "overall": "立体主义与不断变风，使个人风格本身成为 20 世纪艺术史主线。",
        "personality": "精力旺盛、占有欲强，工作与私生活都极度自我中心。",
        "career": "从蓝色时期到格尔尼卡，长期占据画市与博物馆核心。",
        "wealth": "生前已是超级富豪，作品成为资产。",
        "love": "多段重要伴侣与子女关系，感情生活几乎与创作分期重叠。",
        "health": "高寿，晚期仍大量工作，1973 年在法国去世。",
    },
    "woolf": {
        "overall": "意识流小说与布卢姆斯伯里圈子，把内心独白写成现代主义方法。",
        "personality": "敏锐、易受刺激，对声音与评价极度敏感。",
        "career": "霍加斯出版社与《到灯塔去》《达洛维夫人》奠定地位。",
        "wealth": "出身文化中产，出版事业提供相对独立的经济。",
        "love": "与伦纳德的婚姻稳定，同时有与维塔等女性的重要情感。",
        "health": "反复抑郁，1941 年投河自尽。",
    },
    "lovelace": {
        "overall": "为分析机写下被后世视为最早计算机程序的注释。",
        "personality": "数学热情与社交名流身份并存，自我期许极高。",
        "career": "与巴贝奇合作，成果在生前少被工业界看见。",
        "wealth": "贵族家庭，却因赌博负债。",
        "love": "婚姻由家庭安排，情感生活受 19 世纪礼法约束。",
        "health": "长期疾病， 36 岁死于子宫癌。",
    },
    "turing": {
        "overall": "可计算性与破译工作改写战争与计算机史。",
        "personality": "话少、直来直去，对社交规则不耐烦。",
        "career": "布莱切利园、ACE、曼彻斯特，学术与国家项目交织。",
        "wealth": "公务员与学者薪资，不以财富著称。",
        "love": "同性关系在当时被定罪，私人生活被法律碾压。",
        "health": "化学阉割后于 1954 年去世，普遍认为是自杀。",
    },
    "nightingale": {
        "overall": "用统计与管理把护理从经验变成可改革的制度。",
        "personality": "意志极强，不喜被家庭角色定义。",
        "career": "克里米亚之后推动英国军医与护士培训改革。",
        "wealth": "出身世家，把资源投进改革而非个人享受。",
        "love": "终身未嫁，把精力放在事业与通信网络。",
        "health": "战后长期卧病，仍以书信指挥改革，享年 90 岁。",
    },
    "carson": {
        "overall": "《寂静的春天》把生态学写成公共政治。",
        "personality": "安静、坚持，面对化工游说也不退。",
        "career": "从渔业局写作者成为全国环保辩论的中心。",
        "wealth": "靠写作与公职，并非资本型财富。",
        "love": "终身未嫁，亲密关系主要在家庭与女性友人之间。",
        "health": "写作期间已患乳腺癌，1964 年病逝。",
    },
    "jobs": {
        "overall": "把个人计算机与消费电子做成大众文化产品。",
        "personality": "完美主义、控制欲强，表达可以极刻薄也可以极煽动。",
        "career": "苹果—NeXT—皮克斯—回归苹果，事业线大起大落再登顶。",
        "wealth": "苹果与皮克斯股权使其成为顶级富豪。",
        "love": "早年否认长女，后与劳伦·鲍威尔结婚，家庭成为晚年主题。",
        "health": "胰腺癌（神经内分泌肿瘤）长期治疗，2011 年去世。",
    },
    "oprah": {
        "overall": "脱口秀与媒体帝国把个人叙事做成大众产业。",
        "personality": "共情能力强，善于把私人经历变成公共语言。",
        "career": "从地方电视到 Harpo、OWN，成为美国最具影响力的主持人之一。",
        "wealth": "靠媒体与投资跻身亿万富豪。",
        "love": "与斯泰德曼·格雷厄尔长期伴侣关系，选择不婚。",
        "health": "公开讨论体重与健康管理，把身体议题当成节目主题。",
    },
    "obama": {
        "overall": "从社区组织者到美国总统，把个人传记写成政治动员。",
        "personality": "克制、演说型魅力，公开形象极强调冷静。",
        "career": "芝加哥—参议员—白宫，路径高度公开化。",
        "wealth": "总统薪资之后靠回忆录与演讲进入富豪行列。",
        "love": "与米歇尔的婚姻是其政治品牌的一部分。",
        "health": "任内保持公开运动习惯，无重大公开病史。",
    },
    "merkel": {
        "overall": "以物理学家式的谨慎主导德国与欧盟十余年。",
        "personality": "少戏剧、重程序，公开表达极克制。",
        "career": "从东德科研到基民盟主席、联邦总理。",
        "wealth": "长期公职，个人财富低调。",
        "love": "第二次婚姻稳定，家庭极少成为八卦中心。",
        "health": "总理任内偶发颤抖等公开健康瞬间，整体以耐力著称。",
    },
    "brucelee": {
        "overall": "把武术、电影与哲学拧成全球流行文化。",
        "personality": "好胜、自律、对身体极限极敏感。",
        "career": "好莱坞受阻后回港拍片，迅速成为国际动作明星。",
        "wealth": "片酬上升很快，但事业高峰短暂。",
        "love": "与琳达的婚姻稳定，子女后来亦进入公众视野。",
        "health": "高强度训练，1973 年因脑水肿突然去世，年仅 32 岁。",
    },
    "hepburn": {
        "overall": "银幕风格与战后人道主义形象叠在一起。",
        "personality": "外表轻盈，工作与慈善都极有纪律。",
        "career": "《罗马假日》之后成为奥斯卡级影星，晚年转向 UNICEF。",
        "wealth": "片酬优厚，生活并不张扬。",
        "love": "两段婚姻，后与罗伯特·沃尔德斯长期伴侣。",
        "health": "童年饥荒留下代谢影响，1993 年因阑尾癌去世。",
    },
    "bowie": {
        "overall": "不断换人格与声线，把流行音乐做成身份实验。",
        "personality": "舞台上极外放，私下被描述为观察型、抽离。",
        "career": "从 Ziggy 到柏林时期再到商业巨星，路线多次自我推翻。",
        "wealth": "唱片与出版权使其成为音乐富豪。",
        "love": "两段婚姻，与伊曼的后半生关系公开而稳定。",
        "health": "肝癌，2016 年在《黑星》发行后两天去世。",
    },
    "lennon": {
        "overall": "披头士与后来的政治歌曲，把私人生平写成流行史。",
        "personality": "尖锐、幽默、情绪起伏大。",
        "career": "利物浦到全球巡演，解散后与小野洋子继续发声。",
        "wealth": "版权与版税使其极其富有。",
        "love": "与辛西娅、小野的关系都高度公开，后者成为创作搭档。",
        "health": "1980 年在纽约遇刺身亡。",
    },
    "tesla": {
        "overall": "交流电与感应电机改写电力工业，个人却日益孤立。",
        "personality": "洁癖、仪式化习惯，对数字与灵感近乎迷信。",
        "career": "与西屋合作后又失去商业控制权，晚年靠旅馆度日。",
        "wealth": "专利曾值巨款，最终几乎破产。",
        "love": "终身未娶，公开表示感情会干扰发明。",
        "health": "老年孤独，1943 年在纽约旅馆去世。",
    },
    "beauvoir": {
        "overall": "《第二性》把女性主义写成哲学与生活方式。",
        "personality": "理性、好辩，坚持契约式亲密关系。",
        "career": "与萨特并列的公共知识分子，写作与介入并行。",
        "wealth": "靠著作与教职，生活在巴黎知识圈子里。",
        "love": "与萨特的开放契约关系成为 20 世纪文化史事件。",
        "health": "晚年酗酒与衰老，1986 年去世。",
    },
    "luxun": {
        "overall": "以小说与杂文成为中国现代文学的坐标。",
        "personality": "冷峭、多疑、对论敌极锋利。",
        "career": "从医学转向文学，在北京、厦门、广州、上海写作与任教。",
        "wealth": "靠稿费与薪俸，后期在上海以写作为生。",
        "love": "与朱安的旧式婚姻名存实亡，与许广平共同生活。",
        "health": "长期肺病，1936 年在上海病逝。",
    },
    "swift": {
        "overall": "把私人叙事、巡演与版权控制做成当代流行工业的模板。",
        "personality": "公开形象亲和，商业与创作上极度自主。",
        "career": "乡村到全球流行，重录旧专辑以夺回母带。",
        "wealth": "巡演与版权使其成为音乐界顶级富豪之一。",
        "love": "多段被媒体追踪的恋爱，作品反复把感情写成专辑主题。",
        "health": "高强度巡演，偶有公开的疲劳与饮食讨论。",
    },
}


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



WEALTH_SOURCE = {
    1: "自我经营、个人品牌与直接出手", 2: "本职收入、储蓄与可掌控的资源",
    3: "信息差、写作沟通、短途奔波与技能变现", 4: "家庭支持、房产置业或老家资源",
    5: "创作、投机、表演才华与兴趣变现", 6: "日常工作、服务技能与稳定薪资",
    7: "伴侣、客户、合作与一对一关系", 8: "投资、遗产、共同账户与他人资源",
    9: "远行、学历、出版、跨文化与开阔视野", 10: "事业成就、职位声望与公开成绩",
    11: "朋友圈、社团、团队分红与人脉机会", 12: "幕后、疗愈、隐秘渠道或需要独处的工作",
}
MONEY_ATTITUDE = {
    "白羊": "花钱偏干脆，看准了就出手", "金牛": "更看重踏实与质感，愿意为长期价值付钱",
    "双子": "钱用在学习、社交和新鲜体验上更开心", "巨蟹": "安全感优先，存钱常为家人和情绪底盘服务",
    "狮子": "舍得在体面、兴趣和让自己出彩的地方花钱", "处女": "精打细算，讨厌浪费",
    "天秤": "为关系和美感买单更容易", "天蝎": "对钱很有掌控欲，不喜欢含糊",
    "射手": "钱更像自由度，愿意为成长和眼界买单", "摩羯": "偏谨慎务实，先求稳再谈享受",
    "水瓶": "花钱偏理性，也容易投向理念或与众不同的事", "双鱼": "钱跟感觉绑在一起，需要边界",
}
CAREER_BY_SIGN = {
    "白羊": "适合开创、带队或需要决断力的一线岗位",
    "金牛": "适合金融、地产、设计美学或靠耐心积累的实业",
    "双子": "适合媒体写作、教育培训、商务对接与资讯协作",
    "巨蟹": "适合照护服务、心理辅导或与家庭相关的行业",
    "狮子": "适合表演创意、品牌管理、需要被看见的舞台型工作",
    "处女": "适合分析研究、医疗健康、编辑质检与精细服务",
    "天秤": "适合法律咨询、公关设计、人力资源与商务谈判",
    "天蝎": "适合调研风控、投资并购、技术深挖或危机处理",
    "射手": "适合教育出版、跨境贸易、顾问或视野开阔的岗位",
    "摩羯": "适合管理行政、工程、政务与层级清晰的组织",
    "水瓶": "适合科技、社会创新、研究发明或非常规路径",
    "双鱼": "适合艺术疗愈、影像音乐、公益与灵感型创意",
}
CAREER_BY_HOUSE = {
    1: "个人品牌、独立从业或强自我驱动的角色", 2: "财务、产品、销售变现或资源经营",
    3: "写作传播、培训销售与技能教学", 4: "不动产、家庭事业或后方支持",
    5: "创意娱乐、内容创作与投机型项目", 6: "专业技术、医疗健康、行政运营",
    7: "咨询顾问、客户成功与合伙经营", 8: "金融投资、税务风控与资源整合",
    9: "高等教育、出版传媒、跨境业务", 10: "管理领导、公众角色与行业权威",
    11: "社群平台、团队协作与组织型事业", 12: "幕后研发、疗愈艺术或需要独处的专业",
}
PARTNER_PERSON = {
    "白羊": "性格直接干脆，说做就做", "金牛": "性格踏实慢热，重承诺与安全感",
    "双子": "性格活泼善聊，需要新鲜感与空间", "巨蟹": "性格顾家敏感，重视情绪联结",
    "狮子": "性格大方要面子，也需要被看见", "处女": "性格细致挑剔，爱把事情安排妥当",
    "天秤": "性格讲究公平和谐，也在意观感", "天蝎": "性格深沉专注，一旦投入很深",
    "射手": "性格乐观开阔，不喜被绑太死", "摩羯": "性格克制负责，感情里也像在经营",
    "水瓶": "性格独立理性，需要被尊重空间", "双鱼": "性格温柔感性，共情强",
}
HEALTH_ZONE = {
    "白羊": "头面部、血压与急性炎症，宜少熬夜、控脾气",
    "金牛": "喉咙、甲状腺、颈椎与代谢节奏，宜规律饮食",
    "双子": "呼吸、肩臂、神经紧张与作息紊乱，宜放慢换气",
    "巨蟹": "肠胃、胸腹敏感与情绪性不适，宜暖食、稳情绪",
    "狮子": "心脏、背脊与精力透支，宜有氧但别硬撑",
    "处女": "消化吸收、肠道与过度焦虑劳损，宜细嚼慢咽",
    "天秤": "腰肾、皮肤与平衡感，宜作息对称、少久坐",
    "天蝎": "生殖泌尿、排毒代谢与积压性疲劳，宜规律排解压力",
    "射手": "髋腿、肝脏负荷与跑动过量，宜拉伸、少暴饮暴食",
    "摩羯": "骨骼关节、皮肤屏障与慢性劳损，宜保暖、量力运动",
    "水瓶": "小腿踝、循环与神经过敏，宜保暖末梢、规律休息",
    "双鱼": "足部、淋巴与边界模糊导致的疲惫，宜泡脚、早睡",
}


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


def lon_from_ra(ra: float, eps: float) -> float:
    ra_r = math.radians(ra)
    e = math.radians(eps)
    return norm360(math.degrees(math.atan2(math.sin(ra_r), math.cos(ra_r) * math.cos(e))))


def placidus_cusps(lst: float, lat: float, eps: float) -> list[float]:
    """Return 12 Placidus cusp longitudes (index 0 = house 1 / ASC)."""
    asc = ascendant(lst, lat, eps)
    mc = midheaven(lst, eps)
    cusps = [0.0] * 12
    cusps[0] = asc
    cusps[9] = mc
    cusps[6] = norm360(asc + 180)
    cusps[3] = norm360(mc + 180)

    lat_r = math.radians(lat)
    eps_r = math.radians(eps)

    def iterate(frac: float, nocturnal: bool) -> float:
        # Diurnal 11/12 sit east of MC: RA = RAMC + f * DSA.
        # Nocturnal 2/3 sit east of IC toward ASC: RA = RAMC + 180 - f * NSA.
        if nocturnal:
            ra = lst + 180.0 - 90.0 * frac
        else:
            ra = lst + 90.0 * frac
        lon = lon_from_ra(ra, eps)
        for _ in range(24):
            lon_r = math.radians(lon)
            decl = math.asin(max(-1.0, min(1.0, math.sin(eps_r) * math.sin(lon_r))))
            tan_prod = math.tan(lat_r) * math.tan(decl)
            if abs(tan_prod) >= 0.999:
                return lon
            ad = math.degrees(math.asin(max(-1.0, min(1.0, tan_prod))))
            if nocturnal:
                ra_new = lst + 180.0 - frac * (90.0 - ad)
            else:
                ra_new = lst + frac * (90.0 + ad)
            lon_new = lon_from_ra(ra_new, eps)
            if abs(((lon_new - lon + 180) % 360) - 180) < 1e-4:
                return lon_new
            lon, ra = lon_new, ra_new
        return lon

    try:
        cusps[10] = iterate(1.0 / 3.0, False)  # 11
        cusps[11] = iterate(2.0 / 3.0, False)  # 12
        cusps[1] = iterate(2.0 / 3.0, True)    # 2
        cusps[2] = iterate(1.0 / 3.0, True)    # 3
    except (ValueError, ZeroDivisionError):
        span = (asc - mc + 360) % 360
        cusps[10] = norm360(mc + span / 3)
        cusps[11] = norm360(mc + 2 * span / 3)
        span2 = (cusps[3] - asc + 360) % 360
        cusps[1] = norm360(asc + span2 / 3)
        cusps[2] = norm360(asc + 2 * span2 / 3)

    def on_arc(lon: float, a: float, b: float) -> bool:
        return (lon - a + 360) % 360 < (b - a + 360) % 360 + 1e-6

    # If iteration landed on the wrong side of the horizon, fall back to Porphyry.
    if not (on_arc(cusps[10], mc, asc) and on_arc(cusps[11], mc, asc)
            and on_arc(cusps[1], asc, cusps[3]) and on_arc(cusps[2], asc, cusps[3])):
        span = (asc - mc + 360) % 360
        cusps[10] = norm360(mc + span / 3)
        cusps[11] = norm360(mc + 2 * span / 3)
        span2 = (cusps[3] - asc + 360) % 360
        cusps[1] = norm360(asc + span2 / 3)
        cusps[2] = norm360(asc + 2 * span2 / 3)
    for i in (4, 5, 7, 8):
        cusps[i] = norm360(cusps[i - 6] + 180)
    return cusps


def get_house(lon: float, cusps: list[float]) -> int:
    lon = norm360(lon)
    for h in range(12):
        start = norm360(cusps[h])
        end = norm360(cusps[(h + 1) % 12])
        if start <= end:
            if start <= lon < end:
                return h + 1
        elif lon >= start or lon < end:
            return h + 1
    return 1


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


def collect_aspects(lons: dict[str, float]) -> list[dict]:
    names = [n for n in TRAD_BODIES if n in lons]
    found = []
    for i, a in enumerate(names):
        for b in names[i + 1 :]:
            sep = ang_sep(lons[a], lons[b])
            best = None
            for label, exact, orb in ASPECT_DEFS:
                delta = abs(sep - exact)
                if delta <= orb and (best is None or delta < best["orb"]):
                    best = {
                        "a": a, "b": b, "aspect": label,
                        "nature": ASPECT_NATURE[label],
                        "orb": round(delta, 1),
                        "sep": round(sep, 1),
                    }
            if best:
                found.append(best)
    found.sort(key=lambda x: (0 if x["aspect"] in ("刑相", "冲相") else 1, x["orb"]))
    return found


def find_body(chart: dict, name: str) -> dict | None:
    if name == "上升":
        return chart.get("asc")
    for p in chart["placements"]:
        if p["name"] == name:
            return p
    return None


def house_sign(chart: dict, house: int) -> str:
    c = chart["cusps"][house - 1]
    return c["sign"]


def house_ruler(chart: dict, house: int) -> str:
    return DOMICILE[house_sign(chart, house)]


def bodies_in(chart: dict, house: int) -> list[str]:
    return list(chart["housePlanets"].get(house) or [])


def join_names(arr: list[str]) -> str:
    if not arr:
        return ""
    if len(arr) == 1:
        return arr[0]
    if len(arr) == 2:
        return arr[0] + "和" + arr[1]
    return "、".join(arr[:-1]) + "和" + arr[-1]


def aspects_of(chart: dict, name: str) -> list[dict]:
    return [a for a in chart["aspects"] if a["a"] == name or a["b"] == name]


def other_of(asp: dict, name: str) -> str:
    return asp["b"] if asp["a"] == name else asp["a"]


def is_soft(nature: str) -> bool:
    return nature in ("顺畅", "和谐", "融合")


def is_hard(nature: str) -> bool:
    return nature in ("张力", "对峙")


def clip_text(s: str, max_len: int) -> str:
    s = (s or "").strip()
    if len(s) <= max_len:
        return s
    cut = s[:max_len]
    best = -1
    for m in "。！？；":
        i = cut.rfind(m)
        if i > best and i >= 80:
            best = i
    if best >= 80:
        return s[: best + 1]
    return cut.rstrip("，、；：") + "。"


def top_aspect(chart: dict, names: list[str]) -> dict | None:
    seen = []
    keys = set()
    for name in names:
        if not name:
            continue
        for asp in aspects_of(chart, name):
            key = tuple(sorted([asp["a"], asp["b"], asp["aspect"]]))
            if key in keys:
                continue
            keys.add(key)
            seen.append(asp)
    seen.sort(key=lambda x: x["orb"])
    return seen[0] if seen else None


def is_day_chart(chart: dict) -> bool:
    sun = find_body(chart, "太阳")
    if not sun:
        return True
    from_asc = (sun["lon"] - chart["asc"]["lon"] + 360) % 360
    return from_asc >= 180


def build_overall(chart: dict, name: str) -> str:
    sun = find_body(chart, "太阳")
    moon = find_body(chart, "月亮")
    asc = chart["asc"]
    text = (
        f"{name}的主轴是{sun['sign']}太阳、{moon['sign']}月亮、{asc['sign']}上升："
        f"别人先看到{SIGN_MOOD[asc['sign']]}的一面，心里其实更需要{SIGN_MOOD[moon['sign']]}的感觉，"
        f"做选择时又常按{SIGN_MOOD[sun['sign']]}的太阳来定方向。"
    )
    text += f"太阳在第{sun['house']}宫，成就感多半来自「{HOUSE_TOPIC[sun['house']]}」。"
    text += f"月亮在第{moon['house']}宫，心情也常跟「{HOUSE_TOPIC[moon['house']]}」绑在一起。"
    text += "此为昼生盘。" if is_day_chart(chart) else "此为夜生盘。"
    return clip_text(text, 220)


def build_personality(chart: dict, name: str) -> str:
    sun = find_body(chart, "太阳")
    moon = find_body(chart, "月亮")
    mer = find_body(chart, "水星")
    asc = chart["asc"]
    in1 = bodies_in(chart, 1)
    text = (
        f"性格底色：上升{asc['sign']}给外界的第一印象是{SIGN_MOOD[asc['sign']]}；"
        f"月亮{moon['sign']}管情绪习惯，偏{SIGN_MOOD[moon['sign']]}；"
        f"太阳{sun['sign']}管意志，做事时更{SIGN_MOOD[sun['sign']]}。"
    )
    if mer:
        text += f"水星在{mer['sign']}第{mer['house']}宫，思考和表达会往「{HOUSE_TOPIC[mer['house']]}」上靠。"
    if in1:
        text += f"一宫有{join_names(in1)}坐守，自我气质会被这些星直接点亮。"
    asp = top_aspect(chart, ["太阳", "月亮", "水星"])
    if asp:
        text += f"{asp['a']}与{asp['b']}的{asp['aspect']}会写进性格里，成为别人一眼能感到的节奏。"
    return clip_text(text, 280)


def build_career(chart: dict, name: str) -> str:
    sun = find_body(chart, "太阳")
    r10 = house_ruler(chart, 10)
    r10b = find_body(chart, r10)
    mc_sign = chart["mc"]["sign"]
    h6 = house_sign(chart, 6)
    in10 = bodies_in(chart, 10)
    in6 = bodies_in(chart, 6)
    parts = [f"中天在{mc_sign}，公开成就的底色偏{SIGN_MOOD[mc_sign]}"]
    if r10b:
        parts.append(
            f"十宫主{r10}飞入第{r10b['house']}宫（{HOUSE_TOPIC[r10b['house']]}），事业起伏常跟这里连在一起"
        )
    if in10:
        parts.append(f"十宫有{join_names(in10)}坐守，公开成绩主题会被点亮")
    elif in6:
        parts.append(f"六宫有{join_names(in6)}，日常技能与岗位更关键")
    if sun:
        parts.append(
            f"太阳在{sun['sign']}第{sun['house']}宫，干劲多半使在「{CAREER_BY_HOUSE[sun['house']]}」上"
        )
    text = "；".join(parts) + "。"
    text += f"适合方向：{CAREER_BY_SIGN[mc_sign]}。做事风格偏{SIGN_MOOD[h6]}（六宫在{h6}）。"
    asp = top_aspect(chart, [r10, "太阳", "土星"])
    if asp:
        if is_hard(asp["nature"]):
            text += f"{asp['a']}{asp['aspect']}{asp['b']}带来张力，升迁路上宜耐得住磨。"
        elif is_soft(asp["nature"]):
            text += f"{asp['a']}{asp['aspect']}{asp['b']}偏顺，合作或曝光更自然。"
    return clip_text(text, 340)


def build_wealth(chart: dict, name: str) -> str:
    venus = find_body(chart, "金星")
    r2 = house_ruler(chart, 2)
    r2b = find_body(chart, r2)
    h2 = house_sign(chart, 2)
    in2 = bodies_in(chart, 2)
    in8 = bodies_in(chart, 8)
    parts = [f"二宫在{h2}，钱袋脾气偏{SIGN_MOOD[h2]}"]
    if r2b:
        parts.append(
            f"二宫主{r2}飞入第{r2b['house']}宫（{HOUSE_TOPIC[r2b['house']]}），进账松紧常跟这里连在一起"
        )
    if in2:
        parts.append(f"二宫有{join_names(in2)}坐守，自己挣钱存钱的主题会被点亮")
    elif in8:
        parts.append(f"八宫有{join_names(in8)}，共同财务或投资议题更醒目")
    if venus:
        parts.append(
            f"金星在{venus['sign']}第{venus['house']}宫，花钱更听「{WEALTH_SOURCE[venus['house']]}」的话"
        )
    text = "；".join(parts) + "。"
    src = WEALTH_SOURCE[r2b["house"]] if r2b else "本职与可掌控资源"
    text += f"财富主要来自{src}。对金钱的态度：{MONEY_ATTITUDE[h2]}。"
    asp = top_aspect(chart, [r2, "金星", "木星"])
    if asp:
        if is_hard(asp["nature"]):
            text += f"{asp['a']}{asp['aspect']}{asp['b']}带来张力，理财上宜设规则。"
        elif is_soft(asp["nature"]):
            text += f"{asp['a']}{asp['aspect']}{asp['b']}偏顺，合作或顺势进账更自然。"
    return clip_text(text, 340)


def build_love(chart: dict, name: str) -> str:
    venus = find_body(chart, "金星")
    r7 = house_ruler(chart, 7)
    r7b = find_body(chart, r7)
    h7 = house_sign(chart, 7)
    in7 = bodies_in(chart, 7)
    parts = [f"七宫在{h7}，伴侣性格偏{PARTNER_PERSON[h7]}"]
    if r7b:
        parts.append(
            f"七宫主{r7}飞入第{r7b['house']}宫，相处重心常在「{HOUSE_TOPIC[r7b['house']]}」"
        )
    if in7:
        parts.append(f"七宫有{join_names(in7)}坐守，对方身上这些星的特质会更明显")
    if venus:
        parts.append(f"金星在{venus['sign']}第{venus['house']}宫，喜好滤镜偏{SIGN_MOOD[venus['sign']]}")
    text = "；".join(parts) + "。"
    asp = top_aspect(chart, [r7, "金星", "月亮"])
    if asp:
        if is_hard(asp["nature"]):
            text += f"{asp['a']}{asp['aspect']}{asp['b']}提醒：相处里宜少猜忌、多把话说开。"
        elif is_soft(asp["nature"]):
            text += f"{asp['a']}{asp['aspect']}{asp['b']}偏顺，吸引与互动来得更自然。"
    return clip_text(text, 340)


def build_health(chart: dict, name: str) -> str:
    r6 = house_ruler(chart, 6)
    r6b = find_body(chart, r6)
    h1 = chart["asc"]["sign"]
    h6 = house_sign(chart, 6)
    h12 = house_sign(chart, 12)
    in6 = bodies_in(chart, 6)
    in12 = bodies_in(chart, 12)
    parts = [
        f"六宫在{h6}，日常保养节奏偏{SIGN_MOOD[h6]}",
        f"上升在{h1}，体质底色偏{SIGN_MOOD[h1]}",
    ]
    if r6b:
        parts.append(
            f"六宫主{r6}飞入第{r6b['house']}宫，体能起伏常跟「{HOUSE_TOPIC[r6b['house']]}」绑在一起"
        )
    if in6:
        parts.append(f"六宫有{join_names(in6)}，工作消耗会更快反映到身上")
    elif in12:
        parts.append(f"十二宫有{join_names(in12)}，独处恢复与睡眠格外重要")
    text = "；".join(parts) + "。"
    text += f"日常更需留意{HEALTH_ZONE[h6]}。十二宫在{h12}，休息不足时更易出现隐性疲惫。"
    asp = top_aspect(chart, [r6, "月亮", "火星", "土星"])
    if asp and is_hard(asp["nature"]):
        text += f"{asp['a']}{asp['aspect']}{asp['b']}带来张力，压力大时身体会先报警。"
    return clip_text(text, 340)


def translate_section(kind: str, chart: dict) -> str:
    sun = find_body(chart, "太阳")
    moon = find_body(chart, "月亮")
    asc = chart["asc"]
    if kind == "overall":
        return (
            f"Sun in {sign_en(sun['sign'])} (house {sun['house']}), Moon in {sign_en(moon['sign'])} "
            f"(house {moon['house']}), {sign_en(asc['sign'])} rising — first impression {SIGN_MOOD_EN[asc['sign']]}, "
            f"inner need {SIGN_MOOD_EN[moon['sign']]}, will {SIGN_MOOD_EN[sun['sign']]}."
        )
    if kind == "personality":
        return (
            f"Rising {sign_en(asc['sign'])} ({SIGN_MOOD_EN[asc['sign']]}); "
            f"Moon {sign_en(moon['sign'])} ({SIGN_MOOD_EN[moon['sign']]}); "
            f"Sun {sign_en(sun['sign'])} ({SIGN_MOOD_EN[sun['sign']]})."
        )
    if kind == "career":
        mc = chart["mc"]["sign"]
        return f"MC in {sign_en(mc)}: {CAREER_BY_SIGN[mc]} Tenth-ruler story sits in house {find_body(chart, house_ruler(chart, 10))['house']}."
    if kind == "wealth":
        h2 = house_sign(chart, 2)
        r2b = find_body(chart, house_ruler(chart, 2))
        return f"2nd house in {sign_en(h2)}. Money path leans on {WEALTH_SOURCE[r2b['house']] if r2b else 'earned resources'}."
    if kind == "love":
        h7 = house_sign(chart, 7)
        return f"7th house in {sign_en(h7)}: partners tend to feel {SIGN_MOOD_EN[h7]}."
    h6 = house_sign(chart, 6)
    return f"6th house in {sign_en(h6)}. Watch the body themes tied to {sign_en(h6)}."


def analyze(person: dict, chart: dict) -> dict:
    name = person["name"]
    life = LIFE.get(person["id"]) or {}
    specs = [
        ("overall", "整体", "Overview", build_overall(chart, name)),
        ("personality", "性格", "Personality", build_personality(chart, name)),
        ("career", "事业", "Career", build_career(chart, name)),
        ("wealth", "财富", "Wealth", build_wealth(chart, name)),
        ("love", "感情", "Love", build_love(chart, name)),
        ("health", "健康", "Health", build_health(chart, name)),
    ]
    sections = []
    for key, title, title_en, text in specs:
        verify = life.get(key) or ""
        sections.append({
            "id": key,
            "title": title,
            "titleEn": title_en,
            "text": text,
            "textEn": translate_section(key, chart),
            "verify": ("事迹验证：" + verify) if verify else "",
            "verifyEn": ("Life check: " + verify) if verify else "",
        })
    sun = find_body(chart, "太阳")
    day = is_day_chart(chart)
    return {
        "sections": sections,
        "sectZh": "昼生盘" if day else "夜生盘",
        "sectEn": "day chart" if day else "night chart",
        "ruler": DOMICILE[chart["asc"]["sign"]],
        "techniqueZh": (
            "分宫用普拉西德斯制（与星星日记本命盘相同）：看宫头、宫主飞星、落宫与相位。"
            "论述按整体、性格、事业、财富、感情、健康展开，再用公开事迹对照，并非某专栏转载。"
            "出生数据见 Astro-Databank（Rodden 评级）。星盘画法参考宫神星网：上升在左、宫位线、内圈相位。"
        ),
        "techniqueEn": (
            "Placidus houses, as in the Star Diary natal module: cusps, house rulers, occupancy, aspects. "
            "Notes cover overview, personality, career, wealth, love and health, then check public biography. "
            "Birth data: Astro-Databank. Wheel in the Almuten / Gongshenxing layout."
        ),
        "sunHouse": sun["house"] if sun else 1,
    }


def xy(cx: float, cy: float, ang_deg: float, r: float) -> tuple[float, float]:
    a = math.radians(ang_deg)
    return cx + r * math.cos(a), cy - r * math.sin(a)


def svg_wheel(chart: dict) -> str:
    """Almuten-style wheel: ASC at left, zodiac ring, Placidus spokes, inner aspects."""
    cx = cy = 210
    r_out, r_zod, r_house, r_pl, r_asp = 200, 168, 118, 142, 72
    asc = chart["asc"]["lon"]

    def screen(lon: float) -> float:
        return 180.0 - (lon - asc)

    parts = [
        '<svg viewBox="0 0 420 420" class="nat-svg" role="img" aria-label="natal chart">',
        f'<circle cx="{cx}" cy="{cy}" r="{r_out}" fill="#fff" stroke="#111" stroke-width="1.6"/>',
        f'<circle cx="{cx}" cy="{cy}" r="{r_zod}" fill="#fff" stroke="#111" stroke-width="1"/>',
        f'<circle cx="{cx}" cy="{cy}" r="{r_house}" fill="#fafafa" stroke="#111" stroke-width="1"/>',
        f'<circle cx="{cx}" cy="{cy}" r="{r_asp}" fill="#fff" stroke="#bbb" stroke-width="0.8"/>',
    ]
    # Zodiac sectors (equal 30°)
    for i in range(12):
        lon0 = i * 30
        a0, a1 = screen(lon0), screen(lon0 + 30)
        x1, y1 = xy(cx, cy, a0, r_zod)
        x2, y2 = xy(cx, cy, a0, r_out)
        parts.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#111" stroke-width="1"/>'
        )
        mid = screen(lon0 + 15)
        tx, ty = xy(cx, cy, mid, (r_zod + r_out) / 2)
        parts.append(
            f'<text x="{tx:.1f}" y="{ty:.1f}" text-anchor="middle" dominant-baseline="middle" '
            f'font-size="11" font-weight="700" fill="#111">{ZODIAC[i][:1]}</text>'
        )
        # 5° ticks
        for k in range(1, 6):
            ta = screen(lon0 + k * 5)
            inner = r_out - (6 if k == 3 else 3)
            xa, ya = xy(cx, cy, ta, inner)
            xb, yb = xy(cx, cy, ta, r_out)
            parts.append(
                f'<line x1="{xa:.1f}" y1="{ya:.1f}" x2="{xb:.1f}" y2="{yb:.1f}" stroke="#666" stroke-width="0.6"/>'
            )

    # House spokes
    for i, c in enumerate(chart["cusps"]):
        ang = screen(c["lon"])
        wide = 1.8 if i in (0, 3, 6, 9) else 1.0
        col = "#111" if i in (0, 3, 6, 9) else "#444"
        x1, y1 = xy(cx, cy, ang, r_asp)
        x2, y2 = xy(cx, cy, ang, r_zod)
        parts.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{col}" stroke-width="{wide}"/>'
        )
        nxt = chart["cusps"][(i + 1) % 12]["lon"]
        span = (nxt - c["lon"] + 360) % 360
        mid = screen(c["lon"] + span / 2)
        hx, hy = xy(cx, cy, mid, (r_house + r_asp) / 2 + 4)
        parts.append(
            f'<text x="{hx:.1f}" y="{hy:.1f}" text-anchor="middle" dominant-baseline="middle" '
            f'font-size="10" fill="#111">{i + 1}</text>'
        )

    # Aspectarium
    pos = {}
    for b in chart["placements"]:
        pos[b["name"]] = xy(cx, cy, screen(b["lon"]), r_asp - 6)
    for asp in chart["aspects"][:14]:
        if asp["a"] not in pos or asp["b"] not in pos:
            continue
        x1, y1 = pos[asp["a"]]
        x2, y2 = pos[asp["b"]]
        col = ASPECT_COLOR.get(asp["aspect"], "#888")
        dash = "4 3" if asp["aspect"] in ("六分相", "拱相") else "none"
        sw = 1.4 if asp["aspect"] in ("冲相", "刑相", "合相") else 1.0
        parts.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{col}" stroke-width="{sw}" stroke-dasharray="{dash}" opacity="0.85"/>'
        )

    # Planets
    used = {}
    for b in chart["placements"]:
        key = int(round(b["lon"] / 6))
        bump = used.get(key, 0)
        used[key] = bump + 1
        ang = screen(b["lon"])
        rr = r_pl - bump * 12
        x, y = xy(cx, cy, ang, rr)
        parts.append(
            f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" dominant-baseline="middle" '
            f'font-size="14" fill="#111">{GLYPH.get(b["name"], b["name"][:1])}</text>'
        )
    # ASC / MC marks
    for label, lon, extra in (("Asc", chart["asc"]["lon"], True), ("MC", chart["mc"]["lon"], False)):
        ang = screen(lon)
        x, y = xy(cx, cy, ang, r_out + 12)
        parts.append(
            f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" dominant-baseline="middle" '
            f'font-size="9" font-weight="700" fill="#e07000">{label}</text>'
        )
    parts.append("</svg>")
    return "".join(parts)


def compute(person: dict) -> dict:
    utc = birth_utc(person)
    jd = to_jd(utc)
    lons = lons_at(utc)
    eps = obliquity(jd)
    lst = norm360(gmst_deg(jd) + person["lon"])
    cusps_lon = placidus_cusps(lst, person["lat"], eps)
    asc = cusps_lon[0]
    mc = cusps_lon[9]
    day_sect = ((lons["太阳"] - asc + 360) % 360) >= 180

    placements = []
    house_planets = {h: [] for h in range(1, 13)}
    for name in TRAD_BODIES:
        lon = lons[name]
        sign, deg, _ = sign_of(lon)
        house = get_house(lon, cusps_lon)
        item = {
            "name": name,
            "lon": round(lon, 2),
            "sign": sign,
            "signEn": sign_en(sign),
            "deg": round(deg, 1),
            "label": fmt_pos(lon),
            "labelEn": fmt_pos_en(lon),
            "house": house,
            "dignity": dignity(name, sign) if name in ("太阳", "月亮", "水星", "金星", "火星", "木星", "土星") else "",
            "glyph": GLYPH[name],
        }
        if item["dignity"]:
            item["dignityEn"] = DIGNITY_EN.get(item["dignity"], "")
        placements.append(item)
        house_planets[house].append(name)

    cusps = []
    for i, lon in enumerate(cusps_lon):
        sign, _, _ = sign_of(lon)
        cusps.append({
            "house": i + 1,
            "lon": round(lon, 2),
            "sign": sign,
            "label": fmt_pos(lon),
            "labelEn": fmt_pos_en(lon),
        })

    aspect_lons = {p["name"]: p["lon"] for p in placements}
    aspects = collect_aspects(aspect_lons)
    chart = {
        "asc": {
            "name": "上升", "lon": round(asc, 2), "sign": sign_of(asc)[0],
            "label": fmt_pos(asc), "house": 1,
        },
        "mc": {"sign": sign_of(mc)[0], "label": fmt_pos(mc), "lon": round(mc, 2)},
        "placements": placements,
        "cusps": cusps,
        "aspects": aspects,
        "housePlanets": house_planets,
        "lons": aspect_lons,
    }
    note = analyze(person, chart)
    local = datetime.fromisoformat(person["local"])
    fortune_lon = norm360(asc + lons["月亮"] - lons["太阳"]) if day_sect else norm360(asc + lons["太阳"] - lons["月亮"])
    fort_h = get_house(fortune_lon, cusps_lon)
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
        "fortuneHouse": fort_h,
        "fortuneLabel": HOUSE_TOPIC[fort_h],
        "fortuneLabelEn": HOUSE_TOPIC_EN[fort_h],
        "bodies": placements,
        "cusps": cusps,
        "aspects": aspects,
        "sections": note["sections"],
        "techniqueZh": note["techniqueZh"],
        "techniqueEn": note["techniqueEn"],
        "svg": svg_wheel(chart),
        "houseSystem": "普拉西德斯制 Placidus",
    }


def build_nativity(now: datetime) -> dict:
    person = pick_person(now)
    data = compute(person)
    data["date"] = now.strftime("%Y-%m-%d")
    return data
