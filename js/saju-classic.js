/* 달빛 한 스푼 — 고전 명리 3관점 (2026-11-22 추가)
   · 궁통보감(窮通寶鑑) : 월지 계절의 한난조습(寒暖燥濕)과 조후(調候)
   · 적천수(滴天髓)     : 일간의 기세(氣勢)와 균형 · 통관(通關)
   · 자평진전(子平眞詮) : 월지 지장간 투출로 잡는 격국(格局) = 사회적 그릇
   만세력이 이미 계산한 값(월지·오행 개수·일간 강약·지장간)만 읽어 해설합니다.
   여기서 사주를 다시 계산하거나, 값에 없는 것을 지어내지 않습니다. */
(function (root) {
  "use strict";

  var GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var GAN_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  var ZHI_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  var EL = ["목", "화", "토", "금", "수"];
  var EL_H = ["木", "火", "土", "金", "水"];
  var GAN_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var ZHI_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var SAENG = [1, 2, 3, 4, 0];   // 木→火→土→金→水→木
  var GEUK = [2, 3, 4, 0, 1];    // 木克土 火克金 土克水 金克木 水克火
  var TEN_KO = { bigeop: "비겁", siksang: "식상", jaeseong: "재성", gwanseong: "관성", inseong: "인성" };

  /* 12지지 지장간 — 여기 → 본기 순 (만세력 통용표) */
  var JANGAN = [
    [9],          // 子 癸
    [9, 7, 5],    // 丑 癸 辛 己
    [4, 2, 0],    // 寅 戊 丙 甲
    [1],          // 卯 乙
    [1, 9, 4],    // 辰 乙 癸 戊
    [4, 6, 2],    // 巳 戊 庚 丙
    [5, 3],       // 午 己 丁
    [3, 1, 5],    // 未 丁 乙 己
    [4, 8, 6],    // 申 戊 壬 庚
    [7],          // 酉 辛
    [7, 3, 4],    // 戌 辛 丁 戊
    [4, 0, 8]     // 亥 戊 甲 壬
  ];

  /* ---------- 궁통보감 : 월지 12개의 계절과 조후 ----------
     heat : 그 달 자체의 온도(한난). 火·水 개수로 보정합니다.
     need : 궁통보감이 그 달에 요구하는 기운 (el = 오행, stems = 대표 천간, why = 그 까닭) */
  var MONTH = [
    { // 子
      season: "한겨울", heat: -2.5,
      read: "한겨울 子月은 水가 가장 왕한 달입니다. 궁통보감은 이 계절을 '얼어붙은 땅'으로 보고, 丙火로 데우고 戊土로 넘치는 물을 막는 일을 첫째로 칩니다.",
      need: [{ el: 1, stems: "丙火", why: "얼어붙은 땅을 데우는 불" }, { el: 2, stems: "戊土", why: "넘치는 물을 막는 둑" }],
      tip: "겨울 원국의 힘은 오래 쌓고 버티는 데 있습니다. 온기가 있으면 그 힘이 인내로, 비면 미루는 습관으로 나타나요."
    },
    { // 丑
      season: "늦겨울", heat: -2,
      read: "丑月은 흙이 얼어붙은 늦겨울입니다. 궁통보감은 丙火로 얼음을 풀고 甲木으로 굳은 흙을 헤쳐 봄기운을 들이라고 봅니다.",
      need: [{ el: 1, stems: "丙火", why: "얼음을 푸는 불" }, { el: 0, stems: "甲木", why: "굳은 흙을 헤치는 나무" }],
      tip: "土가 두꺼운 계절이라 한번 정한 길을 오래 갑니다. 대신 방향이 틀리면 늦게 알아차리니, 새 시도를 일부러 섞어 두는 게 좋아요."
    },
    { // 寅
      season: "초봄", heat: -1,
      read: "寅月은 봄이 시작됐지만 땅속에 겨울 추위가 남아 있습니다. 궁통보감은 丙火로 데우고 癸水로 촉촉이 적시라고 봅니다.",
      need: [{ el: 1, stems: "丙火", why: "남은 추위를 데우는 불" }, { el: 4, stems: "癸水", why: "새싹을 적시는 물" }],
      tip: "초봄 원국은 뻗는 힘과 시작이 빠릅니다. 다만 남은 추위를 무시하고 첫 단추를 급히 채우면 중간에 힘이 빠져요."
    },
    { // 卯
      season: "봄 한창", heat: 0,
      read: "卯月은 木이 한창 자라는 봄입니다. 궁통보감은 丙火로 꽃을 피우고 癸水로 마르지 않게 하라고 봅니다.",
      need: [{ el: 1, stems: "丙火", why: "꽃을 피우는 볕" }, { el: 4, stems: "癸水", why: "마르지 않게 하는 물" }],
      tip: "봄 한창 원국은 사람을 끌어당기는 기운이 좋습니다. 물기가 없으면 재주는 많은데 오래 못 가는 쪽으로 기울어요."
    },
    { // 辰
      season: "늦봄", heat: 0.3,
      read: "辰月은 봄 끝의 젖은 흙입니다. 궁통보감은 甲木으로 흙을 헤쳐 물길을 트고, 丙火와 癸水로 마르지도 넘치지도 않게 하라고 봅니다.",
      need: [{ el: 0, stems: "甲木", why: "질척한 흙을 헤치는 나무" }, { el: 1, stems: "丙火", why: "젖은 땅을 데우는 볕" }, { el: 4, stems: "癸水", why: "흙을 적시는 물" }],
      tip: "辰月 원국은 받아들이는 힘이 큽니다. 흙이 질척하면 결정을 미루기 쉬워, 甲木처럼 '일단 벌이고 보는' 결단이 약이 됩니다."
    },
    { // 巳
      season: "초여름", heat: 1.8,
      read: "巳月은 火가 올라오는 초여름입니다. 궁통보감은 癸水로 열을 식히고 庚金으로 물의 근원을 대라고 봅니다.",
      need: [{ el: 4, stems: "癸水", why: "타는 열을 식히는 물" }, { el: 3, stems: "庚金", why: "물의 근원이 되는 쇠" }],
      tip: "초여름 원국은 추진력과 표현이 좋습니다. 열이 식지 않으면 속도는 나는데 판단이 앞서가요."
    },
    { // 午
      season: "한여름", heat: 2.5,
      read: "午月은 火가 가장 왕한 한여름입니다. 궁통보감은 癸水로 타는 열을 식히고 庚金으로 水의 근원을 세우라고 봅니다.",
      need: [{ el: 4, stems: "癸水", why: "타는 열을 식히는 물" }, { el: 3, stems: "庚金", why: "물의 근원이 되는 쇠" }],
      tip: "한여름 원국의 힘은 밝고 빠른 추진입니다. 물이 없으면 그 열이 사람과 몸을 먼저 지치게 합니다."
    },
    { // 未
      season: "늦여름", heat: 2,
      read: "未月은 흙이 마르고 더운 늦여름입니다. 궁통보감은 癸水로 메마른 흙을 적시고 庚金으로 물을 도우라고 봅니다.",
      need: [{ el: 4, stems: "癸水", why: "메마른 흙을 적시는 물" }, { el: 3, stems: "庚金", why: "물을 도는 쇠" }],
      tip: "늦여름 원국은 중심을 잡고 사람을 품는 힘이 있습니다. 흙이 마르면 고집으로 굳어, 물기(유연함)가 관건이에요."
    },
    { // 申
      season: "초가을", heat: -0.5,
      read: "申月은 金이 왕해진 초가을입니다. 궁통보감은 丙火로 서늘함을 데우고 癸水로 마른 기운을 적시라고 봅니다.",
      need: [{ el: 1, stems: "丙火", why: "서늘함을 데우는 불" }, { el: 4, stems: "癸水", why: "마른 기운을 적시는 물" }],
      tip: "초가을 원국은 판단이 정확하고 맺는 힘이 좋습니다. 서늘함이 지나치면 사람을 밀어내니 온기를 의식적으로 챙기세요."
    },
    { // 酉
      season: "가을 한창", heat: -1.2,
      read: "酉月은 金이 가장 왕한 가을입니다. 궁통보감은 丙火·丁火로 金을 벼리고 癸水로 마르지 않게 하라고 봅니다.",
      need: [{ el: 1, stems: "丙火·丁火", why: "金을 벼리는 불" }, { el: 4, stems: "癸水", why: "마르지 않게 하는 물" }],
      tip: "가을 한창 원국은 기준이 분명하고 마무리가 깔끔합니다. 다만 그 기준이 칼이 되면 관계가 상해요."
    },
    { // 戌
      season: "늦가을", heat: 0.2,
      read: "戌月은 흙이 마른 늦가을입니다. 궁통보감은 甲木으로 굳은 흙을 헤치고 癸水로 적시라고 봅니다.",
      need: [{ el: 0, stems: "甲木", why: "굳은 흙을 헤치는 나무" }, { el: 4, stems: "癸水", why: "마른 흙을 적시는 물" }],
      tip: "늦가을 원국은 정리와 수확에 강합니다. 흙이 굳으면 새 일을 못 받아들이니, 문을 하나 열어 두는 게 좋아요."
    },
    { // 亥
      season: "초겨울", heat: -1.8,
      read: "亥月은 水가 올라오는 초겨울입니다. 궁통보감은 丙火로 데우고 戊土로 물을 잡으라고 봅니다.",
      need: [{ el: 1, stems: "丙火", why: "얼어붙기 전에 데우는 불" }, { el: 2, stems: "戊土", why: "넘치는 물을 잡는 둑" }],
      tip: "초겨울 원국은 생각이 깊고 흐름을 읽는 힘이 있습니다. 추위가 지나치면 시작을 미루게 됩니다."
    }
  ];

  /* ---------- 자평진전 : 십성별 격국 ---------- */
  var GYEOK = {
    geonrok: {
      n: "건록격(建祿格)",
      core: "월지가 일간의 록(祿) 자리입니다. 자평진전은 이 격을 '내 힘으로 서는 그릇'으로 봅니다.",
      role: "남이 정해 준 자리보다 자기 이름으로 판을 짜는 쪽에 맞습니다. 조직에 있어도 실무 책임을 맡을 때 실력이 드러나요.",
      need: "jaeseong", why: "힘을 성과로 바꿔 주는 보상과 쓸 곳",
      bare: "재성이 없으면 힘은 넘치는데 성과로 바뀌는 통로가 없어, 일은 많은데 남는 게 적어집니다.",
      tip: "혼자 다 하는 대신 성과를 숫자로 남기세요. 재성이 그걸 자리로 바꿔 줍니다."
    },
    yangin: {
      n: "양인격(羊刃格)",
      core: "월지에 겁재가 깔린, 격 가운데 추진력이 가장 센 그릇입니다. 자평진전은 이 힘을 '날을 세운 칼'로 봅니다.",
      role: "빠른 결단과 밀어붙이는 힘으로 현장·영업·전문직에서 두각을 냅니다.",
      need: "gwanseong", why: "칼에 칼집을 씌우는 책임과 규율(특히 편관)",
      bare: "관성이 없으면 그 힘이 안으로만 돌아 독단과 소모로 이어집니다.",
      tip: "결단은 빠르게, 집행은 규칙 안에서. 책임지는 상사나 제도를 가까이 두면 힘이 무기가 됩니다."
    },
    siksin: {
      n: "식신격(食神格)",
      core: "월지에서 올라온 식신이 격을 이룹니다. '가진 것을 편하게 꺼내 쓰는 그릇'입니다.",
      role: "손재주·말솜씨·기획처럼 자기 자원을 결과물로 바꾸는 일에 맞습니다.",
      need: "jaeseong", why: "만든 것을 성과로 바꿔 주는 통로(식신생재)",
      bare: "재성이 없으면 만들어 놓고 마무리에서 끊기기 쉬워요.",
      tip: "만든 것을 팔고 기록하는 습관이 격을 완성합니다."
    },
    sanggwan: {
      n: "상관격(傷官格)",
      core: "'규격을 새로 만드는 그릇'입니다. 재주와 표현이 앞서고, 시키는 일보다 개선하는 일에 강합니다.",
      role: "기획·마케팅·콘텐츠·교육처럼 말과 아이디어가 상품이 되는 자리에 맞습니다.",
      need: "jaeseong", why: "재능을 돈과 평가로 바꿔 주는 통로(상관생재)",
      bare: "재성이 없으면 재주는 많은데 평가와 보상이 따라오지 않는 구조가 됩니다.",
      tip: "아이디어를 성과로 옮기는 사람과 짝을 이루면 재능이 값이 됩니다."
    },
    pyeonjae: {
      n: "편재격(偏財格)",
      core: "'돈이 도는 판을 보는 그릇'입니다. 정해진 월급보다 흐르는 자금을 다루는 쪽이에요.",
      role: "영업·유통·투자·사업처럼 판을 키우는 일에 맞습니다.",
      need: "bigeop", why: "큰돈을 감당하는 체력과 자금(비겁·인성)",
      bare: "비겁이 약하면 판은 보는데 체력과 자금이 못 받쳐 주어 중간에 흔들립니다.",
      tip: "판을 벌이기 전에 체력과 자금을 먼저 확인하세요. 이 격은 감당력이 실력입니다."
    },
    jeongjae: {
      n: "정재격(正財格)",
      core: "'차곡차곡 쌓는 그릇'입니다. 정확함과 신용으로 오래 가는 쪽이에요.",
      role: "관리·회계·운영·공무처럼 규칙과 숫자가 중요한 자리에 맞습니다.",
      need: "gwanseong", why: "쌓은 것을 사회적 자리로 이어 주는 통로(재생관)",
      bare: "관성이 없으면 쌓기만 하고 인정이나 직책으로 이어지지 않아요.",
      tip: "정확함을 무기로 삼되, 사람에게 먼저 베풀면 자리가 따라옵니다."
    },
    pyeongwan: {
      n: "편관격(偏官格)",
      core: "'압박을 견디며 권한을 쥐는 그릇'입니다. 힘든 자리에서 오히려 강해집니다.",
      role: "조직의 실무 책임·현장 관리·법·의료·기술처럼 책임과 압박이 큰 자리에 맞습니다.",
      need: "siksang", why: "압박을 다루는 기술(식신제살)",
      bare: "식상이 없으면 압박을 받아도 풀어낼 도구가 없어 몸과 마음이 먼저 상합니다.",
      tip: "압박을 기술로 바꾸세요. 배우고 정리해 남에게 설명하는 순간 권한이 됩니다."
    },
    jeonggwan: {
      n: "정관격(正官格)",
      core: "'질서와 신뢰의 그릇'입니다. 규칙 안에서 인정받는 방식이 몸에 맞습니다.",
      role: "공직·관리·규정이 있는 조직에서 오래 쌓아 올리는 자리에 맞습니다.",
      need: "jaeseong", why: "자리를 받쳐 주는 실적과 자금(재생관)",
      bare: "재성이 없으면 자리는 있는데 뒷받침할 실적이 약해 자리가 흔들립니다.",
      tip: "맡은 자리의 실적을 숫자로 쌓으세요. 재성이 관을 받쳐 자리가 올라갑니다."
    },
    pyeonin: {
      n: "편인격(偏印格)",
      core: "'남다른 시선과 기술의 그릇'입니다. 남이 안 보는 각도를 잡아냅니다.",
      role: "연구·자격·특수 기술·틈새 전문직처럼 깊이 파는 일에 맞습니다.",
      need: "jaeseong", why: "생각을 실행으로 넘겨 주는 마감(재성제인)",
      bare: "재성이 없으면 생각이 실행으로 넘어가지 못하고 준비만 길어집니다.",
      tip: "배움을 결과물로 내놓는 마감을 스스로 정하세요. 재성이 그 마감을 만듭니다."
    },
    jeongin: {
      n: "정인격(正印格)",
      core: "'배우고 받쳐 주는 그릇'입니다. 사람을 키우고 돌보는 자리에 맞습니다.",
      role: "교육·상담·행정·복지처럼 사람을 세워 주는 일에 맞습니다.",
      need: "gwanseong", why: "배움을 사회적 자리로 이어 주는 통로(관인상생)",
      bare: "관성이 없으면 배움은 깊은데 그것을 쓸 자리가 없어 답답해집니다.",
      tip: "배운 것을 남에게 가르치고 맡기는 자리를 찾으세요. 관성이 그 자리를 열어 줍니다."
    }
  };

  /* ---------- 도우미 ---------- */
  function josa(word, kind) {
    var ch = String(word).charAt(String(word).length - 1);
    var code = ch.charCodeAt(0) - 0xAC00;
    var has = (code >= 0 && code < 11172) ? ((code % 28) !== 0) : false;
    if (kind === "i") return has ? "이" : "가";
    if (kind === "eul") return has ? "을" : "를";
    if (kind === "wa") return has ? "과" : "와";
    if (kind === "euro") return has ? "으로" : "로";
    if (kind === "eun") return has ? "은" : "는";
    return "";
  }
  /* 오행을 '목(木)' 꼴로, 뒤에 조사를 맞춰 붙입니다 */
  function elJ(el, kind) {
    return EL[el] + "(" + EL_H[el] + ")" + (kind ? josa(EL[el], kind) : "");
  }

  function tenOf(meEl, otherEl) {
    if (meEl === otherEl) return "bigeop";
    if (SAENG[meEl] === otherEl) return "siksang";
    if (GEUK[meEl] === otherEl) return "jaeseong";
    if (GEUK[otherEl] === meEl) return "gwanseong";
    return "inseong";
  }

  /* 십성 그룹 + 음양까지 봐서 편/정을 가릅니다 (甲丙=식신, 甲丁=상관) */
  function tenPair(meGi, gi) {
    var g = tenOf(GAN_EL[meGi], GAN_EL[gi]);
    var same = (meGi % 2) === (gi % 2);
    if (g === "bigeop") return same ? "bigeop" : "geopjae";
    if (g === "siksang") return same ? "siksin" : "sanggwan";
    if (g === "jaeseong") return same ? "pyeonjae" : "jeongjae";
    if (g === "gwanseong") return same ? "pyeongwan" : "jeonggwan";
    return same ? "pyeonin" : "jeongin";
  }

  var TEN_GROUP_OF = {
    bigeop: "bigeop", geopjae: "bigeop", siksin: "siksang", sanggwan: "siksang",
    pyeonjae: "jaeseong", jeongjae: "jaeseong", pyeongwan: "gwanseong", jeonggwan: "gwanseong",
    pyeonin: "inseong", jeongin: "inseong"
  };

  function pct(n, total) { return Math.round(n / total * 1000) / 10; }

  /* ---------- ① 궁통보감 ---------- */
  function climateOf(mb, c, total) {
    var m = MONTH[mb];
    var w = m.heat + 1.0 * ((c[1] || 0) - (c[4] || 0));
    var tone, toneH;
    if (w >= 2.2) { tone = "건조하고 더운 편"; toneH = "燥熱"; }
    else if (w >= 0.6) { tone = "따뜻한 편"; toneH = "溫"; }
    else if (w <= -2.2) { tone = "차고 습한 편"; toneH = "寒濕"; }
    else if (w <= -0.6) { tone = "서늘한 편"; toneH = "凉"; }
    else { tone = "온도가 고른 편"; toneH = "中和"; }

    var head = "월지 " + ZHI_KO[mb] + EL_H[ZHI_EL[mb]] + " · " + m.season +
      " · 화(火) " + (c[1] || 0) + " · 수(水) " + (c[4] || 0) +
      " → " + tone + "(" + toneH + ")";

    var parts = [], missing = [], have = [], stems = [];
    for (var i = 0; i < m.need.length; i++) {
      var nd = m.need[i];
      var n = c[nd.el] || 0;
      parts.push(nd.stems + " " + n + "개");
      stems.push(nd.stems);
      if (n === 0) missing.push(nd); else have.push(nd);
    }

    var body = m.read + " 이 계절에 요구하는 조후는 " + stems.join("·") + "입니다. 이 원국에는 " + parts.join(" · ") + " — ";
    if (!missing.length) {
      body += "급하게 부르는 기운이 이미 채워져 있어, 조후는 스스로 돌아가는 편입니다.";
      if ((c[m.need[0].el] || 0) >= 3) {
        body += " 다만 " + elJ(m.need[0].el, "i") + " 이미 " + c[m.need[0].el] +
          "개로 넘쳐, 보태는 쪽보다 덜어내는 쪽이 필요합니다.";
      }
    } else {
      var ms = [];
      for (var k = 0; k < missing.length; k++) ms.push(missing[k].why);
      body += missing.map(function (x) { return EL[x.el] + "(" + EL_H[x.el] + ")"; }).join("·") +
        " 기운이 비어 " + ms.join("·") + " 자리가 없습니다.";
      if (have.length) {
        body += " " + have.map(function (x) { return EL[x.el] + "(" + EL_H[x.el] + ")"; }).join("·") +
          "는 있어 계절의 요구를 절반은 받쳐 줍니다.";
      }
      body += " 타고난 자리가 아니니, 생활에서 의식적으로 채우는 쪽(색·음식·사람·장소)이 실제로 차이를 만듭니다.";
    }

    return {
      tone: tone, toneH: toneH, head: head, body: body, tip: m.tip,
      season: m.season,
      needs: m.need.map(function (x) { return x.el; }),
      chip: "계절 " + m.season + "(" + tone + ")"
    };
  }

  /* ---------- ② 적천수 ---------- */
  function jigiOf(ctx) {
    var me = ctx.me, c = ctx.counts, total = 0;
    for (var i = 0; i < 5; i++) total += c[i] || 0;
    var inEl = -1, gwanEl = -1;
    for (var e = 0; e < 5; e++) {
      if (SAENG[e] === me) inEl = e;
      if (GEUK[e] === me) gwanEl = e;
    }
    var outEl = SAENG[me], jaeEl = GEUK[me];
    var sup = (c[me] || 0) + (c[inEl] || 0);
    var drn = (c[outEl] || 0) + (c[jaeEl] || 0) + (c[gwanEl] || 0);
    var strong = !!ctx.strong;
    var day = ctx.pillars.day;
    var words = total >= 8 ? "여덟 글자" : "여섯 글자";
    var order = [0, 1, 2, 3, 4].sort(function (a, b) { return (c[b] || 0) - (c[a] || 0) || a - b; });
    var top = order[0], second = order[1];

    var head = "일간 " + day.ganKo + "(" + EL_H[me] + ") · 강약 지수 " + ctx.strengthScore +
      "(" + (strong ? "신강" : "신약") + ") · 돕는 편 " + sup + " : 쓰는 편 " + drn +
      (c[top] ? " · 가장 두꺼운 " + EL[top] + "(" + EL_H[top] + ") " + c[top] + "개 " + pct(c[top], total) + "%" : "");

    var body = "적천수는 계절보다 먼저 기세(氣勢)를 봅니다. 이 원국은 일간과 같은 편(비겁·인성)이 " + sup +
      "개, 일간이 쓰는 편(식상·재성·관성)이 " + drn + "개입니다. " +
      "적천수는 '강하면 마땅히 흘려보내고 덜어내며(旺則宜泄宜傷), 약하면 돕고 받쳐 주기를 좋아한다(衰則喜幫喜助)'고 말합니다. " +
      (strong
        ? "일간이 스스로 서는 힘이 있으니, " + elJ(outEl) + "·" + elJ(jaeEl) + " 쪽으로 흘려 쓰는 것이 균형에 맞습니다."
        : "일간이 눌리는 쪽이니, " + elJ(inEl) + "·" + elJ(me) + " 쪽으로 뿌리를 세우고 무리한 확장을 줄이는 것이 맞습니다.");

    var empt = [];
    for (var z = 0; z < 5; z++) if (!c[z]) empt.push(EL[z] + "(" + EL_H[z] + ")");
    if (c[top]) {
      body += " " + words + "에서 " + elJ(top, "i") + " " + c[top] + "개(" + pct(c[top], total) + "%)로 가장 두껍습니다.";
    }
    if (empt.length) body += " 반대로 " + empt.join("·") + " 기운은 아예 없습니다.";

    /* 통관(通關) · 흐름 — 가장 두꺼운 두 기운의 관계 */
    if (c[top] && c[second]) {
      if (GEUK[top] === second) {
        var mid = SAENG[top];
        body += " 가장 두꺼운 " + elJ(top, "wa") + " " + elJ(second, "i") + " 부딪히는 구조(" +
          EL_H[top] + "克" + EL_H[second] + ")라, 적천수는 그 사이를 잇는 " + elJ(mid, "eul") + " 통관(通關)으로 봅니다. " +
          (c[mid] ? "이 원국에는 " + elJ(mid, "i") + " " + c[mid] + "개 있어 충돌이 완충됩니다."
            : "이 원국에는 " + elJ(mid, "i") + " 없어 충돌이 그대로 드러납니다 — 이 기운을 채우는 것이 균형점입니다.");
      } else if (GEUK[second] === top) {
        var mid2 = SAENG[second];
        body += " " + elJ(second, "i") + " " + elJ(top, "eul") + " 누르는 구조(" +
          EL_H[second] + "克" + EL_H[top] + ")라, 사이를 잇는 " + elJ(mid2, "i") + " 통관(通關) 노릇을 합니다. " +
          (c[mid2] ? "이 원국에는 " + elJ(mid2, "i") + " " + c[mid2] + "개 있어 충돌이 누그러집니다."
            : "이 원국에는 " + elJ(mid2, "i") + " 없어 그 긴장이 그대로 남습니다.");
      } else if (SAENG[top] === second) {
        body += " 가장 두꺼운 " + elJ(top, "i") + " " + elJ(second, "eul") + " 생하는 방향으로 기세가 한 줄로 흐릅니다. " +
          "그 흐름을 끊는 " + elJ(GEUK[top], "eul") + " 조심하면 됩니다.";
      } else if (SAENG[second] === top) {
        body += " " + elJ(second, "i") + " " + elJ(top, "eul") + " 생해 밀어 주는 구조라, 힘이 아래에서 위로 올라오는 흐름입니다.";
      }
    }

    var tip = strong
      ? "여분의 힘을 식상(" + EL_H[outEl] + ")으로 풀어내세요. 만들고 말하고 가르치는 일에 쓰면 기세가 흐르고, 안으로만 쌓으면 답답해집니다."
      : "인성(" + EL_H[inEl] + ")과 비겁(" + EL_H[me] + ")을 먼저 채우세요. 배움·자격·동료가 이 사주의 뿌리이고, 혼자 밀어붙이는 확장은 손실이 큽니다.";

    return {
      head: head, body: body, tip: tip,
      sup: sup, drn: drn, strong: strong, topEl: top,
      chip: "기세 " + (strong ? "신강" : "신약") + "(" + sup + ":" + drn + ")"
    };
  }

  /* ---------- ③ 자평진전 ---------- */
  function gyeokOf(ctx) {
    var p = ctx.pillars, meGi = p.day.gi, c = ctx.counts;
    var mb = p.month.zi;
    var jang = JANGAN[mb];
    var stems = [p.year.gi, p.month.gi];
    var posNames = ["년간", "월간"];
    if (p.hour) { stems.push(p.hour.gi); posNames.push("시간"); }

    var picked = -1, at = [];
    for (var i = jang.length - 1; i >= 0; i--) {
      if (stems.indexOf(jang[i]) >= 0) { picked = jang[i]; break; }
    }
    var exposed = picked >= 0;
    if (!exposed) picked = jang[jang.length - 1];
    for (var s = 0; s < stems.length; s++) if (stems[s] === picked) at.push(posNames[s]);

    var key = tenPair(meGi, picked);
    var g = GYEOK[key] || GYEOK.jeongin;
    var pickedTxt = GAN_KO[picked] + "(" + GAN[picked] + ")";

    var jangTxt = jang.map(function (x) { return GAN_KO[x] + "(" + GAN[x] + ")"; }).join("·");
    var head = "월지 " + ZHI_KO[mb] + EL_H[ZHI_EL[mb]] + " · 지장간 " + jangTxt + " · " +
      (exposed ? pickedTxt + josa(GAN_KO[picked], "i") + " " + at.join("·") + "에 투출" : "천간 투출 없음, 본기 " + pickedTxt + josa(GAN_KO[picked], "euro") + " 격을 잡음") +
      " → " + g.n;

    var body = g.core + " " + g.role + " ";

    var needKey = g.need;
    var needN = (ctx.ten && ctx.ten[needKey]) || 0;
    body += "이 격은 " + TEN_KO[needKey] + "이 받쳐 줄 때 제 몫을 합니다 — " + g.why + ". ";
    body += needN > 0
      ? "이 원국에는 " + TEN_KO[needKey] + "이 " + needN + "개 있어 그 통로가 열려 있습니다."
      : "그런데 이 원국에는 " + TEN_KO[needKey] + "이 없습니다. " + g.bare;

    var grpNow = TEN_GROUP_OF[key] || key;
    var grpN = (ctx.ten && ctx.ten[grpNow]) || 0;
    if (grpN >= 3) body += " 격을 이룬 " + TEN_KO[grpNow] + "이 원국에 " + grpN + "개로 힘이 실려 있어, 이 역할이 삶의 중심에 놓입니다.";
    else if (grpN <= 1) body += " 다만 격을 이룬 " + TEN_KO[grpNow] + "이 1개뿐이라 격이 가는 편입니다 — 그 역할을 의식적으로 키우는 게 좋아요.";

    /* 격이 섞였는지 : 천간에 드러난 지장간의 십성 그룹이 둘 이상 */
    var seen = [], names = [];
    for (var t = 0; t < jang.length; t++) {
      if (stems.indexOf(jang[t]) < 0) continue;
      var kk = TEN_GROUP_OF[tenPair(meGi, jang[t])] || "inseong";
      if (seen.indexOf(kk) < 0) { seen.push(kk); names.push(TEN_KO[kk]); }
    }
    if (seen.length >= 2) {
      body += " 지장간에서 " + names.join("·") + "이 함께 드러나 격이 섞였습니다(자평진전이 말하는 '탁한 격'). 한 가지 역할에 집중할수록 그릇이 또렷해집니다.";
    }

    return {
      name: g.n, key: key, head: head, body: body, tip: g.tip,
      need: needKey, exposed: exposed,
      chip: "격 " + g.n.replace(/\(.*\)/, "")
    };
  }

  /* ---------- 조립 ---------- */
  function build(ctx) {
    if (!ctx || !ctx.pillars) return null;
    var c = ctx.counts || ctx.elementCount || [0, 0, 0, 0, 0];
    var total = 0;
    for (var i = 0; i < 5; i++) total += c[i] || 0;
    if (!total) return null;
    var me = (typeof ctx.me === "number") ? ctx.me : GAN_EL[ctx.pillars.day.gi];
    var norm = {
      pillars: ctx.pillars, me: me, counts: c, ten: ctx.ten || {},
      strong: !!ctx.strong, strengthScore: (typeof ctx.strengthScore === "number" ? ctx.strengthScore : 0)
    };
    var climate = climateOf(ctx.pillars.month.zi, c, total);
    var jigi = jigiOf(norm);
    var gyeok = gyeokOf(norm);

    /* 조후가 부르는 기운과 적천수의 억부 방향이 같은 곳을 가리키는지 */
    var inEl = -1, gwanEl = -1;
    for (var e = 0; e < 5; e++) { if (SAENG[e] === me) inEl = e; if (GEUK[e] === me) gwanEl = e; }
    var outEl = SAENG[me], jaeEl = GEUK[me];
    var okSet = norm.strong ? [outEl, jaeEl, gwanEl] : [inEl, me];
    var jot = climate.needs[0];
    var eok = norm.strong ? outEl : inEl;
    var fork = okSet.indexOf(jot) >= 0
      ? "궁통보감이 부르는 " + elJ(jot) + " 쪽과 적천수가 말하는 방향이 겹칩니다. 계절과 기세가 같은 곳을 가리키는, 드물게 정돈된 구조입니다."
      : "궁통보감은 " + elJ(jot, "eul") + " 부르고, 적천수는 " + elJ(eok) + " 쪽을 권합니다. " +
        "이렇게 갈릴 때 실무에서는 계절이 급한 쪽(조후)을 먼저 세우고 기세는 그 위에서 맞춥니다 — 몸이 먼저 지면 나머지가 의미를 잃기 때문입니다.";

    return {
      climate: climate, jigi: jigi, gyeok: gyeok, fork: fork,
      line: climate.chip + " · " + jigi.chip + " · " + gyeok.chip
    };
  }

  function card(no, name, sub, d) {
    return '<div class="cl-card">' +
      '<h3><span class="cl-n">' + no + '</span>' + name + ' <i>' + sub + '</i></h3>' +
      '<div class="cl-val">' + d.head + '</div>' +
      '<p class="cl-body">' + d.body + '</p>' +
      '<p class="cl-tip"><b>한 줄</b> ' + d.tip + '</p>' +
      '</div>';
  }

  function panel(ctx) {
    var b = build(ctx);
    if (!b) return "";
    return '<div class="panel mt" id="classicPanel">' +
      '<h2 class="sec">고전 3관점 <small>궁통보감 · 적천수 · 자평진전</small></h2>' +
      '<p class="pro-intro">같은 원국을 세 고전이 서로 다른 각도로 읽습니다. 아래 값은 모두 위에서 계산된 월지·오행 개수·일간 강약·월지 지장간에서 나온 것이라, 사주를 모르는 분도 읽을 수 있게 풀었어요.</p>' +
      '<div class="cl-list">' +
        card("①", "궁통보감", "계절과 온도 · 조후", b.climate) +
        card("②", "적천수", "기세와 균형 · 통관", b.jigi) +
        card("③", "자평진전", "격국과 그릇", b.gyeok) +
      '</div>' +
      '<p class="cl-fork"><b>세 관점이 엇갈릴 때 —</b> ' + b.fork + '</p>' +
      '</div>';
  }

  var api = {
    build: build, panel: panel,
    climateOf: climateOf, jigiOf: jigiOf, gyeokOf: gyeokOf,
    tenPair: tenPair, JANGAN: JANGAN, MONTH: MONTH
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.SAJU_CLASSIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
