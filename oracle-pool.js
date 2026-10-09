/**
 * 神谕卡牌库：经典固定牌 + 日常意象牌。
 * 经典牌沿用常见神谕卡主题，文案原创、口语化。
 */
(function () {
  var ORACLE_CLASSIC = [
    { title: "信任", motif: "star", classic: true, text: "你不必把每件事都攥在手里。先把今天过好，剩下的会慢慢到位。" },
    { title: "放手", motif: "wind", classic: true, text: "抓太紧的地方，先松一松。留点空，新的东西才进得来。" },
    { title: "丰盛", motif: "seed", classic: true, text: "你值得被好好对待。别因为习惯了省，就拒绝来到身边的好事。" },
    { title: "边界", motif: "key", classic: true, text: "说「不」不是自私，是在保护自己。边界清楚了，关系反而更轻松。" },
    { title: "疗愈", motif: "dew", classic: true, text: "伤会慢慢好，不用跟自己的进度较劲。今天能好一点，就是进步。" },
    { title: "耐心", motif: "tide", classic: true, text: "还没到时候，不等于不会发生。先稳住，别因为急就乱做决定。" },
    { title: "内在力量", motif: "mountain", classic: true, text: "你要的力气其实已经在身上了。回想一下，你以前也扛过来过。" },
    { title: "新开始", motif: "sprout", classic: true, text: "结束不是失败，是在给新的一段腾地方。可以期待，也可以慢慢来。" },
    { title: "自爱", motif: "home", classic: true, text: "像对待在乎的人那样对待自己：吃饭、休息、别总挑自己的错。" },
    { title: "时机", motif: "lighthouse", classic: true, text: "不是晚了，是还没到你该动的那一步。该等的就等，该做的会做。" },
    { title: "臣服", motif: "anchor", classic: true, text: "改不了的事，先别硬扛。把力气留给还能改变的部分。" },
    { title: "清晰", motif: "window", classic: true, text: "现在看不清没关系。少做重大决定，多收集信息，雾会散。" },
    { title: "感恩", motif: "fire", classic: true, text: "看看身边已经有的：一口饭、一个联系人、今晚能睡个觉。这些也算数。" },
    { title: "勇气", motif: "wing", classic: true, text: "害怕不代表要停。可以一边怕，一边迈一小步。" },
    { title: "宽恕", motif: "bridge", classic: true, text: "放下怨恨，首先是放过自己。你不一定要原谅对方，但可以不再反复折磨自己。" },
    { title: "平衡", motif: "galaxy", classic: true, text: "把自己掏空了，谁也照顾不好。先补自己，再顾别人。" },
    { title: "直觉", motif: "well", classic: true, text: "心里那个小小的声音，多半在提醒你真实感受。先听一听，再决定要不要行动。" },
    { title: "保护", motif: "anchor", classic: true, text: "你的时间和精力很宝贵。远离消耗你的人和事，不是冷漠，是自保。" },
    { title: "转化", motif: "seed", classic: true, text: "这段经历会改变你，但不一定会毁掉你。熬过去，你会更知道自己要什么。" },
    { title: "对齐", motif: "key", classic: true, text: "当生活跟你的价值观一致，人会更踏实。今天做一件「像你自己」的小事。" },
    { title: "接纳", motif: "tide", classic: true, text: "先承认现状，再决定怎么改。否认和硬撑，往往比面对更累。" },
    { title: "显化", motif: "star", classic: true, text: "你常想的事，会慢慢影响你的选择。把精力放在真正想要的上面。" },
    { title: "连接", motif: "bridge", classic: true, text: "给一个人发消息、打一个电话。联系不会丢脸，孤独才更磨人。" },
    { title: "休息", motif: "home", classic: true, text: "休息不是浪费时间，是充电。睡够、吃够、歇够，才有力气继续。" },
    { title: "真相", motif: "letter", classic: true, text: "你已经知道答案了，只是还没准备好面对。诚实对自己，会轻松很多。" },
    { title: "奇迹", motif: "galaxy", classic: true, text: "小概率的好事也会发生。保持开放，别因为怕失望，就把门全关上。" },
    { title: "丰盛流动", motif: "tide", classic: true, text: "给出和接收都重要。只出不进会空，只进不出会堵。允许自己也被照顾。" },
    { title: "神圣时机", motif: "lighthouse", classic: true, text: "有些事先做铺垫，结果会在合适的时候出现。你现在的努力没有白费。" },
    { title: "灵魂伴侣", motif: "bridge", classic: true, text: "对的人未必马上出现，但你要先把自己过成值得被好好对待的样子。" },
    { title: "更高视角", motif: "window", classic: true, text: "跳开眼前这一团，想想：一年后回看，这件事还那么要命吗？多半不会。" }
  ];

  var ORACLE_DAILY = [
    { title: "星光", motif: "star", text: "有人在惦记你。今晚把灯打开，别一个人硬扛，也让自己松一松。" },
    { title: "潮汐", motif: "tide", text: "心情起起落落很正常，别跟自己较劲。你已经很不容易了。" },
    { title: "种子", motif: "seed", text: "现在看不到结果，不代表没在长。先把眼前这件小事做好就行。" },
    { title: "微风", motif: "wind", text: "别想一次把所有事做完。今晚只做一件让你松口气的小事就好。" },
    { title: "灯塔", motif: "lighthouse", text: "路还在，只是眼前有点看不清。先站稳、慢慢走，会越走越亮。" },
    { title: "深井", motif: "well", text: "偶尔停下来想想自己，也没关系。看清真实想法，反而更踏实。" },
    { title: "羽翼", motif: "wing", text: "你可以少扛一点，不是偷懒。把力气留给真正要紧的人和事。" },
    { title: "炉火", motif: "fire", text: "心里发冷的时候，找点暖的：喝杯热的、聊两句、早点睡。小温暖也够过今晚。" },
    { title: "桥梁", motif: "bridge", text: "对面那个人未必跟你作对。说句实话，事情往往就好谈了。" },
    { title: "露水", motif: "dew", text: "有些好时候很短，但也很珍贵。先享受现在这点舒服，别逼它一直留着。" },
    { title: "远山", motif: "mountain", text: "目标还在那儿，你不必今天就到顶。走得慢，也是在往前走。" },
    { title: "钥匙", motif: "key", text: "这扇门打不开，可能只是时候没到。先把自己照顾好，别在门口干耗着。" },
    { title: "归途", motif: "home", text: "外面再大，也得有个能歇的地方。累了就回去，也允许别人帮帮你。" },
    { title: "新芽", motif: "sprout", text: "旧的告一段落，新的其实已经在冒头。对新开始别要求太高，慢慢来。" },
    { title: "星河", motif: "galaxy", text: "你不是一个人。抬头看看，这片夜空都在，会陪着你。" },
    { title: "锚", motif: "anchor", text: "漂一会儿没关系，但给自己留个抓手。可以是深呼吸，也可以是在乎你的人。" },
    { title: "窗", motif: "window", text: "换个角度看，情况还是那样，心情可能就不一样了。今天试着换个想法。" },
    { title: "信", motif: "letter", text: "有些话先写给自己听。写着写着你会发现，你其实一直站在自己这边。" },
    { title: "晨露", motif: "dew", text: "新的一天才刚开始。先别急着下结论，让事情再发展一会儿。" },
    { title: "回声", motif: "wind", text: "你对别人好，也会慢慢回到你身上。先对自己温柔一点。" },
    { title: "罗盘", motif: "key", text: "方向可以改，不必死守原来的计划。你心里其实已经有答案了。" },
    { title: "暖石", motif: "fire", text: "有人愿意接住你，就靠近一点。被关心的感觉，比硬撑有用。" },
    { title: "浅滩", motif: "tide", text: "水浅也没关系，先站稳再往深处走。今天适合稳一点、慢一点。" },
    { title: "萤火", motif: "star", text: "一点点光也够认路。别嫌自己亮得不够大，够用就好。" },
    { title: "云隙", motif: "window", text: "乌云不会一直盖着天。给自己留点缝，阳光会照进来。" },
    { title: "棉被", motif: "home", text: "今晚可以早点躲进舒服里。休息不是偷懒，是为了明天有劲。" },
    { title: "竹节", motif: "sprout", text: "进步要一步一步来。这一小步做好了，下一步自然会到。" },
    { title: "渡口", motif: "bridge", text: "有人在对面等你。你先迈出半步，事情就会靠近一点。" },
    { title: "琥珀", motif: "dew", text: "把今天这点好先记住。以后某个难的时候，它会帮到你。" },
    { title: "弦月", motif: "tide", text: "不完美也没关系。你现在的样子，已经够好了。" },
    { title: "书签", motif: "letter", text: "先停在这一页。过阵子回头看，你会发现自己走了多远。" },
    { title: "清泉", motif: "well", text: "喝口水、洗把脸，把杂念冲淡。身体舒服了，心也会松。" },
    { title: "纸船", motif: "wing", text: "愿望可以先小小地放出去。不用急，它会慢慢找方向。" },
    { title: "灯芯", motif: "lighthouse", text: "别把自己逼太紧。留点力气，明天还要亮。" },
    { title: "麦穗", motif: "seed", text: "收成不会一夜到齐。低头看看，其实已经有几粒收获了。" },
    { title: "石阶", motif: "mountain", text: "一级一级走就行。你现在踩着的这一步，就是进步。" },
    { title: "铃铛", motif: "star", text: "轻轻提醒自己一句：我还在，我很好。这就够了。" },
    { title: "丝线", motif: "bridge", text: "一条消息、一句问候，也算联系。回一下，世界会暖一点。" },
    { title: "雨停", motif: "window", text: "雨总会停。收伞之前，先深吸一口气，让自己缓一缓。" },
    { title: "炉边", motif: "fire", text: "围着一点热聊两句。热闹不在人多，是心里有人、有事可盼。" },
    { title: "港湾", motif: "anchor", text: "靠岸歇一会儿。补好力气再出发，才走得远。" },
    { title: "青苔", motif: "sprout", text: "慢点长也是长。不起眼的地方，也能长出绿色。" },
    { title: "银匙", motif: "key", text: "有些锁其实已经松了。再试一次，轻轻来。" },
    { title: "夜路", motif: "galaxy", text: "天黑了不代表走错路。带着一点光慢慢走，会到想去的地方。" },
    { title: "回廊", motif: "home", text: "绕一圈再回来也没关系。有时答案不在前面，而在你安静下来的那一刻。" },
    { title: "羽笔", motif: "letter", text: "写下今晚最想对自己说的一句话。写完，肩膀会轻一点。" },
    { title: "薄冰", motif: "dew", text: "小心一点没关系。慢点走，你会更踏实。" },
    { title: "风铃", motif: "wind", text: "听得见一点动静，说明事情在动。别急，变化正在发生。" },
    { title: "星砂", motif: "galaxy", text: "把小开心攒起来。一点点也好，攒多了也能照亮你。" },
    { title: "长桥", motif: "bridge", text: "远一点也走得到。别因为一时看不到终点就停下。" },
    { title: "暖汤", motif: "fire", text: "先照顾肚子和身体。吃好了、睡好了，决定才会更稳。" },
    { title: "朝露", motif: "dew", text: "早上这点清醒很宝贵。把它留给今天最重要的一件事。" },
    { title: "空杯", motif: "well", text: "先空出一点位置。腾出来了，新的好东西才装得进来。" },
    { title: "飞鸟", motif: "wing", text: "不舒服的地方，你可以先离开。你有权利换个环境。" },
    { title: "灯影", motif: "lighthouse", text: "有人照亮你，你也可以照亮别人。互相照一下，就不那么黑。" },
    { title: "根须", motif: "seed", text: "先把基础打稳，比急着往上冲更重要。底子好了，才扛得住事。" },
    { title: "云舟", motif: "wind", text: "站远一点看，烦恼会小一点。不必每件事都贴脸看。" },
    { title: "月阶", motif: "mountain", text: "每一步都算数。今晚这一小步，也值得给自己点个赞。" },
    { title: "信笺", motif: "letter", text: "有些想念不必说出口。先收好，合适的时候它会帮到你。" },
    { title: "星锚", motif: "anchor", text: "先抓住一件确定的事：好好呼吸、喝杯热水、跟自己说「我在」。" },
    { title: "晴窗", motif: "window", text: "拉开一点窗帘。外面未必完美，但比一直闷着好。" },
    { title: "归巢", motif: "home", text: "累了就回去。家可以是一个地方，也可以是一个让你安心的人。" },
    { title: "新雨", motif: "tide", text: "今天适合收拾一下、清清爽爽。不适合硬扛，先把自己理顺。" },
    { title: "火种", motif: "fire", text: "保护好你那点热情。别被无关的事和话浇灭了。" },
    { title: "星桥", motif: "galaxy", text: "看起来远的事，中间其实有路。人和人、事和事，都能连起来。" },
    { title: "软光", motif: "star", text: "不用很耀眼才算好。温柔一点对别人，也温柔一点对自己。" },
    { title: "浅梦", motif: "wing", text: "允许自己做个小梦。它会提醒你：你还想要些什么。" },
    { title: "石灯", motif: "lighthouse", text: "老办法有时最管用。熟悉的安慰，也能让人安心。" },
    { title: "芽尖", motif: "sprout", text: "刚起步最怕被否定。对自己温柔点，别一上来就批评自己。" },
    { title: "水路", motif: "tide", text: "顺的时候别硬顶，难的时候别放弃。看清情况再动。" },
    { title: "金钥", motif: "key", text: "机会常常藏在小事里。留意今天那扇轻轻响的门。" },
    { title: "晚钟", motif: "home", text: "一天可以收尾了。没做完的放明天，今晚先休息。" },
    { title: "星尘", motif: "galaxy", text: "你身上也有闪光点。别忘了，你并不差。" }
  ];

  window.ORACLE_POOL = {
    CLASSIC: ORACLE_CLASSIC,
    DAILY: ORACLE_DAILY,
    all: function () {
      return ORACLE_CLASSIC.concat(ORACLE_DAILY);
    },
    byTitle: function (title) {
      var all = this.all();
      for (var i = 0; i < all.length; i++) {
        if (all[i].title === title) return all[i];
      }
      return null;
    }
  };
})();
