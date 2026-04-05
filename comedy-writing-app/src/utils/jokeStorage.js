import { STAGES, canonicalizeStage } from '../constants/stages';

export const JOKES_STORAGE_KEY = 'open-mics-jokes-v3';
export const WORKSPACE_CONNECTION_STORAGE_KEY = 'on-deck-workspace-connection-v1';
export const WORKSPACE_PAIRING_STORAGE_KEY = 'on-deck-workspace-pairing-v1';
const WORKSPACE_JOKES_STORAGE_PREFIX = 'on-deck-workspace-jokes-v1:';

export const normalizeJoke = (joke, index = 0) => ({
  ...joke,
  stage: canonicalizeStage(joke.stage),
  tags: Array.isArray(joke.tags) ? joke.tags : [],
  recordings: Array.isArray(joke.recordings) ? joke.recordings : [],
  feedbackHistory: Array.isArray(joke.feedbackHistory) ? joke.feedbackHistory : [],
  updatedAt: joke.updatedAt || joke.date,
  order:
    typeof joke.order === 'number'
      ? joke.order
      : STAGES.indexOf(canonicalizeStage(joke.stage)) * 1000 + index,
});

export const getSnapshotUpdatedAt = (jokes = []) =>
  jokes.reduce((latest, joke) => {
    const nextValue = joke.updatedAt || joke.date;
    if (!nextValue) {
      return latest;
    }

    if (!latest) {
      return nextValue;
    }

    return new Date(nextValue).getTime() > new Date(latest).getTime() ? nextValue : latest;
  }, null) || new Date().toISOString();

export const parseStoredJokes = (rawValue) => {
  if (!rawValue) {
    return null;
  }

  const parsedValue = JSON.parse(rawValue);
  if (Array.isArray(parsedValue)) {
    const jokes = parsedValue.map(normalizeJoke);
    return {
      jokes,
      updatedAt: getSnapshotUpdatedAt(jokes),
    };
  }

  const jokes = Array.isArray(parsedValue.jokes) ? parsedValue.jokes.map(normalizeJoke) : [];
  return {
    jokes,
    updatedAt: parsedValue.updatedAt || getSnapshotUpdatedAt(jokes),
  };
};

export const getWorkspaceJokesStorageKey = (workspaceKey) =>
  workspaceKey ? `${WORKSPACE_JOKES_STORAGE_PREFIX}${workspaceKey}` : null;
