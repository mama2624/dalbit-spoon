#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
달빛 한 스푼 — 운세 가이드 정적 페이지 생성기
=============================================
만드는 것
  · /guide/index.html                운세 가이드 허브
  · /guide/today/index.html          날짜별 오늘의 운세 목록(일진 달력)
  · /guide/today/YYYY-MM-DD.html     날짜별 오늘의 운세 (기본 70일치)
  · /guide/2027-unse/index.html      2027 정미년 띠별 운세 허브
  · /guide/2027-unse/<slug>.html     12띠 개별 페이지
  · /sitemap.xml                     위 주소 전체 반영

계산 근거
  · 일진(日辰) : 앱 본체(js/saju-engine.js)와 같은 율리우스적일 기반 60갑자
                  dayIndex(jdn) = ((jdn + 49) % 60 + 60) % 60
  · 음력        : js/data-saju.js 의 LUNAR 테이블(1900년 기준) 이식
  · 월건(月建)  : js/data-saju.js 의 ST(절입 시각) 테이블 이식, 12절 기준
  · 납음오행    : 60갑자 30쌍 표준표
  · 띠별 길흉   : 일진 지지와 띠 지지의 합·충·형·파·해 관계 + 오행 생극

사용법
  python3 tools/gen_guides.py                  # 기본: 2026-11-23부터 70일
  python3 tools/gen_guides.py --start 2026-12-01 --days 120
  python3 tools/gen_guides.py --no-sitemap     # 페이지만 다시 만들기
