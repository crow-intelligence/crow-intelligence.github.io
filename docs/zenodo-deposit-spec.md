# Zenodo deposits — a spec for a browser agent

Written 2026-10-28. Covers the DOI steps in `docs/findability.md` (Part 1, B).

This spec is written so a small, cheap model (Haiku) can follow it literally. Every value is
spelled out below. The agent fills in forms and **saves drafts**; it never publishes. You
review the drafts and publish them yourself, because a published Zenodo record can't be
deleted, and its files can only be changed for 45 days.

---

## For you: how to run it

**Before the first run**

1. Log in to **zenodo.org** yourself, preferably with ORCID. The agent must never handle
   passwords.
2. Build the five cover-sheet PDFs (one page each: title, abstract, link, cite line,
   licence):
   ```bash
   python3 scripts/zenodo_cover_sheets.py     # writes build/zenodo/aporia-*.pdf
   ```

**Running it cheaply**

- Use the Claude app with browser control (Claude in Chrome, or Cowork), and pick **Haiku**
  in the model menu.
- **Start a fresh chat for each run.** Most of the cost is page snapshots piling up in the
  context, so short runs are much cheaper than one long one.
- **First run: one record only, as a test.** Paste this:
  > Follow /home/zoli/projects/crow-intelligence.github.io/docs/zenodo-deposit-spec.md.
  > Do Part A, record A1 only, then give me the report.
- Check that draft on zenodo.org (*Upload → My uploads*). If it's right, run the rest:
  > Follow …/docs/zenodo-deposit-spec.md. Do Part A, records A2 to A5, then the report.
- Part B (switching on the GitHub integration) is a separate short run:
  > Follow …/docs/zenodo-deposit-spec.md. Do Part B only.

**After the runs**

1. Open each draft and read the description and keywords. The abstracts come from the
   site's `llm_summary` fields and were drafted with AI help, so this is the human check.
2. Click **Publish** on each draft.
3. Send me the five record URLs. I'll read the DOIs from Zenodo's public API and add them to
   the site (`citation_doi`, the cite lines, and the 19 `TODO-DOI` markers).

---

## For the agent

### Rules — follow all of them, always

1. Work **only on zenodo.org**. If you're asked to log in, **stop** and ask the user to log
   in. Never type a password.
2. **Never click "Publish" or "Delete"**, and never change account settings beyond what Part B
   says.
3. Use the values in this file **exactly**. Don't rewrite, shorten, translate or "improve"
   them. If a field doesn't exist or rejects a value, leave it empty, write it down for the
   report, and carry on.
4. Don't fill in any field this file doesn't mention. Leave defaults alone, **except the
   licence** (step 9).
5. Read page text rather than taking screenshots wherever you can.
6. **Don't create duplicates.** Before starting a record, open
   `https://zenodo.org/me/uploads` and look for a draft with the same title. If one exists,
   open it and complete it instead of starting a new one.
7. If you're unsure what to do, **stop and ask the user**. Don't guess.

### Part A — one draft per essay

Do these steps for each record you were asked to do (A1–A5). The values are in the record's
table further down.

1. Go to `https://zenodo.org/uploads/new`.
2. **Files:** click **"Upload files"** and choose the record's **File**. If you can't attach
   files yourself, stop. Ask the user to drag that file into the Files box, and wait until
   they say it's done.
3. **DOI:** for "Do you already have a DOI for this upload?" choose **No**, then click
   **"Get a DOI now!"**. Write down the DOI it shows (it starts `10.5281/zenodo.`).
4. **Resource type:** choose **Publication**, subtype **Other**. It may be shown as
   "Publication / Other".
5. **Title:** the record's **Title**.
6. **Publication date:** the record's **Publication date** (format `YYYY-MM-DD`).
7. **Creators:** click **"Add creator"**, choose **Person**, and search for the ORCID
   `0009-0009-6123-1703`. Select the result: family name **Varjú**, given name **Zoltán**.
   Under affiliation, type `Crow Intelligence` and pick it if it's suggested; otherwise keep
   the typed text. Leave **Role** empty. Save the creator. Add **no** other creators.
8. **Description:** paste the record's **Description** block exactly, both paragraphs.
9. **Licenses:** if a licence is already filled in (Zenodo often pre-fills
   "Creative Commons Attribution 4.0 International"), **remove it**. Then add
   **"Creative Commons Attribution Non Commercial Share Alike 4.0 International"**
   (CC BY-NC-SA 4.0). Exactly one licence must remain.
