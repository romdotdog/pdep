import { createMemo, Show } from "solid-js";
import type { PrepCorp } from "../lib/data";

export function ExampleSentence(props: { example: PrepCorp; prep: string }) {
  const highlighted = createMemo(() => {
    const sentence = props.example.sentence;
    const prep = props.prep.toLowerCase();
    let pos = props.example.preploc;

    // Check if the preposition is actually at the expected position
    const atExpectedPos =
      pos >= 0 &&
      pos < sentence.length &&
      sentence.slice(pos, pos + prep.length).toLowerCase() === prep;

    // Fall back to indexOf if not found at expected position
    if (!atExpectedPos) {
      // Try case-insensitive search with word boundaries
      const searchPattern = new RegExp(`\\b${prep}\\b`, "i");
      const match = searchPattern.exec(sentence);
      pos = match ? match.index : -1;
    }

    if (pos >= 0 && pos < sentence.length) {
      const before = sentence.slice(0, pos);
      const prepWord = sentence.slice(pos, pos + prep.length + 10).split(/\s/)[0];
      const after = sentence.slice(pos + prepWord.length);
      return { before, prep: prepWord, after };
    }
    return { before: sentence, prep: "", after: "" };
  });

  return (
    <div class="example">
      <span>{highlighted().before}</span>
      <Show when={highlighted().prep}>
        <span class="prep-highlight">{highlighted().prep}</span>
      </Show>
      <span>{highlighted().after}</span>
      <div class="example-meta">Source: {props.example.source}</div>
    </div>
  );
}
