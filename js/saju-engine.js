/* 달빛 한 스푼 v4.1 — 만세력 계산 엔진 (지연 로딩 모듈 · 2026-11-16 분리) */
/* ---------- saju.js ---------- */
/* ============================================================
   만세력 계산 엔진 (순수 JS, DOM 의존 없음)
   - 년주: 입춘 기준
   - 월주: 12절(節) 입절 시각 기준
   - 일주: 율리우스적일 기반 60갑자 (한국표준시 자정 기준, 23시 이후는 다음 날)
   - 시주: 일간 + 12지시
   ============================================================ */
(function (root) {
  "use strict";

  var GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var GAN_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  var ZHI_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

  var EL_NAME = ["목", "화", "토", "금", "수"];        // 0木 1火 2土 3金 4水
  var EL_HANJA = ["木", "火", "土", "金", "水"];
  var EL_COLOR = ["#5fbf7f", "#ef6b5e", "#e8b74a", "#cfd6e2", "#5b9bd5"];

  var GAN_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var ZHI_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  // 12지지의 지장간 본기(대표 기운)는 ZHI_EL 그대로 사용

  // 生: 木→火→土→金→水→木
  var SAENG = [1, 2, 3, 4, 0];
  // 克: 木克土, 火克金, 土克水, 金克木, 水克火
  var GEUK = [2, 3, 4, 0, 1];

  // ---------- 절기 ----------
  var JIE = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
  var JIE_NAME = ["소한", "입춘", "경칩", "청명", "입하", "망종", "소서", "입추", "백로", "한로", "입동", "대설"];

  function stMinutes(year, i) {
    var idx = year - ST_Y0;
    if (idx < 0 || idx > ST.length / 48 - 1) return null;
    var s = ST.substr(idx * 48 + i * 4, 4);
    return parseInt(s, 36);
  }

  // 해당 연도의 i번째 절(節) 시각을 '한국표준시 벽시계' 밀리초로 반환
  function jieMs(year, i) {
    var m = stMinutes(year, i);
    if (m === null) return null;
    return Date.UTC(year, 0, 1) + m * 60000;
  }

  function jieDate(year, i) {
    var ms = jieMs(year, i);
    if (ms === null) return null;
    var d = new Date(ms);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), hh: d.getUTCHours(), mm: d.getUTCMinutes() };
  }

  // 벽시계(한국표준시) -> 비교용 밀리초
  function wallMs(y, m, d, hh, mm) {
    return Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  }

  // ---------- 율리우스 적일 ----------
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  function fromJdn(j) {
    var a = j + 32044;
    var b = Math.floor((4 * a + 3) / 146097);
    var c = a - Math.floor(146097 * b / 4);
    var dd = Math.floor((4 * c + 3) / 1461);
    var e = c - Math.floor(1461 * dd / 4);
    var m = Math.floor((5 * e + 2) / 153);
    return {
      d: e - Math.floor((153 * m + 2) / 5) + 1,
      m: m + 3 - 12 * Math.floor(m / 10),
      y: 100 * b + dd - 4800 + Math.floor(m / 10)
    };
  }

  function dayIndex(j) { return ((j + 49) % 60 + 60) % 60; }

  // ---------- 음양력 ----------
  function lunarYearInfo(y) {
    var v = LUNAR[y - LUNAR_Y0];
    if (v === undefined) return null;
    var leap = v >> 13;
    var mask = v & 8191;
    var arr = [];
    for (var m = 1; m <= 12; m++) {
      arr.push({ m: m, leap: false, len: (mask & (1 << (m - 1))) ? 30 : 29 });
      if (leap === m) arr.push({ m: m, leap: true, len: (mask & 4096) ? 30 : 29 });
    }
    var total = 0;
    for (var i = 0; i < arr.length; i++) total += arr[i].len;
    return { leap: leap, arr: arr, days: total };
  }

  function baseJdn() {
    var p = LUNAR_BASE.split("-");
    return jdn(+p[0], +p[1], +p[2]);
  }

  function lunarToSolar(ly, lm, ld, isLeap) {
    var info = lunarYearInfo(ly);
    if (!info) return null;
    var target = null;
    for (var i = 0; i < info.arr.length; i++) {
      if (info.arr[i].m === lm && info.arr[i].leap === !!isLeap) { target = i; break; }
    }
    if (target === null) return null;
    if (ld < 1 || ld > info.arr[target].len) return null;
    var off = 0;
    for (var k = 0; k < target; k++) off += info.arr[k].len;
    off += ld - 1;
    var base = baseJdn();
    for (var y = LUNAR_Y0; y < ly; y++) {
      var inf = lunarYearInfo(y);
      if (!inf) return null;
      base += inf.days;
    }
    return fromJdn(base + off);
  }

  function solarToLunar(y, m, d) {
    var diff = jdn(y, m, d) - baseJdn();
    if (diff < 0) return null;
    var ly = LUNAR_Y0;
    var info = lunarYearInfo(ly);
    while (info && diff >= info.days) {
      diff -= info.days;
      ly++;
      info = lunarYearInfo(ly);
    }
    if (!info) return null;
    var i = 0;
    while (i < info.arr.length && diff >= info.arr[i].len) {
      diff -= info.arr[i].len;
      i++;
    }
    return { y: ly, m: info.arr[i].m, d: diff + 1, leap: info.arr[i].leap };
  }

  // ---------- 사주 ----------
  function pillar(gi, zi) {
    return {
      gan: GAN[gi], zhi: ZHI[zi],
      ganKo: GAN_KO[gi], zhiKo: ZHI_KO[zi],
      gi: gi, zi: zi,
      text: GAN[gi] + ZHI[zi],
      textKo: GAN_KO[gi] + ZHI_KO[zi]
    };
  }

  // hour: 0~23, 모르면 null
  function calculate(y, m, d, hour) {
    var unknownTime = (hour === null || hour === undefined);
    var hh = unknownTime ? 12 : hour;

    // 일주: 23시 이후는 다음 날로 본다(조자시)
    var dayJ = jdn(y, m, d);
    if (!unknownTime && hh >= 23) dayJ += 1;
    var dIdx = dayIndex(dayJ);

    // 년주: 입춘 기준
    var birthMs = wallMs(y, m, d, hh, 0);
    var lichun = jieMs(y, 1); // JIE[1] = 입춘
    var sajuYear = y;
    if (lichun !== null && birthMs < lichun) sajuYear = y - 1;
    var yGi = ((sajuYear - 4) % 10 + 10) % 10;
    var yZi = ((sajuYear - 4) % 12 + 12) % 12;

    // 월주: 가장 최근에 지난 절(節)
    var best = null;
    for (var yy = y - 1; yy <= y + 1; yy++) {
      for (var i = 0; i < 12; i++) {
        var t = jieMs(yy, i);
        if (t === null || t > birthMs) continue;
        if (!best || t > best.t) best = { t: t, i: i, year: yy };
      }
    }
    var monthBranch, monthStem, jieLabel;
    if (best) {
      monthBranch = (best.i + 1) % 12;      // 소한->축, 입춘->인 ...
      var k = (best.i - 1 + 12) % 12;       // 입춘 기준 0
      monthStem = (yGi * 2 + 2 + k) % 10;
      var jd = jieDate(best.year, best.i);
      jieLabel = JIE_NAME[best.i] + "(" + jd.m + "/" + jd.d + " " + pad(jd.hh) + ":" + pad(jd.mm) + ")";
    } else {
      monthBranch = 1; monthStem = (yGi * 2 + 2 + 11) % 10; jieLabel = "입춘 전";
    }

    // 시주
    var hZi = null, hGi = null;
    if (!unknownTime) {
      hZi = Math.floor(((hh + 1) % 24) / 2);
      hGi = (dIdx % 10 * 2 + hZi) % 10;
    }

    var p = {
      year: pillar(yGi, yZi),
      month: pillar(monthStem, monthBranch),
      day: pillar(dIdx % 10, dIdx % 12),
      hour: (hZi === null) ? null : pillar(hGi, hZi)
    };

    // 오행
    var count = [0, 0, 0, 0, 0];
    var chars = [];
    chars.push({ el: GAN_EL[p.year.gi], src: "year" }, { el: ZHI_EL[p.year.zi], src: "year" });
    chars.push({ el: GAN_EL[p.month.gi], src: "month" }, { el: ZHI_EL[p.month.zi], src: "month" });
    chars.push({ el: GAN_EL[p.day.gi], src: "day" }, { el: ZHI_EL[p.day.zi], src: "day" });
    if (p.hour) {
      chars.push({ el: GAN_EL[p.hour.gi], src: "hour" }, { el: ZHI_EL[p.hour.zi], src: "hour" });
    }
    chars.forEach(function (c) { count[c.el]++; });

    // 십성
    var me = GAN_EL[p.day.gi];
    var ten = { bigeop: 0, siksang: 0, jaeseong: 0, gwanseong: 0, inseong: 0 };
    var detail = [];
    [p.year, p.month, p.day, p.hour].forEach(function (pl, idx) {
      if (!pl) return;
      var pos = ["년", "월", "일", "시"][idx];
      if (idx !== 2) {
        var gi = pl.gi;
        ten[tenGroup(me, GAN_EL[gi])]++;
        detail.push({ pos: pos, char: pl.gan, el: GAN_EL[gi], group: tenGroup(me, GAN_EL[gi]) });
      }
      var zi = pl.zi;
      ten[tenGroup(me, ZHI_EL[zi])]++;
      detail.push({ pos: pos, char: pl.zhi, el: ZHI_EL[zi], group: tenGroup(me, ZHI_EL[zi]) });
    });

    var strength = ten.bigeop + ten.inseong + (ZHI_EL[p.month.zi] === me ? 1 : (SAENG[ZHI_EL[p.month.zi]] === me ? 0.8 : 0));
    var strong = strength >= 3.2;

    var total = chars.length;
    var pct = count.map(function (c) { return Math.round(c / total * 1000) / 10; });

    return {
      solar: { y: y, m: m, d: d },
      lunar: solarToLunar(y, m, d),
      unknownTime: unknownTime,
      hour: unknownTime ? null : hh,
      pillars: p,
      jieLabel: jieLabel,
      sajuYear: sajuYear,
      elementCount: count,
      elementPct: pct,
      ten: ten,
      strong: strong,
      strengthScore: Math.round(strength * 10) / 10,
      me: me,
      dayGanKo: GAN_KO[p.day.gi] + "(" + EL_NAME[me] + ")",
      twelve: detail
    };
  }

  /* ---------- 대운 · 세운 (2026-11-20 추가) ----------
     · 방향: 사주년 천간이 양(甲丙戊庚壬)이고 남자 → 순행, 음(乙丁己辛癸)이고 여자 → 순행,
             나머지는 역행 (입춘 기준 사주년 — 1~2월 초 출생은 전년 간지로 판정)
     · 대운수: 순행이면 출생시각→다음 절(節), 역행이면 직전 절→출생시각까지의 일수 ÷ 3
               (3일 = 1년 · 나머지 1일 버림 · 2일 올림 · 몫이 0이면 1)
     · 대운 간지: 월주에서 60갑자 순/역으로 1칸씩, 대운수 나이부터 10년 간격
     · 세운: (연도-4) % 10 · (연도-4) % 12
     · 시간을 모르면 정오로 계산하며 ±1살 차이가 날 수 있습니다. */
  function daeun(y, m, d, hour, gender) {
    var unknownTime = (hour === null || hour === undefined);
    var hh = unknownTime ? 12 : hour;
    var birthMs = wallMs(y, m, d, hh, 0);

    // 사주년(입춘 기준)
    var lichun = jieMs(y, 1);
    var sajuYear = y;
    if (lichun !== null && birthMs < lichun) sajuYear = y - 1;
    var yGi = ((sajuYear - 4) % 10 + 10) % 10;
    var yang = (yGi % 2 === 0);
    var male = (gender === "m");
    var forward = (yang === male);

    // 가장 가까운 절 — 순행은 다음 절, 역행은 직전 절
    var prev = null, next = null;
    for (var yy = y - 1; yy <= y + 1; yy++) {
      for (var i = 0; i < 12; i++) {
        var t = jieMs(yy, i);
        if (t === null) continue;
        if (t <= birthMs) {
          if (!prev || t > prev.t) prev = { t: t, i: i, year: yy };
        } else {
          if (!next || t < next.t) next = { t: t, i: i, year: yy };
        }
      }
    }
    var target = forward ? next : prev;
    var dist = 0;
    if (target) dist = Math.abs(target.t - birthMs) / 86400000;
    var q = Math.floor(dist / 3);
    var rest = dist - q * 3;
    var su = q + (rest >= 2 ? 1 : 0);
    if (su < 1) su = 1;

    // 월주 → 60갑자 index
    var monthStem = 0, monthBranch = 1;
    if (prev) {
      monthBranch = (prev.i + 1) % 12;
      var k = (prev.i - 1 + 12) % 12;
      monthStem = (yGi * 2 + 2 + k) % 10;
    } else {
      monthStem = (yGi * 2 + 2 + 11) % 10;
    }
    var cur = 0;
    for (var ci = 0; ci < 60; ci++) {
      if (ci % 10 === monthStem && ci % 12 === monthBranch) { cur = ci; break; }
    }

    var rows = [];
    for (var n = 0; n < 10; n++) {
      var step = n + 1;
      var idx = ((cur + (forward ? step : -step)) % 60 + 60) % 60;
      var age = su + n * 10;
      rows.push({
        age: age, gi: idx % 10, zi: idx % 12,
        gan: GAN[idx % 10], zhi: ZHI[idx % 12],
        ganKo: GAN_KO[idx % 10], zhiKo: ZHI_KO[idx % 12],
        text: GAN[idx % 10] + ZHI[idx % 12],
        textKo: GAN_KO[idx % 10] + ZHI_KO[idx % 12],
        startYear: y + age, endYear: y + age + 9
      });
    }

    return {
      forward: forward,
      days: Math.round(dist * 100) / 100,
      jieName: (target ? JIE_NAME[target.i] : ""),
      daeunSu: su,
      unknownTime: unknownTime,
      rows: rows
    };
  }

  function seun(year) {
    var gi = ((year - 4) % 10 + 10) % 10;
    var zi = ((year - 4) % 12 + 12) % 12;
    return {
      year: year, gi: gi, zi: zi,
      gan: GAN[gi], zhi: ZHI[zi],
      ganKo: GAN_KO[gi], zhiKo: ZHI_KO[zi],
      text: GAN[gi] + ZHI[zi], textKo: GAN_KO[gi] + ZHI_KO[zi]
    };
  }

  /* 만 나이 (생년월일 기준, 오늘 날짜) */
  function ageAt(y, m, d, now) {
    var t = now || new Date();
    var a = t.getFullYear() - y;
    if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--;
    return a;
  }

  function tenGroup(me, other) {
    if (me === other) return "bigeop";
    if (SAENG[me] === other) return "siksang";
    if (GEUK[me] === other) return "jaeseong";
    if (GEUK[other] === me) return "gwanseong";
    return "inseong";
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  var api = {
    GAN: GAN, ZHI: ZHI, GAN_KO: GAN_KO, ZHI_KO: ZHI_KO,
    EL_NAME: EL_NAME, EL_HANJA: EL_HANJA, EL_COLOR: EL_COLOR,
    GAN_EL: GAN_EL, ZHI_EL: ZHI_EL,
    calculate: calculate,
    daeun: daeun,
    seun: seun,
    ageAt: ageAt,
    tenGroup: tenGroup,
    JIE_NAME: JIE_NAME,
    lunarToSolar: lunarToSolar,
    solarToLunar: solarToLunar,
    jdn: jdn, fromJdn: fromJdn, dayIndex: dayIndex,
    jieDate: jieDate, jieMs: jieMs
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.SAJU = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
