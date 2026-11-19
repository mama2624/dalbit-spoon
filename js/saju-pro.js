/* 달빛 한 스푼 v4.3 — 사주 업그레이드 (2026-11-20)
   P1 원국 포함 AI 프롬프트 내보내기 · P2 대운·세운 표
   P3 오늘의 일진 + 이 기기 저장 · P4 원국만 담은 공유 링크·카드
   · 사주 화면에서만 쓰는 지연 로딩 모듈입니다. (js/saju-view.js 보다 먼저 받습니다)
   · 서버·API 없이 브라우저 계산만 합니다. 생년월일은 이 기기(localStorage)에만 저장합니다. */
(function (root) {
  "use strict";

  var KEY = "dalbit.saju.v1";
  var SITE = "https://saju.gold-queen.com";

  var GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var GAN_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  var ZHI_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  var EL = ["목", "화", "토", "금", "수"];
  var EL_H = ["木", "火", "土", "金", "水"];
  var GAN_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var ZHI_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var SAENG = [1, 2, 3, 4, 0];
  var GEUK = [2, 3, 4, 0, 1];
  var TEN_KO = { bigeop: "비겁", siksang: "식상", jaeseong: "재성", gwanseong: "관성", inseong: "인성" };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ============================================================
     공용 계산 (엔진이 없을 때도 홈 배지에서 쓸 수 있게 최소한만)
     ============================================================ */
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  /* 오늘의 일진 (한국표준시 자정 기준, 23시 이후는 다음 날 일주 — 엔진과 같은 규칙) */
  function todayGanji() {
    var t = new Date();
    var j = jdn(t.getFullYear(), t.getMonth() + 1, t.getDate());
    if (t.getHours() >= 23) j += 1;
    var idx = (((j + 49) % 60) + 60) % 60;
    return { gi: idx % 10, zi: idx % 12, y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
  }

  function tenOf(meEl, otherEl) {
    if (meEl === otherEl) return "bigeop";
    if (SAENG[meEl] === otherEl) return "siksang";
    if (GEUK[meEl] === otherEl) return "jaeseong";
    if (GEUK[otherEl] === meEl) return "gwanseong";
    return "inseong";
  }

  /* 오늘 일진 3줄 — 일진 오행과 내 일간의 관계(오행 5분기)로 씁니다 */
  var ILJIN = {
    bigeop: {
      rel: "비겁 — 나와 같은 기운",
      tip: "혼자 결정하지 말고 한 사람에게 먼저 물어보세요. 약속은 하나만 잡는 편이 좋아요."
    },
    siksang: {
      rel: "식상 — 내가 밖으로 내보내는 기운",
      tip: "미뤄 둔 말·글·연락 하나를 오늘 꺼내 보세요. 표현이 잘 통하는 날이에요."
    },
    jaeseong: {
      rel: "재성 — 내가 다루는 현실·돈의 기운",
      tip: "나갈 돈과 들어올 돈을 한 줄씩 적어 보세요. 숫자를 확인하면 새는 곳이 보여요."
    },
    gwanseong: {
      rel: "관성 — 나를 누르는 규칙·책임의 기운",
      tip: "새로 벌이지 말고 해야 할 일을 순서대로 하나씩 끝내세요."
    },
    inseong: {
      rel: "인성 — 나를 채워 주는 배움·도움의 기운",
      tip: "15분만 읽거나 정리해 보세요. 오늘 모은 정보가 내 편이 됩니다."
    }
  };

  var SEUN_LINE = {
    bigeop: "동료·경쟁·내 몸을 쓰는 한 해",
    siksang: "표현·시도·새로 내보내는 한 해",
    jaeseong: "돈과 현실 성과가 움직이는 한 해",
    gwanseong: "책임·직장·관계의 압박이 오는 한 해",
    inseong: "배움·도움·정리로 채우는 한 해"
  };

  function iljinLines(dayGi) {
    var t = todayGanji();
    var meEl = GAN_EL[dayGi];
    var otherEl = GAN_EL[t.gi];
    var g = tenOf(meEl, otherEl);
    return {
      l1: "오늘 " + GAN[t.gi] + ZHI[t.zi] + "(" + GAN_KO[t.gi] + ZHI_KO[t.zi] + ")일 · " + EL[otherEl] + "(" + EL_H[otherEl] + ") 기운",
      l2: "내 일간 " + GAN[dayGi] + "(" + EL[meEl] + ")에게는 " + ILJIN[g].rel,
      l3: ILJIN[g].tip
    };
  }

  /* ============================================================
     이 기기 저장 (localStorage · 서버 전송 없음)
     ============================================================ */
  function loadSaved() {
    try {
      var raw = root.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o.y !== "number" || typeof o.m !== "number" || typeof o.d !== "number") return null;
      return o;
    } catch (e) { return null; }
  }

  function writeSaved(o) {
    try { root.localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; }
  }

  function clearSaved() {
    try { root.localStorage.removeItem(KEY); } catch (e) { }
  }

  /* ============================================================
     P3 — 홈 상단 '오늘의 일진' 배지 (저장한 사람에게만)
     ============================================================ */
  function renderHomeBadge() {
    var host = $("homeIljin");
    if (!host) return;
    var sv = loadSaved();
    if (!sv) { host.hidden = true; host.innerHTML = ""; return; }
    var dayGi = (typeof sv.dayGi === "number") ? sv.dayGi : null;
    if (dayGi === null) { host.hidden = true; return; }
    var L = iljinLines(dayGi);
    host.innerHTML =
      '<button type="button" class="ijin-card" id="ijinCardLink">' +
        '<span class="ijin-hd"><span class="ijin-kicker">내 사주 · 오늘의 일진</span><span class="ijin-go">열기 ›</span></span>' +
        '<span class="ijin-l1">' + esc(L.l1) + '</span>' +
        '<span class="ijin-l2">' + esc(L.l2) + '</span>' +
        '<span class="ijin-l3">' + esc(L.l3) + '</span>' +
      '</button>';
    host.hidden = false;

    /* <a href>는 애드센스 전면광고(#google_vignette)가 클릭을 가로채서,
       메뉴 카드처럼 버튼 + 앱 안 화면 전환으로 엽니다. (2026-11-20 실서버 확인) */
    var a = host.querySelector("#ijinCardLink");
    if (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        root.__dalbitOpenSaved = true;
        if (root.DALBIT_APP && root.DALBIT_APP.goView) root.DALBIT_APP.goView("saju");
        else root.location.hash = "saju=saved";
      });
    }
  }

  /* ============================================================
     P2 — 대운 · 세운
     ============================================================ */
  function daeunRowsWithTen(rows, me) {
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      out.push({
        age: r.age, text: r.text, textKo: r.textKo,
        startYear: r.startYear, endYear: r.endYear,
        ten: TEN_KO[tenOf(me, GAN_EL[r.gi])]
      });
    }
    return out;
  }

  function daeunPanel(ctx) {
    var dn = ctx.daeun;
    if (!dn) return "";
    var rows = daeunRowsWithTen(dn.rows, ctx.me);
    var now = new Date().getFullYear();
    var cur = -1, i;
    for (i = 0; i < rows.length; i++) {
      if (ctx.age >= rows[i].age && ctx.age < rows[i].age + 10) { cur = i; break; }
    }
    if (cur < 0) {
      for (i = rows.length - 1; i >= 0; i--) { if (ctx.age >= rows[i].age) { cur = i; break; } }
      if (cur < 0) cur = 0;
    }

    var head;
    if (ctx.age >= rows[0].age) {
      head = '<div class="dn-now">만 ' + ctx.age + '세 · <b>' + rows[cur].text + '(' + rows[cur].textKo + ')</b> 대운' +
        '<span class="dn-range">' + rows[cur].startYear + ' ~ ' + rows[cur].endYear + '</span></div>';
    } else {
      head = '<div class="dn-now">첫 대운은 만 ' + rows[0].age + '세에 시작해요 · <b>' + rows[0].text + '(' + rows[0].textKo + ')</b>' +
        '<span class="dn-range">' + rows[0].startYear + ' ~ ' + rows[0].endYear + '</span></div>';
    }

    var table = '<div class="dn-table"><div class="dn-row dn-head"><span>나이</span><span>대운</span><span>십성</span></div>';
    var shown = 0;
    for (i = Math.max(0, cur); i < rows.length && shown < 4; i++) {
      shown++;
      table += '<div class="dn-row' + (i === cur ? ' dn-cur' : '') + '">' +
        '<span>' + rows[i].age + '세</span>' +
        '<span class="dn-g">' + rows[i].text + '<small>' + rows[i].textKo + '</small></span>' +
        '<span>' + rows[i].ten + '</span></div>';
    }
    table += '</div>';

    var seunHtml = '';
    for (var k = 0; k < 2; k++) {
      var yr = now + k;
      var sn = (window.SAJU && SAJU.seun) ? SAJU.seun(yr) : null;
      if (!sn) continue;
      var g = tenOf(ctx.me, GAN_EL[sn.gi]);
      seunHtml += '<div class="sn-row"><b>' + yr + '년 ' + sn.text + '(' + sn.textKo + ')</b> · ' +
        EL[GAN_EL[sn.gi]] + ' 기운 · ' + TEN_KO[g] + ' — ' + SEUN_LINE[g] + '</div>';
    }

    return '<div class="panel mt" id="daeunPanel">' +
      '<h2 class="sec">지금 내 대운 <small>10년 흐름</small></h2>' +
      head +
      table +
      (seunHtml ? '<div class="sn">' + seunHtml + '</div>' : '') +
      '<p class="note">· 대운수는 만세력마다 1살 차이가 날 수 있어요(나머지 일수 처리·나이 기준 차이).' +
      (dn.unknownTime ? '<br>· 태어난 시간을 몰라 정오로 계산했어요. 대운이 ±1살 차이 날 수 있습니다.' : '') +
      '<br>· 표준시·진태양시 보정은 하지 않았어요. 학파에 따라 대운을 보는 방식이 다를 수 있습니다.</p>' +
      '</div>';
  }

  /* ============================================================
     P1 — 원국 포함 AI 프롬프트
     ============================================================ */
  var Q = [
    "이 사주는 한 문장으로 어떤 팔자인가. 다섯 관점을 두루 아는 사람이 이 원국을 처음 봤을 때 드는 생각과, 이 사람이 내 가족이라면 해 주고 싶은 말.",
    "90세까지 산다고 할 때 가장 힘든 구간은 언제이고 사주적으로 왜인가.",
    "2020년대 한국을 살아가면서 이 사주가 가장 자주 느낄 감정과 몸에 밴 습관.",
    "원국대로 아무것도 바꾸지 않고 산다면 어떤 삶이 되는가 — 연대기 시나리오로.",
    "계속 돌아보고 고치려 애쓴다면 결국 무엇을 이루는가.",
    "평안하다고 느낄 시기는 언제이고 그 이유는 무엇인가.",
    "내 현재 상황(일·가정·공부)을 알려줄 테니 5년 안에 올 굵직한 사건은 무엇인가.",
    "앞으로의 대운 10년을 세운 단위로 풀어라 — 밀어붙일 해와 지킬 해, 해마다 꼭 챙길 하나씩.",
    "이 인생이 크게 흔들린다면 언제이며 무엇을 가장 조심해야 하는가.",
    "이 사주에 대한 종합 평가.",
    "2026년과 2027년 각각.",
    "한 줄 평 + 용신·희신·기신·구신과 그것을 일상에서 쓰는 법.",
    "힘이 되는 세운의 합, 조심할 극·형·파·충 — 각각 무슨 일이 생기고 어떻게 대처하나.",
    "묻지 않았지만 꼭 해 주고 싶은 말.",
    "일상에서 습관처럼 할 수 있는 실질적 개운법."
  ];
  var QS = [
    "어떤 팔자인가", "가장 고단한 시절", "2020년대 감정·습관", "원국대로 산다면", "고치려 애쓴다면",
    "평안한 시기", "5년 내 굵직한 사건", "새 대운 10년", "나락과 조심할 것", "종합 평가",
    "2026·2027 평가", "한 줄 평 + 용신", "합과 극·형·파·충", "묻지 않았지만", "습관이 되는 개운법"
  ];

  function hourLabel(hour) {
    if (hour === null || hour === undefined) return null;
    var arr = root.HOURS || [];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].v === hour) return arr[i].label;
    }
    return hour + "시 무렵";
  }

  function jieName(jieLabel) {
    var s = String(jieLabel || "");
    var p = s.indexOf("(");
    return p > 0 ? s.substring(0, p) : s;
  }

  function pillarLine(p) {
    return p.text + "(" + p.textKo + ")";
  }

  function missingText(counts) {
    var m = [];
    for (var i = 0; i < 5; i++) if (counts[i] === 0) m.push(EL[i]);
    return m.length ? m.join(", ") : "없음";
  }

  function wonBlock(ctx) {
    var p = ctx.pillars;
    var L = [];
    L.push("[원국 — 만세력 계산값]");
    L.push("아래 값은 만세력으로 계산한 결과다. 절대 다시 계산하거나 바꾸지 말고, 이 값만 가지고 해석해라. 값이 비어 있으면 지어내지 말고 나에게 먼저 물어라.");
    if (ctx.shared) {
      L.push("- 생년월일: 기록 없음 (원국만 공유받았다. 생년월일·성별·출생지는 알 수 없다)");
      L.push("- 태어난 시간: " + (p.hour ? "원국에 시주가 포함되어 있다" : "모름 — 시주를 빼고 세 기둥으로만 해석"));
    } else {
      L.push("- 생년월일: " + ctx.solar.y + "년 " + ctx.solar.m + "월 " + ctx.solar.d + "일(양력) / 음력 " +
        (ctx.lunar ? ctx.lunar.y + "년 " + ctx.lunar.m + "월 " + ctx.lunar.d + "일" + (ctx.lunar.leap ? " (윤달)" : "") : "해당 없음") +
        " / 성별: " + (ctx.gender === "m" ? "남성" : "여성"));
      L.push("- 태어난 시간: " + (ctx.unknownTime ? "모름 — 시주를 빼고 세 기둥으로만 해석" : hourLabel(ctx.hour)));
      L.push("- 월주 기준 절기: " + jieName(ctx.jieLabel) + " 이후 출생 (한국표준시 기준, 진태양시 보정 없음, 출생지 미입력)");
    }
    L.push("- 사주: 년주 " + pillarLine(p.year) + " · 월주 " + pillarLine(p.month) + " · 일주 " + pillarLine(p.day) +
      " · 시주 " + (p.hour ? pillarLine(p.hour) : "없음(모름)"));
    L.push("- 일간: " + p.day.gan + "(" + EL[ctx.me] + "), 신강·중화·신약 판정: " + (ctx.strong ? "신강" : "신약") +
      " (강약 지수 " + ctx.strengthScore + ")");
    L.push("- 오행 분포: 목 " + ctx.counts[0] + " 화 " + ctx.counts[1] + " 토 " + ctx.counts[2] + " 금 " + ctx.counts[3] + " 수 " + ctx.counts[4] +
      " (없는 오행: " + missingText(ctx.counts) + ")");
    L.push("- 십성 개수: 비겁 " + ctx.ten.bigeop + " 식상 " + ctx.ten.siksang + " 재성 " + ctx.ten.jaeseong + " 관성 " + ctx.ten.gwanseong + " 인성 " + ctx.ten.inseong);
    if (ctx.daeun) {
      var dr = ctx.daeun.rows;
      var list = [];
      for (var i = 0; i < dr.length; i++) list.push(dr[i].age + "세 " + dr[i].text + "(" + dr[i].textKo + ")");
      L.push("- 대운: " + (ctx.daeun.forward ? "순행" : "역행") + " " + ctx.daeun.daeunSu + "세 시작 — " + list.join(", "));
      if (ctx.daeun.unknownTime) L.push("- 대운 계산 참고: 태어난 시간을 몰라 정오로 계산했다(대운수 ±1살 차이 가능).");
    }
    if (!ctx.shared) L.push("- 지금 나이: 만 " + ctx.age + "세 (" + ctx.year + "년 기준)");
    return L.join("\n");
  }

  var RULES = [
    "[해석 규칙]",
    "1. 다섯 관점을 각각 따로 쓴다 — 뼈대(《연해자평》)·백과사전(《삼명통회》)·기세(《적천수》)·격국(《자평진전》)·계절(《궁통보감》). 한 관점으로 뭉개지 마라.",
    "2. 다섯 관점이 서로 다르게 말하는 지점을 반드시 짚어라. 억지로 하나로 합치지 마라.",
    "3. 지장간, 천간과 지지의 관계(합·충·형·파·해), 대운과 세운을 근거로 쓴다.",
    "4. 한자는 처음 나올 때 한글과 함께 쓰고, 사주를 전혀 모르는 사람도 이해하도록 비유로 설명한다.",
    "5. 위 원국에 없는 정보(직업·가족·건강·재산)는 지어내지 말고, 필요하면 나에게 먼저 질문한다.",
    "6. 단정하지 말고 \"이 관점에서는\"이라고 근거를 밝힌다. 의료·법률·투자 결정을 대신하지 않는다.",
    "7. 한국어로 쓴다."
  ].join("\n");

  var OPENING = "너는 아래 사주 원국을 《연해자평》·《삼명통회》·《적천수》·《자평진전》·《궁통보감》 다섯 고전의 관점으로 읽어 주는 명리 해설자다.";

  function questionsBlock() {
    var L = ['[질문 목록 — 내가 번호를 말하면 그 번호만, "다음"이라고 하면 다음 번호를 답한다]'];
    for (var i = 0; i < Q.length; i++) L.push((i + 1) + ". " + Q[i]);
    return L.join("\n");
  }

  function compose(ctx, n) {
    var parts = [OPENING, "", wonBlock(ctx), "", RULES, ""];
    if (n) {
      parts.push("[요청]\n이번에는 아래 " + n + "번만 답한다. 다른 번호는 답하지 않는다.\n" + n + ". " + Q[n - 1]);
      parts.push("");
      parts.push("한국어 3,000자 이상으로, 소제목을 나눠 읽기 쉽게 쓴다.");
    } else {
      parts.push(questionsBlock());
      parts.push("");
      parts.push("각 번호의 답변은 한국어 3,000자 이상으로, 소제목을 나눠 읽기 쉽게 쓴다. 준비되면 \"준비\"라고만 답하고, 원국에서 확인이 필요한 것이 있으면 먼저 물어봐.");
    }
    parts.push("");
    parts.push("▸ 원국 계산: " + SITE);
    return parts.join("\n");
  }

  function promptPanel(ctx) {
    var chips = "";
    for (var i = 0; i < QS.length; i++) {
      chips += '<button class="pq" type="button" data-pro="copyN" data-n="' + (i + 1) + '">' +
        '<b>' + (i + 1) + '</b>' + esc(QS[i]) + '</button>';
    }
    return '<div class="panel mt" id="promptPanel">' +
      '<h2 class="sec">더 깊이 보기 <small>AI에게 내 원국 그대로 물어보기</small></h2>' +
      '<p class="pro-intro">만세력으로 계산한 원국을 그대로 넣어 프롬프트를 만들어요. ChatGPT·제미나이에 붙여넣으면 다섯 고전 관점으로 풀어 줍니다. 원국을 다시 계산하지 말라고 미리 못 박아 두기 때문에, 원국이 틀리는 일이 없어요.</p>' +
      '<div class="pro-btns">' +
        '<button class="btn btn-primary" type="button" data-pro="copyAll">① AI에게 물어보기 (프롬프트 복사)</button>' +
        '<button class="btn btn-ghost" type="button" data-pro="cardSq">② 원국 카드 이미지 저장</button>' +
      '</div>' +
      '<p class="hint">번호를 누르면 그 문항만 담은 짧은 프롬프트를 복사해요. AI에게 "2번"이라고 말하면 그 번호만 답합니다.</p>' +
      '<div class="pq-grid">' + chips + '</div>' +
      '</div>';
  }

  function savePanel(ctx) {
    var sv = loadSaved();
    var isSaved = !!(sv && !ctx.shared && sv.y === ctx.solar.y && sv.m === ctx.solar.m && sv.d === ctx.solar.d &&
      (sv.hour === ctx.hour || (sv.hour === null && ctx.hour === null)));
    var btns = ctx.shared
      ? '<div class="pro-btns two"><button class="btn btn-ghost" type="button" data-pro="cardStory">스토리 카드(1080×1920) 저장</button>' +
        '<button class="btn btn-ghost" type="button" data-pro="again">내 사주 계산하기</button></div>'
      : '<div class="pro-btns two">' +
        (isSaved
          ? '<button class="btn btn-ghost" type="button" data-pro="del">저장 삭제</button>'
          : '<button class="btn btn-primary" type="button" data-pro="save">이 기기에 저장</button>') +
        '<button class="btn btn-ghost" type="button" data-pro="share">공유하기</button></div>' +
        '<div class="pro-btns two"><button class="btn btn-ghost" type="button" data-pro="cardStory">스토리 카드(1080×1920) 저장</button></div>';

    var head = ctx.shared
      ? '공유받은 원국을 그대로 보고 있어요. 생년월일은 링크에 담기지 않습니다.'
      : (isSaved
        ? '<b class="ok">저장됨</b> · 다음에 오면 홈에서 오늘의 일진을 바로 보여드려요.'
        : '저장해 두면 내일 다시 왔을 때 <b>오늘의 일진</b>을 홈에서 바로 볼 수 있어요.');

    return '<div class="panel mt" id="savePanel">' +
      '<h2 class="sec">' + (ctx.shared ? '이 원국 저장하고 공유하기' : '이 사주 저장하고 내일 또 보기') + '</h2>' +
      '<p class="pro-intro" id="saveState">' + head + '</p>' +
      btns +
      '<p class="note">· 생년월일은 이 브라우저에만 저장되고 서버로 보내지 않아요. 저장 삭제를 누르면 바로 지워집니다.' +
      (ctx.shared ? '' : '<br>· 공유 링크에는 생년월일·성별 없이 원국 8자만 담깁니다.') +
      '</p>' +
      '</div>';
  }

  function iljinStrip(ctx) {
    var L = iljinLines(ctx.pillars.day.gi);
    return '<div class="ijin-strip">' +
      '<div class="ijin-l1">' + esc(L.l1) + '</div>' +
      '<div class="ijin-l2">' + esc(L.l2) + '</div>' +
      '<div class="ijin-l3">' + esc(L.l3) + '</div>' +
      '</div>';
  }

  /* ============================================================
     문맥 만들기 — 계산 결과 / 공유 원국
     ============================================================ */
  function ctxFromResult(s, gender) {
    var counts = s.elementCount;
    var now = new Date();
    var ctx = {
      shared: false,
      solar: s.solar,
      lunar: s.lunar,
      gender: gender,
      hour: s.unknownTime ? null : s.hour,
      unknownTime: s.unknownTime,
      pillars: s.pillars,
      me: s.me,
      counts: counts,
      ten: s.ten,
      strong: s.strong,
      strengthScore: s.strengthScore,
      jieLabel: s.jieLabel,
      age: (window.SAJU && SAJU.ageAt) ? SAJU.ageAt(s.solar.y, s.solar.m, s.solar.d, now) : 0,
      year: now.getFullYear(),
      daeun: (window.SAJU && SAJU.daeun) ? SAJU.daeun(s.solar.y, s.solar.m, s.solar.d, s.unknownTime ? null : s.hour, gender) : null
    };
    return ctx;
  }

  function parseGanji(str) {
    var s = String(str || "").replace(/\s+/g, "");
    if (!/^[\u4e00-\u9fff\uac00-\ud7a3]{6,8}$/.test(s)) return null;
    var out = [];
    for (var i = 0; i + 1 < s.length; i += 2) {
      var a = GAN.indexOf(s.charAt(i)); if (a < 0) a = GAN_KO.indexOf(s.charAt(i));
      var b = ZHI.indexOf(s.charAt(i + 1)); if (b < 0) b = ZHI_KO.indexOf(s.charAt(i + 1));
      if (a < 0 || b < 0) return null;
      out.push({ gi: a, zi: b });
    }
    return (out.length === 3 || out.length === 4) ? out : null;
  }

  function pillarOf(gi, zi) {
    return {
      gan: GAN[gi], zhi: ZHI[zi], ganKo: GAN_KO[gi], zhiKo: ZHI_KO[zi], gi: gi, zi: zi,
      text: GAN[gi] + ZHI[zi], textKo: GAN_KO[gi] + ZHI_KO[zi]
    };
  }

  function ctxFromGanji(list) {
    var P = { year: pillarOf(list[0].gi, list[0].zi), month: pillarOf(list[1].gi, list[1].zi), day: pillarOf(list[2].gi, list[2].zi), hour: null };
    if (list.length === 4) P.hour = pillarOf(list[3].gi, list[3].zi);
    var me = GAN_EL[P.day.gi];
    var counts = [0, 0, 0, 0, 0];
    var ten = { bigeop: 0, siksang: 0, jaeseong: 0, gwanseong: 0, inseong: 0 };
    var all = [P.year, P.month, P.day];
    if (P.hour) all.push(P.hour);
    for (var i = 0; i < all.length; i++) {
      counts[GAN_EL[all[i].gi]]++;
      counts[ZHI_EL[all[i].zi]]++;
      if (i !== 2) ten[tenOf(me, GAN_EL[all[i].gi])]++;
      ten[tenOf(me, ZHI_EL[all[i].zi])]++;
    }
    var strength = ten.bigeop + ten.inseong + (ZHI_EL[P.month.zi] === me ? 1 : 0);
    var now = new Date();
    return {
      shared: true,
      solar: null, lunar: null, gender: "", hour: null, unknownTime: !P.hour,
      pillars: P, me: me, counts: counts, ten: ten,
      strong: strength >= 3.2, strengthScore: Math.round(strength * 10) / 10,
      jieLabel: "", age: 0, year: now.getFullYear(), daeun: null
    };
  }

  function pillarsGanji(p) {
    var s = p.year.text + p.month.text + p.day.text;
    if (p.hour) s += p.hour.text;
    return s;
  }

  function shareUrl(ctx) {
    return SITE + "/#saju=" + encodeURIComponent(pillarsGanji(ctx.pillars));
  }

  /* ============================================================
     P4 — 공유 · 원국 카드
     ============================================================ */
  function copyShareLink(url) {
    var UI = root.DALBIT_UI;
    if (!UI || !UI.copy) return;
    UI.copy(url).then(function () {
      UI.toast("✓ 공유 링크를 복사했어요. 원국 8자만 담겨 있어요");
    }, function () {
      UI.toast("링크 복사에 실패했어요. 주소창의 주소를 복사해 주세요.");
    });
  }

  function shareCtx(ctx) {
    var url = shareUrl(ctx);
    var txt = "만세력으로 계산한 내 사주 원국이에요.\n" +
      "년주 " + pillarLine(ctx.pillars.year) + " · 월주 " + pillarLine(ctx.pillars.month) +
      " · 일주 " + pillarLine(ctx.pillars.day) + (ctx.pillars.hour ? " · 시주 " + pillarLine(ctx.pillars.hour) : "") + "\n" +
      "일간 " + ctx.pillars.day.gan + "(" + EL[ctx.me] + ") — 링크를 열면 같은 원국으로 AI 프롬프트까지 만들 수 있어요.";
    /* 공유 시트를 쓸 수 있으면 그걸로, 못 쓰거나 실패하면 링크 복사로 대신합니다.
       사용자가 공유 시트를 그냥 닫은 경우(AbortError)에는 아무 것도 하지 않습니다. */
    if (root.navigator && root.navigator.share) {
      var p = null;
      try {
        p = root.navigator.share({ title: "달빛 한 스푼 — 만세력 사주", text: txt, url: url });
      } catch (e) { p = null; }
      if (p && typeof p.then === "function") {
        p.then(function () { }, function (err) {
          if (err && err.name === "AbortError") return;
          copyShareLink(url);
        });
        return;
      }
    }
    copyShareLink(url);
  }

  var FONT = 'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCard(ctxs, size) {
    var W = 1080;
    var H = (size === "story") ? 1920 : 1080;
    var cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    var c = cv.getContext("2d");
    if (!c) return null;

    var g = c.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, "#0d0c1a");
    g.addColorStop(0.55, "#07060f");
    g.addColorStop(1, "#020204");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    var glow = c.createRadialGradient(W * 0.5, 60, 0, W * 0.5, 60, W * 0.9);
    glow.addColorStop(0, "rgba(233,198,126,.15)");
    glow.addColorStop(1, "rgba(233,198,126,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);

    roundRect(c, 34, 34, W - 68, H - 68, 44);
    c.strokeStyle = "rgba(233,198,126,.30)";
    c.lineWidth = 2;
    c.stroke();

    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = "#e9c67e";
    c.font = "700 40px " + FONT;
    c.fillText("달빛 한 스푼", W / 2, 116);

    c.fillStyle = "rgba(233,198,126,.75)";
    c.font = "500 26px " + FONT;
    c.fillText("만세력 원국", W / 2, 158);

    var p = ctxs.pillars;
    var head = p.day.text + "(" + p.day.textKo + ") 일간 · " + EL[ctxs.me] + "(" + EL_H[ctxs.me] + ")";
    c.fillStyle = "#faf5ea";
    c.font = "800 54px " + FONT;
    c.fillText(head, W / 2, 246);

    var kicker = ctxs.shared
      ? "공유받은 원국 · 생년월일 없이 원국만"
      : (ctxs.solar.y + "년 " + ctxs.solar.m + "월 " + ctxs.solar.d + "일" +
        (ctxs.unknownTime ? " · 시간 모름" : "") + " · " + (ctxs.gender === "m" ? "남성" : "여성"));
    c.fillStyle = "rgba(233,226,246,.62)";
    c.font = "400 24px " + FONT;
    c.fillText(kicker, W / 2, 288);

    /* 4기둥 */
    var top = 340, cellW = 210, gap = 18;
    var totalW = 4 * cellW + 3 * gap;
    var x0 = (W - totalW) / 2;
    var names = ["년주", "월주", "일주", "시주"];
    var list = [p.year, p.month, p.day, p.hour];
    for (var i = 0; i < 4; i++) {
      var x = x0 + i * (cellW + gap);
      roundRect(c, x, top, cellW, 240, 22);
      c.fillStyle = "rgba(255,255,255,.055)";
      c.fill();
      c.strokeStyle = "rgba(233,198,126,.20)";
      c.lineWidth = 2;
      c.stroke();

      c.fillStyle = "rgba(233,226,246,.5)";
      c.font = "600 22px " + FONT;
      c.fillText(names[i], x + cellW / 2, top + 38);

      var pl = list[i];
      if (pl) {
        c.fillStyle = "#faf5ea";
        c.font = "700 76px " + FONT;
        c.fillText(pl.gan + pl.zhi, x + cellW / 2, top + 132);
        c.fillStyle = "rgba(233,226,246,.72)";
        c.font = "500 26px " + FONT;
        c.fillText(pl.ganKo + pl.zhiKo, x + cellW / 2, top + 176);
        c.fillStyle = "rgba(233,198,126,.85)";
        c.font = "500 22px " + FONT;
        c.fillText(EL[GAN_EL[pl.gi]] + "·" + EL[ZHI_EL[pl.zi]], x + cellW / 2, top + 214);
      } else {
        c.fillStyle = "rgba(233,226,246,.35)";
        c.font = "500 40px " + FONT;
        c.fillText("모름", x + cellW / 2, top + 140);
      }
    }

    /* 오행·십성 */
    var y = top + 306;
    c.fillStyle = "#f4efe6";
    c.font = "600 29px " + FONT;
    c.fillText("목 " + ctxs.counts[0] + " · 화 " + ctxs.counts[1] + " · 토 " + ctxs.counts[2] + " · 금 " + ctxs.counts[3] + " · 수 " + ctxs.counts[4], W / 2, y);

    c.fillStyle = "rgba(233,226,246,.62)";
    c.font = "400 24px " + FONT;
    c.fillText("비겁 " + ctxs.ten.bigeop + " · 식상 " + ctxs.ten.siksang + " · 재성 " + ctxs.ten.jaeseong + " · 관성 " + ctxs.ten.gwanseong + " · 인성 " + ctxs.ten.inseong, W / 2, y + 40);

    var y2 = y + 96;
    if (ctxs.daeun && ctxs.daeun.rows.length) {
      var rows = ctxs.daeun.rows;
      var cur = 0;
      for (var k = 0; k < rows.length; k++) {
        if (ctxs.age >= rows[k].age && ctxs.age < rows[k].age + 10) { cur = k; break; }
      }
      c.fillStyle = "#e9c67e";
      c.font = "700 26px " + FONT;
      c.fillText("지금 만 " + ctxs.age + "세 · " + rows[cur].text + "(" + rows[cur].textKo + ") 대운 · " + rows[cur].startYear + "~" + rows[cur].endYear, W / 2, y2);
      y2 += 44;
      c.fillStyle = "rgba(233,226,246,.5)";
      c.font = "400 22px " + FONT;
      c.fillText("다음 대운 " + rows[Math.min(cur + 1, rows.length - 1)].age + "세 " + rows[Math.min(cur + 1, rows.length - 1)].text +
        " · 그다음 " + rows[Math.min(cur + 2, rows.length - 1)].age + "세 " + rows[Math.min(cur + 2, rows.length - 1)].text, W / 2, y2);
    }

    if (size === "story") {
      var L = iljinLines(p.day.gi);
      c.fillStyle = "rgba(233,198,126,.9)";
      c.font = "700 30px " + FONT;
      c.fillText("오늘의 일진", W / 2, 1080);
      c.fillStyle = "rgba(243,239,251,.85)";
      c.font = "400 26px " + FONT;
      c.fillText(L.l1, W / 2, 1128);
      c.fillStyle = "rgba(243,239,251,.7)";
      c.font = "400 24px " + FONT;
      c.fillText(L.l2, W / 2, 1172);

      c.strokeStyle = "rgba(233,198,126,.25)";
      c.beginPath();
      c.moveTo(120, 1230);
      c.lineTo(W - 120, 1230);
      c.stroke();

      c.fillStyle = "#e9c67e";
      c.font = "700 34px " + FONT;
      c.fillText("이 원국 그대로 AI에게 물어보기", W / 2, 1330);
      c.fillStyle = "rgba(243,239,251,.8)";
      c.font = "400 26px " + FONT;
      c.fillText("원국을 다시 계산하지 말라고 못 박은 프롬프트를", W / 2, 1380);
      c.fillText("사이트에서 한 번에 복사할 수 있어요.", W / 2, 1418);
      c.fillStyle = "rgba(233,198,126,.85)";
      c.font = "600 28px " + FONT;
      c.fillText("saju.gold-queen.com", W / 2, 1500);

      c.strokeStyle = "rgba(233,198,126,.18)";
      c.beginPath();
      c.moveTo(200, 1580);
      c.lineTo(W - 200, 1580);
      c.stroke();
      c.fillStyle = "rgba(243,239,251,.62)";
      c.font = "400 24px " + FONT;
      c.fillText("1. 사이트에서 내 사주를 계산한다", W / 2, 1642);
      c.fillText("2. 프롬프트를 복사해 ChatGPT·제미나이에 붙여넣는다", W / 2, 1686);
      c.fillText("3. 1~15번 중 궁금한 번호만 물어본다", W / 2, 1730);
    } else {
      /* 정사각 카드: 아래 빈 자리에 프롬프트 안내 */
      c.strokeStyle = "rgba(233,198,126,.22)";
      c.beginPath();
      c.moveTo(140, 836);
      c.lineTo(W - 140, 836);
      c.stroke();
      c.fillStyle = "#e9c67e";
      c.font = "700 29px " + FONT;
      c.fillText("이 원국 그대로 AI에게 물어보기", W / 2, 892);
      c.fillStyle = "rgba(243,239,251,.72)";
      c.font = "400 23px " + FONT;
      c.fillText("원국을 다시 계산하지 않도록 고정한 프롬프트를", W / 2, 932);
      c.fillText("사이트에서 한 번에 복사할 수 있어요.", W / 2, 962);
    }

    c.textAlign = "center";
    c.fillStyle = "#e9c67e";
    c.font = "600 26px " + FONT;
    c.fillText("saju.gold-queen.com", W / 2, H - 76);
    c.fillStyle = "rgba(233,226,246,.4)";
    c.font = "400 19px " + FONT;
    c.fillText("만세력 계산 기준 · 표준시·진태양시 보정 없음 · 재미로 보는 풀이", W / 2, H - 42);

    return cv;
  }

  function saveImage(canvas, name) {
    var UI = root.DALBIT_UI;
    if (!canvas) { if (UI) UI.toast("이미지를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요."); return; }
    var fire = function (href, revoke) {
      var a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try { a.parentNode.removeChild(a); } catch (e) { }
        if (revoke) { try { URL.revokeObjectURL(href); } catch (e) { } }
      }, 2000);
      if (UI) UI.toast("✓ 원국 카드 이미지를 저장했어요!");
    };
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (!blob) { if (UI) UI.toast("이미지 저장에 실패했어요."); return; }
        fire(URL.createObjectURL(blob), true);
      }, "image/png");
    } else {
      fire(canvas.toDataURL("image/png"), false);
    }
  }

  /* ============================================================
     화면 조립 · 이벤트
     ============================================================ */
  function proBlocks(ctx) {
    return promptPanel(ctx) + savePanel(ctx);
  }

  function copyPrompt(ctx, n, btn) {
    var txt = compose(ctx, n);
    var UI = root.DALBIT_UI;
    UI.copy(txt).then(function () {
      if (btn) {
        var old = btn.getAttribute("data-lb") || btn.textContent;
        btn.setAttribute("data-lb", old);
        btn.textContent = "복사됐어요 ✓";
        clearTimeout(btn._t);
        btn._t = setTimeout(function () { btn.textContent = old; }, 1600);
      }
      UI.toast(n ? "✓ " + n + "번 프롬프트를 복사했어요" : "✓ 프롬프트를 복사했어요. ChatGPT·제미나이에 붙여넣어 보세요");
    }, function () {
      UI.toast("복사에 실패했어요. 길게 눌러 직접 복사해 주세요.");
    });
  }

  function saveThis(ctx, host) {
    var sv = {
      y: ctx.solar.y, m: ctx.solar.m, d: ctx.solar.d,
      hour: ctx.unknownTime ? null : ctx.hour,
      gender: ctx.gender === "m" ? "m" : "f",
      dayGi: ctx.pillars.day.gi,
      ver: 1,
      savedAt: new Date().toISOString()
    };
    if (writeSaved(sv)) {
      root.DALBIT_UI.toast("✓ 이 기기에 저장했어요. 내일 홈에서 오늘의 일진을 볼 수 있어요");
      renderHomeBadge();
    } else {
      root.DALBIT_UI.toast("저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
    }
    refreshSavePanel(host, ctx);
  }

  function refreshSavePanel(host, ctx) {
    var panel = host.querySelector ? host.querySelector("#savePanel") : null;
    if (!panel) return;
    var tmp = document.createElement("div");
    tmp.innerHTML = savePanel(ctx);
    panel.parentNode.replaceChild(tmp.firstChild, panel);
  }

  function handleAction(act, btn, ctx, host) {
    if (act === "copyAll") return copyPrompt(ctx, null, btn);
    if (act === "copyN") return copyPrompt(ctx, +btn.getAttribute("data-n"), btn);
    if (act === "cardSq") return saveImage(drawCard(ctx, "square"), "dalbit-saju-wonguk.png");
    if (act === "cardStory") return saveImage(drawCard(ctx, "story"), "dalbit-saju-wonguk-story.png");
    if (act === "share") return shareCtx(ctx);
    if (act === "save") return saveThis(ctx, host);
    if (act === "del") {
      clearSaved();
      renderHomeBadge();
      root.DALBIT_UI.toast("저장한 사주를 지웠어요");
      return refreshSavePanel(host, ctx);
    }
    if (act === "again") {
      try { history.replaceState(null, "", location.pathname + location.search + "#saju"); } catch (e) { }
      host.innerHTML = "";
      var form = document.querySelector("#paneSaju .panel");
      if (form && form.scrollIntoView) {
        try { form.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e2) { form.scrollIntoView(); }
      }
      return;
    }
  }

  function closestData(el, attr) {
    while (el && el !== document) {
      if (el.getAttribute && el.getAttribute(attr)) return el;
      el = el.parentNode;
    }
    return null;
  }

  function bind(host, ctx) {
    if (!host) return;
    host._proCtx = ctx;
    if (host._proBound) return;
    host._proBound = true;
    host.addEventListener("click", function (ev) {
      var b = closestData(ev.target, "data-pro");
      if (!b) return;
      ev.preventDefault();
      var act = b.getAttribute("data-pro");
      var c = host._proCtx || ctx;
      if (!c) return;
      handleAction(act, b, c, host);
    });
  }

  /* ============================================================
     공유 링크 진입 · 저장된 사주 복원
     ============================================================ */
  function payloadFromHash() {
    var h = String(location.hash || "");
    var m = h.match(/^#saju=(.+)$/i);
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
  }

  function renderShared(text, host) {
    var list = parseGanji(text);
    if (!list) return false;
    var ctx = ctxFromGanji(list);
    var p = ctx.pillars;
    var counts = ctx.counts;
    var missing = [];
    for (var i = 0; i < 5; i++) if (counts[i] === 0) missing.push(i);

    var html = '<div class="panel mt" id="sharedPanel">' +
      '<div class="psum">' +
        '<div class="who">공유받은 원국 · 생년월일 없이 원국만</div>' +
        '<div class="dm"><span>' + p.day.ganKo + '(' + EL_H[ctx.me] + ')</span> 일간 · ' + (ctx.strong ? '중심이 단단한 편' : '도움을 받으면 더 잘 풀리는 편') + '</div>' +
        '<div class="meta">' + (p.hour ? '네 기둥' : '세 기둥(시간 모름)') + ' · ' + (ctx.pillars.day.text) + ' 일주</div>' +
      '</div>' +
      '<div class="pillars">' + pilCell("년주", p.year) + pilCell("월주", p.month) + pilCell("일주", p.day) +
        (p.hour ? pilCell("시주", p.hour) : '<div class="pil empty"><div class="nm">시주</div><div class="han">모름</div><div class="ko">-</div><div class="el">&nbsp;</div></div>') +
      '</div>' +
      '<div class="el-bars">' + counts.map(function (c, k) {
        return '<div class="ebar"><div class="lb" style="color:' + colorOf(k) + '">' + EL[k] + '</div>' +
          '<div class="track"><div class="fill" data-w="' + Math.round(c / (p.hour ? 8 : 6) * 1000) / 10 + '" style="background:' + colorOf(k) + '"></div></div>' +
          '<div class="num">' + c + '개</div></div>';
      }).join('') + '</div>' +
      (missing.length ? '<p class="hint">' + missing.join(", ") + ' 기운이 사주에 없어요.</p>' : '<p class="hint">다섯 기운이 모두 들어 있어요.</p>') +
      iljinStrip(ctx) +
      '</div>';
    html += promptPanel(ctx);
    html += savePanel(ctx);
    html += '<p class="note">· 이 화면은 누군가 보낸 링크의 원국 8자만으로 그렸어요. 생년월일·성별은 링크에 담기지 않습니다.<br>· 재미로 보는 풀이이니 큰 결정은 스스로 판단해 주세요.</p>';

    host.innerHTML = html;
    host._proCtx = ctx;
    bind(host, ctx);
    requestAnimationFrame(function () {
      var fills = host.querySelectorAll(".fill");
      for (var k = 0; k < fills.length; k++) {
        var w = parseFloat(fills[k].getAttribute("data-w"));
        fills[k].style.width = (w > 0 ? Math.max(4, w) : 0) + "%";
      }
    });
    return true;
  }

  function colorOf(el) {
    var C = ["#5fbf7f", "#ef6b5e", "#e8b74a", "#cfd6e2", "#5b9bd5"];
    return C[el] || "#cfd6e2";
  }

  function pilCell(name, pl) {
    return '<div class="pil"><div class="nm">' + name + '</div>' +
      '<div class="han">' + pl.gan + pl.zhi + '</div>' +
      '<div class="ko">' + pl.ganKo + pl.zhiKo + '</div>' +
      '<div class="el"><span style="color:' + colorOf(GAN_EL[pl.gi]) + '">' + EL[GAN_EL[pl.gi]] + '</span>' +
      '<span style="opacity:.4"> · </span><span style="color:' + colorOf(ZHI_EL[pl.zi]) + '">' + EL[ZHI_EL[pl.zi]] + '</span></div></div>';
  }

  /* 저장된 사주를 입력폼에 채우고 계산 버튼을 누릅니다 */
  function openSaved() {
    var sv = loadSaved();
    if (!sv) return false;
    var by = $("by"), bm = $("bm"), bd = $("bd"), bh = $("bh");
    if (!by || !bm || !bd || !bh) return false;
    var solar = document.querySelector('input[name="cal"][value="solar"]');
    if (solar) solar.checked = true;
    by.value = String(sv.y);
    bm.value = String(sv.m);
    var ev;
    try { ev = new Event("change", { bubbles: true }); } catch (e) {
      ev = document.createEvent("HTMLEvents");
      ev.initEvent("change", true, false);
    }
    by.dispatchEvent(ev);
    bd.value = String(sv.d);
    bh.value = (sv.hour === null || sv.hour === undefined) ? "" : String(sv.hour);
    var g = document.querySelector('input[name="gender"][value="' + (sv.gender === "m" ? "m" : "f") + '"]');
    if (g) g.checked = true;
    var btn = $("sajuBtn");
    if (!btn) return false;
    btn.click();
    /* 주소를 #saju 로 정리 — 뒤로가기·재방문에서 또 자동 계산하지 않게 */
    try { history.replaceState(null, "", location.pathname + location.search + "#saju"); } catch (e2) { }
    return true;
  }

  root.SAJU_PRO = {
    KEY: KEY,
    loadSaved: loadSaved,
    clearSaved: clearSaved,
    renderHomeBadge: renderHomeBadge,
    iljinLines: iljinLines,
    ctxFromResult: ctxFromResult,
    ctxFromGanji: ctxFromGanji,
    parseGanji: parseGanji,
    daeunPanel: daeunPanel,
    promptPanel: promptPanel,
    savePanel: savePanel,
    proBlocks: proBlocks,
    iljinStrip: iljinStrip,
    bind: bind,
    compose: compose,
    shareUrl: shareUrl,
    copyShareLink: copyShareLink,
    drawCard: drawCard,
    renderShared: renderShared,
    openSaved: openSaved,
    payloadFromHash: payloadFromHash,
    todayGanji: todayGanji
  };
})(window);
