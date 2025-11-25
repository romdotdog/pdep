import { createSignal, createMemo, For, Show } from "solid-js";
import {
  getPrepsWithMultipleSenses,
  getRandomCorpusExample,
  getDefsForPrep,
  type PrepCorp,
  type PrepDef,
} from "../lib/data";

type QuizState = "playing" | "answered" | "finished";

export default function Quiz() {
  const availablePreps = getPrepsWithMultipleSenses();

  const [currentExample, setCurrentExample] = createSignal<PrepCorp | null>(null);
  const [options, setOptions] = createSignal<PrepDef[]>([]);
  const [selectedAnswer, setSelectedAnswer] = createSignal<string | null>(null);
  const [quizState, setQuizState] = createSignal<QuizState>("playing");
  const [score, setScore] = createSignal(0);
  const [totalQuestions, setTotalQuestions] = createSignal(0);
  const [streak, setStreak] = createSignal(0);

  const isCorrect = createMemo(() => {
    const example = currentExample();
    const selected = selectedAnswer();
    return example && selected && example.sense === selected;
  });

  const correctAnswer = createMemo(() => {
    const example = currentExample();
    if (!example) return null;
    return options().find(o => o.sense === example.sense);
  });

  const MAX_OPTIONS = 4;

  function loadNewQuestion() {
    // Pick a random preposition
    const prep = availablePreps[Math.floor(Math.random() * availablePreps.length)];
    const example = getRandomCorpusExample(prep);

    if (!example) {
      loadNewQuestion();
      return;
    }

    const defs = getDefsForPrep(prep);

    // Limit to MAX_OPTIONS: always include correct answer + random distractors
    let finalOptions: PrepDef[];
    if (defs.length <= MAX_OPTIONS) {
      finalOptions = [...defs];
    } else {
      const correctDef = defs.find(d => d.sense === example.sense);
      const distractors = defs
        .filter(d => d.sense !== example.sense)
        .sort(() => Math.random() - 0.5)
        .slice(0, MAX_OPTIONS - 1);
      finalOptions = correctDef ? [correctDef, ...distractors] : distractors;
    }

    // Shuffle the options
    const shuffled = finalOptions.sort(() => Math.random() - 0.5);

    setCurrentExample(example);
    setOptions(shuffled);
    setSelectedAnswer(null);
    setQuizState("playing");
  }

  function handleAnswer(sense: string) {
    if (quizState() !== "playing") return;

    setSelectedAnswer(sense);
    setQuizState("answered");
    setTotalQuestions(t => t + 1);

    const example = currentExample();
    if (example && example.sense === sense) {
      setScore(s => s + 1);
      setStreak(s => s + 1);
    } else {
      setStreak(0);
    }
  }

  function nextQuestion() {
    loadNewQuestion();
  }

  // Start with first question
  if (!currentExample()) {
    loadNewQuestion();
  }

  const highlightedSentence = createMemo(() => {
    const example = currentExample();
    if (!example) return { before: "", prep: "", after: "" };

    const sentence = example.sentence;
    const prep = example.prep.toLowerCase();
    let pos = example.preploc;

    // Check if the preposition is actually at the expected position
    const atExpectedPos =
      pos >= 0 && pos < sentence.length && sentence.slice(pos, pos + prep.length).toLowerCase() === prep;

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
    <main class="quiz-page">
      <div class="quiz-header">
        <h2>Preposition Sense Quiz</h2>
        <div class="quiz-stats">
          <span class="stat">
            Score: <strong>{score()}</strong> / {totalQuestions()}
          </span>
          <Show when={streak() >= 2}>
            <span class="stat streak">{streak()} streak!</span>
          </Show>
        </div>
      </div>

      <Show when={currentExample()}>
        {example => (
          <div class="quiz-content">
            <div class="quiz-sentence">
              <p>
                Which sense of <strong>"{example().prep}"</strong> is used here?
              </p>
              <blockquote>
                <span>{highlightedSentence().before}</span>
                <span class="prep-highlight">{highlightedSentence().prep}</span>
                <span>{highlightedSentence().after}</span>
              </blockquote>
            </div>

            <div class="quiz-options">
              <For each={options()}>
                {option => {
                  const isSelected = () => selectedAnswer() === option.sense;
                  const isCorrectOption = () => example().sense === option.sense;
                  const showCorrect = () => quizState() === "answered" && isCorrectOption();
                  const showWrong = () => quizState() === "answered" && isSelected() && !isCorrectOption();

                  return (
                    <button
                      class={`quiz-option ${isSelected() ? "selected" : ""} ${showCorrect() ? "correct" : ""} ${
                        showWrong() ? "wrong" : ""
                      }`}
                      onClick={() => handleAnswer(option.sense)}
                      disabled={quizState() !== "playing"}
                    >
                      <span class="sense-id">{option.sense}</span>
                      <span class="sense-def">{option.def}</span>
                    </button>
                  );
                }}
              </For>
            </div>

            <Show when={quizState() === "answered"}>
              <div class={`quiz-feedback ${isCorrect() ? "correct" : "wrong"}`}>
                <Show when={isCorrect()}>
                  <p>Correct!</p>
                </Show>
                <Show when={!isCorrect()}>
                  <p>
                    Not quite. The correct answer was: <strong>{correctAnswer()?.sense}</strong>: {correctAnswer()?.def}
                  </p>
                </Show>
                <div class="quiz-actions">
                  <button class="btn-primary" onClick={nextQuestion}>
                    Next Question
                  </button>
                  <a href={`/prep/${encodeURIComponent(example().prep)}/${encodeURIComponent(example().sense)}`}>
                    View more examples
                  </a>
                </div>
              </div>
            </Show>
          </div>
        )}
      </Show>
    </main>
  );
}