"""

import argparse
import datetime as dt
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GUIDE = ROOT / "guide"
BASE_URL = "https://saju.gold-queen.com"
BUILD_DATE = dt.date.today()

# ============================================================
# 1. 기본 상수 (앱 본체와 동일)
# ============================================================
GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
GAN_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
ZHI_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]
GAN_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]          # 목화토금수
ZHI_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]
EL_NAME = ["목", "화", "토", "금", "수"]
EL_HANJA = ["木", "火", "土", "金", "水"]
EL_COLOR = {"목": "청록·초록", "화": "붉은색·주황", "토": "노랑·황토", "금": "흰색·금색", "수": "검정·남색"}
EL_DIR = {"목": "동쪽", "화": "남쪽", "토": "중앙", "금": "서쪽", "수": "북쪽"}
SAENG = [1, 2, 3, 4, 0]                           # 木→火→土→金→水→木
GEUK = [2, 3, 4, 0, 1]                            # 木克土 …
ZHI_ANIMAL = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"]
ZHI_EMOJI = ["🐭", "🐮", "🐯", "🐰", "🐲", "🐍", "🐴", "🐑", "🐵", "🐔", "🐶", "🐷"]
ZHI_SLUG = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"]
ZHI_TRAIT = [
    "재빠르게 기회를 읽고 실속을 챙기는 편",
    "느리지만 끝까지 가는 꾸준함",
    "크게 움직이고 앞장서는 힘",
    "조심성 많고 감각이 섬세함",
    "규모 있게 키우는 야심",
    "속을 잘 드러내지 않고 때를 기다림",
    "빠르게 달리는 직선적 성향",
    "온순해 보이지만 속은 단단함",
    "재주 많고 임기응변이 빠름",
    "정확하고 기준이 분명함",
    "의리와 책임을 중히 여김",
    "넉넉하고 사람을 편하게 하는 성향",
]
WEEKDAY = ["월", "화", "수", "목", "금", "토", "일"]

NAEUM = [
    ("海中金", "해중금"), ("爐中火", "노중화"), ("大林木", "대림목"), ("路傍土", "노방토"),
    ("劍鋒金", "검봉금"), ("山頭火", "산두화"), ("澗下水", "간하수"), ("城頭土", "성두토"),
    ("白蠟金", "백랍금"), ("楊柳木", "양류목"), ("泉中水", "천중수"), ("屋上土", "옥상토"),
    ("霹靂火", "벽력화"), ("松柏木", "송백목"), ("長流水", "장류수"), ("沙中金", "사중금"),
    ("山下火", "산하화"), ("平地木", "평지목"), ("壁上土", "벽상토"), ("金箔金", "금박금"),
    ("覆燈火", "복등화"), ("天河水", "천하수"), ("大驛土", "대역토"), ("釵釧金", "차전금"),
    ("桑柘木", "상자목"), ("大溪水", "대계수"), ("沙中土", "사중토"), ("天上火", "천상화"),
    ("石榴木", "석류목"), ("大海水", "대해수"),
]

JIE_NAME = ["소한", "입춘", "경칩", "청명", "입하", "망종", "소서", "입추", "백로", "한로", "입동", "대설"]

# ============================================================
# 2. 만세력 데이터 (js/data-saju.js 이식)
# ============================================================
_data_src = (ROOT / "js" / "data-saju.js").read_text(encoding="utf-8")
ST_Y0 = 1900
ST = re.search(r'var ST = "([^"]+)"', _data_src).group(1)
LUNAR = [int(x) for x in re.findall(r"\d+", re.search(r"var LUNAR = \[(.*?)\];", _data_src, re.S).group(1))]
LUNAR_Y0 = 1900
LUNAR_BASE = (1900, 1, 31)


def jdn(y, m, d):
    a = (14 - m) // 12
    yy = y + 4800 - a
    mm = m + 12 * a - 3
    return d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045


LUNAR_BASE_JDN = jdn(*LUNAR_BASE)


def lunar_info(y):
    v = LUNAR[y - LUNAR_Y0]
    leap = v >> 13
    mask = v & 8191
    arr = []
    for mo in range(1, 13):
        arr.append((mo, False, 30 if (mask & (1 << (mo - 1))) else 29))
        if leap == mo:
            arr.append((mo, True, 30 if (mask & 4096) else 29))
    return leap, arr, sum(a[2] for a in arr)


def solar_to_lunar(y, m, d):
    diff = jdn(y, m, d) - LUNAR_BASE_JDN
    ly = LUNAR_Y0
    leap, arr, days = lunar_info(ly)
    while diff >= days:
        diff -= days
        ly += 1
        leap, arr, days = lunar_info(ly)
    i = 0
    while i < len(arr) and diff >= arr[i][2]:
        diff -= arr[i][2]
        i += 1
    return ly, arr[i][0], diff + 1, arr[i][1]


def st_minutes(year, i):
    idx = year - ST_Y0
    s = ST[idx * 48 + i * 4: idx * 48 + i * 4 + 4]
    if len(s) < 4:
        return None
    try:
        return int(s, 36)
    except ValueError:
        return None


def jie_dt(year, i):
    """i번째 절(0=소한 … 11=대설)의 한국표준시 벽시계 시각."""
    m = st_minutes(year, i)
    if m is None:
        return None
    return dt.datetime(year, 1, 1) + dt.timedelta(minutes=m)


def day_index(y, m, d):
    j = jdn(y, m, d)
    return ((j + 49) % 60 + 60) % 60


def month_pillar(y, m, d):
    """그 날짜에 적용되는 월건(절입 기준)."""
    when = dt.datetime(y, m, d, 12, 0)
    best = None
    for yy in (y - 1, y, y + 1):
        for i in range(12):
            t = jie_dt(yy, i)
            if t is None or t > when:
                continue
            if best is None or t > best[0]:
                best = (t, i, yy)
    # 세운(입춘 기준)
    lichun = jie_dt(y, 1)
    saju_year = y - 1 if (lichun and when < lichun) else y
    y_gi = ((saju_year - 4) % 10 + 10) % 10
    y_zi = ((saju_year - 4) % 12 + 12) % 12
    if best is None:
        return y_gi, y_zi, (y_gi * 2 + 2 + 11) % 10, 1, "입춘 전"
    t, i, yy = best
    branch = (i + 1) % 12
    k = (i - 1 + 12) % 12
    stem = (y_gi * 2 + 2 + k) % 10
    return y_gi, y_zi, stem, branch, JIE_NAME[i]


JIE_HANJA = {"소한": "小寒", "입춘": "立春", "경칩": "驚蟄", "청명": "淸明", "입하": "立夏", "망종": "芒種",
             "소서": "小暑", "입추": "立秋", "백로": "白露", "한로": "寒露", "입동": "立冬", "대설": "大雪"}


def next_jie(date):
    """date 다음(당일 포함 이후) 절입 시각을 (이름, datetime)으로."""
    limit = dt.datetime(date.year, date.month, date.day, 0, 0)
    best = None
    for yy in (date.year - 1, date.year, date.year + 1):
        for i in range(12):
            t = jie_dt(yy, i)
            if t is None or t < limit:
                continue
            if best is None or t < best[0]:
                best = (t, i)
    if not best:
        return None
    return JIE_NAME[best[1]], best[0]


def solar_term_on(y, m, d):
    """그 날짜에 절입이 있으면 (절 이름, 시각) 반환."""
    for yy in (y - 1, y, y + 1):
        for i in range(12):
            t = jie_dt(yy, i)
            if t and t.date() == dt.date(y, m, d):
                return JIE_NAME[i], t.strftime("%H:%M")
    return None


# ============================================================
# 3. 지지 관계 (합·충·형·파·해)
# ============================================================
HAP_PAIRS = {(0, 1), (2, 11), (3, 10), (4, 9), (5, 8), (6, 7)}
SAMHAP_GROUPS = [{8, 0, 4}, {11, 3, 7}, {2, 6, 10}, {5, 9, 1}]   # 신자진·해묘미·인오술·사유축
BANGHAP_GROUPS = [{2, 3, 4}, {5, 6, 7}, {8, 9, 10}, {11, 0, 1}]  # 인묘진·사오미·신유술·해자축
HYEONG_GROUPS = [{2, 5, 8}, {1, 10, 7}, {0, 3}]                   # 인사신·축술미·자묘
PA_PAIRS = {(0, 9), (1, 4), (2, 11), (5, 8), (3, 6), (7, 10)}
HAE_PAIRS = {(0, 7), (1, 6), (2, 5), (3, 4), (8, 11), (9, 10)}

REL_MAIN = '''hap chung hyeong pa hae banghap samhap none self'''.split()


def _pair_in(pairs, a, b):
    return (a, b) in pairs or (b, a) in pairs


def _in_group(groups, a, b):
    return any(a in g and b in g for g in groups)


def relation(a, b):
    """a = 오늘 일진의 지지, b = 띠의 지지."""
    if a == b:
        return "self"
    if _pair_in(HAP_PAIRS, a, b):
        return "hap"
    if (a - b) % 12 == 6:
        return "chung"
    if _in_group(HYEONG_GROUPS, a, b):
        return "hyeong"
    if _pair_in(PA_PAIRS, a, b):
        return "pa"
    if _pair_in(HAE_PAIRS, a, b):
        return "hae"
    if _in_group(BANGHAP_GROUPS, a, b):
        return "banghap"
    if _in_group(SAMHAP_GROUPS, a, b):
        return "samhap"
    return "none"


REL_INFO = {
    "hap":     ("육합", "六合", 4.4, "good"),
    "samhap":  ("삼합", "三合", 3.8, "good"),
    "banghap": ("방합", "方合", 3.4, "good"),
    "none":    ("무관", "無關", 3.0, ""),
    "self":    ("겹침", "同支", 2.7, ""),
    "hae":     ("해", "害", 2.1, "care"),
    "pa":      ("파", "破", 1.9, "care"),
    "hyeong":  ("형", "刑", 1.6, "care"),
    "chung":   ("충", "沖", 1.0, "care"),
}
REL_ORDER = ["chung", "hyeong", "pa", "hae", "self", "none", "banghap", "samhap", "hap"]


def score_for(rel, day_zhi, b):
    base = REL_INFO[rel][2]
    d_el, b_el = ZHI_EL[day_zhi], ZHI_EL[b]
    if d_el == b_el:
        pass
    elif SAENG[d_el] == b_el:      # 오늘 기운이 띠를 생함
        base += 0.25
    elif SAENG[b_el] == d_el:      # 띠가 오늘 기운을 생함
        base += 0.10
    elif GEUK[b_el] == d_el:       # 띠가 오늘 기운을 극함
        base += 0.15
    else:                          # 오늘 기운이 띠를 극함
        base -= 0.20
    return max(0.8, min(5.0, round(base, 1)))


def star_count(score):
    return max(1, min(5, int(score + 0.5)))


def stars(score):
    full = star_count(score)
    return "★" * full + "☆" * (5 - full)


# ============================================================
# 4. 문장 풀
# ============================================================
DAILY = {
    "hap": {
        "총운": [
            "오늘은 흐름이 나를 밀어주는 날입니다. 미뤄둔 일을 꺼내면 생각보다 쉽게 풀립니다.",
            "오늘 일진과 내 띠가 합을 이루었습니다. 사람을 만나고 말을 꺼내는 쪽으로 움직이면 결과가 좋습니다.",
            "막혀 있던 자리가 부드럽게 풀리는 날입니다. 먼저 손을 내미는 사람이 이깁니다.",
        ],
        "재물": [
            "돈이 도는 흐름이 좋습니다. 미뤄둔 정산·환불·청구를 오늘 처리하기 좋습니다.",
            "작게 넣은 것이 돌아옵니다. 다만 즉흥적인 큰 지출은 다음 날로 미루세요.",
        ],
        "일·직장": [
            "협업이 잘 맞습니다. 혼자 하던 일도 한 사람에게 말을 걸면 두 배로 빨라집니다.",
            "윗사람이나 거래처와의 접점에서 좋은 신호가 있습니다. 말 꺼내기 좋은 날입니다.",
        ],
        "관계": [
            "오해가 풀리기 좋은 날입니다. 먼저 연락해 보세요. 상대도 기다리고 있습니다.",
            "소개·약속 자리에서 인연이 붙습니다. 오늘 만난 사람은 오래 갑니다.",
        ],
        "건강": [
            "몸의 리듬이 안정적입니다. 무리하지만 않으면 컨디션이 좋습니다.",
            "잠들기 전 스트레칭 한 번이면 다음 날까지 개운합니다.",
        ],
    },
    "samhap": {
        "총운": [
            "뜻이 모이고 힘이 실리는 날입니다. 여럿이 같은 방향을 볼 때 일이 커집니다.",
            "내가 준 만큼 돌아오는 흐름입니다. 먼저 베푸는 쪽이 유리합니다.",
            "한 가지에 집중하면 성과가 남습니다. 여러 개를 벌이기보다 하나를 끝내세요.",
        ],
        "재물": [
            "재물의 흐름이 고르게 들어옵니다. 공동의 이익을 챙기면 더 커집니다.",
            "작은 부수입이 생기기 좋습니다. 다만 지인과의 금전 거래는 문서로 남기세요.",
        ],
        "일·직장": [
            "팀으로 움직일 때 성과가 납니다. 역할을 나누면 속도가 붙습니다.",
            "오래 미뤄둔 제안을 꺼내기 좋습니다. 반응이 생각보다 따뜻합니다.",
        ],
        "관계": [
            "같은 관심사로 만나는 자리가 좋습니다. 모임·스터디 쪽을 눈여겨보세요.",
            "가족·친구와의 약속은 그대로 지켜지기 좋은 날입니다.",
        ],
        "건강": [
            "기운이 고르게 돕니다. 가벼운 유산소로 흐름을 이어가세요.",
            "몸이 보내는 작은 신호를 그냥 넘기지 마세요. 하루면 회복됩니다.",
        ],
    },
    "banghap": {
        "총운": [
            "같은 방향의 기운이 모이는 날입니다. 큰 결정보다 준비와 정리에 어울립니다.",
            "내 편이 늘어나는 날입니다. 말하지 않아도 알아주는 사람에게 힘을 얻습니다.",
        ],
        "재물": [
            "큰 지출보다 모으는 쪽이 맞습니다. 자동이체와 적립을 점검해 보세요.",
            "고정비를 한 번 정리하면 다음 달이 편해집니다.",
        ],
        "일·직장": [
            "익숙한 일에서 성과가 납니다. 새 일을 벌이기보다 마무리에 힘을 쓰세요.",
            "같은 팀·같은 업종 사람과의 대화에서 실마리가 나옵니다.",
        ],
        "관계": [
            "오래된 인연이 다시 이어집니다. 연락이 온다면 반가운 쪽입니다.",
            "무리하게 새 사람을 만들기보다 지금 곁에 있는 사람에게 집중하세요.",
        ],
        "건강": [
            "몸이 편안한 쪽으로 기웁니다. 오늘은 회복에 쓰기 좋습니다.",
            "수면 시간을 조금 늘리면 기운이 확실히 올라옵니다.",
        ],
    },
    "none": {
        "총운": [
            "크게 밀지도 당기지도 않는 평온한 날입니다. 하던 일을 그대로 이어가면 됩니다.",
            "특별한 사건 없이 하루가 흘러갑니다. 이런 날에 기반을 다져두면 나중이 편합니다.",
            "기복이 적은 하루입니다. 무리한 승부보다 루틴을 지키는 쪽이 남는 장사입니다.",
        ],
        "재물": [
            "들어오고 나가는 돈이 비슷합니다. 영수증과 구독 결제만 한 번 확인해 보세요.",
            "충동구매만 피하면 재물의 흐름은 안정적입니다.",
        ],
        "일·직장": [
            "정해진 일을 처리하기 좋은 날입니다. 새 제안은 검토만 해두세요.",
            "집중력이 평소와 비슷합니다. 방해 요소만 미리 치워두면 능률이 오릅니다.",
        ],
        "관계": [
            "무난하게 흘러갑니다. 굳이 말을 꺼내지 않아도 되는 일은 그대로 두세요.",
            "짧은 안부 한 통이 관계를 유지합니다.",
        ],
        "건강": [
            "특별한 이상은 없습니다. 물을 조금 더 마시고 일찍 눕는 정도면 충분합니다.",
            "오래 앉아 있었다면 한 번 일어나 걸어주세요.",
        ],
    },
    "self": {
        "총운": [
            "내 기운이 그대로 겹치는 날입니다. 의욕은 넘치는데 방향을 못 잡으면 제자리입니다.",
            "생각이 많아지는 날입니다. 결론을 내리기보다 정리해 두는 편이 낫습니다.",
        ],
        "재물": [
            "내 판단이 강해지는 날입니다. 확신이 서지 않으면 결제 버튼은 내일 누르세요.",
            "고집이 지출로 이어지기 쉽습니다. 장바구니에만 담아두세요.",
        ],
        "일·직장": [
            "내 방식대로 밀고 나가기 좋지만, 한 번 더 확인하는 절차를 남기세요.",
            "혼자 처리하려다 시간이 새기 쉽습니다. 한 가지만 물어보세요.",
        ],
        "관계": [
            "말이 세게 나갈 수 있습니다. 한 박자 쉬고 말하면 오해가 줄어듭니다.",
            "상대의 속도를 존중하면 관계가 편해집니다.",
        ],
        "건강": [
            "기운이 과열되기 쉽습니다. 카페인과 밤늦은 화면을 줄이세요.",
            "어깨와 목이 굳기 쉽습니다. 한 번 크게 늘여주세요.",
        ],
    },
    "hae": {
        "총운": [
            "뒤에서 새는 기운이 있는 날입니다. 확인 한 번이 사고를 막습니다.",
            "겉으로는 괜찮아 보여도 안쪽에서 어긋나기 쉽습니다. 서두르지 마세요.",
        ],
        "재물": [
            "작은 누수가 생기기 쉽습니다. 구독과 자동결제를 한 번 점검하세요.",
            "지인과 돈이 오갈 일은 오늘 피하는 게 좋습니다. 빌려주면 잊히기 쉽습니다.",
        ],
        "일·직장": [
            "전달이 어긋나기 쉬운 날입니다. 구두로 한 일은 메시지로 남기세요.",
            "내 일이 아니라고 넘긴 부분에서 문제가 생깁니다. 한 번 더 확인하세요.",
        ],
        "관계": [
            "말이 다르게 전해지기 쉽습니다. 중요한 이야기는 얼굴 보고 하세요.",
            "오해를 사기 쉬운 날입니다. 짧게라도 해명해 두면 나중이 편합니다.",
        ],
        "건강": [
            "잔병이 올라오기 쉬운 날입니다. 찬 음식과 과음은 피하세요.",
            "피로가 쌓여 있으면 작은 증상으로 나타납니다. 일찍 쉬세요.",
        ],
    },
    "pa": {
        "총운": [
            "계획이 한 군데에서 어긋나기 쉬운 날입니다. 여유 시간을 미리 남겨두세요.",
            "중간에 방해가 들어오는 날입니다. 우선순위를 하나로 줄이면 버팁니다.",
        ],
        "재물": [
            "예상 밖의 지출이 생기기 쉽습니다. 작은 예비비를 남겨두세요.",
            "계약과 환불은 조항을 한 번 더 읽고 진행하세요.",
        ],
        "일·직장": [
            "일정이 밀리거나 취소될 수 있습니다. 대안을 하나 준비해 두세요.",
            "업무가 갈라지는 날입니다. 경계를 분명히 해두면 책임이 흐려지지 않습니다.",
        ],
        "관계": [
            "약속이 어긋나기 쉽습니다. 시간과 장소를 다시 확인하세요.",
            "사소한 말이 파열음이 됩니다. 농담은 오늘 참는 편이 좋습니다.",
        ],
        "건강": [
            "몸이 삐끗하기 쉬운 날입니다. 무리한 운동과 급한 이동을 줄이세요.",
            "소화가 더디니 늦은 야식은 피하세요.",
        ],
    },
    "hyeong": {
        "총운": [
            "스스로를 조이는 날입니다. 기준을 조금 낮추면 하루가 가벼워집니다.",
            "안에서 긴장이 도는 날입니다. 남의 일까지 떠안지 마세요.",
        ],
        "재물": [
            "벌금·수리비처럼 새는 돈이 생기기 쉬운 날입니다. 미리 점검하세요.",
            "비교하고 재는 마음이 지출을 부릅니다. 필요한 것부터 사세요.",
        ],
        "일·직장": [
            "규정과 절차에서 걸림이 생기기 쉽습니다. 서류를 한 번 더 보세요.",
            "감정이 앞서면 일이 꼬입니다. 사실만 적어 보내세요.",
        ],
        "관계": [
            "서운함이 쌓이기 쉬운 날입니다. 말로 꺼내야 풀립니다.",
            "가까운 사람에게 가장 예민해집니다. 한 번 숨을 고르세요.",
        ],
        "건강": [
            "긴장으로 어깨와 목이 굳기 쉽습니다. 따뜻하게 하고 풀어주세요.",
            "잠이 얕아질 수 있습니다. 자기 전 화면은 조금 일찍 끄세요.",
        ],
    },
    "chung": {
        "총운": [
            "정면으로 부딪히는 날입니다. 밀어붙이면 상처만 남으니 한발 물러서세요.",
            "변화의 기운이 강한 날입니다. 익숙한 것을 내려놓으면 새 길이 보입니다.",
            "예상과 다른 일이 생기기 쉬운 날입니다. 계획을 다시 짜면 오히려 기회가 됩니다.",
        ],
        "재물": [
            "큰 지출과 계약은 하루만 미루세요. 오늘 결정하면 되돌리기 어렵습니다.",
            "돈이 급하게 나갈 수 있습니다. 카드보다 현금으로 한도를 정해두세요.",
        ],
        "일·직장": [
            "마찰이 생기기 쉬운 날입니다. 문서로 남기고 결정은 내일로 넘기세요.",
            "일정이 뒤집힐 수 있습니다. 중요한 약속은 재확인하세요.",
        ],
        "관계": [
            "말 한마디로 크게 부딪히기 쉽습니다. 오늘은 듣는 쪽이 낫습니다.",
            "오래된 갈등이 드러날 수 있습니다. 감정이 아니라 사실로 이야기하세요.",
        ],
        "건강": [
            "사고와 부상에 주의하는 날입니다. 운전과 계단을 조심하세요.",
            "컨디션이 급격히 떨어질 수 있습니다. 무리한 일정은 줄이세요.",
        ],
    },
}

EL_REL_TEXT = {
    "same": ["오늘의 기운과 같은 결입니다. 내 색을 그대로 드러내기 좋은 날입니다.",
             "비슷한 기운끼리 만나 힘이 겹칩니다. 한 곳에만 쓰면 성과가 남습니다."],
    "gives": ["내 기운이 오늘의 흐름을 밀어주는 자리입니다. 남을 돕되 양을 조절하세요.",
              "베푸는 쪽에 서는 날입니다. 쓴 만큼 다음에 돌아옵니다."],
    "receives": ["오늘의 기운이 내 쪽으로 들어옵니다. 받는 것을 부담스러워하지 마세요.",
                 "도움을 받기 좋은 자리입니다. 먼저 손을 내밀면 응답이 옵니다."],
    "controls": ["내가 오늘의 흐름을 누르는 자리입니다. 강하게 나가면 반발이 옵니다.",
                 "주도권은 내게 있지만 힘 조절이 필요합니다. 한 번 양보하면 풀립니다."],
    "controlled": ["오늘의 기운이 나를 누릅니다. 속도를 줄이고 몸을 아끼세요.",
                   "버티는 쪽이 유리한 날입니다. 새 일을 벌이기보다 지키세요."],
}


def el_relation(day_el, my_el):
    if day_el == my_el:
        return "same"
    if SAENG[my_el] == day_el:
        return "gives"
    if SAENG[day_el] == my_el:
        return "receives"
    if GEUK[my_el] == day_el:
        return "controls"
    return "controlled"


# ---- 2027 띠별 연운 ----
YEAR_TEXT = {
    "hap": {
        "총운": "2027년은 내 띠와 해의 지지가 합을 이루는 해입니다. 바깥에서 들어오는 도움이 많은 한 해로, 사람을 통해 일이 풀리는 흐름이 뚜렷합니다. 혼자 밀어붙이기보다 함께하는 쪽으로 방향을 잡으면 같은 노력으로 더 큰 결과가 남습니다. 다만 합은 편안함이기도 해서, 안이해지면 흐름을 놓칩니다. 한 해의 목표를 하나만 정해 두고 그것만은 미루지 마세요.",
        "재물운": "재물은 사람을 따라옵니다. 소개·중개·협업에서 수입이 생기고, 오래 거래한 곳에서 조건이 좋아지는 일이 있습니다. 반대로 편안한 기분에 지출이 늘기 쉬우니, 큰 결제는 하루 재우고 결정하세요. 상반기에 들어온 돈을 하반기에 지키는 것이 이 해의 과제입니다.",
        "직장·사업운": "함께하는 일에서 성과가 납니다. 팀·파트너와의 역할 분담이 분명하면 일이 두 배로 커지고, 반대로 말하지 않은 기대가 쌓이면 합이 오히려 부담이 됩니다. 새 제안은 받아들이되 조건은 문서로 남기세요. 이직·확장은 봄(2~4월)과 늦가을(10~11월)에 문의가 들어오기 좋습니다.",
        "건강운": "전반적으로 안정적이지만 살이 붙기 쉬운 해입니다. 편안함이 몸에 쌓이지 않도록 주 2~3회 짧게라도 움직이세요. 혈당·체중처럼 천천히 오는 지표를 1월과 7월에 한 번씩 확인해 두면 좋습니다.",
        "관계": "인연이 넓어지는 해입니다. 소개로 만난 사람이 오래 가고, 오래된 인연과 다시 이어지는 일도 생깁니다. 다만 모두와 좋게 지내려다 정작 중요한 사람을 놓치지 마세요. 한 사람에게 시간을 몰아주는 편이 낫습니다.",
    },
    "samhap": {
        "총운": "2027년은 내 띠가 해의 지지와 삼합을 이루는 해입니다. 세 개의 지지가 힘을 모으는 자리라, 준비해 둔 것이 결실로 바뀌는 흐름이 강합니다. 특히 미뤄둔 공부·자격·프로젝트를 끝내기에 좋은 해입니다. 다만 삼합은 '모임'의 기운이라 여럿이 엮이면서 일이 커지므로, 내 몫의 경계를 정해 두는 것이 중요합니다.",
        "재물운": "들어오는 길이 여러 개로 늘어나는 해입니다. 부수입·공동 수익·장기 적립이 눈에 띄게 자라고, 3~5월과 9~10월에 자금 흐름이 좋습니다. 다만 여럿이 함께하는 돈은 셈이 흐려지기 쉬우니 지분과 정산 기준을 처음에 정하세요.",
        "직장·사업운": "팀을 키우거나 조직 안에서 자리를 넓히기 좋은 해입니다. 내가 하던 일을 나눠 맡기면 성과가 커지고, 혼자 다 하려 하면 속도가 죽습니다. 새 사업은 봄에 씨앗을 뿌려 가을에 거두는 흐름으로 잡으세요.",
        "건강운": "기운이 고르게 도는 해입니다. 다만 모임이 늘면 술자리와 야식도 함께 늘어납니다. 간 수치와 수면 시간을 3월·9월에 확인하고, 운동은 여럿이 하는 쪽이 오래갑니다.",
        "관계": "사람을 통해 판이 커지는 해입니다. 같은 목표를 가진 사람과의 만남이 특히 좋고, 그 안에서 인연이 깊어집니다. 약속을 가볍게 잡으면 신뢰를 잃으니, 지킬 수 있는 만큼만 잡으세요.",
    },
    "banghap": {
        "총운": "2027년은 내 띠가 해의 지지와 같은 방향(방합)에 서는 해입니다. 힘은 모이는데 조건은 크게 바뀌지 않아, 밖으로 넓히기보다 안을 단단히 하는 쪽이 맞습니다. 익숙한 자리에서 인정받고 기반을 다지기 좋으며, 큰 변화를 서두르면 오히려 흐름을 놓칩니다.",
        "재물운": "모으는 해입니다. 큰 수익보다 새는 돈을 막는 쪽에서 성과가 나고, 고정비 정리와 만기·금리 점검이 실제 이익으로 이어집니다. 4월과 10월에 지출 구조를 한 번 손보세요.",
        "직장·사업운": "현재 자리에서 실력을 쌓기 좋은 해입니다. 눈에 띄는 승진보다 신뢰가 쌓이는 쪽으로 결과가 남고, 그 신뢰가 다음 해의 기회로 이어집니다. 이직을 생각한다면 조건보다 사람을 보세요.",
        "건강운": "큰 탈 없이 지나가되, 움직임이 줄어드는 해입니다. 같은 자세로 오래 앉는 일이 많다면 허리와 목을 따로 챙기세요. 5월과 11월에 한 번씩 몸 상태를 점검하면 좋습니다.",
        "관계": "가까운 사람과의 관계가 정리되는 해입니다. 넓히기보다 깊게 가는 쪽이 맞고, 오래된 인연이 내 편이 되어 줍니다. 새로운 모임에 무리해서 끼지 않아도 충분합니다.",
    },
    "none": {
        "총운": "2027년은 내 띠와 해의 지지가 특별히 얽히지 않는 해입니다. 큰 파도가 없는 대신 내가 정한 만큼만 흘러갑니다. 그래서 이 해는 '무슨 일이 생기느냐'보다 '무엇을 정해 두느냐'가 결과를 가릅니다. 목표를 스스로 정하고 루틴으로 밀고 나가면 조용히 자산이 쌓입니다.",
        "재물운": "무난하게 흐르는 해입니다. 크게 벌기보다 새지 않게 관리하는 쪽이 맞고, 자동이체·구독·보험을 정리하면 체감이 큽니다. 충동적인 큰 투자는 피하고, 적립식으로 꾸준히 넣는 편이 안전합니다.",
        "직장·사업운": "스스로 만든 과제에서 성과가 나는 해입니다. 시키는 일만 하면 심심하게 지나가지만, 하나를 골라 끝까지 밀면 다음 해에 자리가 달라집니다. 하반기(8~10월)에 기회가 한 번 들어옵니다.",
        "건강운": "기복이 적은 해입니다. 대신 몸을 쓰지 않으면 그대로 굳습니다. 걷기처럼 부담 없는 운동을 습관으로 붙이면 1년 뒤 차이가 큽니다. 6월과 12월에 치과·눈 검진을 권합니다.",
        "관계": "새 인연보다 기존 관계가 중심이 되는 해입니다. 연락이 뜸했던 사람에게 먼저 인사하면 관계가 다시 살아납니다. 감정 소모가 큰 모임은 줄여도 손해가 없습니다.",
    },
    "self": {
        "총운": "2027년은 내 띠가 해의 지지와 같은 자리에 서는 해(본명년)입니다. 기운이 두 배로 커지는 만큼 고집도 두 배가 되어, 밀어붙이면 사람이 떠나고 눌러두면 속이 상합니다. 한 해의 주제는 '조절'입니다. 큰 결정은 서두르지 말고, 몸과 마음을 함께 쉬게 하세요.",
        "재물운": "들고나는 폭이 커지는 해입니다. 벌 기회도 늘지만 그만큼 쓰는 힘도 세져, 계획 없이 두면 남는 것이 없습니다. 1월에 한 해 예산을 정하고, 큰 지출은 반드시 하루 재운 뒤 결정하세요.",
        "직장·사업운": "내 뜻대로 밀고 나가고 싶은 해입니다. 다만 혼자 결정한 일은 뒤탈도 혼자 지게 됩니다. 중요한 선택 앞에서는 반드시 한 사람에게 검토를 받으세요. 승부는 5~7월에 걸립니다.",
        "건강운": "과열되기 쉬운 해입니다. 일이 잘 풀릴수록 잠을 줄이게 되니, 수면만은 양보하지 마세요. 혈압·심장 쪽은 40대 이후라면 한 번 확인해 두는 편이 좋습니다.",
        "관계": "가까운 사람과 부딪히기 쉬운 해입니다. 내 기준이 세지는 만큼 상대의 속도가 느려 보입니다. 말하기 전에 한 박자 쉬는 습관 하나가 이 해의 관계를 지켜 줍니다.",
    },
    "hae": {
        "총운": "2027년은 내 띠와 해의 지지가 해(害)의 자리에 놓이는 해입니다. 겉으로는 조용한데 안쪽에서 새는 일이 생기기 쉽습니다. 큰 사고보다 작은 어긋남이 쌓여 피로가 되는 흐름이라, 확인과 정리가 이 해의 무기입니다. 서두르지 않고 두 번 확인하는 사람이 결국 이깁니다.",
        "재물운": "새는 돈을 막는 것이 핵심인 해입니다. 구독·자동결제·보증금처럼 매달 조용히 나가는 돈을 1월과 7월에 정리하세요. 지인과의 금전 거래, 보증, 공동 명의는 이 해에 특히 피하는 편이 좋습니다.",
        "직장·사업운": "전달과 확인에서 실수가 생기기 쉽습니다. 구두로 정한 일은 메시지로 남기고, 인수인계는 문서로 하세요. 이직이나 계약은 조건을 세 번 읽고 진행하면 오히려 좋은 결과가 납니다.",
        "건강운": "잔병이 잦아지는 해입니다. 큰 병보다 피로·소화·수면의 어긋남이 쌓입니다. 정해진 시간에 자는 것만으로도 절반은 해결됩니다. 3월과 9월에 기본 검진을 받아 두세요.",
        "관계": "말이 다르게 전해지기 쉬운 해입니다. 오해를 쌓아두면 관계가 조용히 멀어집니다. 짧게라도 확인하는 습관이 관계를 지키고, 특히 가족과의 대화에서 한 번 더 물어보세요.",
    },
    "pa": {
        "총운": "2027년은 내 띠와 해의 지지가 파(破)에 닿는 해입니다. 계획이 중간에 어긋나는 일이 생기기 쉬워, 여유를 남겨두는 사람이 편하게 지나갑니다. 일이 깨지는 것이 아니라 '다시 짜야 하는' 정도로 받아들이면 오히려 방향을 고칠 기회가 됩니다.",
        "재물운": "예상 밖의 지출이 생기기 쉬운 해입니다. 예비비를 따로 두고, 계약·환불·수리비 조항을 꼼꼼히 보세요. 큰 투자는 시기를 나눠 넣고, 한 번에 거는 일은 피하는 편이 안전합니다.",
        "직장·사업운": "일정이 밀리거나 취소되는 일이 생깁니다. 대안을 하나씩 준비해 두면 흔들리지 않습니다. 업무 경계를 분명히 해두세요. 남의 일까지 떠안으면 책임만 남습니다.",
        "건강운": "몸이 삐끗하기 쉬운 해입니다. 무리한 운동보다 자세와 스트레칭이 중요하고, 급한 이동이나 계단에서 특히 조심하세요. 4월과 10월에 관절·허리를 점검하면 좋습니다.",
        "관계": "약속이 어긋나고 사소한 말이 커지기 쉬운 해입니다. 중요한 약속은 하루 전에 확인하고, 농담은 상대를 확인하고 던지세요. 관계를 크게 바꾸기보다 유지하는 쪽이 이 해에 맞습니다.",
    },
    "hyeong": {
        "총운": "2027년은 내 띠가 해의 지지와 형(刑)의 자리에 놓이는 해입니다. 스스로를 조이고 남과 비교하는 마음이 커져, 잘 풀려도 만족이 늦게 옵니다. 기준을 조금 낮추고 절차를 지키면 오히려 단단해지는 해입니다. 규정과 서류를 가볍게 보지 마세요.",
        "재물운": "벌금·수리비·세금처럼 새는 돈이 생기기 쉬운 해입니다. 계약서와 약관을 꼼꼼히 읽고, 공과금·보험을 미리 정리하면 손실을 줄일 수 있습니다. 남과 비교해 질러 쓰는 지출이 가장 위험합니다.",
        "직장·사업운": "절차와 규정에서 걸림이 생기기 쉽습니다. 서류를 한 번 더 확인하고, 감정이 앞설 때는 사실만 적어 보내세요. 실력을 인정받는 시기는 늦가을이며, 그때까지 버티는 것이 관건입니다.",
        "건강운": "긴장이 몸에 쌓이는 해입니다. 어깨·목·턱이 굳고 잠이 얕아지기 쉬우니, 잠들기 전 화면을 줄이고 온찜질을 더하세요. 5월과 11월에 스트레칭 습관을 점검해 보세요.",
        "관계": "가까운 사람에게 가장 예민해지는 해입니다. 서운함을 쌓아두면 한 번에 터집니다. 작을 때 말로 꺼내는 연습이 관계를 지킵니다. 비교하지 않는 것이 이 해의 예절입니다.",
    },
    "chung": {
        "총운": "2027년은 내 띠와 해의 지지가 정면으로 부딪히는 충(沖)의 해입니다. 변화가 강하게 들어오는 해로, 이사·이직·이별처럼 삶의 틀이 바뀌는 일이 생기기 쉽습니다. 충은 나쁜 것이 아니라 '바뀌는 힘'입니다. 밀어붙이지 않고 흐름을 타면 오히려 새 자리를 얻습니다.",
        "재물운": "돈의 출입이 커지는 해입니다. 큰 계약은 시기를 나누고, 결정 전에 하루를 두세요. 이사·차량·수리처럼 큰 지출이 겹치기 쉬우니 상반기에 예비비를 확보해 두면 마음이 편합니다.",
        "직장·사업운": "일의 틀이 바뀌는 해입니다. 이직·부서 이동·사업 전환의 문이 열리지만, 감정적으로 던지는 결정은 피하세요. 3~4월과 9~10월에 변화의 신호가 오고, 조건을 문서로 확인하면 좋은 쪽으로 갑니다.",
        "건강운": "사고와 급성 통증에 주의하는 해입니다. 운전·계단·운동 전 스트레칭을 습관으로 만들고, 컨디션이 급격히 떨어지는 날은 일정을 비우세요. 1월과 7월에 기본 검진을 받아 두면 안심이 됩니다.",
        "관계": "부딪힘이 드러나는 해입니다. 오래 참은 것이 터지거나, 반대로 관계가 정리되기도 합니다. 감정이 아니라 사실로 이야기하면 대부분 풀립니다. 이 해에 끝난 인연은 미련을 두지 않는 편이 낫습니다.",
    },
}

MONTH_REL_TEXT = {
    "hap": "{m}월({b}월)은 띠와 합을 이루는 달입니다. 사람을 통한 일이 풀리고 소개·계약에 좋습니다.",
    "samhap": "{m}월({b}월)은 띠와 삼합을 이루는 달입니다. 준비한 일이 결실로 바뀌고 힘이 실립니다.",
    "banghap": "{m}월({b}월)은 같은 방향의 기운이 모이는 달입니다. 익숙한 일을 마무리하기 좋습니다.",
    "none": "{m}월({b}월)은 특별히 얽히지 않는 달입니다. 내가 정한 루틴이 그대로 결과가 됩니다.",
    "self": "{m}월({b}월)은 내 기운이 겹치는 달입니다. 의욕이 앞서니 확인 절차를 남기세요.",
    "hae": "{m}월({b}월)은 안쪽에서 새는 기운이 있는 달입니다. 구두 약속은 문서로 남기세요.",
    "pa": "{m}월({b}월)은 계획이 어긋나기 쉬운 달입니다. 일정에 여유를 두고 대안을 준비하세요.",
    "hyeong": "{m}월({b}월)은 절차와 규정에서 걸리는 달입니다. 서류와 약관을 한 번 더 보세요.",
    "chung": "{m}월({b}월)은 변화가 강하게 들어오는 달입니다. 큰 결정은 서두르지 말고 조건을 확인하세요.",
}

MONTH_BRANCH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]  # 1월 축 … 12월 자

ZODIAC_EXTRA = {
    "chung": "오늘의 일진과 정반대 자리에 서는 날이라, 힘은 세지만 방향이 엇갈리기 쉽습니다.",
    "hyeong": "같은 그릇 안에서 부딪히는 형(刑)의 자리라, 안에서 긴장이 돌기 쉽습니다.",
    "pa": "맞물린 것이 어긋나는 파(破)의 자리라, 계획이 한 군데에서 틀어지기 쉽습니다.",
    "hae": "겉과 속이 어긋나는 해(害)의 자리라, 확인하지 않은 부분에서 새기 쉽습니다.",
    "self": "오늘 일진과 같은 지지가 겹치는 날이라, 내 기운이 그대로 커집니다.",
    "hap": "오늘 일진과 합을 이루는 자리라, 사람과 일이 서로를 밀어줍니다.",
    "samhap": "세 지지가 힘을 모으는 삼합의 자리라, 함께할 때 성과가 커집니다.",
    "banghap": "같은 방향의 기운이 모이는 방합의 자리라, 익숙한 흐름이 힘을 보탭니다.",
    "none": "오늘 일진과 특별히 얽히지 않아, 내 페이스대로 가면 됩니다.",
}

ADVICE = {
    "chung": "중요한 결정과 큰 지출은 내일로 미루고, 오늘은 정리와 확인에 쓰세요.",
    "hyeong": "기준을 조금 낮추고, 남의 일까지 떠안지 마세요.",
    "pa": "일정에 여유를 두고, 약속은 하루 전에 다시 확인하세요.",
    "hae": "구두로 한 일은 메시지로 남기고, 모르는 돈은 건드리지 마세요.",
    "self": "결론을 서두르지 말고, 한 번 더 물어보세요.",
    "hap": "먼저 연락하고 먼저 말을 꺼내세요. 오늘은 그쪽이 이깁니다.",
    "samhap": "혼자 하지 말고 한 사람에게 나눠 맡기세요.",
    "banghap": "새로 벌이기보다 지금 하는 일을 끝내는 데 힘을 쓰세요.",
    "none": "평소 하던 루틴을 그대로 지키면 충분한 하루입니다.",
}


def pick(items, *seed):
    if not items:
        return ""
    h = 0
    for s in seed:
        for ch in str(s):
            h = (h * 31 + ord(ch)) % 1000003
    return items[h % len(items)]


# ============================================================
# 5. 날짜 정보 묶음
# ============================================================
class Day:
    def __init__(self, date):
        self.date = date
        self.y, self.m, self.d = date.year, date.month, date.day
        self.idx = day_index(self.y, self.m, self.d)
        self.gi = self.idx % 10
        self.zi = self.idx % 12
        self.gan, self.zhi = GAN[self.gi], ZHI[self.zi]
        self.gan_ko, self.zhi_ko = GAN_KO[self.gi], ZHI_KO[self.zi]
        self.gzi = self.gan + self.zhi
        self.gzi_ko = self.gan_ko + self.zhi_ko
        self.wd = WEEKDAY[date.weekday()]
        self.ly, self.lm, self.ld, self.leap = solar_to_lunar(self.y, self.m, self.d)
        self.naeum = NAEUM[self.idx // 2]
        self.y_gi, self.y_zi, self.m_stem, self.m_branch, self.jie = month_pillar(self.y, self.m, self.d)
        self.term = solar_term_on(self.y, self.m, self.d)
        self.iso = date.strftime("%Y-%m-%d")

    @property
    def url(self):
        return BASE_URL + "/guide/today/" + self.iso + ".html"

    @property
    def title_date(self):
        return "%d년 %d월 %d일" % (self.y, self.m, self.d)

    @property
    def short_date(self):
        return "%d월 %d일" % (self.m, self.d)

    @property
    def lunar_text(self):
        return "%d월 %d일" % (self.lm, self.ld) + ("(윤달)" if self.leap else "")

    @property
    def y_gzi(self):
        return GAN[self.y_gi] + ZHI[self.y_zi]

    @property
    def m_gzi(self):
        return GAN[self.m_stem] + ZHI[self.m_branch]

    @property
    def next_jie_text(self):
        t = next_jie(self.date)
        if not t:
            return "다음 절입 정보 없음"
        name, when = t
        return "%s(%s) %d월 %d일 %02d시 %02d분" % (name, JIE_HANJA[name], when.month, when.day, when.hour, when.minute)


# ============================================================
# 6. HTML 틀
# ============================================================
GA = "G-PH787Y6BNH"
ADS = "ca-pub-3479064308586347"

HEAD = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="달빛 한 스푼">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="ko_KR">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="google-adsense-account" content="ca-pub-3479064308586347">
<link rel="stylesheet" href="/guide/assets/guide.css">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-PH787Y6BNH"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}
gtag("js",new Date());gtag("config","G-PH787Y6BNH",{{"anonymize_ip":true}});
</script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3479064308586347" crossorigin="anonymous"></script>
{jsonld}
</head>
<body>
<div class="sky" aria-hidden="true"></div>
<div class="wrap">
<header class="ghead">
  <a class="brand" href="https://saju.gold-queen.com/"><span class="moon" aria-hidden="true">🌙</span>달빛 한 스푼</a>
  <nav class="gnav" aria-label="가이드 메뉴">
    <a href="/guide/">운세 가이드</a>
    <a href="/guide/today/">날짜별 오늘의 운세</a>
    <a href="/guide/2027-unse/">2027 띠별 운세</a>
  </nav>
</header>
{crumb}
"""

