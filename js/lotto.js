/* 달빛 한 스푼 v4.1 — 행운의 로또 번호 화면 (지연 로딩 모듈 · 2026-11-16 분리) */
/* ============================================================
   탭 5 : 이번 주 행운의 로또 번호 (달빛 한 스푼 v4 · 2026-11-15)
   · 뽑는 방식 : 오늘의 기운(이름·생년월일·이번 주) 시드 조합 / 완전 랜덤 추첨
   · 1~45 중복 없는 6개 + 보너스 1개 (한국 로또 6/45 표준 색상)
   · 번호 한 줄 복사 · 결과 카드 이미지 저장(DALBIT_UI.saveCard)
   기존 4개 탭(타로·사주·꿈해몽·전생체험) 코드는 건드리지 않습니다.
   ============================================================ */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function scrollToEl(el, extra) {
    if (!el) return;
    var head = document.querySelector(".top");
    var off = (head ? head.offsetHeight : 96) + 14 + (extra || 0);
    var y = el.getBoundingClientRect().top + window.pageYOffset - off;
    try { window.scrollTo({ top: y < 0 ? 0 : y, behavior: "smooth" }); }
    catch (e) { window.scrollTo(0, y < 0 ? 0 : y); }
  }

  /* ---------- 공 색 : 1~10 노랑, 11~20 파랑, 21~30 빨강, 31~40 회색, 41~45 초록 ---------- */
  function ballClass(n) {
    if (n <= 10) return "b1";
    if (n <= 20) return "b2";
    if (n <= 30) return "b3";
    if (n <= 40) return "b4";
    return "b5";
  }

  /* ---------- 시드 해시 · 난수 (전생체험과 같은 방식) ---------- */
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
    }
    return h >>> 0;
  }

  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 1~45 중복 없는 6개 + 보너스 1개 */
  function pickNumbers(rng) {
    var pool = [], i, j, t;
    for (i = 1; i <= 45; i++) pool.push(i);
    for (i = 0; i < 7; i++) {
      j = i + Math.floor(rng() * (45 - i));
      t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return {
      nums: pool.slice(0, 6).sort(function (a, b) { return a - b; }),
      bonus: pool[6]
    };
  }

  /* ---------- 이번 주(월~일) 계산 ---------- */
  function weekInfo() {
    var now = new Date();
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var back = (d.getDay() + 6) % 7;                       // 월요일까지 며칠 전
    var mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
    var sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    var thu = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 3);
    var jan1 = new Date(thu.getFullYear(), 0, 1);
    var week = Math.floor((thu - jan1) / 86400000 / 7) + 1;
    return {
      key: thu.getFullYear() + "-W" + pad2(week),
      label: (mon.getMonth() + 1) + "월 " + mon.getDate() + "일 ~ " + (sun.getMonth() + 1) + "월 " + sun.getDate() + "일"
    };
  }

  /* ---------- 행운 한마디(재미용) ---------- */
  var LUCK = [
    "이번 주는 앞자리보다 뒷자리에 기운이 모여 있어요. 큰 숫자가 잘 붙는 한 주예요.",
    "고르는 것보다 미루지 않는 게 이번 주의 복이에요. 한 번 정했으면 가볍게 밀고 나가 보세요.",
    "한 번에 크게보다 한 칸씩 꾸준한 쪽이 잘 맞는 주예요. 작은 번호도 힘을 냅니다.",
    "뜻밖의 자리에서 반가운 소식이 붙는 한 주예요. 연락이 오면 바로 받아 보세요.",
    "정리하고 비우면 들어올 자리가 생기는 주예요. 지갑과 서랍을 한 번 비워보세요.",
    "말보다 행동이 먼저 통하는 한 주예요. 오늘 한 가지는 말없이 해두면 좋아요.",
    "작은 지출을 한 번만 참으면 마음이 가벼워지는 주예요. 그 돈이 다른 복으로 돌아옵니다.",
    "사람을 만나면 운이 트이는 주예요. 먼저 인사하는 쪽이 이번 주의 주인공이에요."
  ];

  /* ---------- 상태 ---------- */
  var L = { mode: "seed", salt: 0, name: "", y: 1975, m: 1, d: 1, res: null };

  function initForm() {
    var ySel = $("loY"), mSel = $("loM"), dSel = $("loD");
    if (!ySel || !mSel || !dSel) return;

    var yo = "";
    for (var y = 2010; y >= 1935; y--) yo += "<option" + (y === 1975 ? " selected" : "") + ">" + y + "</option>";
    ySel.innerHTML = yo;

    var mo = "";
    for (var m = 1; m <= 12; m++) mo += "<option" + (m === 1 ? " selected" : "") + ">" + m + "</option>";
    mSel.innerHTML = mo;

    updateDays();
    ySel.addEventListener("change", updateDays);
    mSel.addEventListener("change", updateDays);
  }

  function updateDays() {
    var y = +$("loY").value, m = +$("loM").value, dSel = $("loD");
    var max = new Date(y, m, 0).getDate();
    var cur = +dSel.value || 1;
    if (cur > max) cur = max;
    var html = "";
    for (var d = 1; d <= max; d++) html += "<option" + (d === cur ? " selected" : "") + ">" + d + "</option>";
    dSel.innerHTML = html;
  }

  function bindMode() {
    var box = $("loMode");
    if (!box) return;
    var btns = box.querySelectorAll(".chip");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        var all = box.querySelectorAll(".chip");
        for (var j = 0; j < all.length; j++) all[j].classList.remove("active");
        this.classList.add("active");
        L.mode = this.getAttribute("data-v");
        var seedBox = $("loSeedBox");
        if (seedBox) seedBox.hidden = (L.mode !== "seed");
        L.salt = 0;
        $("loMsg").textContent = "";
      });
    }
  }

  /* ---------- 뽑기 ---------- */
  function draw() {
    var nameEl = $("loName");
    L.name = (nameEl && nameEl.value ? nameEl.value : "").replace(/\s+/g, " ").trim();
    L.y = +$("loY").value;
    L.m = +$("loM").value;
    L.d = +$("loD").value;

    var w = weekInfo();
    var rng, modeLabel;

    if (L.mode === "seed") {
      var seedStr = (L.name ? L.name.toLowerCase() : "달빛한스푼") + "|" +
        L.y + "-" + pad2(L.m) + "-" + pad2(L.d) + "|" + w.key + "|" + L.salt;
      rng = makeRng(hashStr(seedStr));
      modeLabel = "오늘의 기운으로";
    } else {
      var s;
      var cs = window.crypto || window.msCrypto;
      if (cs && cs.getRandomValues) {
        var arr = new Uint32Array(1);
        cs.getRandomValues(arr);
        s = arr[0];
      } else {
        s = Math.floor(Math.random() * 4294967296);
      }
      rng = makeRng((s ^ Math.imul(L.salt + 1, 2654435761)) >>> 0);
      modeLabel = "완전 랜덤 추첨";
    }

    var picked = pickNumbers(rng);
    var tip = LUCK[hashStr(w.key + "|" + picked.nums.join("-")) % LUCK.length];

    L.res = {
      nums: picked.nums,
      bonus: picked.bonus,
      mode: modeLabel,
      week: w,
      name: L.name,
      birth: L.y + "." + pad2(L.m) + "." + pad2(L.d),
      tip: tip
    };
    render();
  }

  function numberLine() {
    var r = L.res;
    return r.nums.join(" ") + " + " + r.bonus;
  }

  function ctaHtml() {
    var blog = CONFIG.blogUrl || "#";
    var aff = CONFIG.affiliateUrl || blog;
    var note = (CONFIG.affiliateNote || "").trim();
    return '<div class="cta">' +
      (note ? '<p class="cta-note">' + note + '</p>' : '') +
      '<a class="aff" href="' + blog + '" target="_blank" rel="noopener">' +
      '<span>' + (CONFIG.blogLabel || "블로그에서 더 보기") + '</span><span class="arrow">›</span>' +
      '</a>' +
      (CONFIG.shopUrl ? '<a class="shop" href="' + CONFIG.shopUrl + '" target="_blank" rel="noopener">' +
        '<span class="lbl"><i class="n" aria-hidden="true">N</i>' +
        (CONFIG.shopLabel || "네이버 크리에이터샵 구경하기") + '</span>' +
        '<span class="arrow">›</span></a>' : "") +
      '<a class="aff" href="' + aff + '" target="_blank" rel="noopener">' +
      '<span>' + (CONFIG.affiliateLabel || "오늘의 추천 생활 아이템 보기") + '</span>' +
      '<span class="arrow">›</span></a>' +
      '</div>';
  }

  function render() {
    var r = L.res;
    var balls = r.nums.map(function (n, i) {
      return '<span class="ball ' + ballClass(n) + '" style="animation-delay:' + (i * 55) + 'ms">' + n + '</span>';
    }).join("");

    var who = (r.mode === "오늘의 기운으로")
      ? (r.name ? esc(r.name) + " 님 · " + esc(r.birth) + " · " : esc(r.birth) + " · ") + "이번 주 기운으로 뽑았어요"
      : "1~45 중 중복 없이 6개 + 보너스 1개";

    var html =
      '<div class="result" id="loResultInner">' +
        '<div class="lo-head">' +
          '<div class="lo-kicker">이번 주 행운의 로또 번호</div>' +
          '<div class="lo-badge">' + esc(r.mode) + '</div>' +
          '<h3 class="lo-week">' + esc(r.week.label) + '</h3>' +
          '<div class="lo-who">' + who + '</div>' +
        '</div>' +

        '<div class="lo-balls">' + balls +
          '<span class="plus">＋</span>' +
          '<span class="ball bonus ' + ballClass(r.bonus) + '" style="animation-delay:420ms">' + r.bonus + '</span>' +
        '</div>' +
        '<div class="lo-colorkey"><span>1~10 노랑</span><span>11~20 파랑</span><span>21~30 빨강</span>' +
          '<span>31~40 회색</span><span>41~45 초록</span></div>' +

        '<div class="lo-line"><small>한 줄 복사용</small><b>' + numberLine() + '</b></div>' +

        '<div class="lo-tip"><h3>이번 주 행운 한마디</h3><p>' + esc(r.tip) + '</p></div>' +

        '<div class="mini-actions">' +
          '<button id="loAgain">다시 뽑기</button>' +
          '<button id="loCopy">번호 복사</button>' +
          '<button id="loSave">이미지 저장</button>' +
        '</div>' +
        '<p class="lo-share">' + (r.mode === "오늘의 기운으로"
          ? "같은 이름·생일이면 이번 주 내내 같은 번호가 나와요.<br>다른 번호가 보고 싶으면 다시 뽑기를 눌러보세요."
          : "누를 때마다 새로 뽑아요. 마음에 드는 조합이 나오면 번호 복사로 저장해 두세요.") + '</p>' +
        ctaHtml() +
        '<p class="note">재미로 보는 행운 번호이며 당첨을 보장하지 않습니다.<br>' +
          '로또 6/45 구매는 만 19세 이상만 가능하고, 도박 문제로 어려움이 있다면 한국도박문제예방치유원(1336)에 상담하실 수 있어요.</p>' +
      '</div>';

    var box = $("loResult");
    box.innerHTML = html;

    $("loCopy").addEventListener("click", function () {
      var txt = numberLine();
      var ui = window.DALBIT_UI;
      if (ui && ui.copyResult) { ui.copyResult(txt, this, "✓ 번호를 복사했어요! 카톡에 붙여넣기 해보세요"); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        var btn = this;
        navigator.clipboard.writeText(txt).then(function () { btn.textContent = "복사됐어요 ✓"; }, function () { });
      }
    });

    $("loSave").addEventListener("click", function () {
      var ui = window.DALBIT_UI;
      if (!ui || !ui.saveCard) return;
      ui.saveCard({
        kicker: "이번 주 행운의 로또 번호",
        headline: r.week.label,
        sub: "보너스 " + r.bonus + " · " + r.mode,
        balls: r.nums,
        bonus: r.bonus,
        items: [
          { label: "한 줄", text: numberLine() },
          { label: "행운 한마디", text: r.tip }
        ]
      }, "dalbit-lotto-result.png");
    });

    $("loAgain").addEventListener("click", function () {
      L.salt += 1;
      draw();
    });

    scrollToEl($("loResultInner"), 8);
  }

  function init() {
    if (!$("paneLotto")) return;
    initForm();
    bindMode();
    $("loBtn").addEventListener("click", function () { L.salt = 0; draw(); });
    var nameEl = $("loName");
    if (nameEl) {
      nameEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.keyCode === 13) { e.preventDefault(); L.salt = 0; draw(); }
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
