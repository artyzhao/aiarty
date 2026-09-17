#!/usr/bin/env python3
"""1950–1980 五地同期历史切片，供每日精选「历史」模块使用。"""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Shanghai")
YEAR_START = 1950
YEAR_END = 1980

REGIONS = [
    {"id": "cn", "name": "中国", "nameEn": "China"},
    {"id": "us", "name": "美国", "nameEn": "United States"},
    {"id": "jp", "name": "日本", "nameEn": "Japan"},
    {"id": "sea", "name": "东南亚", "nameEn": "Southeast Asia"},
    {"id": "eu", "name": "欧洲", "nameEn": "Europe"},
]

# (year, month, day|0, region, title_zh, title_en, summary_zh, summary_en)
# day=0 表示仅精确到月
EVENTS: list[tuple] = [
    # ---- 1950s ----
    (1950, 6, 25, "sea", "朝鲜战争爆发", "Korean War begins",
     "朝鲜人民军越过三八线，半岛战争迅速演变为冷战中的热战。",
     "North Korean forces cross the 38th parallel; the war becomes a Cold War flashpoint."),
    (1950, 10, 19, "cn", "中国人民志愿军入朝", "Chinese People's Volunteers enter Korea",
     "志愿军跨过鸭绿江参战，东北亚局势全面紧张。",
     "Chinese forces cross the Yalu River, sharply escalating the Korean War."),
    (1950, 5, 9, "eu", "舒曼计划公布", "Schuman Declaration",
     "法国外长提出煤钢联营构想，欧洲一体化迈出关键一步。",
     "France proposes a coal-and-steel community, a founding step for European integration."),
    (1951, 9, 8, "jp", "《旧金山和约》签署", "Treaty of San Francisco signed",
     "多数同盟国与日本结束战争状态；同日美日安保条约也签署。",
     "Japan ends the state of war with most Allies; the U.S.–Japan Security Treaty is signed the same day."),
    (1951, 9, 8, "us", "美日安保体系成型", "U.S.–Japan security framework takes shape",
     "美国在亚太建立以日本为支点的同盟布局。",
     "Washington anchors its Asia-Pacific alliance structure on Japan."),
    (1952, 4, 28, "jp", "日本恢复主权", "Japan regains sovereignty",
     "旧金山和约生效，盟军占领结束，日本重返国际社会。",
     "The San Francisco Peace Treaty takes effect; the occupation ends."),
    (1953, 7, 27, "sea", "朝鲜停战协定签署", "Korean Armistice Agreement",
     "板门店停战，战线大体固定，但和平条约仍未达成。",
     "Fighting stops near the 38th parallel; a formal peace treaty remains elusive."),
    (1953, 3, 5, "eu", "斯大林逝世", "Stalin dies",
     "苏联最高领导人去世，东欧与全球冷战格局进入调整期。",
     "The Soviet leader's death opens a period of succession and Cold War recalibration."),
    (1954, 5, 7, "sea", "奠边府战役结束", "Battle of Dien Bien Phu ends",
     "越盟击败法军，印度支那战争走向日内瓦会议。",
     "Viet Minh victory ends major French combat power in Indochina."),
    (1954, 7, 21, "sea", "日内瓦会议划分越南", "Geneva Accords divide Vietnam",
     "临时以十七度线分治，为后来越南战争埋下伏笔。",
     "A temporary partition at the 17th parallel sets the stage for later conflict."),
    (1954, 9, 8, "sea", "东南亚条约组织成立", "SEATO founded",
     "美国主导的反共集体安全机制覆盖部分东南亚国家。",
     "A U.S.-led collective-security pact covers parts of Southeast Asia."),
    (1955, 4, 18, "sea", "万隆会议召开", "Bandung Conference opens",
     "亚非国家在印尼聚会，不结盟与反殖民议程登上舞台。",
     "Asian and African states meet in Indonesia and elevate nonalignment."),
    (1955, 5, 14, "eu", "华沙条约组织成立", "Warsaw Pact formed",
     "苏联与东欧国家建立军事同盟，对抗北约。",
     "The Soviet bloc creates a military alliance to counter NATO."),
    (1955, 10, 26, "eu", "奥地利国家条约生效", "Austrian State Treaty era",
     "奥地利恢复独立并宣布永久中立，冷战夹缝中的特例。",
     "Austria regains independence and permanent neutrality."),
    (1956, 10, 23, "eu", "匈牙利事件爆发", "Hungarian Uprising begins",
     "布达佩斯民众起义，随后遭苏军镇压，震动东欧。",
     "A popular uprising in Budapest is crushed by Soviet forces."),
    (1956, 10, 29, "eu", "苏伊士危机", "Suez Crisis",
     "英法以军事介入埃及，美国与苏联施压，旧殖民秩序受挫。",
     "Britain, France and Israel intervene in Egypt; U.S. and Soviet pressure follows."),
    (1956, 9, 15, "cn", "中共八大召开", "8th CPC National Congress",
     "大会强调经济建设与集体领导，是五十年代重要政治节点。",
     "The congress stresses economic construction and collective leadership."),
    (1957, 10, 4, "eu", "苏联发射斯普特尼克", "Sputnik 1 launched",
     "人类第一颗人造卫星升空，美苏太空竞赛拉开帷幕。",
     "The first artificial satellite triggers the Space Race."),
    (1957, 3, 25, "eu", "《罗马条约》签署", "Treaties of Rome signed",
     "欧洲经济共同体成立，西欧一体化进入新阶段。",
     "The EEC is founded, deepening West European integration."),
    (1958, 1, 1, "eu", "欧洲经济共同体启动", "EEC begins operations",
     "共同市场机制启动，关税同盟逐步推进。",
     "The Common Market starts moving toward a customs union."),
    (1958, 5, 1, "cn", "大跃进运动兴起", "Great Leap Forward gathers pace",
     "全国掀起工农业跃进浪潮，随后引发严重经济与社会后果。",
     "A nationwide production campaign accelerates, with severe later consequences."),
    (1958, 1, 31, "us", "美国发射探险者1号", "Explorer 1 launched",
     "美国首颗卫星成功，太空竞赛进入实质对抗。",
     "America's first satellite succeeds amid intensifying space rivalry."),
    (1959, 1, 1, "us", "古巴革命胜利影响美洲", "Cuban Revolution reshapes the Americas",
     "卡斯特罗掌权，冷战迅速延伸到加勒比。",
     "Castro takes power; the Cold War deepens in the Caribbean."),
    (1959, 9, 26, "jp", "台风韦拉重创日本", "Typhoon Vera devastates Japan",
     "伊势湾台风造成惨重伤亡，推动防灾体制强化。",
     "Isewan Typhoon causes massive loss and drives disaster reforms."),
    (1959, 3, 10, "cn", "西藏上层反动集团发动武装叛乱", "Armed rebellion in Tibet",
     "拉萨等地发生武装冲突，中央政府迅速平息叛乱。",
     "Armed clashes erupt in Lhasa; Beijing moves to suppress the rebellion."),

    # ---- 1960s ----
    (1960, 5, 1, "us", "U-2事件", "U-2 incident",
     "美军侦察机在苏联上空被击落，美苏峰会陷入危机。",
     "A U.S. spy plane is shot down over the USSR, derailing summit diplomacy."),
    (1960, 6, 19, "jp", "安保斗争高潮", "Anpo protests peak",
     "反对修订美日安保条约的大规模示威震动日本政坛。",
     "Mass protests against the revised U.S.–Japan Security Treaty shake politics."),
    (1960, 8, 16, "sea", "塞浦路斯独立（冷战侧影）", "Cyprus independence",
     "英属殖民地独立浪潮持续，冷战外围格局再变。",
     "Decolonization continues, reshaping Cold War peripheries."),
    (1961, 4, 12, "eu", "加加林进入太空", "Gagarin orbits Earth",
     "苏联完成人类首次载人航天，冷战宣传战升温。",
     "The USSR sends the first human into orbit."),
    (1961, 8, 13, "eu", "柏林墙开始修筑", "Berlin Wall construction begins",
     "东德封锁东西柏林，欧洲分裂的象征固定下来。",
     "East Germany seals East Berlin; division becomes concrete."),
    (1961, 4, 17, "us", "猪湾入侵失败", "Bay of Pigs invasion fails",
     "美国支持的流亡武装登陆古巴失败，肯尼迪政府受挫。",
     "A U.S.-backed exile landing in Cuba collapses."),
    (1962, 10, 16, "us", "古巴导弹危机", "Cuban Missile Crisis",
     "美苏核对抗逼近边缘，两周后以撤出导弹告一段落。",
     "Nuclear brinkmanship ends after a tense two-week standoff."),
    (1962, 10, 16, "eu", "欧洲笼罩核危机阴影", "Europe under nuclear crisis shadow",
     "北约欧洲盟友高度戒备，冷战威慑逻辑暴露无遗。",
     "NATO Europe goes on high alert as deterrence logic is tested."),
    (1962, 9, 29, "cn", "中印边境自卫反击战", "Sino-Indian border war",
     "中印在边境爆发军事冲突，南亚地缘格局改写。",
     "China and India fight a border war that reshapes South Asian geopolitics."),
    (1963, 11, 22, "us", "肯尼迪遇刺", "Kennedy assassinated",
     "总统在达拉斯遇刺身亡，美国政治与社会震荡。",
     "The U.S. president is killed in Dallas, shaking American politics."),
    (1963, 8, 28, "us", "马丁·路德·金发表演说", "King delivers “I Have a Dream”",
     "民权运动在华盛顿大游行中达到高潮。",
     "The March on Washington peaks the civil-rights movement."),
    (1963, 6, 20, "eu", "美苏热线建立", "Moscow–Washington hotline",
     "危机后建立直接通信，降低误判风险。",
     "A direct link aims to reduce miscalculation after Cuba."),
    (1964, 8, 2, "sea", "东京湾事件", "Gulf of Tonkin incident",
     "美越海上冲突成为美国扩大越战的关键由头。",
     "Naval clashes become a key rationale for wider U.S. involvement."),
    (1964, 10, 16, "cn", "中国第一颗原子弹爆炸成功", "China's first atomic test",
     "罗布泊试爆成功，中国进入核国家行列。",
     "A successful test at Lop Nor makes China a nuclear power."),
    (1964, 10, 10, "jp", "东京奥运会开幕", "Tokyo Olympics open",
     "日本以奥运展示战后重建与国际回归。",
     "Japan showcases postwar recovery on a global stage."),
    (1964, 8, 7, "us", "东京湾决议", "Gulf of Tonkin Resolution",
     "国会授权扩大在越南的军事行动。",
     "Congress authorizes expanded military action in Vietnam."),
    (1965, 2, 7, "sea", "美军开始大规模轰炸北越", "Rolling Thunder begins",
     "越战空袭升级，东南亚成为冷战主战场之一。",
     "Sustained U.S. bombing escalates the Vietnam War."),
    (1965, 8, 9, "sea", "新加坡独立", "Singapore becomes independent",
     "脱离马来西亚后建国，城市国家发展道路开启。",
     "Singapore separates from Malaysia and becomes a city-state."),
    (1965, 9, 30, "sea", "印尼九三〇事件", "Indonesia’s 30 September Movement",
     "政局剧变后大规模反共清洗，苏哈托势力上升。",
     "A coup attempt is followed by mass anti-communist killings; Suharto rises."),
    (1965, 11, 22, "jp", "日韩基本条约生效前后", "Japan–Korea normalization era",
     "日韩邦交正常化推进，东亚冷战同盟链更紧。",
     "Tokyo–Seoul normalization tightens the Cold War alliance chain."),
    (1966, 5, 16, "cn", "文化大革命开始", "Cultural Revolution begins",
     "“五一六通知”标志着运动全面发动，政治与社会剧烈动荡。",
     "The May 16 Circular marks the start of a sweeping political upheaval."),
    (1966, 8, 18, "cn", "红卫兵运动兴起", "Red Guards rise",
     "大规模群众运动冲击党政机构与社会秩序。",
     "Mass youth mobilization disrupts party organs and social order."),
    (1967, 6, 5, "eu", "第三次中东战争影响欧洲能源", "Six-Day War jolts Europe",
     "中东战局牵动欧洲外交与石油供应担忧。",
     "The Middle East war raises European energy and diplomacy concerns."),
    (1967, 8, 8, "sea", "东盟成立", "ASEAN founded",
     "印尼、马来西亚、菲律宾、新加坡、泰国在曼谷成立东盟。",
     "Five states found ASEAN in Bangkok for regional cooperation."),
    (1967, 6, 17, "cn", "中国第一颗氢弹爆炸成功", "China's first hydrogen bomb test",
     "热核武器试验成功，战略威慑能力跃升。",
     "A thermonuclear test advances China's strategic deterrent."),
    (1968, 1, 30, "sea", "越南春节攻势", "Tet Offensive",
     "北越与南方游击队发动全面进攻，动摇美国国内对战争的信心。",
     "A nationwide offensive shakes U.S. public support for the war."),
    (1968, 4, 4, "us", "马丁·路德·金遇刺", "Martin Luther King Jr. assassinated",
     "民权领袖遇害，美国多地爆发抗议与骚乱。",
     "The civil-rights leader is killed; protests erupt across the U.S."),
    (1968, 5, 1, "eu", "法国五月风暴", "May 1968 in France",
     "学生与工人运动冲击戴高乐政府，西欧社会进入动荡年。",
     "Student–worker unrest rocks France and much of Western Europe."),
    (1968, 8, 20, "eu", "苏军入侵捷克斯洛伐克", "Soviet invasion of Czechoslovakia",
     "布拉格之春被镇压，“有限主权论”公开化。",
     "The Prague Spring is crushed; the Brezhnev Doctrine is asserted."),
    (1968, 6, 5, "us", "罗伯特·肯尼迪遇刺", "Robert F. Kennedy assassinated",
     "总统竞选中遇刺，美国政治暴力阴影加深。",
     "The presidential candidate is killed, deepening political trauma."),
    (1968, 10, 12, "jp", "日本高速增长高峰期", "Japan at peak high-growth years",
     "日本处于高速增长期，出口与城市化快速推进。",
     "Japan is deep in high-speed growth, exports and urbanization."),
    (1968, 1, 1, "jp", "日本成为世界第二大经济体前后", "Japan nears No.2 economy status",
     "六十年代末日本经济总量跃居资本主义世界前列。",
     "By the late 1960s Japan ranks among the top capitalist economies."),
    (1969, 1, 18, "jp", "东大安田讲堂事件", "University of Tokyo Yasuda Auditorium incident",
     "学生运动与校方对峙，日本学潮进入高潮。",
     "Campus protests peak in a standoff at Todai."),
    (1969, 11, 21, "jp", "佐藤—尼克松冲绳归还协议", "Sato–Nixon Okinawa reversion deal",
     "双方就冲绳施政权归还达成协议，美日同盟再调整。",
     "Tokyo and Washington agree on Okinawa’s reversion."),
    (1969, 7, 20, "us", "阿波罗11号登月", "Apollo 11 Moon landing",
     "阿姆斯特朗踏上月球，美国在太空竞赛中取得标志性胜利。",
     "Armstrong walks on the Moon; a landmark U.S. Space Race win."),
    (1969, 3, 2, "cn", "珍宝岛冲突", "Zhenbao Island clash",
     "中苏边境武装冲突，促使中国对外战略重新评估。",
     "Sino-Soviet border fighting pushes Beijing to reassess strategy."),
    (1969, 11, 17, "us", "美苏开始战略武器谈判", "SALT talks begin",
     "限制战略武器会谈启动，缓和进程加速。",
     "Strategic arms talks open a path toward détente."),

    # ---- 1970s ----
    (1970, 3, 18, "sea", "柬埔寨政变", "Cambodian coup",
     "朗诺政变推翻西哈努克，印支战火进一步扩大。",
     "Lon Nol ousts Sihanouk; Indochina war expands."),
    (1970, 4, 30, "us", "美军进入柬埔寨", "U.S. troops enter Cambodia",
     "扩大战场引发美国国内强烈抗议。",
     "The Cambodian incursion triggers fierce domestic protests."),
    (1970, 12, 15, "jp", "三岛由纪夫事件", "Mishima incident",
     "作家三岛由纪夫兵变未遂后自杀，震动日本舆论。",
     "Writer Yukio Mishima dies after a failed coup spectacle."),
    (1971, 7, 9, "cn", "基辛格秘密访华", "Kissinger’s secret visit to China",
     "为尼克松访华铺路，中美关系解冻进入实质阶段。",
     "The secret trip prepares Nixon’s visit and a China–U.S. thaw."),
    (1971, 10, 25, "cn", "中国恢复联合国合法席位", "PRC seated at the UN",
     "第26届联大通过2758号决议，中华人民共和国恢复席位。",
     "UNGA Resolution 2758 seats the PRC at the United Nations."),
    (1971, 8, 15, "us", "尼克松冲击", "Nixon Shock",
     "美元与黄金脱钩，布雷顿森林体系瓦解，冲击日欧经济。",
     "The dollar leaves gold; Bretton Woods unravels, jolting Japan and Europe."),
    (1971, 8, 15, "jp", "日本面对尼克松冲击", "Japan faces the Nixon Shock",
     "出口导向型经济被迫应对汇率与贸易环境剧变。",
     "Export-led Japan confronts abrupt exchange-rate and trade shifts."),
    (1972, 2, 21, "cn", "尼克松访华", "Nixon visits China",
     "中美发表《上海公报》，冷战大三角格局显现。",
     "The Shanghai Communiqué marks a strategic realignment."),
    (1972, 2, 21, "us", "美国对华破冰", "U.S. opens to China",
     "尼克松政府借对华缓和重塑全球战略。",
     "Washington uses opening to China to reshape global strategy."),
    (1972, 5, 15, "jp", "冲绳回归日本", "Okinawa reverts to Japan",
     "施政权由美国交还日本，美日同盟进入新阶段。",
     "Administrative rights return to Japan within the alliance framework."),
    (1972, 9, 29, "cn", "中日邦交正常化", "China–Japan normalization",
     "田中角荣访华，两国建立外交关系。",
     "Tanaka visits Beijing; diplomatic relations are established."),
    (1972, 9, 5, "eu", "慕尼黑奥运会恐怖袭击", "Munich Olympics attack",
     "以色列运动员遭袭击遇难，国际反恐议题升温。",
     "Israeli athletes are killed; counterterrorism rises on the agenda."),
    (1973, 1, 27, "sea", "巴黎和平协定签署", "Paris Peace Accords",
     "美国承诺撤军，越战进入尾声阶段。",
     "The U.S. agrees to withdraw; the Vietnam War enters its endgame."),
    (1973, 10, 6, "eu", "第四次中东战争与石油危机", "Yom Kippur War and oil shock",
     "石油禁运冲击西欧经济，滞胀时代加深。",
     "An oil embargo hits Western Europe amid stagflation."),
    (1973, 10, 6, "us", "美国面临石油危机", "U.S. oil crisis",
     "油价暴涨冲击美国经济与能源政策。",
     "Oil prices spike and reshape U.S. energy politics."),
    (1973, 10, 6, "jp", "日本第一次石油危机", "Japan’s first oil crisis",
     "高度依赖进口石油的日本经济受到猛烈冲击。",
     "Oil-import-dependent Japan takes a severe economic hit."),
    (1974, 8, 8, "us", "尼克松辞职", "Nixon resigns",
     "水门事件迫使总统辞职，美国宪政危机告一段落。",
     "Watergate forces a presidential resignation."),
    (1974, 4, 25, "eu", "葡萄牙康乃馨革命", "Carnation Revolution in Portugal",
     "军方政变结束独裁，推动非洲殖民地独立浪潮。",
     "A military revolt ends dictatorship and accelerates decolonization."),
    (1975, 4, 30, "sea", "西贡解放", "Fall of Saigon",
     "北越军队进入西贡，越南战争结束，国家走向统一。",
     "North Vietnamese forces take Saigon; the war ends and reunification follows."),
    (1975, 4, 17, "sea", "红色高棉占领金边", "Khmer Rouge take Phnom Penh",
     "柬埔寨政权更迭，随后进入极端统治时期。",
     "The Khmer Rouge seize power, beginning a brutal regime."),
    (1975, 11, 20, "eu", "佛朗哥去世", "Franco dies",
     "西班牙开启民主转型，南欧政治地图改写。",
     "Spain begins a democratic transition after Franco."),
    (1975, 8, 1, "eu", "赫尔辛基协定签署", "Helsinki Accords",
     "欧安会成果确认战后边界并写入人权条款。",
     "The CSCE deals confirm borders and include human-rights language."),
    (1976, 9, 9, "cn", "毛泽东逝世", "Mao Zedong dies",
     "中国最高领导人去世，政治格局进入重大转折前夜。",
     "China’s paramount leader dies; a major political turn nears."),
    (1976, 10, 6, "cn", "粉碎“四人帮”", "Gang of Four arrested",
     "华国锋等采取措施，文化大革命结束。",
     "The Cultural Revolution ends after the Gang of Four is arrested."),
    (1976, 7, 28, "cn", "唐山大地震", "Tangshan earthquake",
     "华北发生特大地震，造成巨大人员伤亡与破坏。",
     "A catastrophic quake devastates Tangshan."),
    (1977, 8, 16, "us", "猫王去世", "Elvis Presley dies",
     "流行文化偶像去世，折射七十年代美国社会情绪。",
     "A pop icon's death marks a cultural moment in 1970s America."),
    (1977, 6, 15, "eu", "西班牙首次民主大选", "Spain’s first democratic elections",
     "佛朗哥之后的民主重建迈出关键一步。",
     "Post-Franco Spain holds its first democratic elections."),
    (1978, 12, 18, "cn", "中共十一届三中全会", "Third Plenum of the 11th Central Committee",
     "会议确立改革开放方向，中国进入新时代。",
     "The plenum sets the course for reform and opening."),
    (1978, 8, 12, "cn", "《中日和平友好条约》签署", "China–Japan Peace and Friendship Treaty",
     "两国关系在邦交正常化后进一步法律化。",
     "Ties are further formalized after normalization."),
    (1978, 9, 17, "us", "戴维营协议", "Camp David Accords",
     "埃以达成框架协议，中东和平进程出现突破。",
     "Egypt and Israel reach a framework breakthrough."),
    (1978, 5, 8, "eu", "意大利总理莫罗遇害余波", "Aftermath of Moro murder",
     "红色旅绑架杀害莫罗，西欧左翼恐怖主义阴影加深。",
     "The Red Brigades’ killing of Aldo Moro deepens European terror fears."),
    (1979, 1, 1, "cn", "中美正式建交", "China–U.S. diplomatic relations",
     "两国建立大使级外交关系，冷战三角格局巩固。",
     "Full diplomatic relations begin; the strategic triangle hardens."),
    (1979, 1, 1, "us", "美国与中华人民共和国建交", "U.S. recognizes the PRC",
     "美台“断交”同时完成对华关系正常化。",
     "Washington derecognizes Taipei while recognizing Beijing."),
    (1979, 2, 17, "cn", "对越自卫反击战", "Sino-Vietnamese War",
     "中越爆发边境战争，印支与中苏关系进一步复杂化。",
     "A brief border war complicates Indochina and Sino-Soviet ties."),
    (1979, 2, 17, "sea", "印支冲突再起", "Indochina conflict flares",
     "越南出兵柬埔寨后地区局势持续紧张。",
     "After Vietnam’s Cambodia intervention, regional tension stays high."),
    (1979, 3, 26, "eu", "埃以和平条约签署", "Egypt–Israel peace treaty",
     "戴维营后续落地，中东地缘出现结构性变化。",
     "Camp David yields a formal peace treaty."),
    (1979, 5, 3, "eu", "撒切尔夫人当选英国首相", "Thatcher becomes UK prime minister",
     "保守党上台，西欧转向新自由主义政策实验。",
     "Conservatives win; neoliberal policy experiments accelerate."),
    (1979, 6, 18, "us", "美苏签署第二阶段限制战略武器条约", "SALT II signed",
     "缓和仍在推进，但年底阿富汗事件将改变气氛。",
     "Arms control advances, though Afghanistan will soon chill détente."),
    (1979, 12, 24, "eu", "苏军进入阿富汗", "Soviet intervention in Afghanistan",
     "苏联出兵，缓和终结，新一轮冷战升温。",
     "Soviet troops enter Afghanistan; détente collapses."),
    (1979, 12, 24, "us", "卡特政府强硬回应阿富汗", "Carter hardens over Afghanistan",
     "美国采取制裁与抵制奥运等措施对抗苏联。",
     "Washington answers with sanctions and an Olympic boycott path."),
    (1979, 7, 1, "jp", "日本面对第二次石油冲击余波", "Japan manages second oil shock",
     "伊朗革命后油价再涨，日本加速节能与产业结构调整。",
     "Post-Iran oil spikes push Japan toward energy saving and restructuring."),

    # ---- 1980 ----
    (1980, 5, 18, "sea", "光州事件", "Gwangju Uprising",
     "韩国光州民众抗争遭镇压，威权体制面临挑战。",
     "A civic uprising in Gwangju is suppressed under authoritarian rule."),
    (1980, 8, 14, "eu", "波兰团结工会兴起", "Solidarity rises in Poland",
     "格但斯克罢工催生独立工会，东欧异议运动壮大。",
     "Gdańsk strikes birth Solidarity; dissent grows in Eastern Europe."),
    (1980, 9, 22, "eu", "两伊战争爆发影响欧洲能源", "Iran–Iraq War hits energy markets",
     "海湾开战推高油价，欧洲与日本能源安全再受考验。",
     "Gulf war raises oil prices and tests energy security."),
    (1980, 11, 4, "us", "里根当选总统", "Reagan elected president",
     "共和党获胜，美国对苏政策与国内议程转向更强硬保守。",
     "A Republican win hardens U.S. Cold War and domestic conservatism."),
    (1980, 5, 17, "cn", "审判林彪、江青反革命集团", "Trial of the Lin Biao and Jiang Qing cliques",
     "公开审判成为拨乱反正的重要象征。",
     "A public trial symbolizes the drive to set things right."),
    (1980, 8, 26, "jp", "日本汽车产业扩张高峰期", "Japan auto industry peak expansion",
     "日系车在美欧市场快速扩张，贸易摩擦升温。",
     "Japanese cars surge in Western markets, fueling trade friction."),
    (1980, 1, 20, "us", "卡特主义提出", "Carter Doctrine",
     "美国宣称将保卫波斯湾利益，冷战与能源安全绑定。",
     "Washington pledges to defend Persian Gulf interests."),
    (1980, 4, 1, "sea", "东南亚难民潮持续", "Indochina refugee crisis continues",
     "印支变局后大量难民涌向泰国等地，引发国际救援。",
     "Refugees flee Indochina into Thailand and beyond."),
    (1950, 1, 14, "cn", "中苏同盟初期巩固", "Sino-Soviet alliance consolidates",
     "新中国与苏联关系密切，社会主义阵营东翼成型。",
     "New China aligns closely with the USSR in the early Cold War."),
    (1950, 1, 31, "us", "杜鲁门下令研制氢弹", "Truman orders H-bomb work",
     "美国加速热核武器计划，军备竞赛升级。",
     "The U.S. accelerates thermonuclear weapons development."),
    (1952, 11, 1, "us", "美国氢弹试验", "U.S. hydrogen bomb test",
     "艾维威环礁试验成功，核军备进入新阶段。",
     "A successful test marks a new nuclear-arms phase."),
    (1953, 6, 2, "eu", "伊丽莎白二世加冕", "Elizabeth II coronation",
     "英国举行盛大加冕典礼，战后英联邦象征更新。",
     "Britain crowns Elizabeth II in a postwar Commonwealth spectacle."),
    (1955, 7, 18, "eu", "日内瓦四国首脑会议", "Geneva Summit of 1955",
     "美英法苏首脑会晤，缓和尝试短暂出现。",
     "U.S., UK, France and USSR leaders meet in a brief thaw attempt."),
    (1960, 9, 26, "us", "肯尼迪—尼克松电视辩论", "Kennedy–Nixon TV debate",
     "电视辩论改变美国竞选政治形态。",
     "Televised debates reshape U.S. campaign politics."),
    (1963, 1, 14, "eu", "法德爱丽舍宫条约", "Élysée Treaty",
     "法德和解制度化，成为欧洲一体化核心动力。",
     "Franco-German reconciliation is institutionalized."),
    (1965, 2, 21, "us", "马尔科姆·X遇刺", "Malcolm X assassinated",
     "美国黑人民权运动内部重要人物遇害。",
     "A major Black-rights figure is assassinated."),
    (1970, 4, 22, "us", "首个世界地球日", "First Earth Day",
     "美国环保运动走向大众化。",
     "Environmentalism goes mainstream in the U.S."),
    (1971, 4, 19, "sea", "孟加拉国独立战争（南亚溢出）", "Bangladesh Liberation War",
     "南亚变局牵动印巴与大国博弈，难民潮波及地区。",
     "South Asian upheaval draws in India, Pakistan and great powers."),
    (1973, 1, 1, "eu", "英国加入欧共体", "UK joins the EEC",
     "英国、爱尔兰与丹麦加入，欧洲共同体扩大。",
     "Britain, Ireland and Denmark enlarge the Community."),
    (1974, 7, 15, "eu", "塞浦路斯危机", "Cyprus crisis of 1974",
     "希腊政变与土耳其出兵导致岛屿实际分裂。",
     "A Greek-backed coup and Turkish invasion leave Cyprus divided."),
    (1975, 4, 1, "jp", "日本经济进入稳定增长转换", "Japan shifts from high growth",
     "石油危机后日本从高速增长转向稳定增长模式。",
     "After oil shocks, Japan moves from high growth to steadier expansion."),
    (1976, 7, 4, "us", "美国建国二百周年", "U.S. Bicentennial",
     "建国两百周年庆典伴随后水门时代的政治重建。",
     "Bicentennial celebrations unfold in a post-Watergate mood."),
    (1977, 9, 7, "us", "巴拿马运河条约签署", "Panama Canal Treaties signed",
     "美国同意逐步移交运河主权，拉美政策调整。",
     "Washington agrees to transfer canal control over time."),
    (1978, 10, 16, "eu", "若望·保禄二世当选教皇", "John Paul II elected pope",
     "波兰籍教皇当选，对东欧天主教与异议运动影响深远。",
     "A Polish pope is elected, with deep impact on Eastern Europe."),
    (1979, 11, 4, "us", "伊朗人质危机开始", "Iran hostage crisis begins",
     "德黑兰美国大使馆被占，卡特政府陷入外交危机。",
     "The U.S. embassy in Tehran is seized; Carter faces a crisis."),
    (1980, 2, 22, "us", "美国队冰球赛“冰上奇迹”", "Miracle on Ice",
     "冬奥会美国冰球队击败苏联队，冷战体育象征意味强烈。",
     "The U.S. hockey team upsets the USSR in a Cold War sports moment."),
]


