import { useParams } from "@solidjs/router";
import { createSignal, createMemo, For, Show, onMount, onCleanup } from "solid-js";
import {
  getDefsForPrep,
  getPropsForPrep,
  getCorpusForPrepSense,
  isLoaded,
  type PrepDef,
  type PrepProp,
} from "../../../lib/data";
import { ExampleSentence, SenseProps } from "../../../components";

function SenseCard(props: { def: PrepDef; prop?: PrepProp; prep: string; highlighted: () => string | null; setHighlighted: (id: string | null) => void }) {
  const [showExamples, setShowExamples] = createSignal(false);

  const examples = createMemo(() => {
    if (!showExamples()) return [];
    return getCorpusForPrepSense(props.prep, props.def.sense).slice(0, 10);
  });

  const exampleCount = createMemo(() => {
    return getCorpusForPrepSense(props.prep, props.def.sense).length;
  });

  const handleAnchorClick = (e: MouseEvent) => {
    e.preventDefault();
    props.setHighlighted(props.def.sense);
    history.replaceState(null, "", `#${props.def.sense}`);
    document.getElementById(props.def.sense)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div class="sense-card" id={props.def.sense} classList={{ highlighted: props.highlighted() === props.def.sense }}>
      <h3>
        <a href={`#${props.def.sense}`} class="sense-anchor" onClick={handleAnchorClick}>
          <span class="sense-id">{props.def.sense}</span>
        </a>
      </h3>
      <p class="sense-def">{props.def.def}</p>

      <Show when={props.prop}>
        {(prop) => <SenseProps prop={prop()} />}
      </Show>

      <Show when={exampleCount() > 0}>
        <div class="examples-section">
          <button class="examples-toggle" onClick={() => setShowExamples(!showExamples())}>
            {showExamples() ? "Hide" : "Show"} examples ({exampleCount()})
          </button>

          <Show when={showExamples()}>
            <For each={examples()}>
              {(ex) => <ExampleSentence example={ex} prep={props.prep} />}
            </For>
            <Show when={exampleCount() > 10}>
              <p class="example-meta">
                Showing 10 of {exampleCount()} examples.{" "}
                <a href={`/prep/${encodeURIComponent(props.prep)}/${encodeURIComponent(props.def.sense)}`}>
                  View all &rarr;
                </a>
              </p>
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  );
}

export default function PrepDetail() {
  const params = useParams();
  const prep = () => decodeURIComponent(params.prep ?? "");

  const defs = createMemo(() => {
    if (!isLoaded()) return [];
    return getDefsForPrep(prep());
  });
  const propsData = createMemo(() => {
    if (!isLoaded()) return [];
    return getPropsForPrep(prep());
  });

  const propsMap = createMemo(() => {
    const map = new Map<string, PrepProp>();
    for (const p of propsData()) {
      map.set(p.sense, p);
    }
    return map;
  });

  const [highlighted, setHighlighted] = createSignal<string | null>(
    typeof window !== "undefined" ? window.location.hash.slice(1) || null : null
  );

  onMount(() => {
    const handleHashChange = () => setHighlighted(window.location.hash.slice(1) || null);
    window.addEventListener("hashchange", handleHashChange);
    onCleanup(() => window.removeEventListener("hashchange", handleHashChange));
  });

  return (
    <main>
      <div class="prep-header">
        <h2>{prep()}</h2>
        <p class="sense-count">
          {defs().length} sense{defs().length !== 1 ? "s" : ""}
        </p>
      </div>

      <Show when={!isLoaded()}>
        <p class="loading">Loading data...</p>
      </Show>

      <Show when={isLoaded()}>
        <For each={defs()}>
          {(def) => <SenseCard def={def} prop={propsMap().get(def.sense)} prep={prep()} highlighted={highlighted} setHighlighted={setHighlighted} />}
        </For>

        <Show when={defs().length === 0}>
          <p>No definitions found for "{prep()}"</p>
          <a href="/">Back to list</a>
        </Show>
      </Show>
    </main>
  );
}
