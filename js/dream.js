/* 달빛 한 스푼 v4.1 — 꿈해몽 화면 (지연 로딩 모듈 · 2026-11-16 분리) */
/* ---------- dream.js ---------- */
/* ---------- dream.js : 꿈해몽 ---------- */
(function () {
  "use strict";

  var D = { q: "", cat: "all", showAll: false, open: null };
  function $(id) { return document.getElementById(id); }

  var CATNAME = {};
  for (var i = 0; i < DREAM_CATS.length; i++) CATNAME[DREAM_CATS[i].id] = DREAM_CATS[i].label;

  var GRADE = {
    "길": { cls: "b-gil", label: "길몽" },
    "평": { cls: "b-pyo", label: "보통" },
    "흉": { cls: "b-hyung", label: "흉몽" }
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }

  /* ---------- 초성/부분 일치 검색 ---------- */
  var CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  function choOf(ch) {
    var c = ch.charCodeAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) return CHO.charAt(Math.floor((c - 0xAC00) / 588));
    return ch;
  }
  function toCho(s) {
    var o = "";
    for (var i = 0; i < s.length; i++) o += choOf(s.charAt(i));
    return o;
  }
  function norm(s) { return String(s == null ? "" : s).replace(/\s+/g, "").toLowerCase(); }
  function isChoOnly(s) { return /^[ㄱ-ㅎ]+$/.test(s); }

  var IDX = [];
  var MAP = {};
  for (var k = 0; k < DREAMS.length; k++) {
    var d = DREAMS[k];
    MAP[d.id] = d;
    IDX.push({
      d: d,
      full: norm(d.title + " " + d.keys + " " + CATNAME[d.cat]),
      cho: toCho(norm(d.title + d.keys)),
      choTitle: toCho(norm(d.title)),
      choWords: (d.title + " " + d.keys).split(/\s+/).map(function (w) { return toCho(norm(w)); }),
      words: (d.title + " " + d.keys).split(/\s+/).map(function (w) { return norm(w); })
    });
  }

  function choHit(it, q) {
    for (var i = 0; i < it.choWords.length; i++) {
      if (it.choWords[i].indexOf(q) === 0) return true;
    }
    return false;
  }

  function scoreToken(it, t) {
    if (isChoOnly(t)) {
      if (!choHit(it, t)) return 0;
      return it.choTitle.indexOf(t) >= 0 ? 3 : 2;
    }
    // 한 글자 검색은 단어 앞자리에서만 (예: '물' → 물고기·물에 빠지는 O, 물건 X)
    if (t.length === 1) {
      var head = false;
      for (var i = 0; i < it.words.length; i++) {
        if (it.words[i].indexOf(t) === 0) { head = true; break; }
      }
      if (!head) return 0;
      return norm(it.d.title).indexOf(t) === 0 ? 3 : 2;
    }
    if (it.full.indexOf(t) < 0) return 0;
    var title = norm(it.d.title);
    if (title.indexOf(t) === 0) return 3;
    if (title.indexOf(t) >= 0) return 2;
    return 1;
  }

  // 띄어쓰기·'꿈' 접미사를 지우고 여러 단어는 모두 만족해야 통과
  function tokens(raw) {
    return String(raw == null ? "" : raw).trim().split(/\s+/)
      .map(function (w) { return norm(w).replace(/꿈$/, "").replace(/해몽$/, ""); })
      .filter(function (t) { return t.length > 0; });
  }

  function score(it, raw) {
    var tk = tokens(raw);
    if (!tk.length) return 1;
    var first = 0;
    for (var i = 0; i < tk.length; i++) {
      var s = scoreToken(it, tk[i]);
      if (!s) return 0;
      if (i === 0) first = s;
    }
    return first;
  }

  function currentList() {
    var has = tokens(D.q).length > 0, q = norm(D.q), out = [];
    var curated = !has && D.cat === "all" && !D.showAll;
    for (var i = 0; i < IDX.length; i++) {
      var it = IDX[i];
      if (D.cat !== "all" && it.d.cat !== D.cat) continue;
      var s = score(it, D.q);
      if (!s) continue;
      out.push({ it: it, s: s });
    }
    out.sort(function (a, b) {
      if (b.s !== a.s) return b.s - a.s;
      if (b.it.d.pop !== a.it.d.pop) return b.it.d.pop - a.it.d.pop;
      return a.it.d.title < b.it.d.title ? -1 : 1;
    });
    if (curated) out = out.slice(0, 12);
    return out;
  }

  /* ---------- 목록 ---------- */
  function hiTitle(title, q) {
    var t = esc(title);
    if (!q || isChoOnly(q)) return t;
    var idx = norm(title).indexOf(q);
    if (idx < 0) return t;
    // 원문에서 공백 제거 후의 위치를 원문 위치로 보정
    var plain = norm(title), count = 0, pos = -1;
    for (var i = 0; i < title.length; i++) {
      if (/\s/.test(title.charAt(i))) continue;
      if (count === idx) { pos = i; break; }
      count++;
    }
    if (pos < 0) return t;
    var end = pos + q.length;
    var raw = title.substr(pos, end - pos);
    return esc(title.substr(0, pos)) + "<mark>" + esc(raw) + "</mark>" + esc(title.substr(end));
  }

  function badge(g) {
    var b = GRADE[g] || GRADE["평"];
    return '<span class="badge ' + b.cls + '">' + b.label + "</span>";
  }

  function renderList() {
    var q = norm(D.q), hq = tokens(D.q)[0] || "";
    var arr = currentList();
    var listEl = $("dreamList"), cntEl = $("dreamCount"), emptyEl = $("dreamEmpty"), moreEl = $("dreamMore");
    if (!cntEl) return;

    var introEl = $("dreamIntro");
    if (introEl) introEl.classList.toggle("searched", tokens(D.q).length > 0);

    if (!arr.length) {
      listEl.innerHTML = "";
      cntEl.textContent = "";
      emptyEl.hidden = false;
      emptyEl.innerHTML = emptyHtml(q);
      moreEl.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    emptyEl.innerHTML = "";

    var txt;
    if (q) txt = "'" + D.q.trim() + "' 관련 꿈 " + arr.length + "가지";    else if (D.cat !== "all") txt = CATNAME[D.cat] + " 꿈 " + arr.length + "가지";
    else txt = D.showAll ? "전체 꿈 " + arr.length + "가지" : "많이 찾는 꿈 " + arr.length + "가지";
    cntEl.textContent = txt;

    var html = "";
    for (var i = 0; i < arr.length; i++) {
      var d = arr[i].it.d;
      html += '<button class="dcard" data-id="' + d.id + '">' +
        '<span class="ico">' + d.emoji + "</span>" +
        '<span class="txt"><span class="tl"><b>' + hiTitle(d.title, hq) + "</b>" + badge(d.grade) + "</span>" +
          '<span class="sm">' + esc(d.sum) + "</span></span>" +
        '<span class="go">›</span>' +
        "</button>";
    }
    listEl.innerHTML = html;

    moreEl.hidden = !(!q && D.cat === "all" && !D.showAll);
    if (!moreEl.hidden) moreEl.textContent = "전체 " + DREAMS.length + "가지 꿈 모두 보기";
  }

  /* ---------- 검색 결과 없을 때: 가까운 꿈 추천 ---------- */
  var NEAR = [
    { k: ["비행기", "우주선", "로켓", "헬리콥터", "열기구", "드론"], q: ["하늘", "별"] },
    { k: ["자동차", "버스", "지하철", "기차", "운전", "택시", "오토바이"], q: ["이사", "말"] },
    { k: ["밥", "음식", "국", "반찬", "고기", "과일", "채소", "식사", "냉장고"], q: ["음식", "곡식"] },
    { k: ["귀신", "혼령", "유령", "영혼"], q: ["조상", "죽는"] },
    { k: ["가족", "엄마", "아빠", "부모", "형제", "자매", "아들", "딸"], q: ["부모님", "아기"] },
    { k: ["연애", "사랑", "애인", "남자친구", "여자친구", "썸"], q: ["연인", "결혼"] },
    { k: ["공부", "입시", "합격", "성적", "학원", "선생님"], q: ["시험", "학교"] },
    { k: ["회사", "직장", "상사", "동료", "월급", "출근", "사업"], q: ["계단", "문"] },
    { k: ["출산", "태몽", "아들", "딸", "육아"], q: ["임신", "아기"] },
    { k: ["죽음", "사망", "무덤", "제사", "상가"], q: ["죽는", "장례"] },
    { k: ["화장실", "변기", "대변", "배설"], q: ["똥", "오줌"] },
    { k: ["강아지", "멍멍이", "반려견"], q: ["개"] },
    { k: ["거미", "개미", "모기", "파리", "곤충", "지네"], q: ["벌레"] },
    { k: ["날씨", "장마", "태풍", "구름", "안개"], q: ["비", "눈"] },
    { k: ["집", "방", "침대", "이불", "부엌", "아파트", "마당"], q: ["집", "이사"] },
    { k: ["옷", "원피스", "가방", "모자", "거울"], q: ["옷", "신발"] },
    { k: ["재물", "로또", "금", "지폐", "통장", "월세"], q: ["돈", "복권"] },
    { k: ["바다", "강", "수영", "목욕", "홍수"], q: ["물"] },
    { k: ["길", "도로", "여행", "휴가", "공항"], q: ["이사", "문"] },
    { k: ["문자", "연락", "카톡", "핸드폰", "휴대폰"], q: ["전화"] }
  ];

  function suggest(q) {
    var out = [], seen = {}, alts = [], i, j, n;
    function add(d) { if (d && !seen[d.id]) { seen[d.id] = 1; out.push(d); } }

    // 1) 연상 사전 (사전에 없는 흔한 단어를 가까운 검색어로)
    for (i = 0; i < NEAR.length; i++) {
      var w = NEAR[i];
      for (j = 0; j < w.k.length; j++) {
        var key = norm(w.k[j]);
        if (key.indexOf(q) >= 0 || q.indexOf(key) >= 0) {
          for (n = 0; n < w.q.length; n++) if (alts.indexOf(w.q[n]) < 0) alts.push(w.q[n]);
        }
      }
    }
    for (i = 0; i < alts.length && out.length < 3; i++) {
      var arr = DREAMS.filter(function (d) { return norm(d.title + " " + d.keys).indexOf(norm(alts[i])) >= 0; });
      arr.sort(function (a, b) { return b.pop - a.pop; });
      for (n = 0; n < arr.length && out.length < 3; n++) add(arr[n]);
    }

    // 2) 두 글자 이상 겹치는 꿈
    if (out.length < 3 && q.length >= 2) {
      var scored = [];
      for (i = 0; i < DREAMS.length; i++) {
        var d = DREAMS[i], hay = norm(d.title + " " + d.keys), sc = 0;
        for (var p = 0; p < q.length - 1; p++) if (hay.indexOf(q.substr(p, 2)) >= 0) sc += 2;
        if (sc) scored.push({ d: d, sc: sc });
      }
      scored.sort(function (a, b) { return (b.sc - a.sc) || (b.d.pop - a.d.pop); });
      for (i = 0; i < scored.length; i++) add(scored[i].d);
    }

    // 3) 그래도 없으면 많이 찾는 꿈
    if (out.length < 3) {
      var rest = DREAMS.slice().sort(function (a, b) { return b.pop - a.pop; });
      for (i = 0; i < rest.length && out.length < 3; i++) add(rest[i]);
    }
    return { items: out.slice(0, 3), alt: alts.slice(0, 2) };
  }

  function emptyHtml(q) {
    var res = suggest(q);
    var chips = res.items.map(function (d) {
      return '<button data-id="' + d.id + '">' + d.emoji + " " + esc(d.title) + "</button>";
    }).join("");
    var altLine = res.alt.length
      ? '<p class="dempty-alt">이렇게 바꿔 찾으면 더 잘 나와요 — ' + res.alt.join(" · ") + "</p>"
      : "";
    var cats = DREAM_CATS.slice(1).map(function (c) {
      return '<button data-cat="' + c.id + '">' + c.label + "</button>";
    }).join(" · ");
    return '<div class="dempty-ico">🌙</div>' +
      '<p class="dempty-t">' + (D.q.trim() ? "‘" + esc(D.q.trim()) + "’ — 아직 사전에 없는 꿈이에요." : "찾는 꿈이 없어요.") + "</p>" +
      '<p class="dempty-s">꿈은 단어 하나보다 상황으로 풀려요. 가장 가까운 의미로 이런 꿈을 찾아보세요.</p>' +
      altLine +
      '<div class="dsug">' + chips + "</div>" +
      '<p class="dempty-c">이런 주제로도 찾아볼 수 있어요<br>' + cats + "</p>";
  }

  /* ---------- 상세 ---------- */
  function ctaHtml() {
    var blog = (typeof CONFIG !== "undefined" && CONFIG.blogUrl) ? CONFIG.blogUrl : "#";
    var aff = (typeof CONFIG !== "undefined" && CONFIG.affiliateUrl) ? CONFIG.affiliateUrl : blog;
    var affLabel = (typeof CONFIG !== "undefined" && CONFIG.dreamAffiliateLabel)
      ? CONFIG.dreamAffiliateLabel
      : ((typeof CONFIG !== "undefined" && CONFIG.affiliateUrl && CONFIG.affiliateLabel)
        ? CONFIG.affiliateLabel : "오늘의 추천 생활 아이템 보기");
    var blogLabel = (typeof CONFIG !== "undefined" && CONFIG.blogLabel)
      ? CONFIG.blogLabel : "나에게 맞는 건강·생활 정보 더 보기";
    var note = (typeof CONFIG !== "undefined" && CONFIG.affiliateNote)
      ? String(CONFIG.affiliateNote).trim() : "";
    return '<div class="cta">' +
        (note ? '<p class="cta-note">' + esc(note) + '</p>' : '') +
        '<a class="blog" href="' + esc(blog) + '" target="_blank" rel="noopener">' +
          "<span>" + esc(blogLabel) + '</span><span class="arrow">바로가기 ›</span></a>' +
        (CONFIG.shopUrl ? '<a class="shop" href="' + esc(CONFIG.shopUrl) + '" target="_blank" rel="noopener">' +
          '<span class="lbl"><i class="n" aria-hidden="true">N</i>' +
          esc(CONFIG.shopLabel || "네이버 크리에이터샵 구경하기") + '</span>' +
          '<span class="arrow">›</span></a>' : "") +
        '<a class="aff" href="' + esc(aff) + '" target="_blank" rel="noopener">' +
          "<span>" + esc(affLabel) + '</span><span class="arrow">›</span></a>' +
      "</div>" + adSlotHtml();
  }

  function adSlotHtml() {
    var a = (typeof CONFIG !== "undefined" && CONFIG.adsense) ? CONFIG.adsense : {};
    var inner = "<!-- ADSENSE_SLOT : 꿈해몽 결과 아래 광고 자리 -->";
    if (a.client && a.slot) {
      inner += '<ins class="adsbygoogle" style="display:block" data-ad-client="' + esc(a.client) +
        '" data-ad-slot="' + esc(a.slot) + '" data-ad-format="auto" data-fullwidth-responsive="true"></ins>';
      setTimeout(function () {
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { }
      }, 0);
    }
    return '<div class="ad-slot">' + inner + "</div>";
  }

  function relatedOf(d) {
    var same = DREAMS.filter(function (x) { return x.cat === d.cat && x.id !== d.id; });
    same.sort(function (a, b) { return b.pop - a.pop; });
    return same.slice(0, 3);
  }

  function openDetail(id) {
    var d = MAP[id];
    if (!d) return;
    D.open = id;

    var rel = relatedOf(d);
    var relHtml = rel.map(function (x) {
      return '<button data-id="' + x.id + '">' + x.emoji + " " + esc(x.title) + "</button>";
    }).join("");

    $("dreamIntro").hidden = true;

    var html =
      '<div class="dnav"><button class="dback" id="dreamBack">← 꿈 목록으로</button></div>' +
      '<div class="dtop">' +
        '<div class="demoji-lg">' + d.emoji + "</div>" +
        '<div class="dtopmeta"><span class="dcatlabel">' + CATNAME[d.cat] + "</span>" + badge(d.grade) + "</div>" +
        '<h2 class="dtitle">' + esc(d.title) + "</h2>" +
      "</div>" +
      '<div class="dsum">' + esc(d.sum) + "</div>" +
      '<div class="rblock"><div class="pos">상황별 풀이</div><p>' + esc(d.body) + "</p></div>" +
      '<div class="dtip"><h3>오늘의 행동 팁</h3><p>' + esc(d.tip) + "</p></div>" +
      '<div class="dluck"><span class="dluck-k">🍀 행운 포인트</span><span class="dluck-v">' + esc(d.luck) + "</span></div>" +
      '<h3 class="drelh">함께 찾아본 꿈</h3><div class="drel">' + relHtml + "</div>" +
      ctaHtml() +
      '<div class="mini-actions"><button id="dreamAgain">다른 꿈 찾기</button><button id="dreamCopy">결과 복사</button><button id="dreamSave">이미지 저장</button></div>' +
      '<p class="note">꿈해몽은 오래 전해 내려온 상징 풀이입니다. 재미로 읽고, 중요한 판단은 현실의 정보와 함께 하세요.</p>';

    var detailEl = $("dreamDetail");
    detailEl.innerHTML = html;
    detailEl.hidden = false;
    $("dreamBrowser").hidden = true;
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); }

    $("dreamBack").addEventListener("click", showList);
    $("dreamAgain").addEventListener("click", function () {
      showList();
      var box = $("dreamSearch");
      box.value = ""; D.q = ""; $("dreamClear").hidden = true;
      renderList();
    });
    $("dreamCopy").addEventListener("click", function () {
      var g = GRADE[d.grade] || GRADE["평"];
      var txt = "[꿈해몽 · " + CATNAME[d.cat] + "] " + d.title + " (" + g.label + ")\n\n" +
        "핵심 — " + d.sum + "\n\n" + d.body + "\n\n" +
        "오늘의 팁 — " + d.tip + "\n" +
        "행운 포인트 — " + d.luck + "\n\n" +
        "▸ " + ((typeof CONFIG !== "undefined" && CONFIG.blogUrl) ? CONFIG.blogUrl : "");
      DALBIT_UI.copyResult(txt, this);
    });
    $("dreamSave").addEventListener("click", function () {
      var gg = GRADE[d.grade] || GRADE["평"];
      DALBIT_UI.saveCard({
        kicker: CATNAME[d.cat] + " · " + gg.label,
        headline: d.title,
        sub: d.sum,
        items: [
          { label: "상황별 풀이", text: d.body },
          { label: "오늘의 행동 팁", text: d.tip },
          { label: "행운 포인트", text: d.luck }
        ]
      }, "dalbit-spoon-result.png");
    });
    var relBtns = detailEl.querySelectorAll(".drel button");
    for (var i = 0; i < relBtns.length; i++) {
      relBtns[i].addEventListener("click", function () { openDetail(this.getAttribute("data-id")); });
    }
  }

  function copyText(txt, btn) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = "복사됐어요 ✓";
      setTimeout(function () { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt); done(); });
    } else { fallbackCopy(txt); done(); }
  }
  function fallbackCopy(txt) {
    var ta = document.createElement("textarea");
    ta.value = txt;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { }
    document.body.removeChild(ta);
  }

  function showList() {
    D.open = null;
    var detailEl = $("dreamDetail");
    detailEl.hidden = true;
    detailEl.innerHTML = "";
    $("dreamBrowser").hidden = false;
    $("dreamIntro").hidden = false;
    renderList();
  }

  /* ---------- 화면 구성 ---------- */
  function buildCats() {
    var el = $("dreamCats");
    el.innerHTML = DREAM_CATS.map(function (c) {
      return '<button class="dcat' + (c.id === D.cat ? " active" : "") + '" data-cat="' + c.id + '">' + c.label + "</button>";
    }).join("");
    var btns = el.querySelectorAll(".dcat");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        D.cat = this.getAttribute("data-cat");
        for (var j = 0; j < btns.length; j++) btns[j].classList.toggle("active", btns[j] === this);
        if (D.cat !== "all") D.showAll = true;
        renderList();
      });
    }
  }

  function buildTags() {
    var el = $("dreamTags");
    el.innerHTML = DREAM_TAGS.map(function (t) {
      return '<button class="dtag" data-q="' + esc(t.q) + '">' + t.label + "</button>";
    }).join("");
    var btns = el.querySelectorAll(".dtag");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        var q = this.getAttribute("data-q");
        var box = $("dreamSearch");
        box.value = q;
        D.q = q;
        D.showAll = true;
        $("dreamClear").hidden = false;
        renderList();
        try { box.focus({ preventScroll: true }); } catch (e) { }
        var top = $("dreamList");
        if (top) {
          var head = document.querySelector(".top");
          var off = (head ? head.offsetHeight : 96) + 20;
          var y = top.getBoundingClientRect().top + window.pageYOffset - off;
          try { window.scrollTo({ top: y, behavior: "smooth" }); } catch (e2) { window.scrollTo(0, y); }
        }
      });
    }
  }

  function init() {
    if (!$("dreamBrowser")) return;
    buildCats();
    buildTags();
    renderList();

    var box = $("dreamSearch"), clearBtn = $("dreamClear");
    box.addEventListener("input", function () {
      D.q = this.value;
      clearBtn.hidden = !this.value;
      renderList();
    });
    clearBtn.addEventListener("click", function () {
      box.value = ""; D.q = ""; this.hidden = true; renderList(); box.focus();
    });
    $("dreamMore").addEventListener("click", function () {
      D.showAll = true;
      renderList();
    });
    $("dreamList").addEventListener("click", function (e) {
      var card = e.target.closest ? e.target.closest(".dcard") : null;
      if (card) openDetail(card.getAttribute("data-id"));
    });
    $("dreamEmpty").addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("button") : null;
      if (!t) return;
      if (t.getAttribute("data-id")) { openDetail(t.getAttribute("data-id")); return; }
      var c = t.getAttribute("data-cat");
      if (c) {
        D.cat = c;
        var cats = $("dreamCats").querySelectorAll(".dcat");
        for (var i = 0; i < cats.length; i++) cats[i].classList.toggle("active", cats[i].getAttribute("data-cat") === c);
        D.showAll = true;
        D.q = "";
        box.value = "";
        $("dreamClear").hidden = true;
        renderList();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
