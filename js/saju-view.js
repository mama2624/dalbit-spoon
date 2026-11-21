/* 달빛 한 스푼 v4.1 — 만세력 사주 화면 (지연 로딩 모듈 · 2026-11-16 분리) */
(function () {
  "use strict";
  /* 원래 app.js 한 덩어리 안에 있던 부분을 그대로 옮기고,
     공용 도구는 코어(window.DALBIT_APP)에서 그대로 받아 씁니다. */
  var A = window.DALBIT_APP;
  var $ = A.$, scrollToEl = A.scrollToEl, ctaHtml = A.ctaHtml;

  var byEl = $("by"), bmEl = $("bm"), bdEl = $("bd"), bhEl = $("bh");
  var msgEl = $("sajuMsg"), sajuResultEl = $("sajuResult");

  (function initForm() {
    var opts = "";
    for (var y = 2049; y >= 1901; y--) opts += "<option" + (y === 1990 ? " selected" : "") + ">" + y + "</option>";
    byEl.innerHTML = opts;
    var mo = "";
    for (var m = 1; m <= 12; m++) mo += "<option" + (m === 1 ? " selected" : "") + ">" + m + "</option>";
    bmEl.innerHTML = mo;
    var ho = "";
    HOURS.forEach(function (h) { ho += '<option value="' + h.v + '">' + h.label + "</option>"; });
    bhEl.innerHTML = ho;
    updateDays();
  })();

  function isLunar() { return document.querySelector('input[name="cal"]:checked').value === "lunar"; }

  function daysInMonth() {
    var y = +byEl.value, m = +bmEl.value;
    if (isLunar()) return 30;
    return new Date(y, m, 0).getDate();
  }

  function updateDays() {
    var max = daysInMonth();
    var cur = +bdEl.value || 1;
    var html = "";
    for (var d = 1; d <= max; d++) html += "<option" + (d === cur ? " selected" : "") + ">" + d + "</option>";
    bdEl.innerHTML = html;
  }

  byEl.addEventListener("change", updateDays);
  bmEl.addEventListener("change", updateDays);
  var calRadios = document.querySelectorAll('input[name="cal"]');
  for (var r = 0; r < calRadios.length; r++) {
    calRadios[r].addEventListener("change", function () {
      $("leapWrap").hidden = !isLunar();
      if (!isLunar()) $("leap").checked = false;
      updateDays();
    });
  }

  function elBadge(el) {
    return '<span style="color:' + SAJU.EL_COLOR[el] + '">●</span> ' + SAJU.EL_NAME[el];
  }

  $("sajuBtn").addEventListener("click", function () {
    msgEl.textContent = "";
    var y = +byEl.value, m = +bmEl.value, d = +bdEl.value;
    var hour = bhEl.value === "" ? null : +bhEl.value;
    var lunar = isLunar();
    var leap = $("leap").checked;
    var solar = { y: y, m: m, d: d };

    if (lunar) {
      if (leap) {
        var probe = SAJU.lunarToSolar(y, m, 1, true);
        if (!probe) {
          msgEl.textContent = y + "년에는 윤" + m + "월이 없어요. 달력을 다시 확인해 주세요.";
          return;
        }
      }
      solar = SAJU.lunarToSolar(y, m, d, leap);
      if (!solar) {
        msgEl.textContent = "음력 " + y + "년 " + m + "월 " + d + "일을 찾을 수 없어요. 날짜를 다시 확인해 주세요.";
        return;
      }
    } else {
      var chk = new Date(y, m - 1, d);
      if (chk.getFullYear() !== y || chk.getMonth() !== m - 1 || chk.getDate() !== d) {
        msgEl.textContent = "그 날짜는 달력에 없어요. 다시 확인해 주세요.";
        return;
      }
      if (y < 1900 || y > 2060) {
        msgEl.textContent = "1900년부터 2060년까지 볼 수 있어요.";
        return;
      }
    }

    var s;
    try {
      s = SAJU.calculate(solar.y, solar.m, solar.d, hour);
    } catch (e) {
      msgEl.textContent = "계산 중 문제가 생겼어요. 날짜를 다시 확인해 주세요.";
      return;
    }
    renderSaju(s, lunar ? { y: y, m: m, d: d, leap: leap } : null);
  });


  /* ============================== 2027 정미년 신년운세 ============================== */
  var NEWYEAR_2027 = {
    "meta": {
      "year": 2027,
      "ganji": "정미",
      "hanja": "丁未",
      "animal": "양",
      "animalEmoji": "🐑",
      "ganKo": "정",
      "ganHanja": "丁",
      "ganElement": "화",
      "zhiKo": "미",
      "zhiHanja": "未",
      "zhiElement": "토",
      "note": "정미년은 천간 정(丁)화와 지지 미(未)토가 만난 해예요. 정화는 한낮의 태양이 아니라 촛불·등불처럼 오래 타는 불이고, 미토는 늦여름의 축축한 흙이자 곡식을 갈무리하는 창고예요."
    },
    "intro": "2027년은 화려하게 터지는 해가 아니라, 작은 불을 오래 지키는 해예요. 크게 벌이기보다 한 가지를 꾸준히 데우는 쪽이 결국 남습니다.",
    "why": "정(丁)화는 밝기보다 오래 가는 힘이 강한 불이라, 시작할 때보다 석 달 뒤에 더 환해져요. 미(未)토는 여름의 끝에서 곡식을 창고에 넣는 흙이라, 벌어들인 것을 지키고 정리하는 일이 잘 맞습니다. 그래서 2027년은 새로 사는 해보다 가진 것을 익히고 갈무리하는 해로 보면 흐름이 편해져요.",
    "strength": {
      "strong": "기운이 센 편이라 스스로 밀고 나가는 힘이 있어요. 다만 2027년은 그 힘을 한 곳에만 쓰는 게 좋아요. 여러 곳에 나눠 쓰면 불이 흩어져요.",
      "weak": "기운이 약한 편이라 혼자 밀기보다 도움을 받는 쪽이 잘 풀려요. 2027년은 사람을 통해 들어오는 기회가 많으니, 먼저 연락하는 사람이 유리해요."
    },
    "flow": [
      {
        "label": "1~3월 · 불을 옮기는 때",
        "text": "새해의 불씨를 옮겨 붙이는 구간이에요. 계획을 크게 세우기보다 이미 하고 있는 일을 하나 골라 손에 익히면, 그 감각이 일 년을 끌고 갑니다."
      },
      {
        "label": "4~6월 · 불이 커지는 때",
        "text": "정화의 기운이 가장 밝아지는 구간이에요. 미뤄둔 말과 제안을 꺼내기 좋고, 사람을 만나 새 판을 짜기에도 나쁘지 않아요. 다만 속도를 내다 지치지 않게 중간에 쉬는 날을 넣어 두세요."
      },
      {
        "label": "7~9월 · 흙이 데워지는 때",
        "text": "미토가 본격적으로 힘을 쓰는 구간이에요. 벌여 둔 일이 형태를 갖추고, 돈이든 사람이든 결실이 눈에 보이기 시작해요. 여기서 욕심을 더 내기보다 지금 나온 것을 정리하는 쪽이 이득이에요."
      },
      {
        "label": "10~12월 · 창고에 넣는 때",
        "text": "거둔 것을 갈무리하는 구간이에요. 미토는 저장의 흙이라, 이 시기에 정리해 둔 것이 다음 해에 그대로 자본이 돼요. 새 일을 벌이기보다 장부와 관계를 정리하는 편이 좋아요."
      }
    ],
    "byElementNeed": [
      {
        "el": "목",
        "hanja": "木",
        "text": "목이 부족한 사주라면 2027년의 불이 목을 태워 쓸 수 있어요. 아침에 십 분만 걷거나 초록 잎을 곁에 두는 식으로 목을 채워 두면, 불이 오래 갑니다."
      },
      {
        "el": "화",
        "hanja": "火",
        "text": "화가 부족한 사주라면 2027년이 가장 힘이 실리는 해예요. 다만 갑자기 크게 태우면 금방 꺼지니, 작은 불을 매일 켜는 쪽으로 쓰세요."
      },
      {
        "el": "토",
        "hanja": "土",
        "text": "토가 부족한 사주라면 미토가 창고를 채워 주는 해예요. 저축과 정리를 미루지 않으면 생각보다 많이 남습니다."
      },
      {
        "el": "금",
        "hanja": "金",
        "text": "금이 부족한 사주라면 미토가 금을 낳아 주는 해예요. 배우고 익힌 것을 값으로 바꾸기 좋으니, 자격이나 기술 하나를 정리해 두세요."
      },
      {
        "el": "수",
        "hanja": "水",
        "text": "수가 부족한 사주라면 미토가 물길을 막는 해라 답답함이 올 수 있어요. 물을 자주 마시고 밤에 일찍 자는 것만으로도 체감이 달라집니다."
      }
    ],
    "byDayMaster": [
      {
        "gi": 0,
        "gan": "갑",
        "hanja": "甲",
        "ten": "상관",
        "tenZhi": "정재",
        "title": "말과 기술이 돈이 되는 해",
        "total": "2027년은 내가 아는 것을 밖으로 꺼낼수록 좋아지는 해예요. 정화가 갑목의 표현력을 깨우고, 미토가 그 표현을 재물로 바꿔 주는 자리라, 말과 손으로 만든 것이 곧 돈이 됩니다.",
        "money": "기술을 팔거나 가르치는 쪽에서 돈이 붙어요. 큰 투자보다 지금 가진 재주를 어떻게 값으로 바꿀지 계산해 보는 게 이득입니다.",
        "work": "새로 배우기보다 하던 일을 더 잘하게 되는 해예요. 다만 윗사람에게 할 말을 그대로 하면 일이 커지니, 맞는 말도 순서를 바꿔서 하세요.",
        "people": "사람을 끌어당기는 힘이 강해요. 다만 말이 앞서면 관계가 상해요. 잘난 척이 아니라 나눔으로 보이게 말하는 게 관건입니다.",
        "health": "머리가 쉬지 못해 잠이 얕아지기 쉬워요. 저녁에 화면을 이십 분만 줄이면 다음 날의 판단이 달라집니다.",
        "first": "상반기는 표현이 앞서는 구간이에요. 미뤄둔 제안과 연락을 꺼내기 좋고, 말로 인정받는 일이 생겨요.",
        "second": "하반기는 그 표현이 돈으로 바뀌는 구간이에요. 정산과 청구를 미루지 마세요. 말해 두지 않은 값은 끝내 오지 않습니다.",
        "key": "꺼내야 돈이 됩니다",
        "tip": "이번 주에 내 기술 하나를 값으로 부르는 문장을 만들어 보세요."
      },
      {
        "gi": 1,
        "gan": "을",
        "hanja": "乙",
        "ten": "식신",
        "tenZhi": "편재",
        "title": "조용히 불어나는 해",
        "total": "2027년은 크게 티 나지 않지만 알맹이가 차는 해예요. 정화가 을목의 생활력을 살리고 미토가 새로운 수입의 길을 열어, 하루하루 쌓인 것이 연말에 눈에 보이게 됩니다.",
        "money": "들어오는 길이 하나에서 둘로 늘어나요. 부업이든 작은 판매든 지금 시작하면 연말에 두 번째 통장이 생깁니다.",
        "work": "혼자 하는 일보다 손발이 맞는 사람과 짝을 이룰 때 성과가 커져요. 내가 잘하는 것과 남이 잘하는 것을 나누는 게 이 해의 요령입니다.",
        "people": "먹고 나누는 자리에서 인연이 붙어요. 다만 부탁을 다 들어주다 보면 내 시간이 사라지니, 한 번은 미안하게 거절해도 괜찮아요.",
        "health": "식욕이 늘고 몸이 편안해지는 대신 살이 붙기 쉬운 해예요. 저녁을 조금 줄이는 것만으로 컨디션이 유지됩니다.",
        "first": "상반기는 씨를 뿌리는 구간이에요. 새 수입원을 하나 정해 아주 작게 시작해 보세요.",
        "second": "하반기는 뿌린 것이 올라오는 구간이에요. 7~9월에 첫 결실이 보이고, 10월 이후에 그것을 정리하면 남는 게 커집니다.",
        "key": "작게 벌려 오래 키웁니다",
        "tip": "이번 달에 새 수입원 하나를 정하고 첫 한 걸음을 지금 해 보세요."
      },
      {
        "gi": 2,
        "gan": "병",
        "hanja": "丙",
        "ten": "겁재",
        "tenZhi": "상관",
        "title": "나서고 싶은 마음이 큰 해",
        "total": "2027년은 내 존재감이 커지는 해인 동시에 돈이 새기 쉬운 해예요. 정화가 병화의 자리를 나눠 갖고 미토가 말을 키우니, 앞에 서는 일과 함께 나가는 돈을 같이 봐야 합니다.",
        "money": "벌어도 쓰는 만큼 사라지기 쉬워요. 통장을 하나 더 만들어 자동이체로 떼어 두지 않으면, 연말에 남는 게 없습니다.",
        "work": "동료나 동업자와의 경쟁이 생겨요. 이길 생각보다 이기는 사람과 편을 만드는 쪽이 오래 갑니다. 계약은 말로 하지 말고 문서로 남기세요.",
        "people": "내 주장이 세지는 만큼 부딪힐 상대도 생겨요. 한 번 더 들어주는 것만으로 일 년의 관계 지도가 달라집니다.",
        "health": "열이 위로 오르는 해라 얼굴이 붉어지거나 잠이 짧아져요. 술과 늦은 야식을 줄이면 바로 달라집니다.",
        "first": "상반기는 경쟁이 붙는 구간이에요. 먼저 제안하고 먼저 움직이는 쪽이 유리하지만, 지출은 미리 막아 두세요.",
        "second": "하반기는 말로 인정받는 구간이에요. 대신 그 말이 구설로 돌아올 수 있으니 남 이야기는 삼가세요.",
        "key": "나서되 새지 않게",
        "tip": "이번 주에 고정으로 떼어 둘 금액을 하나 정해 자동이체로 옮기세요."
      },
      {
        "gi": 3,
        "gan": "정",
        "hanja": "丁",
        "ten": "비견",
        "tenZhi": "식신",
        "title": "내 이름으로 서는 해",
        "total": "2027년은 정(丁)화가 정(丁)화를 만나 내 자리가 또렷해지는 해예요. 남의 판에 얹혀 있던 것이 내 이름의 일이 되고, 미토의 식신이 그것을 오래 가게 합니다.",
        "money": "큰돈이 갑자기 들어오기보다 내 이름으로 하는 일이 조금씩 값을 만듭니다. 처음 받는 값이 낮아도 그 값을 올리는 데 일 년을 쓰면 됩니다.",
        "work": "혼자 시작하는 일에 힘이 실려요. 다만 같은 기운이 겹친 해라 내 고집도 세지니, 한 번은 남의 방식을 그대로 따라 해 보세요.",
        "people": "비슷한 사람과 어울리기 쉬운 해예요. 편한 사람만 만나면 좁아지니, 한 해에 낯선 사람 셋과 밥을 먹어 보세요.",
        "health": "조용한 불이 오래 타는 해라 피로가 쌓여도 티가 잘 안 나요. 한 달에 한 번은 아무 일정 없이 쉬는 날을 두세요.",
        "first": "상반기는 내 자리를 만드는 구간이에요. 이름을 걸고 할 일 하나를 정하면 그게 일 년의 축이 됩니다.",
        "second": "하반기는 그 일이 모양을 갖추는 구간이에요. 9월 이후에 정리하고 이름을 붙이면 다음 해에 그대로 이어집니다.",
        "key": "내 이름으로 해 봅니다",
        "tip": "오늘 내 이름을 걸고 할 일 하나를 종이에 적어 보세요."
      },
      {
        "gi": 4,
        "gan": "무",
        "hanja": "戊",
        "ten": "정인",
        "tenZhi": "겁재",
        "title": "배우고 지키는 해",
        "total": "2027년은 배움과 문서의 운이 좋은 해예요. 정화가 무토를 따뜻하게 덥혀 주니 도움과 인연이 들어오고, 미토가 같은 흙으로 겹쳐 내 자리를 단단하게 만듭니다.",
        "money": "들어오는 돈은 안정적인데 나가는 돈이 같이 늘어요. 특히 사람 때문에 쓰는 돈이 많으니, 빌려주는 돈은 처음부터 없는 셈 치세요.",
        "work": "자격이나 교육을 받으면 그대로 값이 돼요. 지금 배우는 것이 늦은 게 아니라, 이 해에 시작해야 다음 해에 쓰입니다.",
        "people": "형제나 동료 같은 사람과 일이 엮여요. 고맙다는 말을 아끼지 않으면 오래 가는 편이 되고, 당연하게 여기면 그 자리에서 끊깁니다.",
        "health": "소화기 쪽이 예민해지기 쉬운 해예요. 저녁을 가볍게 하고 따뜻한 물을 챙겨 마시면 대체로 편안합니다.",
        "first": "상반기는 배움과 문서의 구간이에요. 미뤄둔 신 청이나 지원을 이때 끝내면 좋습니다.",
        "second": "하반기는 사람과 돈이 얽히는 구간이에요. 같이 하는 일의 몫을 미리 정해 두면 끝에 다투지 않아요.",
        "key": "배운 것이 자리가 됩니다",
        "tip": "미뤄둔 서류나 신청 하나를 이번 주에 끝내세요."
      },
      {
        "gi": 5,
        "gan": "기",
        "hanja": "己",
        "ten": "편인",
        "tenZhi": "비견",
        "title": "한 우물을 파는 해",
        "total": "2027년은 전문성이 살아나는 해예요. 정화의 편인이 기토를 데워 남다른 감각을 만들어 주니, 넓히기보다 한 곳을 깊게 파면 그게 값이 됩니다.",
        "money": "큰돈보다 한 가지 기술에서 반복되는 수입이 생겨요. 새로운 것에 손대기보다 지금 잘하는 것에서 값을 더 받는 쪽이 이득입니다.",
        "work": "남들이 안 하는 일에서 기회를 잡아요. 다만 생각이 많아 시작이 느려지니, 결론을 내는 날을 미리 정해 두세요.",
        "people": "좋아하는 사람 소수와 깊게 가는 해예요. 모임의 수를 줄이는 대신 한 사람과의 대화를 길게 하는 편이 낫습니다.",
        "health": "생각이 많아 잠들기까지 오래 걸려요. 잠자기 전에 머릿속 목록을 종이에 옮겨 두면 그만큼 빨리 잠듭니다.",
        "first": "상반기는 감각을 벼리는 구간이에요. 공부든 취미든 한 가지를 정해 매일 조금씩 하세요.",
        "second": "하반기는 그 감각을 값으로 바꾸는 구간이에요. 10월 이후에 작업물을 정리해 내놓으면 반응이 옵니다.",
        "key": "깊게 파면 값이 됩니다",
        "tip": "오늘 배우고 싶은 것 하나를 정해 십 분만 시작하세요."
      },
      {
        "gi": 6,
        "gan": "경",
        "hanja": "庚",
        "ten": "정관",
        "tenZhi": "정인",
        "title": "자리를 인정받는 해",
        "total": "2027년은 열 개의 일간 중에서도 조직과 평가의 운이 가장 좋은 해예요. 정화의 정관이 경금을 바로 세우고 미토의 정인이 뒤를 받쳐, 승진과 자격, 책임 있는 자리가 따라옵니다.",
        "money": "직장이나 계약을 통한 수입이 안정적으로 올라요. 큰 모험보다 지금 자리에서 값을 올리는 쪽이 훨씬 유리합니다.",
        "work": "맡은 일이 늘고 그만큼 인정받아요. 대신 규칙을 어기면 손해가 크니, 문서와 절차를 정확히 챙기세요.",
        "people": "윗사람의 신임을 얻기 좋은 해예요. 다만 그 신임에 기대어 아랫사람에게 각박해지면 그게 다음 해에 돌아옵니다.",
        "health": "어깨와 목이 굳기 쉬워요. 책임이 늘어나는 해일수록 자세를 먼저 챙기세요.",
        "first": "상반기는 평가와 시험의 구간이에요. 자격증이나 면접이 있다면 이때가 가장 좋습니다.",
        "second": "하반기는 책임이 늘어나는 구간이에요. 일이 늘면 돈도 늘지만 시간은 줄어드니, 쉬는 날을 먼저 정해 두세요.",
        "key": "제자리에 서면 올라갑니다",
        "tip": "올해 안에 딸 자격 하나를 정해 접수일을 적어 두세요."
      },
      {
        "gi": 7,
        "gan": "신",
        "hanja": "辛",
        "ten": "편관",
        "tenZhi": "편인",
        "title": "압박을 실력으로 바꾸는 해",
        "total": "2027년은 다소 빡빡한 해예요. 정화의 편관이 신금을 조이고 미토의 편인이 그 압박을 기술로 바꿔 주니, 힘든 일을 견디면 그게 실력으로 남습니다.",
        "money": "한 번에 큰돈이 들어오기보다, 어려운 일을 해낸 값으로 들어와요. 값을 먼저 정해 두고 시작하면 나중에 후회하지 않습니다.",
        "work": "굵직한 과제나 어려운 자리가 배정될 수 있어요. 피하지 않으면 그 일이 이 해의 가장 큰 자산이 됩니다.",
        "people": "까다로운 상대를 만나기 쉬워요. 그 사람을 이기려 하기보다 그 사람이 원하는 것을 정확히 파악하는 쪽이 빠릅니다.",
        "health": "긴장이 몸에 남는 해예요. 잠들기 전 오 분 스트레칭만으로도 다음 날의 컨디션이 달라집니다.",
        "first": "상반기는 압박이 몰리는 구간이에요. 일정을 몰아넣지 말고 사이에 빈칸을 두세요.",
        "second": "하반기는 그 압박이 실력으로 남는 구간이에요. 9월 이후에 결과물을 정리해 두면 다음 해에 그대로 쓰입니다.",
        "key": "견디면 실력이 남습니다",
        "tip": "지금 힘든 일 하나를 올해의 자산이라고 적어 보세요."
      },
      {
        "gi": 8,
        "gan": "임",
        "hanja": "壬",
        "ten": "정재",
        "tenZhi": "정관",
        "title": "재물과 책임이 함께 오는 해",
        "total": "2027년은 돈과 자리가 같이 오는 드문 자리예요. 정화가 임수의 정재가 되고 미토가 정관으로 받쳐 주니, 벌이가 안정되고 그만큼 책임도 생깁니다.",
        "money": "정직하게 번 돈이 잘 남는 해예요. 큰 모험보다 꾸준한 적립이 훨씬 유리하고, 이 해에 만든 저축 습관이 몇 해를 갑니다.",
        "work": "맡은 자리의 책임이 커져요. 그 책임을 피하지 않으면 다음 해에 자리가 올라갑니다.",
        "people": "인연이 안정되고 깊어져요. 결혼이나 동업처럼 문서로 남는 결정을 하기에도 나쁘지 않은 해입니다.",
        "health": "물의 기운이 막히는 해라 부기가 잘 빠지지 않아요. 짠 음식을 줄이고 저녁에 물을 나눠 마시세요.",
        "first": "상반기는 돈이 고이는 구간이에요. 새로 벌기보다 새는 곳을 막으면 그대로 남습니다.",
        "second": "하반기는 책임이 붙는 구간이에요. 10월 이후에 계약이나 정산을 마무리하면 깔끔하게 끝납니다.",
        "key": "벌고 지키고 책임집니다",
        "tip": "이번 달에 새는 돈 한 곳을 찾아 자동이체를 해지하세요."
      },
      {
        "gi": 9,
        "gan": "계",
        "hanja": "癸",
        "ten": "편재",
        "tenZhi": "편관",
        "title": "판을 키우는 해",
        "total": "2027년은 시야가 넓어지고 판이 커지는 해예요. 정화의 편재가 계수에게 새로운 돈의 길을 보여 주고, 미토의 편관이 그 길을 지키게 합니다.",
        "money": "한 곳에서만 벌기보다 여러 곳으로 넓힐 때 돈이 붙어요. 다만 손을 너무 많이 벌리면 관리가 안 되니, 두 개까지만 동시에 하세요.",
        "work": "새로운 분야나 큰 판에 들어갈 기회가 와요. 확신이 서지 않아도 한 번은 문을 두드려 볼 만한 해입니다.",
        "people": "처음 보는 사람이 내 편이 되는 해예요. 다만 그 인연에 기대어 일을 벌이면 관계가 먼저 상합니다.",
        "health": "몸이 붓고 무거워지기 쉬운 해예요. 아침에 물 한 컵과 가벼운 걷기로 하루를 열면 훨씬 가뿐합니다.",
        "first": "상반기는 새 길을 보는 구간이에요. 정보를 모으고 사람을 만나되, 결정은 조금 미뤄도 괜찮습니다.",
        "second": "하반기는 판을 키우는 구간이에요. 7~9월에 기회가 오면 그때 잡으세요. 10월 이후에는 정리에 힘을 쓰면 됩니다.",
        "key": "넓게 보되 두 개까지만",
        "tip": "하고 싶은 일 목록에서 두 개만 남기고 나머지는 내려놓으세요."
      }
    ],
    "caveat": "2027년 운세는 만세력으로 계산한 일간과 오행을 기준으로 본 재미용 풀이입니다. 큰 결정은 스스로 판단해 주세요."
  };

  function newyearPanel(s, missing) {
    var Y = NEWYEAR_2027, m = Y.meta;
    var dm = Y.byDayMaster[s.pillars.day.gi];
    var need = missing.length ? Y.byElementNeed[missing[0]] : null;
    var strength = s.strong ? Y.strength.strong : Y.strength.weak;
    var card = function (t, body) {
      return '<div class="lcard"><h3>' + t + '</h3><p>' + body + '</p></div>';
    };
    var flow = '';
    for (var i = 0; i < Y.flow.length; i++) {
      flow += '<div class="row"><b>' + Y.flow[i].label + '</b><span>' + Y.flow[i].text + '</span></div>';
    }
    return '<div class="panel mt" id="newyear2027">' +
      '<h2 class="sec">2027년 ' + m.ganji + '년(' + m.hanja + ') 신년운세</h2>' +
      '<div class="ny-head">' +
        '<div class="ny-badge">' + m.hanja + ' · ' + m.animalEmoji + ' ' + m.animal + '띠 · ' +
          m.ganElement + '·' + m.zhiElement + '의 해</div>' +
        '<h3 class="ny-title">' + dm.gan + '(' + dm.hanja + ') 일간 · ' + dm.title + '</h3>' +
        '<p class="ny-key">' + dm.key + '</p>' +
      '</div>' +
      '<p class="ny-intro">' + Y.intro + '</p>' +
      '<p class="ny-intro">' + Y.why + '</p>' +
      '<div class="luck">' +
        card('💰 총운', dm.total) +
        card('💵 재물운', dm.money) +
        card('🛠 일·직장운', dm.work) +
        card('🤝 대인운', dm.people) +
        card('🌿 건강운', dm.health) +
        card('🌱 상반기 (1~6월)', dm.first) +
        card('🍂 하반기 (7~12월)', dm.second) +
      '</div>' +
      '<p class="ny-intro" style="margin-top:12px"><b class="ny-lb">이 사주에 2027년은</b> ' + strength + '</p>' +
      (need ? '<div class="ny-need"><b>' + need.hanja + ' ' + need.el + ' 기운 보충</b> · ' + need.text + '</div>' : '') +
      '<div class="ny-flow">' + flow + '</div>' +
      '<p class="hint">' + dm.tip + '</p>' +
      '</div>';
  }

  function renderSaju(s, lunarInput) {
    var p = s.pillars;
    var dm = DAY_MASTER[p.day.gi];
    var me = s.me;
    var counts = s.elementCount;
    var missing = [];
    var fewest = 0;
    for (var i = 0; i < 5; i++) {
      if (counts[i] === 0) missing.push(i);
      if (counts[i] < counts[fewest]) fewest = i;
    }
    var tipTargets = missing.length ? missing.slice(0, 2) : [fewest];

    var gender = document.querySelector('input[name="gender"]:checked').value;
    var genderTxt = gender === "f" ? "여성" : "남성";

    /* P1~P4 업그레이드가 함께 쓰는 계산 문맥 (2026-11-20) */
    var pro = (window.SAJU_PRO && SAJU_PRO.ctxFromResult) ? SAJU_PRO.ctxFromResult(s, gender) : null;

    var dateLine = solarLine(s);
    var lunarLine = s.lunar ? ("음력 " + s.lunar.y + "년 " + s.lunar.m + "월 " + s.lunar.d + "일" + (s.lunar.leap ? " (윤달)" : "")) : "";
    var inputNote = lunarInput ? ("입력: 음력 " + lunarInput.y + "-" + lunarInput.m + "-" + lunarInput.d + (lunarInput.leap ? " 윤달" : "") + " → 양력으로 바꿔 계산했어요.") : "";

    var strengthTxt = s.strong ? "중심이 단단한 편" : "도움을 받으면 더 잘 풀리는 편";
    var JI_ANIMAL = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
    var animal = JI_ANIMAL[p.year.zi] + "띠";

    var html = '<div class="panel mt">' +
      '<div class="psum">' +
        '<div class="who">' + dateLine + (s.unknownTime ? " · 태어난 시간 모름" : "") + ' · ' + genderTxt + '</div>' +
        '<div class="dm"><span>' + p.day.ganKo + "(" + SAJU.EL_HANJA[me] + ")" + '</span> 일간 · ' + strengthTxt + '</div>' +
        '<div class="meta">' + animal + ' · ' + lunarLine + '<br>' + (inputNote ? inputNote + "<br>" : "") +
          "월주 기준 절기: " + s.jieLabel + " 이후" +
          (s.unknownTime ? "<br>시간을 몰라 시주를 빼고 세 기둥으로 봤어요." : "") +
        '</div>' +
      '</div>' +
      '<div class="pillars">' + pillarCell("년주", p.year) + pillarCell("월주", p.month) + pillarCell("일주", p.day) +
        (p.hour ? pillarCell("시주", p.hour) : '<div class="pil empty"><div class="nm">시주</div><div class="han">모름</div><div class="ko">-</div><div class="el">&nbsp;</div></div>') +
      '</div>' +
      '<div class="el-bars" id="elBars">' +
        counts.map(function (c, i) {
          return '<div class="ebar">' +
            '<div class="lb" style="color:' + SAJU.EL_COLOR[i] + '">' + SAJU.EL_NAME[i] + '</div>' +
            '<div class="track"><div class="fill" data-w="' + s.elementPct[i] + '" style="background:' + SAJU.EL_COLOR[i] + '"></div></div>' +
            '<div class="num">' + c + '개 ' + s.elementPct[i] + '%</div>' +
            '</div>';
        }).join("") +
      '</div>' +
      (pro ? SAJU_PRO.iljinStrip(pro) : '') +
      '</div>';

    /* P2 — 지금 내 대운 · 세운 */
    if (pro) html += SAJU_PRO.daeunPanel(pro);

    // 일간 성격
    html += '<div class="panel mt">' +
      '<h2 class="sec">' + p.day.ganKo + ' 일간, ' + dm.t + '</h2>' +
      '<p style="margin:0;font-size:14.5px;line-height:1.75;color:#e8e2f6;word-break:keep-all">' + dm.s + " " + dm.a + '</p>' +
      (missing.length
        ? '<p class="hint">' + missing.map(function (i) { return SAJU.EL_NAME[i] + "(" + SAJU.EL_HANJA[i] + ")"; }).join(", ") +
          " 기운이 사주에 없어요. 아래 개운 팁에서 채워보세요.</p>"
        : '<p class="hint">다섯 기운이 모두 들어 있어요. 흔한 사주는 아니에요.</p>') +
      '</div>';

    /* 고전 3관점 — 궁통보감(계절·조후) · 적천수(기세·균형) · 자평진전(격국·그릇) */
    if (pro && window.SAJU_CLASSIC) html += SAJU_CLASSIC.panel(pro);

    // 운세 3종
    var moneyKey = Math.min(s.ten.jaeseong, 2) + "-" + (s.strong ? "strong" : "weak");
    var healthKey = missing.length >= 2 ? "weak2" : (missing.length === 1 ? "weak1" : "weak0");
    var maxPct = Math.max.apply(null, s.elementPct);
    var healthTxt = HEALTH_TEXT[healthKey];
    if (maxPct >= 40 && healthKey !== "weak0") healthTxt += " " + HEALTH_TEXT.heavy;

    var socialScore = s.ten.gwanseong + s.ten.inseong + s.ten.bigeop;
    var socialTxt = socialScore >= 5 ? SOCIAL_TEXT.many : (socialScore <= 2 ? SOCIAL_TEXT.few : SOCIAL_TEXT.mid);

    html += '<div class="panel mt">' +
      '<h2 class="sec">재물운 · 건강운 · 대인운</h2>' +
      '<div class="luck">' +
        '<div class="lcard"><h3>💰 재물운</h3><p>' + MONEY_TEXT[moneyKey] + '</p></div>' +
        '<div class="lcard"><h3>🌿 건강운</h3><p>' + healthTxt +
          (missing.length ? " 특히 " + missing.map(function (i) { return ELEMENT_INFO[i].body; }).join(", ") + " 쪽을 살펴보세요." : "") +
          '</p></div>' +
        '<div class="lcard"><h3>🤝 대인운</h3><p>' + socialTxt + '</p></div>' +
      '</div></div>';

    // 2027 정미년 신년운세 (saju.js)
    html += newyearPanel(s, missing);

    // 개운 팁
    html += '<div class="panel mt"><h2 class="sec">부족한 기운 채우는 개운 팁</h2>';
    tipTargets.forEach(function (idx) {
      var e = ELEMENT_INFO[idx];
      html += '<div class="tipbox">' +
        '<h3>' + e.hanja + " " + e.name + " 기운 보충 · " + e.theme + '</h3>' +
        '<div class="item"><b>색·소품</b><span>' + e.color + ' / ' + e.item + '</span></div>' +
        '<div class="item"><b>음식</b><span>' + e.food + '</span></div>' +
        '<div class="item"><b>활동</b><span>' + e.act + '</span></div>' +
        '<div class="item"><b>숫자·방향</b><span>' + e.num + ' / ' + e.dir + '</span></div>' +
        '<div class="item"><b>몸</b><span>' + e.body + '</span></div>' +
        '</div>';
    });
    html += '</div>';

    /* P1 · P3 · P4 — 원국 프롬프트 / 저장 / 공유 (CTA 위) */
    if (pro) html += SAJU_PRO.proBlocks(pro);

    html += ctaHtml(ELEMENT_INFO[tipTargets[0]].name);
    html += '<div class="mini-actions"><button id="sajuAgain">다시 보기</button><button id="sajuCopy">결과 복사</button><button id="sajuSave">이미지 저장</button></div>';
    html += '<div class="note">' +
      "· 월주는 절기(입춘·경칩 등) 시각을 기준으로 계산했어요. 절입 시각은 한국표준시 기준입니다.<br>" +
      "· 음력 변환은 한국천문연구원 음력 기준(1900~2049년)이에요.<br>" +
      "· 자시는 23:00~00:59이며, 23시대 출생은 다음 날 일주로 계산합니다(조자시 기준).<br>" +
      "· 표준시·진태양시 보정은 적용하지 않았어요. 출생 지역에 따라 하루 정도 차이가 날 수 있습니다.<br>" +
      "· 재미로 보는 풀이이니 큰 결정은 스스로 판단해 주세요." +
      '</div>';

    sajuResultEl.innerHTML = html;

    // 막대 애니메이션
    requestAnimationFrame(function () {
      var fills = sajuResultEl.querySelectorAll(".fill");
      for (var k = 0; k < fills.length; k++) {
        var w = parseFloat(fills[k].getAttribute("data-w"));
        fills[k].style.width = (w > 0 ? Math.max(4, w) : 0) + "%";
      }
    });

    $("sajuCopy").addEventListener("click", function () {
      var cl = (pro && window.SAJU_CLASSIC) ? SAJU_CLASSIC.build(pro) : null;
      var txt = "[사주팔자] " + dateLine + (s.unknownTime ? " (시간 모름)" : "") + "\n" +
        "년주 " + p.year.textKo + " · 월주 " + p.month.textKo + " · 일주 " + p.day.textKo +
        (p.hour ? " · 시주 " + p.hour.textKo : "") + "\n" +
        "일간 " + p.day.ganKo + "(" + SAJU.EL_HANJA[me] + ") — " + dm.t + "\n" +
        "오행 " + s.elementCount.map(function (c, i2) { return SAJU.EL_NAME[i2] + c; }).join(" ") + "\n" +
        (cl ? "고전 3관점: " + cl.line + "\n" : "") +
        "재물운: " + MONEY_TEXT[moneyKey] + "\n" +
        "2027 정미년: " + NEWYEAR_2027.byDayMaster[p.day.gi].key + " — " + NEWYEAR_2027.byDayMaster[p.day.gi].title + "\n" +
        "▸ " + CONFIG.blogUrl;
      DALBIT_UI.copyResult(txt, this);
    });
    $("sajuSave").addEventListener("click", function () {
      DALBIT_UI.saveCard({
        kicker: dateLine + " · " + genderTxt,
        headline: p.day.ganKo + "(" + SAJU.EL_HANJA[me] + ") 일간 · " + strengthTxt,
        sub: animal + " · " + p.day.textKo + " 일주",
        items: [
          { label: "재물운", text: MONEY_TEXT[moneyKey] },
          { label: "건강운", text: healthTxt },
          { label: "대인운", text: socialTxt }
        ]
      }, "dalbit-spoon-result.png");
    });
    $("sajuAgain").addEventListener("click", function () {
      sajuResultEl.innerHTML = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    if (pro) SAJU_PRO.bind(sajuResultEl, pro);

    scrollToEl(sajuResultEl);
  }

  function pillarCell(name, pl) {
    var ge = SAJU.GAN_EL[pl.gi], ze = SAJU.ZHI_EL[pl.zi];
    return '<div class="pil">' +
      '<div class="nm">' + name + '</div>' +
      '<div class="han">' + pl.gan + pl.zhi + '</div>' +
      '<div class="ko">' + pl.ganKo + pl.zhiKo + '</div>' +
      '<div class="el"><span style="color:' + SAJU.EL_COLOR[ge] + '">' + SAJU.EL_NAME[ge] + '</span>' +
      '<span style="opacity:.4"> · </span><span style="color:' + SAJU.EL_COLOR[ze] + '">' + SAJU.EL_NAME[ze] + '</span></div>' +
      '</div>';
  }

  function solarLine(s) {
    return s.solar.y + "년 " + s.solar.m + "월 " + s.solar.d + "일";
  }

  /* ============================== 공유 링크 · 저장된 사주 (2026-11-20) ==============================
     · #saju=己巳丙子丙寅 → 원국 8자만으로 결과 카드를 바로 그립니다.
     · #saju=saved → 이 기기에 저장한 사주를 입력폼에 넣고 바로 계산합니다. */
  var sharedShown = false;

  function handleProHash() {
    if (!window.SAJU_PRO) return;
    var pane = document.getElementById("paneSaju");
    if (!pane || !pane.classList.contains("active")) return;
    var pl = SAJU_PRO.payloadFromHash();
    if (pl !== "saved" && window.__dalbitOpenSaved) {
      /* 홈 배지에서 앱 안 화면 전환으로 들어온 경우 */
      window.__dalbitOpenSaved = false;
      sharedShown = false;
      SAJU_PRO.openSaved();
      return;
    }
    if (pl === "saved") {
      sharedShown = false;
      SAJU_PRO.openSaved();
      return;
    }
    if (pl) {
      if (SAJU_PRO.renderShared(pl, sajuResultEl)) {
        sharedShown = true;
        scrollToEl(sajuResultEl);
      }
      return;
    }
    if (sharedShown) { sajuResultEl.innerHTML = ""; sharedShown = false; }
  }

  window.addEventListener("hashchange", handleProHash);
  window.addEventListener("dalbit:view", function (e) {
    var key = e && e.detail ? e.detail.key : "";
    if (key !== "saju" && sharedShown) { sajuResultEl.innerHTML = ""; sharedShown = false; }
    if (key === "saju") setTimeout(handleProHash, 0);
  });
  setTimeout(handleProHash, 0);
})();
