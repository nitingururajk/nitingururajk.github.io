"""Reproduce the blog's local API checks without exporting save files or player names.

Start bmw_web, then run with --save-dir pointing at your own sample directory.
Only loopback servers are accepted. Uses the Python standard library.
"""

import argparse
import json
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request


def request(base, parts=None, raw=None):
    boundary = "wukong-blog-experiment-boundary"
    if raw is not None:
        body, content_type = raw, "application/json"
    else:
        body = b""
        for field, name, data in parts or []:
            body += (
                f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; '
                f'filename="{name}"\r\nContent-Type: application/octet-stream\r\n\r\n'
            ).encode() + data + b"\r\n"
        body += f"--{boundary}--\r\n".encode()
        content_type = f"multipart/form-data; boundary={boundary}"
    req = urllib.request.Request(
        base + "/api/analyze", data=body, headers={"Content-Type": content_type}
    )
    try:
        response = urllib.request.urlopen(req, timeout=60)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, dict(response.headers), json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--save-dir", type=Path, required=True)
    parser.add_argument("--base-url", default="http://127.0.0.1:5098")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--source-revision", required=True)
    parser.add_argument("--date", required=True, help="Capture date, YYYY-MM-DD")
    args = parser.parse_args()
    if urllib.parse.urlsplit(args.base_url).hostname not in {"127.0.0.1", "localhost", "::1"}:
        parser.error("Use a loopback server; these samples must stay on your computer.")

    samples = sorted(args.save_dir.glob("*.sav"))
    if not samples:
        parser.error("No .sav samples found.")
    rows = []
    for path in samples:
        status, headers, payload = request(args.base_url, [("saveFile", path.name, path.read_bytes())])
        assert status == 200 and payload["ok"], (path.name, status)
        report = payload["report"]
        achievements = report["achievements"]
        ids = [item["achievementId"] for item in achievements]
        assert ids == list(range(81001, 81082)), path.name
        assert report["totalAchievements"] == 81
        assert report["completedAchievements"] + report["incompleteAchievements"] == 81
        assert "no-store" in headers.get("Cache-Control", "")
        soak = next(item for item in achievements if item["achievementId"] == 81078)
        row = {
            "sample": path.stem,
            "bytes": path.stat().st_size,
            "status": status,
            "chapterId": report["currentChapterId"],
            "newGamePlusCount": report["newGamePlusCount"],
            "rawAchievementRows": report["rawAchievementCount"],
            "totalAchievements": report["totalAchievements"],
            "complete": report["completedAchievements"],
            "remaining": report["incompleteAchievements"],
            "absentPlatformRows": sum(not item["isPresentInSave"] for item in achievements),
            "displayedMissingTargets": sum(len(item["missingTargets"]) for item in achievements if not item["isComplete"]),
            "soaksCollected": sum(target["isCollected"] for target in soak["requirementTargets"]),
            "soaksTracked": len(soak["requirementTargets"]),
            "missingSoaks": [{"id": target["id"], "name": target["name"]} for target in soak["missingTargets"]],
            "ngPlusFallbacks": [item["displayTitle"] for item in achievements if any("resettable NG+" in step for step in item["steps"])],
            "canonicalIdsVerified": True,
            "responseNoStore": True,
        }
        rows.append(row)
        print(json.dumps({key: row[key] for key in ("sample", "rawAchievementRows", "complete", "remaining", "absentPlatformRows", "displayedMissingTargets", "soaksCollected", "ngPlusFallbacks")}))

    cases = [
        ("JSON instead of multipart", None, b"{}", 415),
        ("No file", [], None, 400),
        ("Two files", [("saveFile", "one.sav", b"x"), ("extra", "two.sav", b"x")], None, 400),
        ("Wrong extension", [("saveFile", "notes.txt", b"not a save")], None, 415),
        ("Empty save", [("saveFile", "empty.sav", b"")], None, 400),
        ("Undecodable save", [("saveFile", "invalid.sav", b"not a save")], None, 422),
        ("4 MiB plus one byte", [("saveFile", "oversize.sav", b"x" * (4 * 1024 * 1024 + 1))], None, 413),
    ]
    checks = []
    for name, parts, raw, expected in cases:
        status, _, payload = request(args.base_url, parts, raw)
        assert status == expected, (name, status, expected)
        assert payload["ok"] is False, name
        checks.append({"case": name, "expectedStatus": expected, "actualStatus": status, "error": payload["error"]})
    result = {
        "date": args.date,
        "sourceRevision": args.source_revision,
        "environment": "Local .NET 10 app; seven existing, untracked save fixtures. No platform account API was queried.",
        "method": "One real multipart upload per fixture, plus seven invalid-request checks. No save mutation or synthetic success responses.",
        "privacy": "Only aggregate counts and item labels are exported. Player names, paths, account IDs and save bytes are omitted.",
        "samples": rows,
        "invalidRequests": checks,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"Recorded {len(rows)} successful analyses and {len(checks)} rejected invalid requests.")


if __name__ == "__main__":
    main()
