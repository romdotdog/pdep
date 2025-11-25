import { createSignal, createMemo, For, Show } from "solid-js";
import { getAllPreps, getSenseCountForPrep, getExampleCountForPrep, isLoaded } from "../lib/data";

type SortOption = "alpha" | "senses" | "examples";

export default function Home() {
  const [search, setSearch] = createSignal("");
  const [sortBy, setSortBy] = createSignal<SortOption>("alpha");

  const prepStats = createMemo(() => {
    // Re-run when data loads
    if (!isLoaded()) return [];
    const preps = getAllPreps();
    return preps.map((prep) => ({
      prep,
      senses: getSenseCountForPrep(prep),
      examples: getExampleCountForPrep(prep),
    }));
  });

  const filteredAndSortedPreps = createMemo(() => {
    const q = search().toLowerCase();
    let results = prepStats();

    if (q) {
      results = results.filter((p) => p.prep.toLowerCase().includes(q));
    }

    const sort = sortBy();
    if (sort === "senses") {
      results = [...results].sort((a, b) => b.senses - a.senses);
    } else if (sort === "examples") {
      results = [...results].sort((a, b) => b.examples - a.examples);
    } else {
      results = [...results].sort((a, b) => a.prep.localeCompare(b.prep));
    }

    return results;
  });

  return (
    <main>
      <div class="search-box">
        <input
          type="text"
          placeholder="Search prepositions..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />
      </div>
      <div class="sort-options">
        <span
          class={sortBy() === "alpha" ? "active" : ""}
          onClick={() => setSortBy("alpha")}
        >
          A–Z
        </span>
        <span
          class={sortBy() === "senses" ? "active" : ""}
          onClick={() => setSortBy("senses")}
        >
          Most senses
        </span>
        <span
          class={sortBy() === "examples" ? "active" : ""}
          onClick={() => setSortBy("examples")}
        >
          Most examples
        </span>
      </div>

      <Show when={!isLoaded()}>
        <p class="loading">Loading data...</p>
      </Show>

      <Show when={isLoaded()}>
        <p class="sense-count">
          {filteredAndSortedPreps().length} preposition{filteredAndSortedPreps().length !== 1 ? "s" : ""}
        </p>

        <div class="prep-grid">
          <For each={filteredAndSortedPreps()}>
            {(item) => (
              <a class="prep-link" href={`/prep/${encodeURIComponent(item.prep)}`}>
                <span class="prep-name">{item.prep}</span>
                <span class="prep-stats">
                  {item.senses} sense{item.senses !== 1 ? "s" : ""}
                </span>
              </a>
            )}
          </For>
        </div>
      </Show>
    </main>
  );
}