FOOT = """<div class="adsense-bottom"></div>
<footer>
  <p>재미로 보는 운세 콘텐츠입니다. 중요한 결정은 본인의 판단과 전문가의 조언을 함께 믿어주세요.</p>
  <p><a href="https://saju.gold-queen.com/">달빛 한 스푼 앱</a> · <a href="/guide/">운세 가이드</a> · <a href="/guide/today/">날짜별 오늘의 운세</a> · <a href="/guide/2027-unse/">2027 띠별 운세</a> · <a href="https://link.gold-queen.com/">골드퀸 허브</a> · <a href="/privacy.html">개인정보처리방침</a></p>
  <p style="opacity:.7">© 달빛 한 스푼 · 일진·음력은 만세력(한국표준시 자정 기준)으로 계산합니다.</p>
</footer>
</div>
</body>
</html>
"""

CTABLOCK = """<div class="cta">
  <a class="main" href="https://saju.gold-queen.com/#saju"><span>{m}</span><span class="go">바로가기 ›</span></a>
  <a class="sub" href="https://saju.gold-queen.com/#tojeong"><span>{s}</span><span class="go">›</span></a>
</div>"""


def crumb_html(items):
    out = ['<nav class="crumb" aria-label="위치">']
    parts = []
    for i, (label, href) in enumerate(items):
        if href:
            parts.append('<a href="%s">%s</a>' % (href, label))
        else:
            parts.append(label)
    out.append('<span>›</span>'.join(parts).replace("<span>›</span>", "<span>›</span>"))
    out.append("</nav>")
    return "".join(out)


