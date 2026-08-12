"use client";

import { useEffect, useMemo, useState } from "react";
import { LISTS, getList } from "@/data/lists";
import { sectionFor, toBands } from "@/data/sections";
import { DEFAULT_SETTINGS } from "@/lib/game";
import { readTeamNames, writeTeamNames } from "@/lib/session";
import type { GameList, GameSettings, ScoringMode, TeamId } from "@/lib/types";

const TIMER_OPTIONS: { label: string; value: number | null }[] = [
  { label: "No timer", value: null },
  { label: "30s", value: 30 },
  { label: "1 min", value: 60 },
  { label: "90s", value: 90 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
];

const SCORING_OPTIONS: { mode: ScoringMode; title: string; desc: string }[] = [
  {
    mode: "rank",
    title: "Rank = points",
    desc: "Guess #99 and score 99. Deep cuts are worth the most.",
  },
  {
    mode: "inverted",
    title: "Inverted",
    desc: "The top of the list pays best. #1 is worth the full list length.",
  },
];

export default function SetupScreen({ onStart }: { onStart: (settings: GameSettings) => void }) {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(true);
  // Card being hovered or focused. The preview strip falls back to the
  // selection, so moving the mouse away restores it rather than going blank.
  const [previewId, setPreviewId] = useState<string | null>(null);
  const selectedList = getList(settings.listId);
  const selectedSection = sectionFor(selectedList);
  const previewList = previewId ? getList(previewId) : selectedList;

  const needle = query.trim().toLowerCase();
  const visibleLists = useMemo(
    () =>
      needle
        ? LISTS.filter((list) =>
            [
              list.name,
              list.series?.name ?? "",
              list.category,
              // Section names are on screen now, so they are worth typing.
              sectionFor(list).name,
              list.blurb,
            ].some((field) => field.toLowerCase().includes(needle)),
          )
        : LISTS,
    [needle],
  );

  // Bands of cards, dropping any section the current search emptied out.
  const bands = useMemo(() => toBands(visibleLists), [visibleLists]);

  // Restore the names this tab was last using. This runs after mount rather
  // than seeding useState, because the page is prerendered: reading storage
  // during the first render would make the server and client markup disagree.
  // The cost is one frame showing the defaults.
  useEffect(() => {
    const stored = readTeamNames();
    if (stored) setSettings((s) => ({ ...s, teamNames: stored }));
  }, []);

  const choose = (list: GameList) => {
    setSettings((s) => ({ ...s, listId: list.id }));
    setPickerOpen(false);
  };

  // Written on every keystroke rather than from an effect: an effect would have
  // to be ordered against the restore above, and getting that ordering wrong
  // means silently overwriting the stored names with the defaults.
  const setTeamName = (team: TeamId, value: string) => {
    const teamNames = { ...settings.teamNames, [team]: value };
    setSettings((s) => ({ ...s, teamNames }));
    writeTeamNames(teamNames);
  };

  const start = () => {
    const teamNames = {
      A: settings.teamNames.A.trim() || "Team A",
      B: settings.teamNames.B.trim() || "Team B",
    };
    // Persist what the game will actually call them, so a team left blank comes
    // back as "Team A" rather than as an empty box.
    writeTeamNames(teamNames);
    onStart({ ...settings, teamNames });
  };

  return (
    <div className="shell shell-wide">
      <p className="eyebrow">Two teams, one ranked list</p>
      <h1>Rank Rush</h1>
      <p className="lede">
        Teams take turns naming entries from a ranked list, banking each entry&rsquo;s rank as
        points. The deep cuts pay best.
      </p>

      <section className="panel">
        <div className="spread" style={{ marginBottom: pickerOpen ? 18 : 0 }}>
          <h2 style={{ margin: 0 }}>1. Pick a list</h2>
          {pickerOpen ? (
            <div className="search">
              <input
                className="text-input"
                type="search"
                value={query}
                placeholder={`Search ${LISTS.length} lists...`}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search lists"
                autoFocus
              />
              {needle ? (
                <span className="search-count">
                  {visibleLists.length} of {LISTS.length}
                </span>
              ) : null}
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setPickerOpen(true)}>
              Change list
            </button>
          )}
        </div>

        {pickerOpen ? (
          <>
            {bands.map(({ section, cards }) => (
              <div
                key={section.id}
                className="band"
                style={{ ["--accent" as string]: section.accent }}
              >
                <div className="band-head">
                  <span className="band-name">{section.name}</span>
                  <span className="band-count">{cards.length}</span>
                </div>
                <div className="list-grid">
                  {cards.map((card) => {
                    const active = card.variants.find((v) => v.id === settings.listId);
                    const shown = active ?? card.variants[0];
                    return (
                      <div
                        key={card.key}
                        className={`list-card${active ? " selected" : ""}`}
                        onClick={() => choose(shown)}
                        role="button"
                        tabIndex={0}
                        title={card.name}
                        aria-pressed={Boolean(active)}
                        onMouseEnter={() => setPreviewId(shown.id)}
                        onMouseLeave={() => setPreviewId(null)}
                        onFocus={() => setPreviewId(shown.id)}
                        onBlur={() => setPreviewId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            choose(shown);
                          }
                        }}
                      >
                        <div className="title">{card.name}</div>
                        <div className="card-meta">
                          {card.variants.length > 1 ? (
                            <div className="variants" onClick={(e) => e.stopPropagation()}>
                              {card.variants.map((variant) => (
                                <button
                                  key={variant.id}
                                  type="button"
                                  className="variant"
                                  aria-pressed={variant.id === settings.listId}
                                  onMouseEnter={() => setPreviewId(variant.id)}
                                  onClick={() => choose(variant)}
                                >
                                  {variant.series?.variant.replace(/^Top\s+/, "") ?? variant.name}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span>{shown.items.length}</span>
                          )}
                          <span className="cat">{shown.category}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {bands.length === 0 ? (
              <p className="hint">
                Nothing matches &ldquo;{query.trim()}&rdquo;. Try a section like screen, music,
                games, world or business.
              </p>
            ) : null}
          </>
        ) : null}

        {pickerOpen ? (
          <div className="preview">
            <div className="preview-head">
              <span className="preview-name">{previewList.name}</span>
              <span className="preview-count">{previewList.items.length} entries</span>
            </div>
            <p className="preview-blurb">{previewList.blurb}</p>
            <p className="preview-meta">
              {previewList.caveat ? (
                <>
                  <span className="flag">Snapshot:</span> {previewList.caveat}{" "}
                </>
              ) : null}
              Source:{" "}
              <a href={previewList.source.url} target="_blank" rel="noreferrer noopener">
                {previewList.source.name}
              </a>
              , scraped {previewList.source.sourcedAt}.
            </p>
          </div>
        ) : (
          <div className="chosen">
            <div className="chosen-bar" style={{ ["--accent" as string]: selectedSection.accent }}>
              <div>
                <span className="eyebrow">Playing</span>
                <div className="chosen-name">{selectedList.name}</div>
              </div>
              <span className="chosen-count">{selectedList.items.length} entries</span>
            </div>
            {selectedList.caveat ? <p className="caveat">{selectedList.caveat}</p> : null}
            <p className="hint">
              Source:{" "}
              <a href={selectedList.source.url} target="_blank" rel="noreferrer noopener">
                {selectedList.source.name}
              </a>
              , scraped {selectedList.source.sourcedAt}.
            </p>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>2. Name the teams</h2>
        <div className="grid-2">
          <div>
            <label className="field-label" htmlFor="team-a">
              Team A
            </label>
            <input
              id="team-a"
              className="text-input"
              value={settings.teamNames.A}
              maxLength={28}
              onChange={(e) => setTeamName("A", e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="team-b">
              Team B
            </label>
            <input
              id="team-b"
              className="text-input"
              value={settings.teamNames.B}
              maxLength={28}
              onChange={(e) => setTeamName("B", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>3. Scoring</h2>
        <div className="grid-2">
          {SCORING_OPTIONS.map((option) => (
            <button
              key={option.mode}
              type="button"
              className="mode-card"
              aria-pressed={settings.scoring === option.mode}
              onClick={() => setSettings((s) => ({ ...s, scoring: option.mode }))}
            >
              <div className="title">{option.title}</div>
              <div className="desc">{option.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>4. Round timer</h2>
        <div className="chip-row">
          {TIMER_OPTIONS.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              className="chip"
              aria-pressed={settings.turnSeconds === option.value}
              onClick={() => setSettings((s) => ({ ...s, turnSeconds: option.value }))}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="hint">
          The clock runs per guessing round. If it hits zero the turn passes to the other team with
          no points. Leave it off to play untimed.
        </p>
      </section>

      <div className="row" style={{ marginTop: 22 }}>
        <button type="button" className="btn btn-primary btn-lg" onClick={start}>
          Start game
        </button>
        <span className="hint" style={{ margin: 0 }}>
          {selectedList.name} &middot; {selectedList.items.length} entries &middot;{" "}
          {settings.turnSeconds ? `${settings.turnSeconds}s per round` : "untimed"}
        </span>
      </div>
    </div>
  );
}
