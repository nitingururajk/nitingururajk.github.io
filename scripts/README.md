# Journey Ledger article experiments

The accompanying article is `posts/black-myth-wukong-achievement-tracker.html`.
Its measurements were captured on October 2, 2026 against tracker revision
`42b7c81bbf865c3265db7c0ce51f5b076a104de5`.

## Repeat the API checks

Use a stable .NET 10 SDK to run the [tracker repository](https://github.com/nitingururajk/black-myth-wukong-achievement-tracker)
on localhost:

```powershell
dotnet run --project .\bmw_web\bmw_web.csproj -- --urls http://127.0.0.1:5098
```

In another terminal, from this blog repository, run the standard-library Python script.
Use your own save directory, capture date, and inspected source revision:

```powershell
python .\scripts\wukong-experiments.py --save-dir "C:\path\to\your\save-samples" --output ".\results.json" --source-revision "<tracker-commit>" --date "YYYY-MM-DD"
```

The script submits every `.sav` file in that directory to a loopback server. It
checks the canonical 81 IDs, completion totals, and the response caching header,
then records counts, missing soak labels, and any NG+ completion fallbacks.
It also checks seven invalid-request cases. It fails on an unexpected response.
It does not modify saves or write their contents, player names, or account IDs
into the result file. Sample basenames are included in the output, so use neutral
fixture names if you plan to publish your results.

The article's seven original fixtures are private, untracked inputs from the
tracker workspace. They are not distributed with this blog. Running the script
on different saves will naturally give different completion counts.

## Screenshot and browser evidence

`assets/data/wukong-browser-checks.json` records the browser checks and screenshot
sizes. The landing-page screenshot was captured from the deployed tracker.
Report screenshots in `assets/images/wukong/` were captured in Chromium using
the real upload form and the local analysis endpoint, with animations disabled
for stable captures. No successful responses were mocked.

- Desktop viewport: 1440 × 1050; screenshots crop to the relevant sections.
- Mobile viewport: 390 × 844; the mobile image includes vertically stacked content.
- Player names were masked during capture. Achievement counts, labels, routes,
  and collection states are unchanged.
- The soak screenshot shows the expanded 27-row guide.
- Overview, missing items, soaks, and mobile: `near_perfect`.
- Missable route: `chapter3_midgame`.
- Completion ceremony: `ngplus_full_collection`.

The October run did not repeat the July runtime-table extraction documented
by the tracker repository. The article separates those historical findings from
the current save-analysis results. No platform account API was queried.
