"use client";

import { Check, ChevronRight, Clock3, RotateCcw, TrainFront, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { triviaQuestions, type TriviaQuestion } from "@/data/trivia";

const ROUND_LENGTH = 5;
const QUESTION_SECONDS = 15;

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeRound(): TriviaQuestion[] {
  return shuffle(triviaQuestions).slice(0, ROUND_LENGTH);
}

function stableOptions(question: TriviaQuestion) {
  const offset =
    question.id.split("").reduce((total, character) => total + character.charCodeAt(0), 0) %
    question.options.length;
  return [...question.options.slice(offset), ...question.options.slice(0, offset)];
}

export function CommercialTrivia() {
  const [round, setRound] = useState<TriviaQuestion[]>(() =>
    triviaQuestions.slice(0, ROUND_LENGTH),
  );
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(QUESTION_SECONDS);
  const [best, setBest] = useState(0);

  const question = round[index];
  const finished = index >= round.length;

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("nyk-trivia-best") ?? 0);
    setBest(saved);
    setRound(makeRound());
  }, []);

  useEffect(() => {
    if (answer || finished) return;
    if (seconds === 0) {
      setAnswer("__timeout__");
      return;
    }

    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [answer, finished, seconds]);

  const shuffledOptions = useMemo(
    () => (question ? stableOptions(question) : []),
    [question],
  );

  function chooseAnswer(option: string) {
    if (answer || !question) return;
    setAnswer(option);
    if (option === question.answer) setScore((value) => value + 1);
  }

  function advance() {
    const nextIndex = index + 1;
    const finalScore = score + (answer === question?.answer ? 0 : 0);

    if (nextIndex >= round.length && finalScore > best) {
      setBest(finalScore);
      window.localStorage.setItem("nyk-trivia-best", String(finalScore));
    }
    setIndex(nextIndex);
    setAnswer(null);
    setSeconds(QUESTION_SECONDS);
  }

  function restart() {
    setRound(makeRound());
    setIndex(0);
    setAnswer(null);
    setScore(0);
    setSeconds(QUESTION_SECONDS);
  }

  if (finished) {
    return (
      <div className="subway-tile overflow-hidden rounded-2xl border-4 border-black bg-[#f3f0e8] text-black shadow-2xl">
        <div className="bg-black px-5 py-4 text-white sm:px-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
            End of the line
          </p>
          <h2 className="display-type mt-1 text-4xl uppercase sm:text-5xl">
            You went {score} for {ROUND_LENGTH}
          </h2>
        </div>
        <div className="p-5 sm:p-8">
          <div className="subway-map-line mb-7 flex items-center justify-between">
            {round.map((_, stop) => (
              <span
                key={stop}
                className={`subway-stop ${stop < score ? "subway-stop-correct" : ""}`}
              >
                {stop + 1}
              </span>
            ))}
          </div>
          <p className="font-bold text-black/60">
            {score === 5
              ? "Express status. The conductor is impressed."
              : score >= 3
                ? "Solid ride. You know your way to the Garden."
                : "Local train energy. Take another loop through Knicks history."}
          </p>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-black/45">
              Best trip: {Math.max(best, score)}/{ROUND_LENGTH}
            </span>
            <button
              type="button"
              onClick={restart}
              className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-knicks-blue"
            >
              <RotateCcw size={14} />
              Ride again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subway-tile overflow-hidden rounded-2xl border-4 border-black bg-[#f3f0e8] text-black shadow-2xl">
      <div className="flex items-center justify-between bg-black px-4 py-3 text-white sm:px-7">
        <div className="flex items-center gap-3">
          <span className="route-bullet bg-[#fccc0a] text-black">Q</span>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
              Commercial Break Express
            </p>
            <p className="text-sm font-black">Next stop: Knicks History</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 font-black ${seconds <= 5 ? "text-red-400" : ""}`}>
          <Clock3 size={15} />
          <span className="score-text">{seconds}s</span>
        </div>
      </div>

      <div className="p-4 sm:p-7">
        <div className="subway-map-line mb-7 flex items-center justify-between">
          {round.map((_, stop) => (
            <span
              key={stop}
              className={`subway-stop ${
                stop < index ? "subway-stop-passed" : stop === index ? "subway-stop-current" : ""
              }`}
            >
              {stop + 1}
            </span>
          ))}
        </div>

        <div className="mb-5 flex items-center justify-between">
          <span className="rounded bg-black px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white">
            {question.difficulty} · {question.category}
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
            {triviaQuestions.length} questions in service
          </span>
        </div>

        <h2 className="max-w-2xl text-xl font-black leading-tight sm:text-3xl">
          {question.question}
        </h2>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {shuffledOptions.map((option) => {
            const isCorrect = option === question.answer;
            const isChosen = option === answer;
            const revealed = Boolean(answer);

            return (
              <button
                key={option}
                type="button"
                disabled={revealed}
                onClick={() => chooseAnswer(option)}
                className={`flex min-h-14 items-center justify-between rounded-lg border-2 px-4 py-3 text-left text-sm font-black transition ${
                  revealed && isCorrect
                    ? "border-emerald-700 bg-emerald-100 text-emerald-950"
                    : revealed && isChosen
                      ? "border-red-700 bg-red-100 text-red-950"
                      : "border-black/15 bg-white/70 hover:border-knicks-blue hover:bg-white"
                }`}
              >
                {option}
                {revealed && isCorrect ? (
                  <Check size={18} />
                ) : revealed && isChosen ? (
                  <X size={18} />
                ) : null}
              </button>
            );
          })}
        </div>

        {answer && (
          <div className="mt-5 animate-rise border-l-4 border-knicks-orange bg-white/75 p-4">
            <p className="text-xs font-black uppercase tracking-widest">
              {answer === question.answer ? "Correct. Doors closing." : answer === "__timeout__" ? "Time expired." : "Not this stop."}
            </p>
            <p className="mt-1 text-sm text-black/65">{question.fact}</p>
            <button
              type="button"
              onClick={advance}
              className="mt-4 flex items-center gap-2 rounded-full bg-knicks-blue px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"
            >
              {index === ROUND_LENGTH - 1 ? "See results" : "Next stop"}
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t-2 border-black bg-[#fccc0a] px-4 py-2 text-[10px] font-black uppercase tracking-widest sm:px-7">
        <TrainFront size={14} />
        Stand clear of the closing doors, please
      </div>
    </div>
  );
}