def _valid_events() -> list[dict]:
    region_ids = {r["id"] for r in REGIONS}
    out: list[dict] = []
    for row in EVENTS:
        year, month, day, region, title, title_en, summary, summary_en = row
        if region not in region_ids:
            continue
        if not (YEAR_START <= year <= YEAR_END):
            continue
        if not (1 <= month <= 12):
            continue
        out.append(
            {
                "year": year,
                "month": month,
                "day": day or 0,
                "region": region,
                "title": title,
                "titleEn": title_en,
                "summary": summary,
                "summaryEn": summary_en,
            }
        )
    return out


def _slot_for(day: date) -> tuple[int, int]:
    """把日历日映射到 1950–1980 切片。

    每天换一个年份（差异更明显）；月份取当天公历月，形成「这一年的这个月」对照。
    旧算法按月连号推进，相邻两天常同属一年，事件几乎不变，看起来像没刷新。
    """
    years = YEAR_END - YEAR_START + 1
    origin = date(2020, 1, 1)
    year = YEAR_START + ((day.toordinal() - origin.toordinal()) % years)
    month = day.month
    return year, month


def _month_distance(y1: int, m1: int, y2: int, m2: int) -> int:
    return abs((y1 * 12 + m1) - (y2 * 12 + m2))


def _date_label(ev: dict, lang: str = "zh") -> str:
    y, m, d = ev["year"], ev["month"], ev["day"]
    if lang == "en":
        months = [
            "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ]
        if d:
            return f"{months[m]} {d}, {y}"
        return f"{months[m]} {y}"
    if d:
        return f"{y}年{m}月{d}日"
    return f"{y}年{m}月"


def _pick_for_region(events: list[dict], region: str, year: int, month: int, limit: int = 4) -> list[dict]:
    pool = [e for e in events if e["region"] == region]
    day_seed = (year * 12 + month) % 7

    def score(e: dict) -> tuple:
        # 月份距离优先，再同年；避免「换月不换事件」
        year_dist = abs(e["year"] - year)
        if e["year"] == year:
            month_dist = abs(e["month"] - month)
        else:
            month_dist = 6 + abs(e["month"] - month)
        day_bias = abs((e["day"] or 15) - 15)
        # 轻微打散，让相邻切片排序不同
        jitter = (hash((e["title"], e["year"], e["month"])) + day_seed) % 5
        return (year_dist, month_dist, jitter, day_bias, e["year"], e["month"], e["day"])

    same_year = [e for e in pool if e["year"] == year]
    near = [e for e in pool if abs(e["year"] - year) == 1]
    # 再扩到同年份段，保证每月都有料
    band = [e for e in pool if abs(e["year"] - year) <= 2]
    candidates = sorted(same_year, key=score)
    if len(candidates) < limit:
        candidates = candidates + sorted(near, key=score)
    if len(candidates) < limit:
        candidates = candidates + sorted(band, key=score)

    picked = []
    seen = set()
    for e in candidates:
        key = (e["title"], e["year"], e["month"])
        if key in seen:
            continue
        seen.add(key)
        picked.append(e)
        if len(picked) >= limit:
            break
    return picked


def _china_essay(year: int, month: int, cn_events: list[dict]) -> dict:
    """当日切片对应的中国近现代史专述：先交代近代脉络，再写本阶段具体进程。"""
    eras = [
        {
            "lo": 1950, "hi": 1953,
            "title": "建国初期：一边倒、土改与抗美援朝",
            "titleEn": "Early PRC: alliance, land reform, Korea",
            "era": "中国近现代史 · 1949年后的巩固阶段",
            "eraEn": "Modern China · consolidation after 1949",
            "paras": [
                "近代中国自鸦片战争后陷入半殖民地半封建社会：条约口岸、赔款与法外特权不断加深，洋务运动未能改变国力结构。辛亥革命推翻帝制，但军阀割据与日本侵华使统一长期落空；抗日战争与解放战争之后，中华人民共和国于1949年成立，近代史的“救亡”命题转入如何在冷战夹缝中站稳脚跟。",
                "1950年前后，新政权同时推进土地改革、镇压反革命与向苏联“一边倒”。朝鲜战争爆发后，志愿军入朝作战，把东北边境安全与国际承认问题绑在一起。战争直到1953年停战，国内则加速把乡村地主土地所有制改成农民个体所有，为国家工业化抽取剩余准备条件。",
                "与时间线对照：此时美国在亚太搭同盟，欧洲谈煤钢联营，日本尚在占领体制尾声。中国选择站在社会主义阵营一侧，用热战与土改完成“站起来”的第一课——代价是与西方隔绝、财政军事负担加重，也使新中国第一次以大国身份进入东北亚均势。",
            ],
            "parasEn": [
                "After the Opium War, China was forced into a semi-colonial order of ports, indemnities and extraterritoriality. The 1911 Revolution ended the monarchy but not fragmentation; war with Japan and then civil war delayed unity. The PRC’s founding in 1949 shifted the modern-history question from survival to holding ground in a Cold War world.",
                "Around 1950 the new state combined land reform, political consolidation and a Soviet-leaning alliance. The Korean War tied border security to international recognition until the 1953 armistice. Land reform also created the rural surplus later used for industrialization.",
                "On the same timeline the U.S. built Pacific alliances, Europe sketched the coal-steel community, and Japan was leaving occupation. China entered Northeast Asian balance as a socialist-camp power—at the cost of Western isolation and a heavy military burden.",
            ],
        },
        {
            "lo": 1954, "hi": 1957,
            "title": "社会主义改造与八大前后",
            "titleEn": "Socialist transformation and the Eighth Congress",
            "era": "中国近现代史 · 从新民主主义转向社会主义",
            "eraEn": "Modern China · from New Democracy to socialism",
            "paras": [
                "近代史留下的课题是：如何把一个被战争打烂的农业国变成有计划的工业国。1954年一届全国人大通过宪法，国家政治架构成型；农业合作化、手工业与资本主义工商业改造在数年内基本完成，城市里的公私合营改变了产权结构。",
                "1956年中共八大判断国内主要矛盾已是先进工业国要求与落后农业国现实之间的矛盾，强调集体领导与经济建设。国际上，万隆会议让中国在亚非世界获得舞台，日内瓦会议则确认印度支那停火。整风随即转向反右，政治空气在1957年迅速收紧。",
                "时间线上欧洲签《罗马条约》、苏联放卫星，东南亚去殖民。中国此阶段的关键，不是再打一场对外战争，而是用制度改造把近代以来“一盘散沙”的社会重新组织起来——也为随后的跃进准备了集中动员的管道。",
            ],
            "parasEn": [
                "The modern-history task was to industrialize a war-torn agrarian country. The 1954 constitution set the state form; cooperativization and joint state-private ownership remade property in city and countryside.",
                "The 1956 Eighth Congress stressed economic construction; Bandung and Geneva raised China’s Afro-Asian profile. The 1957 Anti-Rightist turn then tightened politics.",
                "While Europe signed the Treaties of Rome and the USSR launched Sputnik, China reorganized a fragmented society—creating the mobilization channels later used in the Great Leap.",
            ],
        },
        {
            "lo": 1958, "hi": 1961,
            "title": "大跃进、人民公社与严重困难",
            "titleEn": "Great Leap, communes, and crisis",
            "era": "中国近现代史 · 高速度工业化的挫折",
            "eraEn": "Modern China · a failed sprint to industry",
            "paras": [
                "近代中国屡次想用“跃进”追上列强：洋务、维新、国民政府十年建设都受制于战争与分裂。1958年的大跃进把这一冲动推到极端——大炼钢铁、公共食堂、人民公社，试图在短时间内完成英国用百年走完的工业化。",
                "高指标与浮夸风破坏了农业统计和分配，1959–1961年出现严重经济困难与人口损失。中苏关系也在此时裂痕扩大，援助和技术来源变得不确定。调整政策要到1961年才逐步收缩公社规模、恢复部分自留地。",
                "对照时间线：美国进入太空竞赛，欧洲共同体运转，日本高速增长起步。中国这一页说明，近代史中的赶超焦虑一旦脱离物质约束，会把国家能力消耗在错误的速度上；此后调整，正是为了把工业化拉回可计算的轨道。",
            ],
            "parasEn": [
                "Modern China repeatedly tried to leapfrog: Self-Strengthening, Reform, and Nanjing-decade construction all hit war and fragmentation. The 1958 Great Leap pushed that impulse to an extreme—steel campaigns, mess halls, people’s communes.",
                "Inflated targets wrecked information and distribution; 1959–1961 brought severe hardship. The Sino-Soviet split also made aid uncertain. Only around 1961 did policy scale back communes and restore some private plots.",
                "The U.S. raced in space, the EEC ran, Japan’s high growth began. This page of modern history shows how catch-up anxiety, unbound from material limits, can burn state capacity.",
            ],
        },
        {
            "lo": 1962, "hi": 1965,
            "title": "调整、核试验与中苏交恶",
            "titleEn": "Readjustment, the bomb, and the Sino-Soviet split",
            "era": "中国近现代史 · 在两个超级大国之间寻路",
            "eraEn": "Modern China · finding a path between superpowers",
            "paras": [
                "近代中国长期在列强均势中求生存。1960年代初，国民经济“调整、巩固、充实、提高”，工业与粮食生产缓慢恢复；同时中苏论战公开化，边境与意识形态双重紧张。1962年中印边境战争，又把西南边疆拉进地缘博弈。",
                "1964年10月第一颗原子弹爆炸，近代以来“有国无防”的屈辱记忆被核威慑改写。对外，中国既批评美帝，也批评苏修，开始摸索一条不依附两大阵营的道路。对内则社会主义教育运动升温，为更大规模政治运动埋下线索。",
                "时间线上越战升级、东盟成立、日韩接近。中国此时的近代史含义是：终于拥有了阻止外敌大规模入侵的终极手段，却仍未解决如何在和平条件下发展经济与治理社会的问题。",
            ],
            "parasEn": [
                "In the early 1960s the economy was readjusted while the Sino-Soviet split went public. The 1962 border war with India pulled the southwest into geopolitics.",
                "The October 1964 nuclear test recast a modern-history memory of defenselessness. Beijing criticized both Washington and Moscow, while the Socialist Education Movement heated domestic politics.",
                "Vietnam escalated, ASEAN was founded, Japan and Korea drew closer. China now had an ultimate deterrent—but not yet a settled formula for peacetime growth and governance.",
            ],
        },
        {
            "lo": 1966, "hi": 1969,
            "title": "文化大革命发动与社会动荡",
            "titleEn": "The Cultural Revolution and social upheaval",
            "era": "中国近现代史 · 以群众运动重塑政权",
            "eraEn": "Modern China · remaking power through mass movement",
            "paras": [
                "近代中国的政治动员传统，从义和团、辛亥革命到土地革命，都习惯用群众运动打破旧秩序。1966年“五一六通知”后，文化大革命把这一传统推向党内：红卫兵冲击党政机构，学校停课，大批干部被打倒，国家日常治理严重受损。",
                "1967–1968年各地夺权与武斗交织，军队介入“三支两军”。1969年中共九大把文革体制固定下来，同年珍宝岛冲突使中苏几乎走到战争边缘，对外战略被迫重新评估联美制苏的可能。",
                "对照时间线：美国深陷越战与民权撕裂，欧洲有五月风暴与布拉格之春，日本学生运动高涨。中国这一段说明，近代史中“继续革命”若失去法治与生产约束，会把建国后刚刚织起的国家机器再次撕开。",
            ],
            "parasEn": [
                "Mass mobilization runs through modern China. After May 1966 the Cultural Revolution turned that tradition inward: Red Guards, closed schools, fallen cadres, broken routine governance.",
                "Power seizures and factional fighting in 1967–68 brought in the army. The 1969 Ninth Congress locked in the new order; the Zhenbao clash pushed Beijing to rethink a possible opening to the United States.",
                "The U.S. was in Vietnam and civil-rights strife; Europe had May 1968 and Prague; Japan’s campuses erupted. “Continuous revolution,” unconstrained, tore at the state just rebuilt after 1949.",
            ],
        },
        {
            "lo": 1970, "hi": 1976,
            "title": "从解冻外交到文革结束",
            "titleEn": "Diplomatic thaw and the end of the Cultural Revolution",
            "era": "中国近现代史 · 打开国门的前夜",
            "eraEn": "Modern China · on the eve of opening",
            "paras": [
                "近代中国的外交长期在“以夷制夷”与闭关之间摇摆。1971年基辛格秘密访华、联合国恢复中华人民共和国席位，1972年尼克松访华与中日邦交正常化，使中国从两个超级大国的夹击中抽出一条缝：联美、防苏、重返国际组织。",
                "国内则林彪事件后政治更加扑朔，批林批孔与“反击右倾翻案风”交替。1976年周恩来、毛泽东相继去世，唐山地震加重创伤，粉碎“四人帮”标志文化大革命结束。近代史意义上，长达十年的运动周期被打断。",
                "时间线上美元与黄金脱钩、石油危机打击日欧、西贡解放。中国抓住的是战略窗口：先解决“谁是主要敌人”，再为几年后的改革开放腾出外部空间。没有这一页破冰，1978年的转向很难落地。",
            ],
            "parasEn": [
                "Modern Chinese diplomacy long oscillated between playing powers off each other and closing the door. Kissinger’s 1971 visit, the UN seat, Nixon in 1972 and Japan normalization opened a gap between the superpowers.",
                "At home, politics stayed opaque after Lin Biao. 1976 brought the deaths of Zhou and Mao, the Tangshan earthquake, and the arrest of the Gang of Four—ending the Cultural Revolution’s decade.",
                "Bretton Woods cracked, oil shocked Japan and Europe, Saigon fell. China used the window to redefine its main adversary and clear space for the 1978 turn.",
            ],
        },
        {
            "lo": 1977, "hi": 1980,
            "title": "拨乱反正与改革开放起步",
            "titleEn": "Setting things right and launching reform",
            "era": "中国近现代史 · 从革命建国转向建设强国",
            "eraEn": "Modern China · from revolutionary founding to building",
            "paras": [
                "近代史的主线是救亡与启蒙纠缠。1978年12月十一届三中全会把工作重心转到经济建设，否定以阶级斗争为纲，等于给1840年以来反复中断的现代化补上和平时期的制度入口。农村联产承包随后铺开，特区试验开始出现。",
                "1979年中美建交、对越自卫反击战、中日和平友好条约生效，构成“改革必须有一个可预测的外部环境”。审判林彪、江青集团则用法律形式给文革做结。中国不再以输出革命为外交主轴，而开始计算市场、技术和投资。",
                "对照时间线：撒切尔上台、苏军入阿富汗、第二次石油冲击。中国选择的道路与苏联对峙、与西方有限接轨。近代中国追求的富强，第一次有了持续数十年的国内共识——尽管代价、争论与未完成的改革，都要留到1980年之后。",
            ],
            "parasEn": [
                "Modern history tangled national salvation with enlightenment. The December 1978 Third Plenum shifted the center of gravity to the economy, opening a peacetime path that war had repeatedly cut off. Household contracting and special zones followed.",
                "1979’s U.S. recognition, the brief war with Vietnam, and the Japan treaty sought a predictable exterior; the trial of the Lin-Jiang cliques legally closed the Cultural Revolution. Diplomacy turned from exporting revolution toward markets and technology.",
                "Thatcher won, the USSR entered Afghanistan, oil shocked again. China chose limited engagement with the West. The modern quest for wealth and power at last had a multi-decade domestic consensus—its costs deferred past 1980.",
            ],
        },
    ]
    era = next((e for e in eras if e["lo"] <= year <= e["hi"]), eras[-1])
    names = [e.get("title") for e in cn_events if e.get("title")]
    extra = ""
    extra_en = ""
    if names:
        extra = f"与本页切片直接相关的中国事件包括：{'、'.join(names)}。可将它们读作上述进程在{year}年前后的具体节点。"
        extra_en = (
            "Chinese items on this slice: "
            + "; ".join(e.get("titleEn") or e.get("title") for e in cn_events)
            + f". Read them as nodes of this process around {year}."
        )
    paras = list(era["paras"])
    paras_en = list(era["parasEn"])
    if extra:
        paras.append(extra)
        paras_en.append(extra_en)
    return {
        "title": f"{year}年{month}月 · {era['title']}",
        "titleEn": f"{datetime(year, month, 1).strftime('%B %Y')} · {era['titleEn']}",
        "era": era["era"],
        "eraEn": era["eraEn"],
        "paras": paras,
        "parasEn": paras_en,
    }


def build_history(now: datetime | None = None) -> dict:
    now = now or datetime.now(TZ)
    day = now.astimezone(TZ).date()
    year, month = _slot_for(day)
    events = _valid_events()

    regions_out = []
    timeline = []
    for reg in REGIONS:
        picked = _pick_for_region(events, reg["id"], year, month)
        items = []
        for e in picked:
            item = {
                "year": e["year"],
                "month": e["month"],
                "day": e["day"],
                "dateLabel": _date_label(e, "zh"),
                "dateLabelEn": _date_label(e, "en"),
                "title": e["title"],
                "titleEn": e["titleEn"],
                "summary": e["summary"],
                "summaryEn": e["summaryEn"],
            }
            items.append(item)
            timeline.append(
                {
                    **item,
                    "region": reg["id"],
                    "regionName": reg["name"],
                    "regionNameEn": reg["nameEn"],
                    "sort": e["year"] * 10000 + e["month"] * 100 + (e["day"] or 0),
                }
            )
        regions_out.append(
            {
                "id": reg["id"],
                "name": reg["name"],
                "nameEn": reg["nameEn"],
                "events": items,
            }
        )

    timeline.sort(key=lambda x: x["sort"])
    for row in timeline:
        row.pop("sort", None)

    return {
        "range": f"{YEAR_START}–{YEAR_END}",
        "year": year,
        "month": month,
        "label": f"{year}年{month}月",
        "labelEn": datetime(year, month, 1).strftime("%B %Y"),
        "note": "1950–1980 五地同期对照：每天更换年份，月份对齐今天公历月。",
        "noteEn": "Same-period snapshots across five regions, 1950–1980: the year rotates daily; the month matches today's calendar month.",
        "regions": regions_out,
        "timeline": timeline,
        "chinaEssay": _china_essay(
            year,
            month,
            next((r["events"] for r in regions_out if r["id"] == "cn"), []),
        ),
    }


if __name__ == "__main__":
    data = build_history()
    print(data["label"], "events", sum(len(r["events"]) for r in data["regions"]))
    for r in data["regions"]:
        print(r["name"], len(r["events"]), [e["title"] for e in r["events"][:2]])