10. **Keywords and subjects:** add each of the record's **Keywords** as a separate keyword.
11. **Languages:** add the record's **Languages** value.
12. **Related works:** click to add a related work.
    - Relation: **"Is variant form of"**.
    - Identifier: the record's **Related work URL**.
    - Scheme: **URL**.
    - Resource type: **Publication** (if asked).
13. Leave everything else as it is: publisher, version, funding, communities, references,
    alternate identifiers.
14. Click **"Save draft"**. If errors appear at the top, fix them using this file's values
    only, and save again. If an error can't be fixed with these values, stop and report it.
15. Write down the draft's address from the browser bar (it looks like
    `https://zenodo.org/uploads/<number>`).

### Part B — switch on the GitHub integration for the five libraries

This only switches the integration on. Nothing is published until a library's next GitHub
release.

1. Go to `https://zenodo.org/account/settings/github/`.
2. If Zenodo asks to connect to GitHub, or GitHub asks you to authorise anything, **stop** and
   ask the user. Granting access is their decision.
3. If the repositories below aren't listed, click **"Sync now"** once. If they still aren't
   listed (the crow-intelligence organisation may not have granted Zenodo access), **stop**
   and tell the user.
4. Switch **On** exactly these five, and nothing else:
   - `crow-intelligence/chronowords`
   - `crow-intelligence/kenon`
   - `crow-intelligence/keyflux`
   - `crow-intelligence/lexograph`
   - `crow-intelligence/saphes`
5. **Don't create GitHub releases.** A release also publishes the package to PyPI, so that
   is the user's job.

### Report — finish every run with this

Give the user this table, one row per record you worked on, copied from the screen (not
from memory):

| Record | Draft URL | Reserved DOI | Saved without errors? | Anything skipped or odd |
|---|---|---|---|---|

For Part B, list each of the five repositories with its final state (On / Off / not
listed).

---

## Record values

### A1. The Wrath and the Journey — reading Homer by machine

| Field | Value |
|---|---|
| File | `/home/zoli/projects/crow-intelligence.github.io/build/zenodo/aporia-homer.pdf` |
| Title | `The Wrath and the Journey — reading Homer by machine` |
| Publication date | `2026-07-24` |
| Languages | English |
| Keywords | `Homer`; `Iliad`; `Odyssey`; `Ancient Greek`; `computational classics`; `character networks`; `literary geography`; `keyness`; `digital humanities` |
| Related work URL | `https://crowintelligence.org/aporia/homer/` |

**Description** (paste exactly, both paragraphs):

```text
Compares the Iliad and the Odyssey as corpora. Extracts proper nouns and themes, builds a character co-occurrence network (the "small world" of Greek heroes), and maps the geography of each poem — finding that 21.3% of the Odyssey is open water, and reading the Catalogue of Ships against the wanderings.

This record archives a visual essay. Its argument is carried by interactive figures that do not survive as a PDF; the essay itself is at https://crowintelligence.org/aporia/homer/.
```

### A2. The Nagel Index — Does Power Change a Person?

| Field | Value |
|---|---|
| File | `/home/zoli/projects/crow-intelligence.github.io/build/zenodo/aporia-nagel-essay.pdf` |
| Title | `The Nagel Index — Does Power Change a Person?` |
| Publication date | `2026-03-31` |
| Languages | English |
| Keywords | `Thomas Nagel`; `public and private language`; `Big Five personality`; `political leaders`; `American presidents`; `computational psycholinguistics`; `NLP` |
| Related work URL | `https://crowintelligence.org/aporia/nagel-essay/` |

**Description** (paste exactly, both paragraphs):

```text
Measures the gap between public and private personality in American leaders by scoring Big Five traits on public speeches versus private letters and diaries. Lincoln reads as the same man in both registers; Nixon does not. Takes its title and its question from Thomas Nagel's essay on ruthlessness in public life.

This record archives a visual essay. Its argument is carried by interactive figures that do not survive as a PDF; the essay itself is at https://crowintelligence.org/aporia/nagel-essay/.
```

### A3. Whereof one cannot speak, thereof one must be silent