def breadcrumb_ld(items):
    els = []
    for i, (label, href) in enumerate(items):
        e = {"@type": "ListItem", "position": i + 1, "name": label}
        if href:
            e["item"] = href
        els.append(e)
    return {"@type": "BreadcrumbList", "itemListElement": els}


def write(rel_path, html):
    p = ROOT / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(html, encoding="utf-8")
    return p


def ld_json(obj):
    import json
    return ('<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "</script>")


# ============================================================
# 7. 날짜별 페이지
# ============================================================
def daily_paragraph(day):
    g_el = GAN_EL[day.gi]
    z_el = ZHI_EL[day.zi]
    rel = el_relation(z_el, g_el)   # 지지가 천간을 어떻게 보는가
    if g_el == z_el:
        flow = "천간과 지지의 오행이 같아 한 가지 기운이 하루를 꽉 채우는 날입니다. 한 우물을 파기 좋고, 반대로 고집이 세지기 쉽습니다."
    elif SAENG[z_el] == g_el:
        flow = "지지의 %s 기운이 천간의 %s 기운을 받쳐주는 흐름입니다. 뒤에서 밀어주는 힘이 있어 일이 매끄럽게 풀리기 쉽습니다." % (EL_NAME[z_el], EL_NAME[g_el])
    elif SAENG[g_el] == z_el:
        flow = "천간의 %s 기운이 지지의 %s 기운으로 뻗어 나가는 흐름입니다. 시작과 표현에 힘이 실리지만, 기운을 밖으로 쏟아내니 마무리도 함께 챙기세요." % (EL_NAME[g_el], EL_NAME[z_el])
    elif GEUK[g_el] == z_el:
        flow = "천간의 %s 기운이 지지의 %s 기운을 누르는 흐름입니다. 밀어붙이는 힘이 세니, 상대의 속도를 한 번 확인하고 움직이세요." % (EL_NAME[g_el], EL_NAME[z_el])
    else:
        flow = "지지의 %s 기운이 천간의 %s 기운을 누르는 흐름입니다. 환경이 나를 조이는 느낌이 들 수 있으니, 욕심을 조금 내려놓으면 편해집니다." % (EL_NAME[z_el], EL_NAME[g_el])

    g_desc = {
        0: "곧게 뻗는 새싹처럼 시작을 여는 기운", 1: "덩굴처럼 유연하게 자리를 찾는 기운",
        2: "해처럼 환하게 드러내는 기운", 3: "촛불처럼 한곳을 비추는 기운",
        4: "산처럼 넓게 받쳐주는 기운", 5: "밭처럼 가꾸고 품는 기운",
        6: "칼처럼 결단하고 끊는 기운", 7: "보석처럼 다듬어 빛내는 기운",
        8: "큰물처럼 넓게 흐르는 기운", 9: "이슬비처럼 스며드는 기운",
    }[day.gi]
    z_desc = {
        0: "밤의 물이 가장 짙은 자리", 1: "겨울 흙이 얼어 창고가 되는 자리",
        2: "봄의 문이 열리는 자리", 3: "새벽이 밝아오는 자리",
        4: "안개 낀 땅, 변화가 모이는 자리", 5: "여름의 열기가 올라오는 자리",
        6: "해가 가장 높은 정오", 7: "오후의 마른 흙, 여름의 끝",
        8: "가을의 문이 열리는 자리", 9: "해가 지고 결실을 세는 자리",
        10: "해질녘 흙, 지키고 닫는 자리", 11: "밤이 깊어 물이 넘치는 자리",
    }[day.zi]
    return ("%s일은 60갑자 %d번째에 해당합니다. 천간 %s(%s)은 %s이고, 지지 %s(%s)은 %s입니다. %s %s"
            % (day.gzi, day.idx + 1, day.gan, day.gan_ko, g_desc, day.zhi, day.zhi_ko, z_desc, flow,
               "오늘은 %s일이라 %s띠와 정반대(충) 자리에 놓입니다." % (day.zhi_ko, ZHI_ANIMAL[(day.zi + 6) % 12])))


def build_daily_page(day, prev_day, next_day):
    url = day.url
    title = "%s 오늘의 운세 — %s일(%s日) 12띠별 총운·재물·건강 | 달빛 한 스푼" % (day.title_date, day.gzi_ko, day.gzi)
    desc = ("%s(%s) 음력 %s, 일진은 %s(%s)일입니다. 쥐·소·호랑이부터 돼지까지 12띠별 오늘의 총운·재물·일·관계·건강과 "
            "오행별 흐름, 개운 포인트를 한 페이지에 정리했습니다. 오늘의 일진과 내 띠의 관계로 읽는 하루 운세입니다."
            % (day.title_date, day.wd, day.lunar_text, day.gzi_ko, day.gzi))

    crumbs = [("달빛 한 스푼", "https://saju.gold-queen.com/"), ("운세 가이드", "/guide/"),
              ("날짜별 오늘의 운세", "/guide/today/"), ("%s" % day.short_date, None)]

    # --- 12띠 블록 ---
    blocks = []
    rows = []
    order = sorted(range(12), key=lambda b: -score_for(relation(day.zi, b), day.zi, b))
    for b in range(12):
        rel = relation(day.zi, b)
        info = REL_INFO[rel]
        sc = score_for(rel, day.zi, b)
        good = info[3]
        rel_name = info[0]
        pool = DAILY[rel]
        total = pick(pool["총운"], day.iso, b, "t")
        money = pick(pool["재물"], day.iso, b, "m")
        work = pick(pool["일·직장"], day.iso, b, "w")
        love = pick(pool["관계"], day.iso, b, "r")
        health = pick(pool["건강"], day.iso, b, "h")
        d_el, b_el = ZHI_EL[day.zi], ZHI_EL[b]
        if d_el == b_el:
            elem_note = "오늘의 %s 기운과 %s띠의 %s 기운이 같아 힘이 겹칩니다." % (EL_NAME[d_el], ZHI_ANIMAL[b], EL_NAME[b_el])
        elif SAENG[d_el] == b_el:
            elem_note = "오늘 %s 기운이 %s띠의 %s 기운을 생해 줍니다." % (EL_NAME[d_el], ZHI_ANIMAL[b], EL_NAME[b_el])
        elif SAENG[b_el] == d_el:
            elem_note = "오늘 %s 기운이 %s띠의 %s 기운에게서 힘을 받습니다." % (EL_NAME[d_el], ZHI_ANIMAL[b], EL_NAME[b_el])
        elif GEUK[d_el] == b_el:
            elem_note = "오늘 %s 기운이 %s띠의 %s 기운을 누릅니다." % (EL_NAME[d_el], ZHI_ANIMAL[b], EL_NAME[b_el])
        else:
            elem_note = "오늘 %s 기운이 %s띠의 %s 기운에게 눌립니다." % (EL_NAME[d_el], ZHI_ANIMAL[b], EL_NAME[b_el])
        lucky = "%s · %s 방위 · 숫자 %d" % (EL_COLOR[EL_NAME[ZHI_EL[day.zi]]], EL_DIR[EL_NAME[ZHI_EL[day.zi]]], (day.idx + b) % 10)
        rows.append((b, rel_name, sc, good))
        blocks.append("""<article class="zod {cls}" id="{slug}">
  <div class="zod-h"><span class="emo" aria-hidden="true">{emo}</span><b>{animal}띠</b>
    <span class="rel">{rel}</span><span class="stars" aria-label="오늘의 기운 {sc}점">{stars}</span></div>
  <p class="zod-pair">오늘 일진 {dzhi}({dzhi_h}) ↔ {animal} 지지 {zhi}({zhi_h}) · {info}<br>{elem}</p>
  <ul class="lines">
    <li><b>총운</b>{total}</li>
    <li><b>재물</b>{money}</li>
    <li><b>일·직장</b>{work}</li>
    <li><b>관계</b>{love}</li>
    <li><b>건강</b>{health}</li>
  </ul>
  <p class="adv"><b>한 줄 조언</b>{advice} 행운 포인트는 {lucky}입니다.</p>
</article>""".format(cls=good, slug=ZHI_SLUG[b], emo=ZHI_EMOJI[b], animal=ZHI_ANIMAL[b], rel=rel_name,
                    sc=sc, stars=stars(sc), zhi=ZHI[b], zhi_h=ZHI_KO[b],
                    dzhi=day.zhi, dzhi_h=day.zhi_ko, info="%s(%s)" % (REL_INFO[rel][1], rel_name) + " — " + ZODIAC_EXTRA[rel],
                    elem=elem_note, total=total, money=money, work=work, love=love, health=health,
                    advice=ADVICE[rel], lucky=lucky))

    # --- 한눈에 보는 표 ---
    tbl_rows = []
    for b, rel_name, sc, good in rows:
        tbl_rows.append('<tr><td class="d"><a href="#%s">%s %s띠</a></td><td>%s</td><td class="d">%s</td></tr>'
                        % (ZHI_SLUG[b], ZHI_EMOJI[b], ZHI_ANIMAL[b], rel_name, stars(sc)))

    # --- 오행별 ---
    el_blocks = []
    for e in range(5):
        rel = el_relation(GAN_EL[day.gi], e)
        txt = pick(EL_REL_TEXT[rel], day.iso, EL_NAME[e])
        el_blocks.append('<article class="card"><h3>%s(%s) 기운</h3><p>%s</p></article>'
                         % (EL_NAME[e], EL_HANJA[e], txt))

    # --- FAQ ---
    top_b = order[0]
    top_rel = REL_INFO[relation(day.zi, top_b)][0]
    low_b = order[-1]
    low_rel = REL_INFO[relation(day.zi, low_b)][0]
    faqs = [
        ("%s 일진(간지)은 무엇인가요?" % day.title_date,
         "%s은 60갑자 %d번째인 %s(%s)일입니다. 천간 %s(%s)은 %s, 지지 %s(%s)은 %s이고, 납음오행은 %s(%s)입니다. 음력으로는 %s입니다."
         % (day.title_date, day.idx + 1, day.gzi, day.gzi_ko, day.gan, day.gan_ko, EL_NAME[GAN_EL[day.gi]],
            day.zhi, day.zhi_ko, EL_NAME[ZHI_EL[day.zi]], day.naeum[0], day.naeum[1], day.lunar_text)),
        ("%s에 운이 가장 좋은 띠는 무엇인가요?" % day.title_date,
         "오늘 일진 %s일과의 합·충 관계로 보면 %s띠가 %s 관계로 가장 순조롭습니다. 반대로 %s띠는 %s 관계라 확인과 여유가 필요합니다. 다만 이는 띠 하나만 본 재미용 해석이고, 실제 운은 태어난 날의 일간과 전체 사주에 따라 달라집니다."
         % (day.gzi, ZHI_ANIMAL[top_b], top_rel, ZHI_ANIMAL[low_b], low_rel)),
        ("띠별 운세는 무엇을 기준으로 계산하나요?",
         "만세력의 60갑자 일진과 12지지의 합(六合)·삼합(三合)·방합(方合)·충(沖)·형(刑)·파(破)·해(害) 관계, 그리고 오행의 생극을 기준으로 계산합니다. 일진이 바뀌면 12띠의 관계도 함께 바뀌므로 날짜마다 결과가 달라집니다."),
    ]
    faq_html = "".join('<details class="card"><summary><b>%s</b></summary><p>%s</p></details>' % (q, a) for q, a in faqs)
    faq_ld = {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]}

    article_ld = {
        "@type": "Article",
        "@id": url + "#article",
        "headline": "%s 오늘의 운세 · %s일 12띠별 총운" % (day.title_date, day.gzi_ko),
        "description": desc,
        "inLanguage": "ko",
        "datePublished": BUILD_DATE.isoformat() + "T06:00:00+09:00",
        "dateModified": BUILD_DATE.isoformat() + "T06:00:00+09:00",
        "author": {"@type": "Organization", "name": "골드퀸", "url": "https://link.gold-queen.com/"},
        "publisher": {"@type": "Organization", "name": "골드퀸", "url": "https://link.gold-queen.com/"},
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "isPartOf": {"@type": "WebSite", "name": "달빛 한 스푼", "url": "https://saju.gold-queen.com/"},
        "about": {"@type": "Thing", "name": "%s 일진 %s" % (day.title_date, day.gzi)},
    }
    jsonld = ld_json({"@context": "https://schema.org", "@graph": [
        article_ld,
        breadcrumb_ld([("달빛 한 스푼", "https://saju.gold-queen.com/"), ("운세 가이드", BASE_URL + "/guide/"),
                       ("날짜별 오늘의 운세", BASE_URL + "/guide/today/"), (day.title_date, url)]),
        faq_ld,
    ]})

    term_line = ""
    if day.term:
        term_line = '<p class="small muted">이날은 절기 <b>%s</b>가 들어오는 날입니다(한국표준시 %s). 절입 시각을 기준으로 월건이 %s월로 바뀝니다.</p>' % (day.term[0], day.term[1], ZHI_KO[day.m_branch])

    pager = []
    if prev_day:
        pager.append('<a href="/guide/today/%s.html"><span class="k">← 이전 날</span><span class="v">%s %s일</span></a>'
                     % (prev_day.iso, prev_day.short_date, prev_day.gzi_ko))
    pager.append('<a href="/guide/today/"><span class="k">목록</span><span class="v">날짜별 오늘의 운세 전체</span></a>')
    if next_day:
        pager.append('<a href="/guide/today/%s.html"><span class="k">다음 날 →</span><span class="v">%s %s일</span></a>'
                     % (next_day.iso, next_day.short_date, next_day.gzi_ko))

    body = """<nav class="crumb" aria-label="위치"><a href="https://saju.gold-queen.com/">달빛 한 스푼</a><span>›</span><a href="/guide/">운세 가이드</a><span>›</span><a href="/guide/today/">날짜별 오늘의 운세</a><span>›</span>%s</nav>
<h1>%s %s요일 오늘의 운세<small>%s(%s)일 · 음력 %s · %s년 %s월</small></h1>
<p class="lede">%s의 일진은 <b>%s(%s)</b>일입니다. 오늘의 기운과 12띠별 총운·재물·일·관계·건강을 한 페이지에 모았습니다. 내 띠를 찾아 그대로 읽으시면 됩니다.</p>
<dl class="facts">
  <div class="fact"><dt>일진</dt><dd>%s<span class="han">%s</span></dd></div>
  <div class="fact"><dt>음력</dt><dd>%s</dd></div>
  <div class="fact"><dt>납음오행</dt><dd>%s<span class="han">%s</span></dd></div>
  <div class="fact"><dt>세운·월건</dt><dd>%s<span class="han">·%s</span></dd></div>
</dl>
%s

<h2>오늘의 기운<span class="sub">일진 %s</span></h2>
<div class="card gold"><p>%s</p><p>%s</p></div>
<p class="note">이 페이지는 %s의 일진으로 만든 하루 운세입니다. 본문의 '오늘'은 모두 이 날짜를 가리킵니다.</p>

<h2>12띠별 오늘의 운세<span class="sub">일진 지지 %s(%s)과의 관계</span></h2>
<p class="small muted">일진의 지지와 각 띠의 지지가 합·충·형·파·해 중 어디에 놓이는지로 읽습니다. 별점은 그 관계의 강도를 다섯 개로 나타낸 것입니다.</p>
<table class="tbl"><thead><tr><th>띠</th><th>관계</th><th>기운</th></tr></thead><tbody>%s</tbody></table>
<div style="margin-top:14px">%s</div>

<h2>오행별 오늘의 운세<span class="sub">태어난 날의 일간 오행으로</span></h2>
<p class="small muted">내 사주의 일간(태어난 날의 천간) 오행이 오늘 천간 %s(%s)과 어떤 사이인지로 읽습니다.</p>
<div style="display:grid;gap:9px">%s</div>

<h2>오늘의 활용법</h2>
<div class="card">
<p><b>개운 포인트.</b> 오늘의 기운은 %s(%s)입니다. %s 계열의 색을 하나 걸치고, %s 방향으로 자리를 잡으면 기운이 덜 새고 잘 모입니다.</p>
<p><b>피하면 좋은 것.</b> %s일은 %s띠와 정반대 자리입니다. 그 띠의 사람과 정면으로 부딪히는 대화는 시간을 두고 하세요. 같은 이유로 큰 계약·큰 지출은 서두르지 않는 편이 좋습니다.</p>
<p><b>내 사주로 정확히 보려면.</b> 띠는 태어난 해의 지지 하나만 보는 방식입니다. 태어난 날의 일간과 전체 여덟 글자를 넣어야 오늘의 일진이 내게 어떤 십성으로 오는지 알 수 있습니다.</p>
</div>

<h2>자주 묻는 질문</h2>
%s

%s

<h2>함께 보기</h2>
<div class="grid">
  <a class="tile" href="/guide/2027-unse/"><span class="t">2027 띠별 운세</span><span class="s">정미년(丁未年) 12띠 총운·재물·직장</span></a>
  <a class="tile" href="https://saju.gold-queen.com/#tojeong"><span class="t">2027 토정비결</span><span class="s">생년월일로 보는 144괘 신년운세</span></a>
  <a class="tile" href="https://saju.gold-queen.com/#saju"><span class="t">만세력 사주</span><span class="s">내 원국과 대운·세운 표</span></a>
  <a class="tile" href="/guide/today/"><span class="t">날짜별 오늘의 운세</span><span class="s">일진 달력에서 다른 날짜 고르기</span></a>
</div>
<div class="pager">%s</div>
<p class="note">이 페이지의 일진·음력·월건은 앱 본체와 같은 만세력 계산(율리우스적일 기반 60갑자, 한국표준시 자정 기준)으로 구했습니다. 절입 시각이 결과를 가르는 경우에는 하루 차이가 날 수 있습니다.</p>
""" % (
        day.short_date,
        day.title_date, day.wd,
        day.gzi_ko, day.gzi, day.lunar_text, GAN_KO[day.y_gi] + ZHI_KO[day.y_zi], GAN_KO[day.m_stem] + ZHI_KO[day.m_branch],
        day.title_date, day.gzi, day.gzi_ko,
        day.gzi, day.gzi_ko, day.lunar_text,
        day.naeum[0], day.naeum[1],
        day.y_gzi, day.m_gzi,
        term_line,
        day.gzi, daily_paragraph(day),
        ("%s일은 %s년 %s월에 들어 있습니다. 월건(月建)은 절입(節入)으로 바뀌므로 %s 이후 %s월이 이어지고, 다음 절입은 %s입니다."
         % (day.gzi, day.y_gzi, day.m_gzi, day.jie, ZHI_KO[day.m_branch], day.next_jie_text)),
        day.title_date,
        day.zhi_ko, day.zhi,
        "".join(tbl_rows), "".join(blocks),
        day.gan, day.gan_ko,
        "".join(el_blocks),
        EL_NAME[ZHI_EL[day.zi]], EL_HANJA[ZHI_EL[day.zi]], EL_COLOR[EL_NAME[ZHI_EL[day.zi]]], EL_DIR[EL_NAME[ZHI_EL[day.zi]]],
        day.zhi_ko, ZHI_ANIMAL[(day.zi + 6) % 12],
        faq_html,
        CTABLOCK.format(m="내 생년월일로 오늘의 일진 보기 · 만세력 사주", s="2027 정미년 토정비결 144괘 보기"),
        "".join(pager),
    )

    html = HEAD.format(title=title, desc=desc, url=url, jsonld=jsonld, crumb="") + body + FOOT
    write("guide/today/%s.html" % day.iso, html)
    return url


