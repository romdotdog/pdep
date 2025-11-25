import { useParams } from "@solidjs/router";
import { createSignal, createMemo, For, Show, onMount, onCleanup } from "solid-js";
import {
  getDefForSense,
  getPropForSense,
  getCorpusForPrepSense,
  isLoaded,
} from "../../../lib/data";
import { ExampleSentence, SenseProps } from "../../../components";

const PAGE_SIZE = 20;

export default function SensePage() {
  const params = useParams();
  const prep = () => decodeURIComponent(params.prep ?? "");
  const sense = () => decodeURIComponent(params.sense ?? "");

  const def = createMemo(() => {
    if (!isLoaded()) return undefined;
    return getDefForSense(prep(), sense());
  });
  const prop = createMemo(() => {
    if (!isLoaded()) return undefined;
    return getPropForSense(prep(), sense());
  });
  const allExamples = createMemo(() => {
    if (!isLoaded()) return [];
    return getCorpusForPrepSense(prep(), sense());
  });

  const [visibleCount, setVisibleCount] = createSignal(PAGE_SIZE);
  const [showStickyHeader, setShowStickyHeader] = createSignal(false);
  const [stickyDismissed, setStickyDismissed] = createSignal(false);
  let sentinelRef: HTMLDivElement | undefined;
  let headerRef: HTMLDivElement | undefined;

  const visibleExamples = createMemo(() => allExamples().slice(0, visibleCount()));
  const hasMore = createMemo(() => visibleCount() < allExamples().length);

  onMount(() => {
    // Infinite scroll observer
    const scrollObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore()) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, allExamples().length));
        }
      },
      { rootMargin: "200px" }
    );

    if (sentinelRef) {
      scrollObserver.observe(sentinelRef);
    }

    // Sticky header observer
    const headerObserver = new IntersectionObserver(
      (entries) => {
        setShowStickyHeader(!entries[0].isIntersecting);
      },
      { threshold: 0 }
    );

    if (headerRef) {
      headerObserver.observe(headerRef);
    }

    onCleanup(() => {
      scrollObserver.disconnect();
      headerObserver.disconnect();
    });
  });

  const SenseHeader = (props: { sticky?: boolean }) => (
    <>
      <div class={props.sticky ? "sense-sticky-top" : "prep-header"}>
        <p>
          <a href={`/prep/${encodeURIComponent(prep())}`}>&larr; {prep()}</a>
        </p>
        <h2>
          {prep()} <span class="sense-id">{sense()}</span>
        </h2>
        <Show when={def()}>
          <p class="sense-def">{def()!.def}</p>
        </Show>
      </div>

      <Show when={prop()}>
        {(p) => <SenseProps prop={p()} />}
      </Show>
    </>
  );

  return (
    <main class="sense-page">
      <Show when={showStickyHeader() && !stickyDismissed()}>
        <div class="sense-sticky-header visible">
          <button class="sticky-close" onClick={() => setStickyDismissed(true)} aria-label="Close">
            &times;
          </button>
          <SenseHeader sticky />
        </div>
      </Show>

      <div ref={headerRef}>
        <SenseHeader />
      </div>

      <div style={{ "margin-top": "2rem" }}></div>

      <Show when={!isLoaded()}>
        <p class="loading">Loading data...</p>
      </Show>

      <Show when={isLoaded()}>
        <h3>Examples ({allExamples().length})</h3>

        <For each={visibleExamples()}>
          {(ex) => <ExampleSentence example={ex} prep={prep()} />}
        </For>

        <Show when={hasMore()}>
          <div ref={sentinelRef} class="loading">
            Loading more examples...
          </div>
        </Show>

        <Show when={allExamples().length === 0}>
          <p>No examples found for this sense.</p>
        </Show>
      </Show>
    </main>
  );
}