| Field | Value |
|---|---|
| File | `/home/zoli/projects/crow-intelligence.github.io/build/zenodo/aporia-wittgenstein.pdf` |
| Title | `Whereof one cannot speak, thereof one must be silent` |
| Publication date | `2026-05-19` |
| Languages | English |
| Keywords | `Wittgenstein`; `Tractatus Logico-Philosophicus`; `sentence embeddings`; `PageRank`; `text visualisation`; `computational philosophy`; `digital humanities` |
| Related work URL | `https://crowintelligence.org/aporia/wittgenstein/` |

**Description** (paste exactly, both paragraphs):

```text
Reads Wittgenstein's Tractatus as a shape: the whole text walked out as one continuous right-angle spiral through its numbered propositions, set in handwriting and coloured by topical cluster. Companion visualisations lift the spiral into 3-D and strip the text to its punctuation alone.

This record archives a visual essay. Its argument is carried by interactive figures that do not survive as a PDF; the essay itself is at https://crowintelligence.org/aporia/wittgenstein/.
```

### A4. The Epistemic Arcade — Where does the mind end and the world begin?

| Field | Value |
|---|---|
| File | `/home/zoli/projects/crow-intelligence.github.io/build/zenodo/aporia-epistemic-arcade.pdf` |
| Title | `The Epistemic Arcade — Where does the mind end and the world begin?` |
| Publication date | `2026-05-21` |
| Languages | English |
| Keywords | `extended mind`; `Clark and Chalmers`; `reinforcement learning`; `PPO`; `Tetris`; `epistemic action`; `philosophy of mind` |
| Related work URL | `https://crowintelligence.org/aporia/epistemic-arcade/` |

**Description** (paste exactly, both paragraphs):

```text
An empirical test of Clark & Chalmers' extended-mind thesis. Two reinforcement-learning agents (PPO) learn Tetris under identical architectures but opposite reward functions — one charged for every keystroke, one free to rotate pieces on screen rather than in its head. Their strategies diverge as the epistemic actions are priced in or out.

This record archives a visual essay. Its argument is carried by interactive figures that do not survive as a PDF; the essay itself is at https://crowintelligence.org/aporia/epistemic-arcade/.
```

### A5. Nekem írod a dalt — hét szó, hetven év magyar dalszövege

| Field | Value |
|---|---|
| File | `/home/zoli/projects/crow-intelligence.github.io/build/zenodo/aporia-magyar-dalszovegek-essze.pdf` |
| Title | `Nekem írod a dalt — hét szó, hetven év magyar dalszövege` |
| Publication date | `2026-09-21` |
| Languages | Hungarian |
| Keywords | `Hungarian popular music`; `song lyrics`; `Hungarian language`; `semantic change`; `corpus linguistics`; `digital humanities`; `NLP` |
| Related work URL | `https://crowintelligence.org/aporia/magyar-dalszovegek-essze/` |

**Description** (paste exactly, both paragraphs):

```text
Traces seven words — szerelem (love), lány (girl), csaj (chick), pénz (money), éjszaka (night), szabadság (freedom), élet (life) — through seventy years of Hungarian popular song, quoting real lyrics decade by decade and tracking how each word shifts meaning and company. Written in Hungarian.

This record archives a visual essay. Its argument is carried by interactive figures that do not survive as a PDF; the essay itself is at https://crowintelligence.org/aporia/magyar-dalszovegek-essze/.
```


---

## Notes for the human, not the agent

- **Why a cover sheet, not the essay:** printing the scrollytelling pages produces dark,
  half-blank pages (tested 2026-10-28). Each record's abstract meets Google Scholar's
  "complete abstract freely available" criterion. A properly printed version can be added
  later with **"New version"** on the same record.
- **Which DOI the site will use:** the **concept DOI**, which always points to the latest
  version. It only appears after publishing, which is why I fetch it from the API rather
  than using the DOI reserved in step 3.
- **Choices worth a second look in the drafts:**
  - Resource type *Publication / Other*.
  - Relation *Is variant form of*.
  - Publisher left at Zenodo's default.
  - No community.
  - The keywords, which are drafts.
- **Package DOIs** need a `CITATION.cff` in each library before its next release, or Zenodo
  builds the record from bare GitHub metadata. That's work in the package repos (see
  `docs/findability.md`, Part 1, C).
