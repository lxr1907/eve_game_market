#!/usr/bin/env python3
"""
获取 B站 UP主所有视频（普通投稿 + 合集）并存储到数据库
UP主 UID: 1965152257
数据库连接从 backend/.env 读取

分类规则（category 字段）：
  - 标题含 "势力战"                → "势力战"
  - 标题含 "深渊"                  → "深渊"
  - 其他                          → "其他"

【需要 Cookie】
  将浏览器 Cookie 写入 bilibili_cookie.txt（项目根目录）
  或设置环境变量 BILIBILI_COOKIE
"""

import os
import re
import time
import hashlib
import urllib.parse
import warnings
from datetime import datetime
from typing import Optional

import requests
import pymysql

warnings.filterwarnings("ignore")

# ── 配置 ─────────────────────────────────────────────────────────────────────

UID = 1965152257
ENV_PATH = os.path.join(os.path.dirname(__file__), "backend", ".env")
COOKIE_FILE = os.path.join(os.path.dirname(__file__), "bilibili_cookie.txt")

BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://space.bilibili.com/",
    "Origin": "https://space.bilibili.com",
}

# ── 分类规则 ──────────────────────────────────────────────────────────────────

CATEGORY_RULES = [
    ("势力战", ["势力战"]),
    ("深渊",   ["深渊"]),
]

def classify(title: str) -> str:
    for category, keywords in CATEGORY_RULES:
        for kw in keywords:
            if kw in title:
                return category
    return "其他"


# ── 读取 .env ─────────────────────────────────────────────────────────────────

def load_env(path: str) -> dict:
    env = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            m = re.match(r"^([A-Z_]+)\s*=\s*(.+)$", line)
            if m:
                env[m.group(1)] = m.group(2).strip()
    return env


# ── Cookie 加载 ───────────────────────────────────────────────────────────────

def load_cookie() -> str:
    cookie = os.environ.get("BILIBILI_COOKIE", "").strip()
    if cookie:
        return cookie
    if os.path.exists(COOKIE_FILE):
        with open(COOKIE_FILE, encoding="utf-8") as f:
            cookie = f.read().strip()
        if cookie:
            return cookie
    return ""


# ── 数据库 ─────────────────────────────────────────────────────────────────────