# ============================================================
# 8. 목록·허브 페이지
# ============================================================
def build_today_index(days):
    url = BASE_URL + "/guide/today/"
    d0, d1 = days[0], days[-1]
    title = "날짜별 오늘의 운세 · 일진 달력 (%d년 %d월 ~ %d년 %d월) | 달빛 한 스푼" % (d0.y, d0.m, d1.y, d1.m)
    desc = ("날짜마다 일진(간지)과 12띠별 오늘의 운세를 정리한 페이지 모음입니다. %s부터 %s까지 "
            "하루씩 일진·음력·띠별 총운을 확인하고, 내 생년월일로 사주까지 이어서 볼 수 있습니다."
            % (d0.title_date, d1.title_date))

    groups = {}
    for d in days:
        groups.setdefault((d.y, d.m), []).append(d)
    glist = []
    for (y, m), ds in groups.items():
        items = "".join('<a href="/guide/today/%s.html"><span class="gz">%s</span>%d일 <span class="wd">%s</span></a>'
                        % (d.iso, d.gzi_ko, d.d, d.wd) for d in ds)
        glist.append('<div class="dgroup"><h3>%d년 %d월</h3><div class="dlist">%s</div></div>' % (y, m, items))

    faqs = [
        ("일진(日辰)이란 무엇인가요?",
         "그날에 붙는 간지입니다. 천간 10개와 지지 12개를 짝지은 60갑자가 하루에 하나씩 돌아가며, 60일마다 한 바퀴를 돕니다. 음력의 윤달이나 절기와 상관없이 날짜가 바뀌면 끊기지 않고 이어집니다."),
        ("날짜별 운세는 어떻게 계산하나요?",
         "그날의 일진 지지와 12띠의 지지가 합(六合)·삼합(三合)·방합(方合)·충(沖)·형(刑)·파(破)·해(害) 중 어디에 놓이는지, 그리고 오행이 서로 생하는지 극하는지를 기준으로 봅니다."),
        ("며칠 뒤 운세까지 볼 수 있나요?",
         "%s부터 %s까지 날짜별 페이지를 미리 만들어 두었습니다. 페이지마다 그날의 일진과 음력, 띠별 운세가 다르게 들어 있습니다."
         % (days[0].title_date, days[-1].title_date)),
    ]
    faq_html = "".join('<details class="card"><summary><b>%s</b></summary><p>%s</p></details>' % (q, a) for q, a in faqs)
    faq_ld = {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]}
    jsonld = ld_json({"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": url + "#page", "url": url, "name": title, "description": desc,
         "inLanguage": "ko", "isPartOf": {"@type": "WebSite", "name": "달빛 한 스푼", "url": "https://saju.gold-queen.com/"},
         "publisher": {"@type": "Organization", "name": "골드퀸", "url": "https://link.gold-queen.com/"}},
        breadcrumb_ld([("달빛 한 스푼", "https://saju.gold-queen.com/"), ("운세 가이드", BASE_URL + "/guide/"), ("날짜별 오늘의 운세", url)]),
        faq_ld,
    ]})

    body = """<nav class="crumb" aria-label="위치"><a href="https://saju.gold-queen.com/">달빛 한 스푼</a><span>›</span><a href="/guide/">운세 가이드</a><span>›</span>날짜별 오늘의 운세</nav>
<h1>날짜별 오늘의 운세<small>일진(日辰)과 12띠별 하루 운세 · %s ~ %s</small></h1>
<p class="lede">날짜를 고르면 그날의 일진(간지)·음력과 12띠별 총운·재물·일·관계·건강을 한 페이지에서 볼 수 있습니다. 일진이 바뀌면 띠마다 기운도 달라지므로, 보고 싶은 날짜를 먼저 골라 주세요.</p>
<div class="cta" style="margin:18px 0 0">
  <a class="main" href="https://saju.gold-queen.com/#saju"><span>내 생년월일로 오늘의 일진·사주 보기</span><span class="go">바로가기 ›</span></a>
</div>
<h2>날짜 고르기</h2>
%s
<h2>일진은 어떻게 돌아가나요<span class="sub">60갑자</span></h2>
<div class="card"><p>일진은 천간 10개(갑·을·병·정·무·기·경·신·임·계)와 지지 12개(자·축·인·묘·진·사·오·미·신·유·술·해)를 차례로 짝지은 60갑자가 하루에 한 칸씩 움직이는 것입니다. 60일이면 같은 일진이 다시 돌아오고, 그날의 지지가 12띠 각각과 어떤 관계에 놓이는지가 띠별 운세의 뼈대가 됩니다.</p>
<p>예를 들어 2026년 11월 23일은 신축(辛丑)일로 지지가 축(丑)입니다. 축은 미(未)와 정면으로 부딪히고(충), 자(子)와는 합을 이룹니다(육합). 그래서 같은 날이라도 양띠와 쥐띠의 기운이 정반대로 갈립니다.</p></div>
<h2>자주 묻는 질문</h2>
%s
<h2>함께 보기</h2>
<div class="grid">
  <a class="tile" href="/guide/2027-unse/"><span class="t">2027 띠별 운세</span><span class="s">정미년(丁未年) 12띠 총운·재물·직장·월별</span></a>
  <a class="tile" href="https://saju.gold-queen.com/#tojeong"><span class="t">2027 토정비결</span><span class="s">생년월일로 보는 144괘 신년운세</span></a>
  <a class="tile" href="https://saju.gold-queen.com/#saju"><span class="t">만세력 사주</span><span class="s">사주팔자·대운·오늘의 일진</span></a>
  <a class="tile" href="https://link.gold-queen.com/"><span class="t">골드퀸 허브</span><span class="s">건강·생활 정보와 계산기 모음</span></a>
</div>
%s
""" % (d0.title_date, d1.title_date, "".join(glist), faq_html,
       CTABLOCK.format(m="오늘의 일진으로 내 사주 보기", s="2027 정미년 토정비결 보기"))
    html = HEAD.format(title=title, desc=desc, url=url, jsonld=jsonld, crumb="") + body + FOOT
    write("guide/today/index.html", html)


