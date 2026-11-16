/* 달빛 한 스푼 v4.1 — 공용 UI: 토스트·복사·결과 카드 PNG 저장 (지연 로딩 모듈 · 2026-11-16 분리) */
/* ============================================================
   공용 UI : 하단 토스트 · 복사/공유 · 결과 카드 PNG 저장
   타로·사주·꿈해몽·전생체험이 함께 씁니다.
   ============================================================ */
(function (root) {
  "use strict";

  var TOAST_MS = 3000;
  var COPY_MSG = "✓ 복사 완료! 카톡·스레드에 붙여넣기 해보세요";
  var IMG_MSG = "✓ 결과 카드 이미지를 저장했어요!";
  var FONT = 'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';
  var toastTimer = null;

  /* ---------- 하단 토스트 ---------- */
  function toast(msg, ms) {
    var el = document.getElementById("dalbitToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "dalbitToast";
      el.className = "toast-banner";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    if (el.classList.contains("show")) {
      el.classList.remove("show");
      void el.offsetWidth;
    }
    el.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
      toastTimer = null;
    }, ms || TOAST_MS);
  }

  /* ---------- 클립보드 ---------- */
  function legacyCopy(txt) {
    try {
      var ta = document.createElement("textarea");
      ta.value = txt;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { ta.setSelectionRange(0, ta.value.length); } catch (e) { }
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch (e) {
      return false;
    }
  }

  function copy(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(txt).then(function () { return true; }, function () { return legacyCopy(txt); });
    }
    return Promise.resolve(legacyCopy(txt));
  }

  function flash(btn, label) {
    if (!btn) return;
    var old = btn.getAttribute("data-label") || btn.textContent;
    btn.setAttribute("data-label", old);
    btn.textContent = label;
    clearTimeout(btn._flashTimer);
    btn._flashTimer = setTimeout(function () { btn.textContent = old; }, 1600);
  }

  /* ---------- 공유 시트(안드로이드·아이폰) ---------- */
  function shareText(txt) {
    if (!navigator.share) return;
    try {
      var p = navigator.share({ title: "달빛 한 스푼", text: txt });
      if (p && typeof p.catch === "function") p.catch(function () { });
    } catch (e) { }
  }

  /* 복사 → 버튼 문구 잠깐 변경 → 토스트 → (지원 시) 공유 시트 */
  function copyResult(txt, btn, msg) {
    return copy(txt).then(function () {
      flash(btn, "복사됐어요 ✓");
      toast(msg || COPY_MSG);
      shareText(txt);
      return true;
    }, function () {
      toast("복사에 실패했어요. 길게 눌러 직접 복사해 주세요.");
      return false;
    });
  }

  /* ---------- 결과 카드 PNG ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrap(ctx, text, maxW) {
    var lines = [];
    var line = "";
    var s = String(text == null ? "" : text);
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === "\n") { lines.push(line); line = ""; continue; }
      var test = line + ch;
      if (line && ctx.measureText(test).width > maxW) {
        lines.push(line.replace(/\s+$/, ""));
        line = (ch === " ") ? "" : ch;
      } else {
        line = test;
      }
    }
    if (line.replace(/\s+$/, "")) lines.push(line.replace(/\s+$/, ""));
    return lines.length ? lines : [""];
  }

  function fitLines(ctx, text, maxW, maxLines) {
    var all = wrap(ctx, text, maxW);
    if (all.length <= maxLines) return all;
    var out = all.slice(0, maxLines);
    var last = out[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
    out[maxLines - 1] = last.replace(/\s+$/, "") + "…";
    return out;
  }

  function spacer(ctx, v) {
    try { ctx.letterSpacing = v; } catch (e) { }
  }

  /* 로또 공 색 (한국 로또 6/45 표준) : [밝은색, 기본색, 글자색] */
  function ballColorHex(n) {
    if (n <= 10) return ["#ffd751", "#efb100", "#3a2a00"];
    if (n <= 20) return ["#8fd9f9", "#3fb0e6", "#052a3d"];
    if (n <= 30) return ["#ff9b9b", "#e85f5f", "#3d0a0a"];
    if (n <= 40) return ["#c9c9c9", "#9a9a9a", "#232323"];
    return ["#d3ea78", "#a4cc33", "#22320a"];
  }

  /* 로또 공 한 줄 : 6개 + ＋ + 보너스 */
  function drawBalls(ctx, W, y, nums, bonus) {
    var d = 90, gap = 13, plusW = 34;
    var list = nums || [];
    if (!list.length) return y;
    var rowW = list.length * d + (bonus ? d + gap * 2 + plusW : 0) + Math.max(0, list.length - 1) * gap;
    var x = (W - rowW) / 2;
    var cy = y + d / 2;

    function one(cx, num, isBonus) {
      var col = ballColorHex(num);
      var g = ctx.createRadialGradient(cx - d * 0.2, cy - d * 0.28, d * 0.08, cx, cy, d * 0.62);
      g.addColorStop(0, col[0]);
      g.addColorStop(1, col[1]);
      ctx.beginPath();
      ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      if (isBonus) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(233,198,126,.95)";
        ctx.stroke();
      }
      ctx.fillStyle = col[2];
      ctx.font = "800 40px " + FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(num), cx, cy + 2);
      ctx.textBaseline = "alphabetic";
    }

    for (var i = 0; i < list.length; i++) {
      one(x + d / 2, list[i], false);
      x += d + gap;
    }
    if (bonus) {
      ctx.fillStyle = "rgba(233,198,126,.85)";
      ctx.font = "700 32px " + FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", x + plusW / 2, cy);
      ctx.textBaseline = "alphabetic";
      x += plusW + gap;
      one(x + d / 2, bonus, true);
    }
    ctx.textAlign = "center";
    return y + d;
  }

  /* spec = { kicker, headline, sub, items:[{label,text}], balls, bonus } */
  function buildCard(spec) {
    var W = 1080, H = 1350, M = 104, maxW = W - M * 2;
    var cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    var ctx = cv.getContext("2d");
    if (!ctx) return null;

    /* 배경 */
    var g = ctx.createLinearGradient(0, 0, W * 0.35, H);
    g.addColorStop(0, "#1c1636");
    g.addColorStop(0.5, "#130f27");
    g.addColorStop(1, "#090714");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var glow = ctx.createRadialGradient(W * 0.5, 40, 0, W * 0.5, 40, W * 0.85);
    glow.addColorStop(0, "rgba(233,198,126,.16)");
    glow.addColorStop(1, "rgba(233,198,126,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    /* 미세 별빛 */
    var seed = 20261115;
    var rnd = function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (var s = 0; s < 26; s++) {
      var sx = 60 + rnd() * (W - 120);
      var sy = 80 + rnd() * (H - 160);
      var sr = 1 + rnd() * 1.8;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + (rnd() > 0.5 ? "255,255,255" : "246,227,180") + "," + (0.18 + rnd() * 0.32).toFixed(2) + ")";
      ctx.fill();
    }

    /* 테두리 */
    roundRect(ctx, 44, 44, W - 88, H - 88, 46);
    ctx.strokeStyle = "rgba(233,198,126,.30)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    /* 브랜드 */
    ctx.fillStyle = "#e9c67e";
    ctx.font = "700 37px " + FONT;
    ctx.fillText("달빛 한 스푼", W / 2, 158);

    if (spec.kicker) {
      ctx.fillStyle = "rgba(233,226,246,.62)";
      ctx.font = "400 24px " + FONT;
      var kick = fitLines(ctx, spec.kicker, maxW, 1);
      ctx.fillText(kick[0], W / 2, 204);
    }

    /* 금빛 구분선 + 별 장식 */
    ctx.beginPath();
    ctx.moveTo(W / 2 - 92, 240);
    ctx.lineTo(W / 2 - 30, 240);
    ctx.moveTo(W / 2 + 30, 240);
    ctx.lineTo(W / 2 + 92, 240);
    ctx.strokeStyle = "rgba(233,198,126,.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(233,198,126,.85)";
    ctx.font = "400 20px " + FONT;
    ctx.fillText("✦", W / 2, 247);

    /* 제목 */
    ctx.fillStyle = "#faf5ea";
    ctx.font = "800 60px " + FONT;
    var headLines = fitLines(ctx, spec.headline || "", maxW, 3);
    var y = 336;
    for (var i = 0; i < headLines.length; i++) {
      ctx.fillText(headLines[i], W / 2, y + i * 76);
    }
    y += (headLines.length - 1) * 76;

    /* 부제 */
    if (spec.sub) {
      ctx.fillStyle = "rgba(233,198,126,.92)";
      ctx.font = "500 27px " + FONT;
      var subLines = fitLines(ctx, spec.sub, maxW, 2);
      y += 58;
      for (var j = 0; j < subLines.length; j++) {
        ctx.fillText(subLines[j], W / 2, y + j * 40);
      }
      y += (subLines.length - 1) * 40;
    }

    /* 로또 공 (spec.balls 가 있으면 항목 위에 공을 그립니다) */
    if (spec.balls && spec.balls.length) {
      y = drawBalls(ctx, W, y + 34, spec.balls, spec.bonus) + 22;
    }

    /* 항목 */
    var items = (spec.items || []).slice(0, 3);
    y += 60;
    var areaBottom = 1160;
    var labelH = 36, lh = 47, gap = 30;
    var count = Math.max(1, items.length);
    var per = Math.floor((areaBottom - y - gap * (count - 1) - labelH * count) / (count * lh));
    per = Math.max(2, Math.min(per, 5));

    /* 본문 높이를 재서 가운데로 배치 */
    var blockH = 0;
    var measured = [];
    for (var q = 0; q < items.length; q++) {
      ctx.font = "400 29px " + FONT;
      var ml = fitLines(ctx, (items[q] || {}).text || "", maxW, per);
      measured.push(ml);
      blockH += labelH + 30 + ml.length * lh;
      if (q < items.length - 1) blockH += gap;
    }
    var slack = (areaBottom - y) - blockH;
    if (slack > 0) {
      gap += Math.min(slack / Math.max(1, count), 64);
      y += Math.min(slack * 0.3, 76);
    }

    for (var k = 0; k < items.length; k++) {
      var it = items[k] || {};
      ctx.textAlign = "left";
      ctx.fillStyle = "#e9c67e";
      ctx.font = "700 22px " + FONT;
      var lbl = fitLines(ctx, it.label || "", maxW, 1);
      ctx.fillText(lbl[0], M, y);
      y += labelH;

      ctx.fillStyle = "rgba(243,239,251,.92)";
      ctx.font = "400 29px " + FONT;
      var bodyLines = measured[k] || [""];
      for (var m = 0; m < bodyLines.length; m++) {
        ctx.fillText(bodyLines[m], M, y + 30 + m * lh);
      }
      y += 30 + bodyLines.length * lh;
      if (k < items.length - 1) y += gap;
      ctx.textAlign = "center";
    }

    /* 푸터 */
    ctx.beginPath();
    ctx.moveTo(M, 1206);
    ctx.lineTo(W - M, 1206);
    ctx.strokeStyle = "rgba(233,198,126,.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#e9c67e";
    ctx.font = "600 28px " + FONT;
    ctx.fillText("saju.gold-queen.com", W / 2, 1262);
    ctx.fillStyle = "rgba(233,226,246,.45)";
    ctx.font = "400 19px " + FONT;
    ctx.fillText("재미로 보는 타로·사주·꿈해몽·전생체험·로또 번호", W / 2, 1300);

    return cv;
  }

  function saveCard(spec, fileName) {
    var name = fileName || "dalbit-spoon-result.png";
    var cv;
    try {
      cv = buildCard(spec || {});
    } catch (e) {
      cv = null;
    }
    if (!cv) { toast("이미지 저장에 실패했어요. 잠시 뒤 다시 시도해 주세요."); return; }

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
      toast(IMG_MSG);
    };

    if (cv.toBlob) {
      cv.toBlob(function (blob) {
        if (!blob) { toast("이미지 저장에 실패했어요. 잠시 뒤 다시 시도해 주세요."); return; }
        var url = URL.createObjectURL(blob);
        fire(url, true);
      }, "image/png");
    } else {
      fire(cv.toDataURL("image/png"), false);
    }
  }

  root.DALBIT_UI = { toast: toast, copy: copy, copyResult: copyResult, saveCard: saveCard };
})(window);