def get_conn(env: dict):
    return pymysql.connect(
        host=env["DB_HOST"],
        port=int(env.get("DB_PORT", 3306)),
        user=env["DB_USER"],
        password=env["DB_PASSWORD"],
        database=env["DB_NAME"],
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def ensure_table(conn):
    # 建表（如已存在则跳过）
    ddl = """
    CREATE TABLE IF NOT EXISTS bilibili_videos (
        bvid        VARCHAR(20)   NOT NULL,
        title       VARCHAR(512)  NOT NULL,
        uid         BIGINT        NOT NULL,
        aid         BIGINT        DEFAULT NULL,
        pic         VARCHAR(512)  DEFAULT NULL,
        duration    INT           DEFAULT NULL COMMENT '时长（秒）',
        play        INT           DEFAULT NULL COMMENT '播放量',
        pubdate     DATETIME      DEFAULT NULL,
        description TEXT          DEFAULT NULL,
        category    VARCHAR(20)   NOT NULL DEFAULT '其他' COMMENT '分类：势力战/深渊/其他',
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (bvid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
    with conn.cursor() as cur:
        cur.execute(ddl)
        # 若旧表没有 category 列，则补加
        cur.execute("""
            SELECT COUNT(*) AS cnt
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'bilibili_videos'
              AND COLUMN_NAME  = 'category'
        """)
        if cur.fetchone()["cnt"] == 0:
            cur.execute("""
                ALTER TABLE bilibili_videos
                ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT '其他'
                    COMMENT '分类：势力战/深渊/其他'
                AFTER description
            """)
            print("[DB] 已为旧表添加 category 列")
    conn.commit()
    print("[DB] 表 bilibili_videos 已就绪")


def upsert_videos(conn, videos: list):
    sql = """
    INSERT INTO bilibili_videos
        (bvid, title, uid, aid, pic, duration, play, pubdate, description, category)
    VALUES
        (%(bvid)s, %(title)s, %(uid)s, %(aid)s, %(pic)s,
         %(duration)s, %(play)s, %(pubdate)s, %(description)s, %(category)s)
    ON DUPLICATE KEY UPDATE
        title       = VALUES(title),
        aid         = VALUES(aid),
        pic         = VALUES(pic),
        duration    = VALUES(duration),
        play        = VALUES(play),
        pubdate     = VALUES(pubdate),
        description = VALUES(description),
        category    = VALUES(category),
        updated_at  = CURRENT_TIMESTAMP;
    """
    with conn.cursor() as cur:
        cur.executemany(sql, videos)
    conn.commit()


# ── WBI 签名 ──────────────────────────────────────────────────────────────────

MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]


def get_wbi_keys(headers: dict) -> tuple:
    resp = requests.get(
        "https://api.bilibili.com/x/web-interface/nav", headers=headers, timeout=10
    )
    data = resp.json()
    wbi_img = data["data"]["wbi_img"]
    img_key = wbi_img["img_url"].rsplit("/", 1)[-1].split(".")[0]
    sub_key = wbi_img["sub_url"].rsplit("/", 1)[-1].split(".")[0]
    return img_key, sub_key


def make_mixin_key(img_key: str, sub_key: str) -> str:
    raw = img_key + sub_key
    return "".join(raw[i] for i in MIXIN_KEY_ENC_TAB)[:32]


def sign_params(params: dict, mixin_key: str) -> dict:
    params = dict(params)
    params["wts"] = int(time.time())
    sorted_params = dict(sorted(params.items()))
    qs = urllib.parse.urlencode(
        {k: re.sub(r"[!'()*]", "", str(v)) for k, v in sorted_params.items()}
    )
    w_rid = hashlib.md5((qs + mixin_key).encode()).hexdigest()
    sorted_params["w_rid"] = w_rid
    return sorted_params


# ── 时长转秒数 ────────────────────────────────────────────────────────────────

def parse_duration(dur) -> Optional[int]:
    if isinstance(dur, int):
        return dur
    if isinstance(dur, str) and ":" in dur:
        parts = dur.split(":")
        try:
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        except ValueError:
            pass
    return None


def make_video_record(v: dict, uid: int) -> dict:
    """将 API 返回的视频字典标准化为数据库记录"""
    pubdate = None
    ts = v.get("pubdate") or v.get("created") or v.get("ctime")
    if ts:
        pubdate = datetime.fromtimestamp(ts)

    title = v.get("title", "")
    return {
        "bvid":        v["bvid"],
        "title":       title,
        "uid":         uid,
        "aid":         v.get("aid") or v.get("id"),
        "pic":         v.get("pic"),
        "duration":    parse_duration(v.get("duration") or v.get("length")),
        "play":        v.get("stat", {}).get("view") if "stat" in v else v.get("play"),
        "pubdate":     pubdate,
        "description": v.get("description") or v.get("desc", ""),
        "category":    classify(title),
    }


# ── 抓取：普通投稿 ─────────────────────────────────────────────────────────────

def fetch_arc_search(uid: int, headers: dict, mixin_key: str) -> list:
    """wbi/arc/search — 普通投稿列表（按发布时间倒序，最多返回约50条）"""
    all_videos = []
    page, page_size = 1, 50

    while True:
        params = sign_params(
            {"mid": uid, "ps": page_size, "pn": page, "order": "pubdate"},
            mixin_key,
        )
        resp = requests.get(
            "https://api.bilibili.com/x/space/wbi/arc/search",
            params=params, headers=headers, timeout=15,
        )
        if resp.status_code == 412:
            print("[ERROR] arc/search 412 风控")
            break

        data = resp.json()
        if data.get("code") != 0:
            print(f"[arc/search] 错误 code={data.get('code')}: {data.get('message')}")
            break

        vlist = data["data"]["list"]["vlist"]
        if not vlist:
            break

        for v in vlist:
            all_videos.append(make_video_record(v, uid))

        total = data["data"]["page"]["count"]
        print(f"  [arc/search] 第{page}页 +{len(vlist)} 条，共{total}条")

        if len(all_videos) >= total:
            break
        page += 1
        time.sleep(0.8)

    return all_videos


# ── 抓取：合集视频 ─────────────────────────────────────────────────────────────

def fetch_season_videos(uid: int, season_id: int, season_name: str,
                        headers: dict) -> list:
    """polymer/web-space/seasons_archives_list — 合集内视频"""
    all_videos = []
    page, page_size = 1, 30

    while True:
        resp = requests.get(
            "https://api.bilibili.com/x/polymer/web-space/seasons_archives_list",
            params={"mid": uid, "season_id": season_id,
                    "page_num": page, "page_size": page_size},
            headers=headers, timeout=15,
        )
        if resp.status_code == 412:
            print(f"  [合集{season_name}] 412 风控")
            break

        data = resp.json()
        if data.get("code") != 0:
            print(f"  [合集{season_name}] 错误 code={data.get('code')}: {data.get('message')}")
            break

        archives = data["data"].get("archives", [])
        if not archives:
            break

        for v in archives:
            all_videos.append(make_video_record(v, uid))

        total = data["data"]["page"]["total"]
        print(f"  [合集「{season_name}」] 第{page}页 +{len(archives)} 条，共{total}条")

        if len(all_videos) >= total:
            break
        page += 1
        time.sleep(0.8)

    return all_videos


# ── 抓取：所有合集 ─────────────────────────────────────────────────────────────

def fetch_all_seasons(uid: int, headers: dict) -> list:
    """获取所有合集元数据"""
    seasons = []
    page = 1
    while True:
        resp = requests.get(
            "https://api.bilibili.com/x/polymer/web-space/seasons_series_list",
            params={"mid": uid, "page_num": page, "page_size": 20},
            headers=headers, timeout=10,
        )
        data = resp.json()
        if data.get("code") != 0:
            break
        items = data.get("data", {}).get("items_lists", {})
        seasons_list = items.get("seasons_list", [])
        if not seasons_list:
            break
        for s in seasons_list:
            meta = s["meta"]
            seasons.append({
                "season_id": meta["season_id"],
                "name":      meta["name"],
                "total":     meta["total"],
            })
        # 目前合集列表一般一页就够
        break
    return seasons


# ── 合并去重 ──────────────────────────────────────────────────────────────────

def merge_unique(lists: list) -> list:
    seen = {}
    for videos in lists:
        for v in videos:
            seen[v["bvid"]] = v   # 后者覆盖前者（合集数据更完整）
    return list(seen.values())


# ── 主程序 ────────────────────────────────────────────────────────────────────

def main():
    print(f"[START] 开始抓取 UID={UID} 的全部视频 …\n")

    # Cookie
    cookie = load_cookie()
    if not cookie:
        print("[ERROR] 未找到 Cookie，请在 bilibili_cookie.txt 中写入 Cookie")
        return

    headers = dict(BASE_HEADERS)
    headers["Cookie"] = cookie
    print(f"[Cookie] 已加载（前50字符）: {cookie[:50]} …")

    # 数据库
    env = load_env(ENV_PATH)
    print(f"[DB] 连接到 {env['DB_HOST']}:{env.get('DB_PORT',3306)}/{env['DB_NAME']}")
    conn = get_conn(env)
    ensure_table(conn)

    # WBI 签名 key
    img_key, sub_key = get_wbi_keys(headers)
    mixin_key = make_mixin_key(img_key, sub_key)
    print("[API] wbi keys 获取成功\n")

    all_sources = []

    # 1. 普通投稿
    print("── 普通投稿 ──")
    arc_videos = fetch_arc_search(UID, headers, mixin_key)
    print(f"  普通投稿合计: {len(arc_videos)} 条\n")
    all_sources.append(arc_videos)

    # 2. 合集
    seasons = fetch_all_seasons(UID, headers)
    if seasons:
        for s in seasons:
            print(f"── 合集「{s['name']}」(season_id={s['season_id']}, 共{s['total']}条) ──")
            season_videos = fetch_season_videos(UID, s["season_id"], s["name"], headers)
            print(f"  合集「{s['name']}」实际获取: {len(season_videos)} 条\n")
            all_sources.append(season_videos)
            time.sleep(1.0)
    else:
        print("  未发现合集\n")

    # 合并去重
    videos = merge_unique(all_sources)
    print(f"── 去重后共 {len(videos)} 条视频 ──\n")

    if not videos:
        print("[WARN] 未抓取到任何视频，退出")
        conn.close()
        return

    # 写入数据库
    upsert_videos(conn, videos)
    conn.close()
    print(f"✅ 写入/更新完成，共 {len(videos)} 条记录")

    # 分类统计
    from collections import Counter
    cats = Counter(v["category"] for v in videos)
    print("\n── 分类统计 ──")
    for cat, cnt in sorted(cats.items()):
        print(f"  {cat}: {cnt} 条")

    # 预览
    print("\n── 全部视频列表 ──")
    for v in sorted(videos, key=lambda x: x.get("pubdate") or datetime.min, reverse=True):
        print(f"  [{v['category']:4s}] {v['bvid']}  {v['title'][:55]}")


if __name__ == "__main__":
    main()