def build_guide_index(days):
    url = BASE_URL + "/guide/"
    title = "운세 가이드 — 날짜별 오늘의 운세 · 2027 띠별 운세 | 달빛 한 스푼"
    desc = ("달빛 한 스푼이 만든 무료 운세 가이드입니다. 날짜별 오늘의 운세(일진·12띠)와 2027 정미년 12띠별 운세를 "
            "만세력 계산으로 정리했습니다. 생년월일 하나로 사주·토정비결까지 이어서 볼 수 있습니다.")
    today = days[0]
    for d in days:
        if d.date <= BUILD_DATE:
            today = d
    jsonld = ld_json({"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": url + "#page", "url": url, "name": title, "description": desc, "inLanguage": "ko",
         "publisher": {"@type": "Organization", "name": "골드퀸", "url": "https://link.gold-queen.com/"}},
        breadcrumb_ld([("달빛 한 스푼", "https://saju.gold-queen.com/"), ("운세 가이드", url)]),
    ]})
    body = """<nav class="crumb" aria-label="위치"><a href="https://saju.gold-queen.com/">달빛 한 스푼</a><span>›</span>운세 가이드</nav>
<h1>운세 가이드<small>날짜별 오늘의 운세 · 2027 정미년 띠별 운세</small></h1>
<p class="lede">달빛 한 스푼이 만세력 계산으로 정리한 무료 운세 가이드입니다. 앱을 열지 않아도 날짜별 일진과 띠별 흐름을 바로 읽을 수 있고, 더 깊이 보려면 생년월일 하나로 사주·토정비결까지 이어집니다.</p>
<div class="grid" style="margin-top:18px">
  <a class="tile" href="/guide/today/"><span class="t">날짜별 오늘의 운세</span><span class="s">2026년 11월 ~ 2027년 1월 · 일진과 12띠별 하루 운세</span></a>
  <a class="tile" href="/guide/2027-unse/"><span class="t">2027 띠별 운세</span><span class="s">정미년(丁未年) 12띠 총운·재물·직장·건강·월별 포인트</span></a>
  <a class="tile" href="/guide/today/%s.html"><span class="t">오늘(%s) 운세</span><span class="s">%s일 · 음력 %s</span></a>
  <a class="tile" href="https://saju.gold-queen.com/#tojeong"><span class="t">2027 토정비결</span><span class="s">144괘로 보는 신년운세와 12달 흐름</span></a>
</div>
<h2>이 가이드는 어떻게 읽나요</h2>
<div class="card">
<p><b>1. 날짜부터.</b> 오늘의 운세는 그날의 일진(간지)이 기준입니다. 같은 띠라도 일진이 바뀌면 기운이 달라지므로, 보고 싶은 날짜의 페이지를 엽니다.</p>
<p><b>2. 내 띠를 찾습니다.</b> 태어난 해의 띠를 찾아 그 칸만 읽으면 됩니다. 12띠는 태어난 해의 지지 하나만 보는 가장 단순한 방식입니다.</p>
<p><b>3. 관계를 봅니다.</b> 일진의 지지와 내 띠의 지지가 합(六合)·삼합(三合)·방합(方合)이면 순조롭고, 충(沖)·형(刑)·파(破)·해(害)면 확인과 여유가 필요한 날로 읽습니다.</p>
<p><b>4. 사주로 넘어갑니다.</b> 띠는 해 하나만 보지만, 사주는 태어난 날의 일간까지 봅니다. 같은 띠라도 일간이 다르면 오늘의 일진이 전혀 다른 십성으로 옵니다.</p>
</div>
<h2>앱에서 바로 보기</h2>
%s
<p class="note">일진·음력·월건은 율리우스적일 기반 60갑자와 한국표준시 자정 기준으로 계산합니다. 절입 시각이 결과를 가르는 경우 하루 차이가 날 수 있으며, 모든 내용은 재미로 보는 운세입니다.</p>
""" % (today.iso, today.short_date, today.gzi_ko, today.lunar_text,
       CTABLOCK.format(m="내 생년월일로 사주 보기", s="2027 정미년 토정비결 144괘"))
    html = HEAD.format(title=title, desc=desc, url=url, jsonld=jsonld, crumb="") + body + FOOT
    write("guide/index.html", html)


