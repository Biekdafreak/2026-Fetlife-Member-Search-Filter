// ==UserScript==
// @name         2026 Fetlife Member Filter
// @namespace    http://tampermonkey.net/
// @version      2.14
// @description  Filter FetLife member lists by gender, age, role, location, picture count and recent activity. Hides fake one-photo profiles, loads up to 10 pages at once, and filters cards before they render.
// @author       Bull864
// @author       genevera
// @author       Biekdafreak
// @match        https://fetlife.com/*
// @match        https://www.fetlife.com/*
// @updateURL    https://raw.githubusercontent.com/Biekdafreak/2026-Fetlife-Member-Filter-by-Biekdafreak/main/fetlife-member-filter.user.js
// @downloadURL  https://raw.githubusercontent.com/Biekdafreak/2026-Fetlife-Member-Filter-by-Biekdafreak/main/fetlife-member-filter.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=fetlife.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-start
// @license      GPLv3
// @homepageURL  https://github.com/Biekdafreak/2026-Fetlife-Member-Filter-by-Biekdafreak
// @supportURL   https://github.com/Biekdafreak/2026-Fetlife-Member-Filter-by-Biekdafreak/issues
// ==/UserScript==

(function () {
  "use strict";

  // ─── Constants ────────────────────────────────────────────────────────────

  const CARD_SELECTOR =
    "div.w-full.rounded-sm.cursor-pointer.transition.hover\\:bg-gray-950.focus\\:bg-gray-950.bg-gray-900";

  const AGE_MIN_FLOOR = 18;
  const AGE_MAX_CEIL = 120;

  const ALL_GENDERS = [
    "AG", "CD/TV", "Cis", "FEM", "FtM", "GF", "GL", "GN", "GNC", "GQ",
    "M", "F", "Masc", "MtF", "NB", "QG", "TFem", "TG", "TM", "TW",
    "TMasc", "TwoS", "W", "Man", "boy"
  ].sort();

  const ALL_ROLES = [
    "alpha submissive", "artist", "attention whore", "babygirl", "babyboy",
    "big", "bimbo", "bondage bottom", "bondage slut", "bondage switch",
    "bondage top", "bondmaid", "bootblack", "bottom", "brat", "brat tamer",
    "brat wrangler", "bull", "butler", "caregiver", "chew toy", "cock whore",
    "cougar", "cuckcake", "cuckold", "cuckoldress", "cuckquean", "cuddle slut",
    "cumdump", "cumslut", "daddy", "degradee", "degrader", "deity",
    "disciplinarian", "dom", "dom-leaning switch", "domme", "drag king",
    "drag queen", "edge player", "electro bottom", "electro switch",
    "electro top", "empress", "evolving", "exhibitionist", "fairy kink mother",
    "feminizer", "fetishist", "fox", "furry", "goddess", "good girl",
    "handler", "hedonist", "hotwife", "hucow", "kajira", "kajirus", "kitten",
    "king", "kinkster", "leather bottom", "leather daddy", "leather mommy",
    "leatherboy", "leatherboi", "leathergirl", "leatherman", "leatherperson",
    "leatherwoman", "little", "masochist", "master", "middle", "minion",
    "mistress", "mommy", "mommy dom", "muse", "needle bottom", "needle switch",
    "needle top", "owner", "pain slut", "perpetrator", "pet", "pig", "piggy",
    "pincushion", "plaything", "pony", "prince", "princess", "primal",
    "primal predator", "primal prey", "primal switch", "property", "pup",
    "queen", "rigger", "rope bottom", "rope bunny", "rope switch", "rope top",
    "rubberist", "sacrificial lamb", "sadist", "sadomasochist",
    "service bottom", "service slave", "service switch", "service top",
    "sissy", "slave", "slut", "soft domme", "spanker", "spankee", "spanko",
    "stag", "steer", "sub", "swinger", "switch", "tamer", "tickle switch",
    "ticklee", "tickler", "top", "toy", "trainer", "undecided", "unicorn",
    "vanilla", "victim", "vixen", "voyeur", "witch", "worshipper"
  ].sort();

  // ─── Default / Persisted Settings ─────────────────────────────────────────

  const DEFAULTS = {
    ageMin: AGE_MIN_FLOOR,
    ageMax: AGE_MAX_CEIL,
    genders: [...ALL_GENDERS],
    roles: [...ALL_ROLES],
    showNullGender: true,
    showNullRole: true,
    showOrgs: true,
    showOnlyWithPics: false,
    showOnlyWithVids: false,
    showOnlyWithWritings: false,
    locationFilter: "",
    minPics: 0,          // 0 = disabled, 2 = hide profiles with fewer than 2 pics
  };

  let settings = Object.assign({}, DEFAULTS, GM_getValue("FiLiSettings", {}));

  // ─── CSS: injected at document-start so cards are hidden before paint ──────

  GM_addStyle(`
    .fili-hidden {
      display: none !important;
    }
    #FiLiOptionsBox {
      padding: 10px;
      margin-bottom: 10px;
    }
    #FiLiMainContent {
      display: none;
    }
    #FiLiMainContent.fili-open {
      display: block;
    }
    .fili-numeric {
      width: 40px;
      background: #1a1a2e;
      border: 1px solid #4b5563;
      color: #d1d5db;
      border-radius: 3px;
      padding: 1px 4px;
      text-align: center;
    }
    .fili-text-input {
      width: 100%;
      background: #1a1a2e;
      border: 1px solid #4b5563;
      color: #d1d5db;
      border-radius: 3px;
      padding: 3px 6px;
      box-sizing: border-box;
    }
    .fili-section {
      margin-bottom: 12px;
    }
    .fili-section b {
      display: inline-block;
      margin-bottom: 4px;
    }
    .fili-action {
      cursor: pointer;
      color: #9ca3af;
      font-size: 0.8em;
      margin-left: 4px;
    }
    .fili-action:hover {
      color: #d1d5db;
    }
    .fili-checkbox-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 2px 12px;
      margin-top: 4px;
    }
    .fili-checkbox-grid label {
      white-space: nowrap;
      font-size: 0.85em;
      color: #d1d5db;
      cursor: pointer;
    }
    .fili-status {
      color: #9ca3af;
      font-size: 0.85em;
      margin-left: 8px;
    }
    .fili-save-btn {
      cursor: pointer;
      font-weight: bold;
      color: #ef4444;
    }
    .fili-save-btn:hover {
      color: #f87171;
    }
    .fili-unhide-btn {
      cursor: pointer;
      color: #6b7280;
      font-size: 0.8em;
      margin-left: 10px;
    }
    .fili-unhide-btn:hover {
      color: #9ca3af;
    }
    .fili-toggle {
      cursor: pointer;
      color: #6b7280;
      font-size: 0.85em;
      margin-left: 6px;
    }
    .fili-toggle:hover {
      color: #9ca3af;
    }
    .fili-inline-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .fili-small {
      font-size: 0.78em;
      color: #6b7280;
      margin-top: 2px;
    }
  `);

  // ─── Filtering Logic ───────────────────────────────────────────────────────

  // Labels FetLife shows that aren't in ALL_GENDERS / ALL_ROLES. These used to
  // pass through unfiltered, so anything uncatalogued silently defeated the
  // filter — "21BG" surviving a women-only selection. Treat them as
  // unspecified instead, governed by the existing "no specified …" toggles,
  // and log each new one once so the lists can be extended deliberately.
  const seenUnknownGenders = new Set();
  const seenUnknownRoles = new Set();

  function noteUnknown(seen, label, value) {
    if (seen.has(value)) return;
    seen.add(value);
    console.debug(`[FiLi] unrecognised ${label}: ${JSON.stringify(value)}`);
  }

  /**
   * Parse a card element and return whether it should be hidden.
   * Returns null if the card is an org card (handled separately).
   */
  function shouldHide(card) {
    const aslEl = card.querySelector("span.text-sm.font-bold.text-gray-300");

    // Org card path
    if (!aslEl) {
      const isOrg = !!card.querySelector('span[title^="Organization"]');
      if (isOrg && !settings.showOrgs) return true;
      return false;
    }

    const aslText = aslEl.innerText.trim();

    // Parse "25F Dom" → age=25, gender="F", role="Dom"
    const match = aslText.match(/^(\d+)([A-Za-z\/]+)?(?:\s+(.+))?$/);
    let age = null;
    let gender = "";
    let role = "";

    if (match) {
      age = Number(match[1]);
      gender = match[2] || "";
      role = (match[3] || "").trim();
    }

    // Location: second text div inside the flex-auto inner div
    const locationEl = card.querySelector(
      "div.flex-auto.max-w-full div.text-sm.font-normal.leading-normal.text-gray-300"
    );
    const location = locationEl ? locationEl.innerText.trim() : "";

    // Picture count: "20 pics" link
    const picsEl = card.querySelector('a[href$="/pictures"]');
    let picCount = 0;
    if (picsEl) {
      const picsMatch = picsEl.innerText.trim().match(/^(\d+)/);
      if (picsMatch) picCount = Number(picsMatch[1]);
    }

    // ── Age ──
    if (age === null || age < Number(settings.ageMin) || age > Number(settings.ageMax)) {
      return true;
    }

    // ── Gender ──
    if (gender !== "") {
      if (ALL_GENDERS.includes(gender)) {
        if (!settings.genders.includes(gender)) return true;
      } else {
        noteUnknown(seenUnknownGenders, "gender", gender);
        if (!settings.showNullGender) return true;
      }
    } else {
      if (!settings.showNullGender) return true;
    }

    // ── Role ──
    if (role !== "") {
      const roleLower = role.toLowerCase();
      if (ALL_ROLES.includes(roleLower)) {
        if (!settings.roles.includes(roleLower)) return true;
      } else {
        noteUnknown(seenUnknownRoles, "role", roleLower);
        if (!settings.showNullRole) return true;
      }
    } else {
      if (!settings.showNullRole) return true;
    }

    // ── Location ──
    if (settings.locationFilter.trim() !== "") {
      if (!location.toLowerCase().includes(settings.locationFilter.toLowerCase())) {
        return true;
      }
    }

    // ── Minimum pictures ──
    if (settings.minPics > 0) {
      if (picCount < settings.minPics) return true;
    }

    // ── Only with pics ──
    if (settings.showOnlyWithPics && picCount === 0) return true;

    // ── Only with vids ──
    if (settings.showOnlyWithVids && !card.querySelector('a[href$="/videos"]')) return true;

    // ── Only with writings ──
    if (settings.showOnlyWithWritings && !card.querySelector('a[href$="/posts"]')) return true;

    return false;
  }

  let hiddenCount = 0;

  // Why each hidden card was hidden, so the header can say whether it's the
  // regular filters or the activity filter doing the hiding. shouldHide sets
  // lastHideReason; it defaults to "filters" for the non-activity checks.
  const HIDE_LABELS = {
    filters: "by your filters",
    inactive: "inactive",
    unchecked: "not checked yet",
    noactivity: "no activity found"
  };
  let hiddenWhy = {};
  let lastHideReason = "filters";

  function resetHiddenCounts() {
    hiddenCount = 0;
    hiddenWhy = {};
  }

  function processCard(card) {
    if (card.dataset.filiProcessed === "true") return;
    card.dataset.filiProcessed = "true";

    lastHideReason = "filters";
    if (shouldHide(card)) {
      hideUnit(card).classList.add("fili-hidden");
      hiddenCount++;
      hiddenWhy[lastHideReason] = (hiddenWhy[lastHideReason] || 0) + 1;
    }

    updateStatus();
  }

  function processAllCards() {
    document.querySelectorAll(CARD_SELECTOR).forEach(processCard);
  }

  function updateStatus() {
    const el = document.getElementById("FiLiNumHidden");
    if (!el) return;
    if (!hiddenCount) {
      el.textContent = "";
      return;
    }
    const parts = Object.keys(HIDE_LABELS)
      .filter((k) => hiddenWhy[k])
      .map((k) => `${hiddenWhy[k]} ${HIDE_LABELS[k]}`);
    el.textContent = `(${hiddenCount} hidden: ${parts.join(" · ")})`;
  }

  // ─── MutationObserver: fires the instant cards exist in the DOM ────────────

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;

        // Node itself might be a card
        if (node.matches && node.matches(CARD_SELECTOR)) {
          processCard(node);
          continue;
        }

        // Or it might contain cards (e.g. a wrapper div added during infinite scroll)
        if (node.querySelectorAll) {
          node.querySelectorAll(CARD_SELECTOR).forEach(processCard);
        }
      }
    }
  });

  // Observe <html>, not <body>. FetLife navigates without a page load and can
  // swap in a brand-new <body>; an observer on the old body then goes deaf, so
  // cards added afterwards (merged pages, infinite scroll) went unfiltered
  // until something else re-ran the filter. <html> survives those swaps.
  //
  // Start once the document is parsed, though, not at document-start: during
  // parsing a card can be reported before its children exist, get judged on
  // half its text, and be marked processed for good. buildUI's processAllCards
  // covers the cards that were already parsed by then.
  function startObserver() {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  function buildUI() {
    // Don't insert twice
    if (document.getElementById("FiLiOptionsBox")) return;

    const referenceNode = document.querySelector(
      "header.items-end, header.pb-1, header.mb-2, header.border-b"
    );
    if (!referenceNode) return;

    // ── Checkbox grid builder ──
    function checkboxGrid(items, idPrefix, checkedList) {
      return items
        .map(
          (item) =>
            `<label class="fili-cb-label">
              <input type="checkbox" id="${idPrefix}_${item.replace(/\s+/g, "_")}"
                ${checkedList.includes(item) ? "checked" : ""}>
              ${item}
            </label>`
        )
        .join("");
    }

    const box = document.createElement("div");
    box.id = "FiLiOptionsBox";
    box.className = "rounded-sm transition hover:bg-gray-950 focus:bg-gray-950 bg-gray-900";

    box.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="font-weight:bold;color:#ef4444;">FilterLife</span>
        <span id="FiLiNumHidden" class="fili-status"></span>
        <span class="fili-toggle" id="FiLiToggle">[Options]</span>
        <span class="fili-unhide-btn" id="FiLiUnhide">[Temporarily show all]</span>
      </div>

      <div id="FiLiMainContent">
        <hr style="border-color:#374151;margin:10px 0;" />

        <div class="fili-section">
          <b>Age range</b><br />
          From
          <input type="number" class="fili-numeric" id="FiLiAgeMin"
            min="${AGE_MIN_FLOOR}" max="${AGE_MAX_CEIL}" value="${settings.ageMin}" />
          to
          <input type="number" class="fili-numeric" id="FiLiAgeMax"
            min="${AGE_MIN_FLOOR}" max="${AGE_MAX_CEIL}" value="${settings.ageMax}" />
          years old
        </div>

        <div class="fili-section">
          <b>Genders</b>
          <span class="fili-action" id="FiLiGendersAll">[all]</span>
          <span class="fili-action" id="FiLiGendersNone">[none]</span>
          <span class="fili-action" id="FiLiGendersInv">[invert]</span>
          <div class="fili-checkbox-grid" id="FiLiGenderGrid">
            ${checkboxGrid(ALL_GENDERS, "FiLiGender", settings.genders)}
          </div>
          <div style="margin-top:6px;">
            <label>
              <input type="checkbox" id="FiLiGender_Null" ${settings.showNullGender ? "checked" : ""}>
              Show profiles with no specified gender
            </label>
          </div>
        </div>

        <div class="fili-section">
          <b>Roles</b>
          <span class="fili-action" id="FiLiRolesAll">[all]</span>
          <span class="fili-action" id="FiLiRolesNone">[none]</span>
          <span class="fili-action" id="FiLiRolesInv">[invert]</span>
          <div class="fili-checkbox-grid" id="FiLiRoleGrid">
            ${checkboxGrid(ALL_ROLES, "FiLiRole", settings.roles)}
          </div>
          <div style="margin-top:6px;">
            <label>
              <input type="checkbox" id="FiLiRole_Null" ${settings.showNullRole ? "checked" : ""}>
              Show profiles with no specified role
            </label>
          </div>
        </div>

        <div class="fili-section">
          <b>Location filter</b><br />
          <input type="text" class="fili-text-input" id="FiLiLocationFilter"
            value="${settings.locationFilter}"
            placeholder="e.g. Kansas — leave empty to disable" />
          <div class="fili-small">Case-insensitive. Only profiles whose location contains this text will be shown.</div>
        </div>

        <div class="fili-section">
          <b>Picture filter</b><br />
          <div class="fili-inline-row">
            <label>
              <input type="checkbox" id="FiLiShowOnlyWithPics" ${settings.showOnlyWithPics ? "checked" : ""}>
              Only show profiles with at least 1 picture
            </label>
          </div>
          <div class="fili-inline-row" style="margin-top:6px;">
            <label for="FiLiMinPics">Minimum pictures:</label>
            <input type="number" class="fili-numeric" id="FiLiMinPics"
              min="0" max="9999" value="${settings.minPics}" />
            <span class="fili-small">(0 = disabled)</span>
          </div>
          <div class="fili-small">Set to 2 to hide profiles with only 1 picture. Overrides the checkbox above when set higher.</div>
        </div>

        <div class="fili-section">
          <b>Other filters</b><br />
          <label>
            <input type="checkbox" id="FiLiShowOrgs" ${settings.showOrgs ? "checked" : ""}>
            Show organization profiles
          </label><br />
          <label>
            <input type="checkbox" id="FiLiShowOnlyWithVids" ${settings.showOnlyWithVids ? "checked" : ""}>
            Only show profiles with videos
          </label><br />
          <label>
            <input type="checkbox" id="FiLiShowOnlyWithWritings" ${settings.showOnlyWithWritings ? "checked" : ""}>
            Only show profiles with writings
          </label>
        </div>

        <div>
          <span class="fili-save-btn" id="FiLiSaveButton">[Save &amp; apply]</span>
          <span class="fili-unhide-btn" id="FiLiUnhide2">[Temporarily show all hidden]</span>
        </div>
      </div>
    `;

    referenceNode.insertAdjacentElement("afterend", box);
    bindUIEvents();

    // Do an immediate pass in case cards already exist in the DOM
    processAllCards();
  }

  function bindUIEvents() {
    // Toggle options panel
    document.getElementById("FiLiToggle").onclick = () => {
      document.getElementById("FiLiMainContent").classList.toggle("fili-open");
    };

    // Save
    document.getElementById("FiLiSaveButton").onclick = saveAndApply;

    // Temporarily unhide (both buttons)
    function doUnhide() {
      document.querySelectorAll(".fili-hidden").forEach((el) => {
        el.classList.remove("fili-hidden");
        el.style.outline = "2px solid #ef4444";
      });
      resetHiddenCounts();
      updateStatus();
      document.getElementById("FiLiMainContent").classList.remove("fili-open");
    }
    document.getElementById("FiLiUnhide").onclick = doUnhide;
    document.getElementById("FiLiUnhide2").onclick = doUnhide;

    // Gender bulk actions
    function genderCBs() {
      return document.querySelectorAll('input[type=checkbox][id^="FiLiGender_"]');
    }
    function roleCBs() {
      return document.querySelectorAll('input[type=checkbox][id^="FiLiRole_"]');
    }

    document.getElementById("FiLiGendersAll").onclick = () =>
      genderCBs().forEach((cb) => (cb.checked = true));
    document.getElementById("FiLiGendersNone").onclick = () =>
      genderCBs().forEach((cb) => (cb.checked = false));
    document.getElementById("FiLiGendersInv").onclick = () =>
      genderCBs().forEach((cb) => (cb.checked = !cb.checked));

    document.getElementById("FiLiRolesAll").onclick = () =>
      roleCBs().forEach((cb) => (cb.checked = true));
    document.getElementById("FiLiRolesNone").onclick = () =>
      roleCBs().forEach((cb) => (cb.checked = false));
    document.getElementById("FiLiRolesInv").onclick = () =>
      roleCBs().forEach((cb) => (cb.checked = !cb.checked));
  }

  // ─── Save & Re-apply ──────────────────────────────────────────────────────

  function saveAndApply() {
    // Age
    let ageMin = Number(document.getElementById("FiLiAgeMin").value);
    let ageMax = Number(document.getElementById("FiLiAgeMax").value);
    if (isNaN(ageMin) || ageMin < AGE_MIN_FLOOR) ageMin = AGE_MIN_FLOOR;
    if (isNaN(ageMax) || ageMax > AGE_MAX_CEIL) ageMax = AGE_MAX_CEIL;
    settings.ageMin = ageMin;
    settings.ageMax = ageMax;

    // Genders
    const genderCBs = document.querySelectorAll(
      'input[type=checkbox][id^="FiLiGender_"]:not(#FiLiGender_Null)'
    );
    settings.genders = [];
    genderCBs.forEach((cb) => {
      if (cb.checked) {
        // Recover original gender string from the label text
        settings.genders.push(cb.parentElement.textContent.trim());
      }
    });
    settings.showNullGender = document.getElementById("FiLiGender_Null").checked;

    // Roles
    const roleCBs = document.querySelectorAll(
      'input[type=checkbox][id^="FiLiRole_"]:not(#FiLiRole_Null)'
    );
    settings.roles = [];
    roleCBs.forEach((cb) => {
      if (cb.checked) {
        settings.roles.push(cb.parentElement.textContent.trim().toLowerCase());
      }
    });
    settings.showNullRole = document.getElementById("FiLiRole_Null").checked;

    // Location
    settings.locationFilter = document.getElementById("FiLiLocationFilter").value.trim();

    // Pics
    settings.showOnlyWithPics = document.getElementById("FiLiShowOnlyWithPics").checked;
    const minPics = Number(document.getElementById("FiLiMinPics").value);
    settings.minPics = isNaN(minPics) || minPics < 0 ? 0 : minPics;

    // Other
    settings.showOrgs = document.getElementById("FiLiShowOrgs").checked;
    settings.showOnlyWithVids = document.getElementById("FiLiShowOnlyWithVids").checked;
    settings.showOnlyWithWritings = document.getElementById("FiLiShowOnlyWithWritings").checked;

    GM_setValue("FiLiSettings", settings);

    // Re-filter in place — no page reload needed
    reapplyFilter();

    // Close the panel
    document.getElementById("FiLiMainContent").classList.remove("fili-open");
  }

  /**
   * Re-evaluate every already-processed card against the current settings.
   * Resets processed state so shouldHide() runs fresh.
   */
  function reapplyFilter() {
    resetHiddenCounts();
    document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      card.dataset.filiProcessed = undefined;
      delete card.dataset.filiProcessed;
      const unit = hideUnit(card);
      unit.classList.remove("fili-hidden");
      unit.style.outline = "";
    });
    processAllCards();
  }

  // ─── Multi-page loading ───────────────────────────────────────────────────
  //
  // FetLife paginates member lists at 20 and renders them server-side, so an
  // aggressive filter can leave two or three visible people per page and turn
  // browsing into clicking. This pulls the next few pages in the background and
  // merges their cards into the current list, so the filter works across the
  // whole set at once.
  //
  // Requests are same-origin and carry the normal session, but they are still
  // requests, and FetLife sits behind Cloudflare: a burst of rapid page loads
  // looks like scraping. So they are strictly sequential, spaced with jitter,
  // capped, and only ever fired by an explicit click.

  const PAGES_KEY = "FiLiPagesToLoad";
  const PAGE_MIN_DELAY_MS = 900;
  const PAGE_MAX_DELAY_MS = 1800;
  const PAGE_LIMIT = 10;

  let loadingPages = false;

  // How far the merged list actually reaches. The paginator still points at the
  // page we started on, so without this "Next" walks back through members we
  // already pulled in, and a second click refetches the same pages.
  let loadedThroughPage = null;
  let loadedForBase = null;

  function currentBase() {
    const u = new URL(location.href);
    u.searchParams.delete("page");
    return u.toString();
  }

  /** Where the next fetch should start: after whatever we last merged. */
  function startPage() {
    const base = currentBase();
    if (loadedForBase !== base || typeof loadedThroughPage !== "number") {
      loadedForBase = base;
      loadedThroughPage = Number(
        new URL(location.href).searchParams.get("page") || 1
      );
    }
    return loadedThroughPage;
  }

  /** Point the paginator past everything already on screen. */
  function retargetPagination() {
    if (typeof loadedThroughPage !== "number") return;
    const next = [...document.querySelectorAll("a")].find((a) =>
      /^next\s*>?$/i.test(a.textContent.trim())
    );
    if (!next) return;
    const u = new URL(location.href);
    u.searchParams.set("page", String(loadedThroughPage + 1));
    next.setAttribute("href", u.pathname + u.search);
    next.dataset.filiNext = String(loadedThroughPage + 1);
  }

  function getPagesToLoad() {
    const n = Number(GM_getValue(PAGES_KEY, 3));
    return Math.min(PAGE_LIMIT, Math.max(1, isFinite(n) && n ? n : 3));
  }

  /**
   * A card may sit inside a per-card wrapper that carries its spacing. Climb
   * from one card until the parent holds more than one, so we append the same
   * repeating unit the page itself uses and inherit its layout.
   */
  function listShape() {
    const card = document.querySelector(CARD_SELECTOR);
    if (!card) return null;
    let unit = card;
    let depth = 0;
    while (
      unit.parentElement &&
      unit.parentElement.querySelectorAll(CARD_SELECTOR).length <= 1
    ) {
      unit = unit.parentElement;
      depth += 1;
    }
    return unit.parentElement ? { container: unit.parentElement, depth } : null;
  }

  function climb(node, depth) {
    let n = node;
    for (let i = 0; i < depth && n.parentElement; i += 1) n = n.parentElement;
    return n;
  }

  // Cards sit inside a wrapper that owns the grid cell and its margins, so
  // hiding the card alone empties the cell while the wrapper keeps holding the
  // slot — which is what left gaps in the two-column layout. Hide the wrapper.
  var unitDepthCache = null;

  function unitDepth() {
    if (typeof unitDepthCache !== "number") {
      const shape = listShape();
      unitDepthCache = shape ? shape.depth : 0;
    }
    return unitDepthCache;
  }

  /** The element that should actually be hidden for a given card. */
  function hideUnit(card) {
    return climb(card, unitDepth());
  }

  /** Stable per-member key, so a re-fetched page can't duplicate anyone. */
  function cardKey(unit) {
    const pics = unit.querySelector('a[href$="/pictures"]');
    if (pics) return pics.getAttribute("href").replace(/\/pictures$/, "");
    const any = unit.querySelector('a[href^="/"]');
    if (any) return any.getAttribute("href");
    return unit.textContent.trim().slice(0, 120);
  }

  function seenKeys(depth) {
    const set = new Set();
    document
      .querySelectorAll(CARD_SELECTOR)
      .forEach((c) => set.add(cardKey(climb(c, depth))));
    return set;
  }

  function setPageStatus(msg) {
    const el = document.getElementById("FiLiPageStatus");
    if (el) el.textContent = msg;
  }

  async function loadMorePages() {
    if (loadingPages) return;

    const shape = listShape();
    if (!shape) {
      setPageStatus("no member list here");
      return;
    }

    loadingPages = true;
    const btn = document.getElementById("FiLiLoadPages");
    if (btn) btn.textContent = "[loading…]";

    const wanted = getPagesToLoad();
    const seen = seenKeys(shape.depth);
    const url = new URL(location.href);
    let page = startPage();
    let added = 0;
    let note = "";

    try {
      for (let i = 0; i < wanted; i += 1) {
        page += 1;
        setPageStatus(`fetching page ${page}…`);
        url.searchParams.set("page", String(page));

        const res = await fetch(url.toString(), { credentials: "same-origin" });
        if (!res.ok) {
          note = `page ${page} returned ${res.status} — stopped`;
          break;
        }

        const doc = new DOMParser().parseFromString(await res.text(), "text/html");
        const cards = doc.querySelectorAll(CARD_SELECTOR);
        if (!cards.length) {
          note = `no more results after page ${page - 1}`;
          break;
        }

        const frag = document.createDocumentFragment();
        const pending = [];
        cards.forEach((c) => {
          const unit = climb(c, shape.depth);
          const key = cardKey(unit);
          if (seen.has(key)) return;
          seen.add(key);
          const imported = document.importNode(unit, true);
          imported.classList.add("fili-hidden");
          frag.appendChild(imported);
          pending.push(imported);
          added += 1;
        });
        shape.container.appendChild(frag);
        // Arrive hidden, then judge each card in this same task, so nothing
        // paints in between and a rejected member never flashes. Judging must
        // happen while attached and visible: on a detached or hidden node
        // innerText falls back to raw textContent, whose line breaks can break
        // the "35F sub" parse and hide the card as ageless (v2.13 did that).
        pending.forEach((u) => {
          const card = u.matches(CARD_SELECTOR) ? u : u.querySelector(CARD_SELECTOR);
          u.classList.remove("fili-hidden");
          if (card) processCard(card);
        });
        loadedThroughPage = page;

        if (i < wanted - 1) {
          await new Promise((r) =>
            setTimeout(
              r,
              PAGE_MIN_DELAY_MS +
                Math.random() * (PAGE_MAX_DELAY_MS - PAGE_MIN_DELAY_MS)
            )
          );
        }
      }

      processAllCards();
      updateStatus();
      retargetPagination();
      const reach =
        typeof loadedThroughPage === "number" ? ` · through p${loadedThroughPage}` : "";
      setPageStatus((note || (added ? `added ${added}` : "nothing new")) + reach);
    } catch (err) {
      setPageStatus(`failed: ${err.message}`);
    } finally {
      loadingPages = false;
      const b = document.getElementById("FiLiLoadPages");
      if (b) b.textContent = `[load ${getPagesToLoad()} more pages]`;
    }
  }

  /** Adds the loader button and its page-count setting to the existing panel. */
  function injectPageLoaderUI() {
    const box = document.getElementById("FiLiOptionsBox");
    if (!box || document.getElementById("FiLiLoadPages")) return;

    const load = document.createElement("span");
    load.className = "fili-unhide-btn";
    load.id = "FiLiLoadPages";
    load.textContent = `[load ${getPagesToLoad()} more pages]`;
    load.onclick = loadMorePages;

    const status = document.createElement("span");
    status.className = "fili-status";
    status.id = "FiLiPageStatus";

    const check = document.createElement("span");
    check.className = "fili-unhide-btn";
    check.id = "FiLiCheckActivity";
    check.textContent = "[check activity]";
    check.onclick = checkActivity;

    const actStatus = document.createElement("span");
    actStatus.className = "fili-status";
    actStatus.id = "FiLiActStatus";

    const unhide = document.getElementById("FiLiUnhide");
    if (unhide) {
      unhide.insertAdjacentElement("afterend", load);
      load.insertAdjacentElement("afterend", status);
      status.insertAdjacentElement("afterend", check);
      check.insertAdjacentElement("afterend", actStatus);
    } else {
      box.appendChild(load);
      box.appendChild(status);
      box.appendChild(check);
      box.appendChild(actStatus);
    }

    const main = document.getElementById("FiLiMainContent");
    if (main && !document.getElementById("FiLiPagesInput")) {
      const sec = document.createElement("div");
      sec.className = "fili-section";
      sec.innerHTML = `
        <div class="fili-inline-row">
          <label class="fili-small">Pages to pull per click</label>
          <input type="number" class="fili-numeric" id="FiLiPagesInput"
                 min="1" max="${PAGE_LIMIT}" value="${getPagesToLoad()}">
        </div>
        <div class="fili-small">
          Fetched one at a time, about a second apart, to stay out of Cloudflare's way.
        </div>
        <div class="fili-inline-row" style="margin-top:8px;">
          <label class="fili-small">Card size %</label>
          <input type="number" class="fili-numeric" id="FiLiScaleInput"
                 min="${SCALE_MIN}" max="${SCALE_MAX}" step="10"
                 value="${getCardScale()}">
        </div>
        <div class="fili-small">
          Scales each member card — photo, text and Follow button together.
          Takes effect as you type; no need to save.
        </div>
        <div class="fili-inline-row" style="margin-top:8px;">
          <label class="fili-small">Hide members inactive over</label>
          <input type="number" class="fili-numeric" id="FiLiYearsInput"
                 min="0" max="999" step="1" value="${getInactiveAmount()}">
          <select class="fili-numeric" id="FiLiInactiveUnit" style="width:auto;">
            ${Object.keys(UNIT_MS).map((u) =>
              `<option value="${u}" ${u === getInactiveUnit() ? "selected" : ""}>${u}</option>`
            ).join("")}
          </select>
          <span class="fili-small">(0 = off)</span>
        </div>
        <div style="margin-top:4px;">
          <label class="fili-small">
            <input type="checkbox" id="FiLiUnknownAct"
                   ${getShowUnknownActivity() ? "checked" : ""}>
            Show members whose activity hasn't been checked yet
          </label>
        </div>
        <div class="fili-small">
          Recency comes from each member's activity page — one request each,
          spaced by the delay below, up to the per-click limit below. Each answer is
          re-checked after a quarter of the window above (1–30 days), so a short
          window stays accurate.
          Set your other filters first, then use [check activity] in the header:
          only members that survived those get looked up.
        </div>
        <div class="fili-inline-row" style="margin-top:6px;">
          <label class="fili-small">Delay between requests (ms)</label>
          <input type="number" class="fili-numeric" id="FiLiDelayInput"
                 min="100" max="5000" step="50" value="${getActDelay()}">
        </div>
        <div class="fili-inline-row" style="margin-top:6px;">
          <label class="fili-small">Profiles to check per click</label>
          <input type="number" class="fili-numeric" id="FiLiPerRunInput"
                 min="0" max="${ACT_PER_RUN_MAX}" step="10" value="${getActPerRun()}">
          <span class="fili-small">(0 = everyone on the page)</span>
        </div>
        <div class="fili-small">
          Lower is faster and more conspicuous. Wall-clock speed is just request
          rate, and request rate is the thing Cloudflare watches — this is the
          trade, made explicit.
        </div>
      `;
      main.insertBefore(sec, main.firstChild);

      const perRunInput = sec.querySelector("#FiLiPerRunInput");
      perRunInput.onchange = () => {
        const raw = Number(perRunInput.value);
        const n = isFinite(raw) ? Math.min(ACT_PER_RUN_MAX, Math.max(0, Math.round(raw))) : 0;
        perRunInput.value = String(n);
        GM_setValue(ACT_PER_RUN_KEY, n);
      };

      const delayInput = sec.querySelector("#FiLiDelayInput");
      delayInput.onchange = () => {
        const n = Math.min(5000, Math.max(100, Number(delayInput.value) || 1200));
        delayInput.value = String(n);
        GM_setValue(ACT_DELAY_KEY, n);
      };

      const yearsInput = sec.querySelector("#FiLiYearsInput");
      yearsInput.onchange = () => {
        const n = Math.min(999, Math.max(0, Number(yearsInput.value) || 0));
        yearsInput.value = String(n);
        GM_setValue(ACT_YEARS_KEY, n);
        invalidateActSettings();
        reapplyFilter();
      };

      const unitSelect = sec.querySelector("#FiLiInactiveUnit");
      unitSelect.onchange = () => {
        GM_setValue(ACT_UNIT_KEY, unitSelect.value);
        invalidateActSettings();
        reapplyFilter();
      };

      const unknownCb = sec.querySelector("#FiLiUnknownAct");
      unknownCb.onchange = () => {
        GM_setValue(ACT_UNKNOWN_KEY, unknownCb.checked);
        invalidateActSettings();
        reapplyFilter();
      };

      const scaleInput = sec.querySelector("#FiLiScaleInput");
      scaleInput.oninput = () => {
        const n = Math.min(
          SCALE_MAX,
          Math.max(SCALE_MIN, Number(scaleInput.value) || SCALE_DEFAULT)
        );
        GM_setValue(SCALE_KEY, n);
        applyCardScale(n);
      };

      const input = sec.querySelector("#FiLiPagesInput");
      input.onchange = () => {
        const n = Math.min(PAGE_LIMIT, Math.max(1, Number(input.value) || 1));
        input.value = String(n);
        GM_setValue(PAGES_KEY, n);
        const b = document.getElementById("FiLiLoadPages");
        if (b && !loadingPages) b.textContent = `[load ${n} more pages]`;
      };
    }
  }

  // Wrap the panel builder so the loader controls appear with it, including
  // after every SPA navigation.
  const originalBuildUI = buildUI;
  buildUI = function buildUIWithPageLoader() {
    applyCardScale(getCardScale());
    unitDepthCache = null; // re-measure: a different route may nest differently
    loadedThroughPage = null;
    loadedForBase = null;
    originalBuildUI();
    injectPageLoaderUI();
  };

  // ─── Card scale ───────────────────────────────────────────────────────────
  //
  // FetLife caps member rows at a 60px thumbnail. Rather than resize the photo
  // alone and leave the name, location and Follow button at their original
  // size, scale the whole card: `zoom` grows every part together and, unlike a
  // transform, it reflows the layout so the grid stays honest.

  const SCALE_KEY = "FiLiCardScale";
  const SCALE_DEFAULT = 100;
  const SCALE_MIN = 100;
  const SCALE_MAX = 250;

  function getCardScale() {
    const n = Number(GM_getValue(SCALE_KEY, SCALE_DEFAULT));
    return Math.min(
      SCALE_MAX,
      Math.max(SCALE_MIN, isFinite(n) && n ? n : SCALE_DEFAULT)
    );
  }

  function applyCardScale(percent) {
    document.documentElement.style.setProperty(
      "--fili-card-scale",
      String(percent / 100)
    );
  }

  GM_addStyle(`
    :root { --fili-card-scale: 1; }
    ${CARD_SELECTOR} { zoom: var(--fili-card-scale); }
  `);

  applyCardScale(getCardScale());

  // ─── Last-activity filter ─────────────────────────────────────────────────
  //
  // Recency is not on the member cards, so it has to come from each member's
  // /activity page — one request per person. That is a far heavier footprint
  // than anything else here, so it is kept deliberately cheap:
  //
  //   * only members who already survived every other filter are checked,
  //     so tightening the cheap filters first shrinks this enormously
  //   * answers are cached for 30 days; "inactive for 2 years" does not
  //     change meaningfully within a month
  //   * strictly sequential, jittered, capped per run, abortable
  //   * never automatic — it runs on an explicit click
  //
  // Each /activity page carries ISO timestamps in <time datetime="…">. We take
  // the newest one on the page rather than the first in document order, since
  // the markup does not guarantee the feed is sorted.

  const ACT_CACHE_KEY = "FiLiActivityCache";
  // Holds the inactivity amount; the unit lives in ACT_UNIT_KEY. The key keeps
  // its old name so a value saved when this setting was years-only still
  // means the same thing (the unit defaults to years).
  const ACT_YEARS_KEY = "FiLiInactiveYears";
  const ACT_UNIT_KEY = "FiLiInactiveUnit";
  const ACT_UNKNOWN_KEY = "FiLiShowUnknownActivity";
  const DAY_MS = 24 * 60 * 60 * 1000;
  // Profiles checked per [check activity] click; 0 = every eligible member on
  // the page. Was a fixed 40, which made a 100-member page take three clicks.
  const ACT_PER_RUN_KEY = "FiLiActPerRun";
  const ACT_PER_RUN_MAX = 1000;

  function getActPerRun() {
    const n = Number(GM_getValue(ACT_PER_RUN_KEY, 0));
    return isFinite(n) && n > 0 ? Math.min(ACT_PER_RUN_MAX, Math.round(n)) : 0;
  }
  const UNIT_MS = {
    days: DAY_MS,
    weeks: 7 * DAY_MS,
    months: 30.44 * DAY_MS,
    years: 365.25 * DAY_MS
  };

  const ACT_DELAY_KEY = "FiLiActDelayMs";

  let checkingActivity = false;
  let abortActivity = false;

  // shouldHide() runs per card on every reapply, so reading these from GM
  // storage each time meant dozens of synchronous storage hits per filter
  // change. Read once, invalidate when they actually change.
  let actSettings = null;

  function actConfig() {
    if (!actSettings) {
      actSettings = {
        thresholdMs: getInactiveAmount() * UNIT_MS[getInactiveUnit()],
        showUnknown: getShowUnknownActivity()
      };
    }
    return actSettings;
  }

  function invalidateActSettings() {
    actSettings = null;
  }

  function getActDelay() {
    const n = Number(GM_getValue(ACT_DELAY_KEY, 1200));
    return Math.min(5000, Math.max(100, isFinite(n) && n ? n : 1200));
  }

  let activityCache = (() => {
    try {
      return JSON.parse(GM_getValue(ACT_CACHE_KEY, "{}")) || {};
    } catch (e) {
      return {};
    }
  })();

  function saveActivityCache() {
    try {
      GM_setValue(ACT_CACHE_KEY, JSON.stringify(activityCache));
    } catch (e) {
      /* quota — the cache is an optimisation, not state we must keep */
    }
  }

  function getInactiveAmount() {
    const n = Number(GM_getValue(ACT_YEARS_KEY, 0));
    return isFinite(n) && n > 0 ? Math.min(999, n) : 0;
  }

  function getInactiveUnit() {
    const u = GM_getValue(ACT_UNIT_KEY, "years");
    return Object.prototype.hasOwnProperty.call(UNIT_MS, u) ? u : "years";
  }

  /**
   * How long a cached answer is trusted. A fixed 30 days was fine for a
   * multi-year window but let a one-month window show people who went quiet
   * weeks ago, so re-check after a quarter of the window, within 1–30 days.
   */
  function actTtlMs() {
    const t = actConfig().thresholdMs;
    if (!t) return 30 * DAY_MS;
    return Math.min(30 * DAY_MS, Math.max(DAY_MS, t / 4));
  }

  function getShowUnknownActivity() {
    return GM_getValue(ACT_UNKNOWN_KEY, true) !== false;
  }

  /** Profile path for a card, e.g. "/someuser". */
  function profilePath(card) {
    const key = cardKey(card);
    return typeof key === "string" && key.startsWith("/") ? key : null;
  }

  /**
   * Newest timestamp in an activity page's raw HTML.
   *
   * Scanned with a regex rather than DOMParser: building a full document for
   * every profile was the bulk of the per-member cost, and all we want is the
   * largest datetime on the page. Same answer, a fraction of the work.
   */
  const DATETIME_RE = /datetime="([^"]+)"/g;

  function latestActivityFrom(html) {
    let newest = null;
    let m;
    DATETIME_RE.lastIndex = 0;
    while ((m = DATETIME_RE.exec(html)) !== null) {
      const ms = Date.parse(m[1]);
      if (!isNaN(ms) && (newest === null || ms > newest)) newest = ms;
    }
    return newest;
  }

  /**
   * Why the activity filter hides this card, or null if it doesn't:
   * "inactive" (checked, last activity too old), "unchecked" (not looked up
   * yet) or "noactivity" (looked up, but no timestamp was found or the page
   * failed to load). The last two only hide when "show unchecked" is off.
   */
  function activityReason(card) {
    const cfg = actConfig();
    if (!cfg.thresholdMs) return null;

    const path = profilePath(card);
    if (!path) return cfg.showUnknown ? null : "unchecked";

    const hit = activityCache[path];
    if (!hit) return cfg.showUnknown ? null : "unchecked";
    if (typeof hit.ts !== "number") return cfg.showUnknown ? null : "noactivity";

    return Date.now() - hit.ts > cfg.thresholdMs ? "inactive" : null;
  }

  /** True when this card should be hidden for inactivity. */
  function hiddenByActivity(card) {
    return activityReason(card) !== null;
  }

  function setActivityStatus(msg) {
    const el = document.getElementById("FiLiActStatus");
    if (el) el.textContent = msg;
  }

  async function checkActivity() {
    if (checkingActivity) {
      abortActivity = true;
      return;
    }

    const depth = unitDepth();
    const targets = new Set();
    const ttl = actTtlMs();
    document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      // Skip members the other filters reject, but not ones hidden only
      // because their activity is unknown or stale. Checking the hidden class
      // instead meant that with "show unchecked" off, nobody ever got checked.
      if (originalShouldHide(card)) return;
      const path = profilePath(card);
      if (!path) return;
      const hit = activityCache[path];
      if (hit && Date.now() - hit.checked < ttl) return;
      targets.add(path);
    });

    const cap = getActPerRun();
    const list = cap ? [...targets].slice(0, cap) : [...targets];
    if (!list.length) {
      setActivityStatus("nothing new to check");
      reapplyFilter();
      return;
    }

    checkingActivity = true;
    abortActivity = false;
    const btn = document.getElementById("FiLiCheckActivity");
    if (btn) btn.textContent = "[stop]";

    let done = 0;
    const actDelay = getActDelay();
    try {
      for (const path of list) {
        if (abortActivity) break;
        setActivityStatus(`checking ${done + 1}/${list.length}…`);

        try {
          const res = await fetch(location.origin + path + "/activity", {
            credentials: "same-origin"
          });
          if (res.ok) {
            activityCache[path] = {
              ts: latestActivityFrom(await res.text()),
              checked: Date.now()
            };
          } else {
            // Record the attempt so a dead profile isn't retried all session.
            activityCache[path] = { ts: null, checked: Date.now() };
          }
        } catch (e) {
          activityCache[path] = { ts: null, checked: Date.now() };
        }

        done += 1;
        if (done < list.length && !abortActivity) {
          await new Promise((r) =>
            setTimeout(r, actDelay + Math.random() * actDelay * 0.4)
          );
        }
      }
    } finally {
      saveActivityCache();
      checkingActivity = false;
      const b = document.getElementById("FiLiCheckActivity");
      if (b) b.textContent = "[check activity]";
      const remaining = targets.size - done;
      setActivityStatus(
        `checked ${done}` +
          (abortActivity ? " (stopped)" : "") +
          (remaining > 0 ? ` · ${remaining} left` : "")
      );
      reapplyFilter();
    }
  }

  // Fold the recency test into the existing filter, so it participates in
  // Save & apply, Temporarily show all and the hidden count like any other.
  const originalShouldHide = shouldHide;
  shouldHide = function shouldHideWithActivity(card) {
    if (originalShouldHide(card)) {
      lastHideReason = "filters";
      return true;
    }
    const reason = activityReason(card);
    if (reason) {
      lastHideReason = reason;
      return true;
    }
    return false;
  };

  // ─── Boot ─────────────────────────────────────────────────────────────────

  // FetLife is a single-page app, so a bounded retry window loses the race
  // whenever you land on some other page first and navigate to a member list
  // later: there is no page load in between, so nothing calls buildUI again.
  // Instead, stay responsive for the life of the tab. buildUI() returns
  // immediately once its panel exists, so repeat calls are nearly free.

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI, { once: true });
  } else {
    buildUI();
  }

  // Client-side navigation: the SPA swaps pages without a load event.
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      setTimeout(buildUI, 0);
      return result;
    };
  }
  addEventListener("popstate", () => setTimeout(buildUI, 0));

  // And whenever the DOM settles into a new shape, in case a route renders
  // its header after the navigation event. Coalesced into animation frames so
  // a busy feed costs one check per frame rather than one per mutation.
  let uiQueued = false;
  new MutationObserver(() => {
    if (uiQueued || document.getElementById("FiLiOptionsBox")) return;
    uiQueued = true;
    requestAnimationFrame(() => {
      uiQueued = false;
      buildUI();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

})();