# 2026 FetLife Member Filter

A Tampermonkey userscript for FetLife member lists (group members, place members, search
results). It hides the profiles you don't want before they appear on screen. You can filter
by gender, age, role, location, picture count and how recently someone was active.

The original goal was clearing out fake profiles with a single photo. It now also loads
several pages at once and filters across all of them, so you can work through thousands of
members in minutes instead of paging through them by hand.

**[Install the script](https://raw.githubusercontent.com/Biekdafreak/2026-Fetlife-Member-Filter-by-Biekdafreak/main/fetlife-member-filter.user.js)**
(you need Tampermonkey first; see below)

---

## Features

| Filter | What it does |
| --- | --- |
| **Age range** | Minimum and maximum age. |
| **Genders** | Checkbox for every gender FetLife lists, with [all] / [none] / [invert] shortcuts, plus a toggle for profiles with no gender set. |
| **Roles** | Same as genders, for every role FetLife lists (dom, domme, brat, bottom and so on). |
| **Location** | Text match against the member's location, e.g. `Kansas`. Leave it empty to turn it off. |
| **Pictures** | Hide profiles with no pictures, or set a minimum count. **Set it to 2 to drop single-photo fakes.** |
| **Videos / writings** | Only show profiles that have videos, or writings. |
| **Organizations** | Show or hide organization profiles. |
| **Last activity** | Hide members who haven't been active in the last N days, weeks, months or years. |

Other tools:

- **[load N more pages]** pulls the next 1–10 pages of the list into the current one, so the
  filters apply across all of them. The Next button picks up after the last page you loaded.
- **[check activity]** looks up when each visible member was last active. It only checks
  members who already pass your other filters, and it can be stopped at any time.
- **Card size %** enlarges member cards (100–250%) so photos are easier to see.
- **A status line** explains why members are hidden, e.g.
  `(52 hidden: 40 by your filters · 9 inactive · 3 not checked yet)`.
- **[Temporarily show all]** reveals everything without changing your settings.
- **No flicker.** Unwanted cards are hidden as they're inserted, including cards from merged
  pages, so they never show up even for a moment.
- **Works with FetLife's in-site navigation.** The panel appears on every member list, not
  only after a page refresh.

## Installation

1. Install **Tampermonkey** for your browser:
   [Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) ·
   [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/) ·
   [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
2. **Chrome / Edge only:** open `chrome://extensions`, click **Details** on Tampermonkey and
   turn on **Allow User Scripts**. On older Chrome versions, turn on **Developer mode** (top
   right) instead. Without this step, Tampermonkey won't run any scripts.
3. Click **[Install the script](https://raw.githubusercontent.com/Biekdafreak/2026-Fetlife-Member-Filter-by-Biekdafreak/main/fetlife-member-filter.user.js)**,
   then click **Install** in the Tampermonkey tab that opens.
4. Open any member list on FetLife. The **FilterLife** panel appears above the list.

**Updates are automatic.** Tampermonkey checks this repo for new versions, and your settings
carry over.

## Usage

1. Click **[Options]** on the FilterLife panel, set your filters and click **[Save & apply]**.
2. *(Optional)* Click **[load N more pages]** to pull in more of the list.
3. *(Optional, for the activity filter)* Set **Hide members inactive over** (for example
   `1 months`), then click **[check activity]** in the panel header.

### How the activity filter works

FetLife member cards don't show when someone was last active. To find out, the script opens
each member's activity page and reads the newest timestamp on it. In practice:

- **Set your other filters first.** Only members who pass them get checked, so a tight
  gender, age or picture filter saves a lot of requests.
- Results are **cached**. Each member is re-checked after a quarter of your window, clamped to
  between 1 and 30 days. With a 1-month window, that's about once a week.
- **Show members whose activity hasn't been checked yet**: with this off, unchecked members
  stay hidden until [check activity] reaches them. If the list looks almost empty, that's
  usually why. The status line will say so.
- **Delay between requests** (100–5000 ms, default 1200) and **Profiles to check per click**
  (0 = everyone on the page) let you trade speed against how busy you look to FetLife.

## Privacy and network behavior

- **Everything runs in your browser.** Settings and the activity cache are stored locally in
  Tampermonkey. There's no server, account, analytics or tracking.
- **The script only talks to fetlife.com**, using your existing session, and only when you
  click [load N more pages] or [check activity]. It makes no requests in the background.
- **It never sends requests in parallel.** They go one at a time with a randomized gap, and
  page loading is capped at 10 pages per click. FetLife is behind Cloudflare, and bursts of
  requests look like scraping.

## Limitations

- **FetLife caps how deep a list goes,** at around page 455 (roughly 9,000 members), even
  when the group or place is bigger. This can't be worked around. For a large place, use its
  **Places within** tab and filter city by city instead.
- **"Last active" counts any activity** on a member's activity page: posts, pictures, loves,
  comments, RSVPs, and so on.
- **Read FetLife's terms and decide for yourself.** The script does nothing you couldn't do
  by hand, and it's deliberately slow and click-only. Use it at your own risk.

## Troubleshooting

- **No panel appears.** Make sure Tampermonkey is installed and enabled, **Allow User
  Scripts** is on (step 2 above) and the script is switched on in the Tampermonkey dashboard.
  The Tampermonkey icon should show a **1** on fetlife.com.
- **"Barely anyone is showing."** Read the status line. Usually the activity filter is on
  with "show unchecked" off, so everyone stays hidden until you click [check activity].
- **Something broke after a FetLife update.** Please
  [open an issue](https://github.com/Biekdafreak/2026-Fetlife-Member-Filter-by-Biekdafreak/issues)
  and say which page it happened on.

## What this fork adds

Changes in this fork, building on the original filter (gender, age, role, location,
pictures):

- **2.01**: The panel now appears after FetLife's in-site navigation, not only after a refresh.
- **2.02**: Multi-page loading.
- **2.04**: Hidden members collapse out of the grid instead of leaving gaps.
- **2.05**: Pagination continues from the last loaded page.
- **2.06**: Card size control.
- **2.07**: Last-activity filter.
- **2.08**: Filtering stays fast with hundreds of cards loaded, since settings are cached in
  memory and not re-read for every card.
- **2.10–2.12**: Activity window in days, weeks, months or years, a lower delay floor, and a
  per-click limit you can set.
- **2.13–2.14**: Merged pages are filtered before they appear. Status line explains why
  members are hidden.

## Credits and license

The original script is by **Bull864** and **genevera**. This fork is maintained by
**[Biekdafreak](https://github.com/Biekdafreak)**.

Licensed under the **GNU General Public License v3.0**, the same license as the original. See
[LICENSE](LICENSE).