# ============================================================
# 9. 2027 띠별
# ============================================================
YEAR = 2027


def year_relation(b):
    """2027 정미년 지지 未(7)와 띠 지지의 관계."""
    return relation(7, b)


def month_lines(b):
    out = []
    for m in range(1, 13):
        branch = MONTH_BRANCH[m - 1]
        rel = relation(branch, b)
        txt = MONTH_REL_TEXT[rel].format(m=m, b=ZHI_KO[branch])
        out.append((m, ZHI_KO[branch], REL_INFO[rel][0], txt))
    return out


def build_2027_room_page(b):
    slug = ZHI_SLUG[b]
    animal = ZHI_ANIMAL[b]
    url = f"{BASE_URL}/guide/2027-unse/{slug}.html"
    rel = year_relation(b)
    info = REL_INFO[rel]
    sc = score_for(rel, 7, b)
    yt = YEAR_TEXT[rel]
    stars_txt = stars(sc)
    title = f"2027년 {animal}띠 운세 — 정미년(丁未年) 총운·재물·직장·건강·월별 | 달빛 한 스푼"
    desc = (f"2027년 정미년(丁未年) {animal}띠({ZHI[b]}) 운세입니다. 해의 지지 미(未)와 {animal}띠의 {ZHI[b]}가 {info[0]} 관계에 놓입니다. "
            f"총운·재물운·직장·사업운·건강운과 1월부터 12월까지 월별 포인트를 정리했습니다.")

    mrows = "".join('<tr><td class="d">%d월</td><td class="d">%s월</td><td>%s</td></tr>' % (m, br, t) for m, br, _rn, t in month_lines(b))
    navs = "".join(f'<a class="tile" href="/guide/2027-unse/{ZHI_SLUG[i]}.html"><span class="t">{ZHI_EMOJI[i]} {ZHI_ANIMAL[i]}띠</span><span class="s">{REL_INFO[year_relation(i)][0]}</span></a>'
                   for i in range(12) if i != b)

    short = {
        "hap": "해의 지지와 합을 이루어 사람을 통해 일이 풀리는 한 해입니다.",
        "samhap": "해의 지지와 삼합을 이루어 준비한 것이 결실로 바뀌는 한 해입니다.",
        "banghap": "같은 방향의 기운이 모여 익숙한 자리에서 기반을 다지는 한 해입니다.",
        "none": "해의 지지와 특별히 얽히지 않아 내가 정한 만큼 흘러가는 한 해입니다.",
        "self": "해의 지지와 같은 자리에 서는 본명년으로, 기운이 두 배가 되어 조절이 필요한 한 해입니다.",
        "hae": "해의 지지와 해(害)의 자리에 놓여 작은 어긋남을 확인으로 막아야 하는 한 해입니다.",
        "pa": "해의 지지와 파(破)에 닿아 계획이 한 번쯤 어긋나는 한 해입니다.",
        "hyeong": "해의 지지와 형(刑)에 놓여 스스로를 조이는 마음을 낮춰야 하는 한 해입니다.",
        "chung": "해의 지지와 정면으로 부딪히는 충(沖)의 해로, 삶의 틀이 바뀌는 변화가 들어옵니다.",
    }[rel]

    faqs = [
        ("2027년은 무슨 해인가요?",
         "2027년은 정미년(丁未年)입니다. 천간 정(丁)은 음화(陰火)로 촛불 같은 기운, 지지 미(未)는 음토(陰土)로 여름의 끝자락에 놓인 마른 흙입니다. 60갑자로는 44번째이며, 사주에서는 입춘인 2027년 2월 4일 10시 45분부터 정미년으로 바뀝니다."),
        (f"{animal}띠의 2027년 운세는 어떤가요?",
         f"해의 지지 미(未)와 {animal}띠의 지지 {ZHI[b]}가 {info[0]}({info[1]}) 관계에 놓입니다. {short}"),
        ("띠별 운세와 토정비결은 무엇이 다른가요?",
         "띠별 운세는 태어난 해의 지지 하나만 보는 방식이고, 토정비결은 생년월일 전체로 144괘 중 한 괘를 뽑아 그 해의 흐름을 읽는 방식입니다. 같은 띠라도 생년월일이 다르면 괘가 달라지므로, 두 결과가 같지 않을 수 있습니다."),
    ]
    faq_html = "".join(f'<details class="card"><summary><b>{q}</b></summary><p>{a}</p></details>' for q, a in faqs)
    jsonld = ld_json({"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": url + "#article",
         "headline": f"2027년 {animal}띠 운세 · 정미년 총운·재물·직장·건강", "description": desc, "inLanguage": "ko",
         "datePublished": BUILD_DATE.isoformat() + "T06:00:00+09:00",
         "dateModified": BUILD_DATE.isoformat() + "T06:00:00+09:00",
         "author": {"@type": "Organization", "name": "골드퀸", "url": "https://link.gold-queen.com/"},
         "publisher": {"@type": "Organization", "name": "골드퀸", "url": "https://link.gold-queen.com/"},
         "mainEntityOfPage": {"@type": "WebPage", "@id": url}},
        breadcrumb_ld([("달빛 한 스푼", "https://saju.gold-queen.com/"), ("운세 가이드", BASE_URL + "/guide/"),
                       ("2027 띠별 운세", BASE_URL + "/guide/2027-unse/"), (f"{animal}띠", url)]),
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]},
    ]})

    card_line = (f"{animal}띠는 {ZHI_KO[b]}({ZHI[b]})의 해에 태어난 사람으로, {ZHI_TRAIT[b]}이 특징입니다. "
                 f"2027년 정미년의 흐름과 만나면, {ZODIAC_EXTRA_YEAR[rel]}")

    body = f"""<nav class="crumb" aria-label="위치"><a href="https://saju.gold-queen.com/">달빛 한 스푼</a><span>›</span><a href="/guide/">운세 가이드</a><span>›</span><a href="/guide/2027-unse/">2027 띠별 운세</a><span>›</span>{animal}띠</nav>
<h1>2027년 {animal}띠 운세<small>정미년(丁未年) · {animal}띠 {ZHI[b]} · 해의 지지 미(未)와 {info[0]}({info[1]}) 관계</small></h1>
<p class="lede">2027년 정미년, {animal}띠는 해의 지지 미(未)와 <b>{info[0]}({info[1]})</b> 관계에 놓입니다. {info[0]}의 기운이 한 해를 어떻게 감싸는지, 총운과 재물·직장·건강, 그리고 12달 흐름까지 정리했습니다.</p>
<dl class="facts">
  <div class="fact"><dt>띠 지지</dt><dd>{ZHI[b]}<span class="han">{ZHI_KO[b]}</span></dd></div>
  <div class="fact"><dt>띠 오행</dt><dd>{EL_NAME[ZHI_EL[b]]}<span class="han">{EL_HANJA[ZHI_EL[b]]}</span></dd></div>
  <div class="fact"><dt>2027년과</dt><dd>{info[0]}<span class="han">{info[1]}</span></dd></div>
  <div class="fact"><dt>기운</dt><dd>{stars_txt}</dd></div>
</dl>
<div class="card gold"><p>{card_line}</p></div>

<h2>2027년 총운<span class="sub">정미년 · {info[0]}</span></h2>
<div class="card"><p>{yt["총운"]}</p></div>

<h2>재물운</h2>
<div class="card"><p>{yt["재물운"]}</p></div>

<h2>직장·사업운</h2>
<div class="card"><p>{yt["직장·사업운"]}</p></div>

<h2>건강운</h2>
<div class="card"><p>{yt["건강운"]}</p></div>

<h2>연애·인간관계</h2>
<div class="card"><p>{yt["관계"]}</p></div>

<h2>월별 포인트<span class="sub">2027년 1월 ~ 12월</span></h2>
<p class="small muted">달력 월과 그 달의 월건(月建) 지지를 기준으로 한 전통 해석입니다. 사주의 월주는 절입 시각으로 나뉘므로 절입일 전후는 하루 이틀 차이가 날 수 있습니다.</p>
<table class="tbl"><thead><tr><th>월</th><th>월건</th><th>흐름</th></tr></thead><tbody>{mrows}</tbody></table>

<h2>2027년 정미년이란</h2>
<div class="card">
<p>정미년(丁未年)은 천간 정(丁)과 지지 미(未)가 만난 해입니다. 정(丁)은 음화(陰火)로 촛불처럼 한곳을 비추는 기운이고, 미(未)는 음토(陰土)로 오후의 마른 흙, 곧 여름이 끝나고 결실을 거두는 자리입니다.</p>
<p>그래서 정미년은 크게 벌이기보다 안을 다지고, 밖으로 드러내기보다 남은 것을 정리하는 해로 읽힙니다. 불(火)이 흙(土)을 생하는 구조라, 애쓴 것이 형태로 남기 좋은 해이기도 합니다.</p>
<p>사주에서 한 해의 기운(세운)은 1월 1일이 아니라 <b>입춘</b>에 바뀝니다. 2027년 입춘은 2월 4일 10시 45분이므로, 그 전까지는 2026년 병오년의 기운이 이어집니다.</p>
</div>

<h2>자주 묻는 질문</h2>
{faq_html}

<h2>다른 띠 보기</h2>
<div class="grid">{navs}</div>

{CTABLOCK.format(m="2027 정미년 내 토정비결 144괘 보기", s="내 사주 원국 넣고 2027 세운 보기")}

<div class="pager">
  <a href="/guide/2027-unse/"><span class="k">목록</span><span class="v">12띠 전체 보기</span></a>
  <a href="/guide/today/"><span class="k">함께 보기</span><span class="v">날짜별 오늘의 운세</span></a>
</div>
<p class="note">띠별 운세는 태어난 해의 지지 하나만 보는 재미용 해석입니다. 같은 띠라도 태어난 날의 일간과 전체 사주에 따라 실제 흐름은 달라지며, 중요한 결정은 본인의 판단과 전문가의 조언을 함께 따르세요.</p>
"""
    html = HEAD.format(title=title, desc=desc, url=url, jsonld=jsonld, crumb="") + body + FOOT
    write("guide/2027-unse/%s.html" % slug, html)
    return url



