import { createSignal, createMemo, For, Suspense } from "solid-js";
import { cache, createAsync } from "@solidjs/router";
import { getAllPrepStats, type PrepStats } from "../lib/data.server";

const getPrepStats = cache(async () => {
  "use server";
  return getAllPrepStats();
}, "prep-stats");

type SortOption = "alpha" | "senses" | "examples";

export default function Home() {
  const prepStats = createAsync(() => getPrepStats());
  const [search, setSearch] = createSignal("");
  const [sortBy, setSortBy] = createSignal<SortOption>("alpha");

  const filteredAndSortedPreps = createMemo(() => {
    const stats = prepStats();
    if (!stats) return [];

    const q = search().toLowerCase();
    let results = stats as PrepStats[];

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

      <Suspense fallback={<p class="loading">Loading prepositions...</p>}>
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
      </Suspense>
    </main>
  );
}
