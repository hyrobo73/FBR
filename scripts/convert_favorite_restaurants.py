#!/usr/bin/env python3
"""Convert the Gwangju restaurant CSV into the app's JSON data format."""

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = ROOT / "맛집정보" / "favorite_restaurants_hanam.csv"
DEFAULT_OUTPUT = ROOT / "src" / "data" / "favorite_restaurants_hanam.json"


def read_csv(path: Path) -> list[dict[str, str]]:
    """Read UTF-8 (with or without BOM), falling back to Korean CP949."""
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as file:
            return list(csv.DictReader(file))
    except UnicodeDecodeError:
        with path.open("r", encoding="cp949", newline="") as file:
            return list(csv.DictReader(file))


def number(value: str, field: str, row_number: int, *, integer: bool = False):
    try:
        return int(value) if integer else float(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"{row_number}행의 {field} 값이 숫자가 아닙니다: {value!r}") from error


def convert(rows: list[dict[str, str]]) -> dict:
    restaurants = []
    for row_number, row in enumerate(rows, start=2):
        name = (row.get("음식점명") or "").strip()
        if not name:
            continue

        category_path = (row.get("카테고리") or "").strip()
        category_parts = [part.strip() for part in category_path.split(">")]
        if category_parts and category_parts[0] == "음식점":
            category_parts = category_parts[1:]
        category = category_parts[0] if category_parts else "기타"

        url = (row.get("카카오맵URL") or "").strip()
        kakao_id_match = re.search(r"place\.map\.kakao\.com/(\d+)", url)
        road_address = (row.get("도로명주소") or "").strip()
        lot_address = (row.get("지번주소") or "").strip()

        restaurant = {
            "id": f"csv-gwangju-{len(restaurants) + 1}",
            "name": name,
            "rating": number(row.get("별점", ""), "별점", row_number),
            "address": road_address or lot_address,
            "category": category,
            "city": "gwangju",
            "source": "csv",
            "matchStatus": "matched",
            "lat": number(row.get("위도", ""), "위도", row_number),
            "lng": number(row.get("경도", ""), "경도", row_number),
            "phone": (row.get("전화번호") or "").strip(),
            "url": url,
            "reviewCount": number(row.get("리뷰수", "0") or "0", "리뷰수", row_number, integer=True),
            "kakaoCategory": category_path,
            "roadAddress": road_address,
            "lotAddress": lot_address,
        }
        if kakao_id_match:
            restaurant["kakaoId"] = kakao_id_match.group(1)
        restaurants.append(restaurant)

    return {
        "source": "favorite_restaurant_gwangju.csv",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "total": len(restaurants),
        "matchedCount": len(restaurants),
        "unmatchedCount": 0,
        "restaurants": restaurants,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="광주 맛집 CSV를 앱에서 사용하는 JSON으로 변환합니다.")
    parser.add_argument("input", nargs="?", type=Path, default=DEFAULT_INPUT, help="입력 CSV 경로")
    parser.add_argument("output", nargs="?", type=Path, default=DEFAULT_OUTPUT, help="출력 JSON 경로")
    args = parser.parse_args()

    data = convert(read_csv(args.input))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{data['total']}개 음식점을 {args.output}에 저장했습니다.")


if __name__ == "__main__":
    main()