YEAR_SHORT = {
    "hap": ("순조로운 해", "사람을 통해 일이 풀리는 한 해입니다."),
    "samhap": ("결실이 나는 해", "준비한 것이 결실로 바뀌는 한 해입니다."),
    "banghap": ("기반을 다지는 해", "익숙한 자리에서 기반을 다지는 한 해입니다."),
    "none": ("무난한 해", "내가 정한 만큼 흘러가는 한 해입니다."),
    "self": ("조절이 필요한 해", "기운이 두 배가 되어 조절이 필요한 한 해입니다."),
    "hae": ("확인이 필요한 해", "작은 어긋남을 확인으로 막아야 하는 한 해입니다."),
    "pa": ("여유가 필요한 해", "계획이 한 번쯤 어긋나는 한 해입니다."),
    "hyeong": ("낮추어야 하는 해", "스스로를 조이는 마음을 낮춰야 하는 한 해입니다."),
    "chung": ("변화가 큰 해", "삶의 틀이 바뀌는 변화가 들어오는 한 해입니다."),
}

ZODIAC_EXTRA_YEAR = {
    "hap": "사람을 통해 풀리는 한 해가 됩니다.",
    "samhap": "준비한 것이 결실로 바뀌는 한 해가 됩니다.",
    "banghap": "익숙한 자리에서 기반을 다지는 한 해가 됩니다.",
    "none": "내가 정한 만큼만 흘러가는 한 해가 됩니다.",
    "self": "기운이 두 배가 되어 조절이 필요한 한 해가 됩니다.",
    "hae": "작은 어긋남을 확인으로 막아야 하는 한 해가 됩니다.",
    "pa": "계획이 한 번쯤 어긋나므로 여유가 필요한 한 해가 됩니다.",
    "hyeong": "스스로를 조이는 마음을 낮춰야 하는 한 해가 됩니다.",
    "chung": "삶의 틀이 바뀌는 변화가 들어오는 한 해가 됩니다.",
}


def build_2027_index():
    url = BASE_URL + "/guide/2027-unse/"
    title = "2027년 정미년 띠별 운세 — 12띠 총운·재물·직장·건강 | 달빛 한 스푼"
    desc = ("2027년 정미년(丁未年) 12띠별 운세를 한곳에 모았습니다. 쥐·소·호랑이·토끼·용·뱀·말·양·원숭이·닭·개·돼지까지 "
            "총운·재물운·직장·사업운·건강운과 12달 월별 포인트를 띠마다 따로 정리했습니다.")
    tiles = "".join(
        '<a class="tile" href="/guide/2027-unse/%s.html"><span class="t">%s %s띠</span><span class="s">%s 관계 · %s</span></a>'
        % (ZHI_SLUG[b], ZHI_EMOJI[b], ZHI_ANIMAL[b], REL_INFO[year_relation(b)][0],
           YEAR_SHORT[year_relation(b)][0])
        for b in range(12))
    faqs = [
        ("2027년은 무슨 해인가요?",
         "정미년(丁未年)입니다. 천간 정(丁)은 음화, 지지 미(未)는 음토로, 여름이 끝나고 결실을 거두는 자리입니다. 60갑자 44번째이며, 세운은 입춘인 2027년 2월 4일 10시 45분부터 정미년으로 바뀝니다."),
        ("내 띠를 모르면 어떻게 하나요?",
         "태어난 해의 띠를 보면 됩니다. 2027년 기준으로 12년 주기이므로, 같은 해에 태어난 사람은 모두 같은 띠입니다. 정확한 사주는 태어난 날과 시까지 필요하므로 만세력 사주에서 확인하세요."),
        ("띠별 운세와 토정비결 중 무엇을 봐야 하나요?",
         "가볍게 보려면 띠별 운세, 한 해의 흐름을 제대로 보려면 토정비결이 맞습니다. 토정비결은 생년월일 전체로 144괘 중 한 괘를 뽑아 총운과 12달 흐름을 내므로 같은 띠라도 결과가 달라집니다."),
    ]
    faq_html = "".join('<details class="card"><summary><b>%s</b></summary><p>%s</p></details>' % (q, a) for q, a in faqs)
    jsonld = ld_json({"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": url + "#page", "url": url, "name": title, "description": desc, "inLanguage": "ko",
         "publisher": {"@type": "Organization", "name": "골드퀸", "url": "https://link.gold-queen.com/"}},
        breadcrumb_ld([("달빛 한 스푼", "https://saju.gold-queen.com/"), ("운세 가이드", BASE_URL + "/guide/"),
                       ("2027 띠별 운세", url)]),
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]},
    ]})
    body = """<nav class="crumb" aria-label="위치"><a href="https://saju.gold-queen.com/">달빛 한 스푼</a><span>›</span><a href="/guide/">운세 가이드</a><span>›</span>2027 띠별 운세</nav>
<h1>2027년 정미년 띠별 운세<small>12띠 총운·재물·직장·건강·월별 포인트</small></h1>
<p class="lede">2027년은 정미년(丁未年)입니다. 천간 정(丁)의 촛불 같은 화(火)가 지지 미(未)의 마른 흙 위에 앉은 해로, 크게 벌이기보다 안을 다지고 결실을 거두는 흐름입니다. 내 띠를 골라 한 해의 방향을 확인하세요.</p>
<div class="grid" style="margin-top:18px">%s</div>
<h2>2027년 정미년 한눈에</h2>
<div class="card">
<p><b>세운.</b> 정미년은 60갑자 44번째입니다. 사주에서 한 해의 기운은 1월 1일이 아니라 입춘에 바뀌므로, 2027년 입춘인 2월 4일 10시 45분부터 정미년의 기운이 시작됩니다.</p>
<p><b>천간 정(丁).</b> 음화(陰火)로 촛불처럼 한곳을 비추는 기운입니다. 넓게 퍼뜨리기보다 한 가지를 밝히는 데 강합니다.</p>
<p><b>지지 미(未).</b> 음토(陰土)로 오후의 마른 흙, 여름이 끝나고 곡식이 여무는 자리입니다. 정리와 마무리에 어울립니다.</p>
<p><b>흐름.</b> 화(火)가 토(土)를 생하는 구조라, 애쓴 일이 형태로 남기 좋은 해입니다. 다만 미(未)는 충·형·파로 다른 지지와 자주 얽히므로, 띠마다 편차가 큰 한 해이기도 합니다.</p>
</div>
<h2>띠별로 보는 2027년</h2>
<p class="small muted">해의 지지 미(未)와 내 띠의 지지가 합(六合)·삼합(三合)·방합(方合)·충(沖)·형(刑)·파(破)·해(害) 중 어디에 놓이는지로 읽습니다.</p>
<table class="tbl"><thead><tr><th>띠</th><th>미(未)와의 관계</th><th>한 줄</th></tr></thead><tbody>%s</tbody></table>
<h2>자주 묻는 질문</h2>
%s
%s
<p class="note">띠별 운세는 태어난 해의 지지 하나만 보는 재미용 해석입니다. 같은 띠라도 태어난 날의 일간과 전체 사주에 따라 실제 흐름은 달라집니다.</p>
""" % (
        tiles,
        "".join('<tr><td class="d"><a href="/guide/2027-unse/%s.html">%s %s띠</a></td><td>%s</td><td>%s</td></tr>'
                % (ZHI_SLUG[b], ZHI_EMOJI[b], ZHI_ANIMAL[b], REL_INFO[year_relation(b)][0],
                   YEAR_SHORT[year_relation(b)][1]) for b in range(12)),
        faq_html,
        CTABLOCK.format(m="2027 정미년 내 토정비결 보기", s="내 사주로 2027 세운 보기"),
    )
    html = HEAD.format(title=title, desc=desc, url=url, jsonld=jsonld, crumb="") + body + FOOT
    write("guide/2027-unse/index.html", html)


# ============================================================
# 10. sitemap
# ============================================================
def build_sitemap(days):
    rows = [(BASE_URL + "/", "1.0", "daily"), (BASE_URL + "/guide/", "0.9", "weekly"),
            (BASE_URL + "/guide/today/", "0.9", "daily"), (BASE_URL + "/guide/2027-unse/", "0.9", "weekly"),
            (BASE_URL + "/privacy.html", "0.3", "yearly")]
    for d in days:
        rows.append((d.url, "0.7", "daily"))
    for b in range(12):
        rows.append(("%s/guide/2027-unse/%s.html" % (BASE_URL, ZHI_SLUG[b]), "0.8", "weekly"))
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, pr, ch in rows:
        out.append("  <url>")
        out.append("    <loc>%s</loc>" % loc)
        out.append("    <lastmod>%s</lastmod>" % BUILD_DATE.isoformat())
        out.append("    <changefreq>%s</changefreq>" % ch)
        out.append("    <priority>%s</priority>" % pr)
        out.append("  </url>")
    out.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(out) + "\n", encoding="utf-8")
    return len(rows)


# ============================================================
# 11. 실행
# ============================================================
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", default="2026-11-23")
    ap.add_argument("--days", type=int, default=70)
    ap.add_argument("--no-sitemap", action="store_true")
    args = ap.parse_args()

    start = dt.date.fromisoformat(args.start)
    days = [Day(start + dt.timedelta(days=i)) for i in range(args.days)]

    made = 0
    for i, d in enumerate(days):
        prev_day = days[i - 1] if i > 0 else None
        next_day = days[i + 1] if i < len(days) - 1 else None
        build_daily_page(d, prev_day, next_day)
        made += 1
    build_today_index(days)
    build_guide_index(days)
    build_2027_index()
    for b in range(12):
        build_2027_room_page(b)
        made += 1
    n = 0
    if not args.no_sitemap:
        n = build_sitemap(days)
    print("날짜 페이지 %d개 + 2027 띠 페이지 12개 + 허브 3개 생성" % (len(days)))
    print("기간: %s ~ %s" % (days[0].iso, days[-1].iso))
    if n:
        print("sitemap.xml: URL %d개" % n)


if __name__ == "__main__":
    main()
