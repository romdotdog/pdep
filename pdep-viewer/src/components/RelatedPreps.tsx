import { For } from "solid-js";

export function RelatedPreps(props: { opreps: string }) {
  const preps = () =>
    props.opreps
      .split(/,\s*/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

  return (
    <span class="related-preps">
      <For each={preps()}>
        {(p, i) => (
          <>
            <a href={`/prep/${encodeURIComponent(p)}`}>{p}</a>
            {i() < preps().length - 1 ? ", " : ""}
          </>
        )}
      </For>
    </span>
  );
}
