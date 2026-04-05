import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { mockJokes } from './mockJokes';
import KanbanBoardScreen from './KanbanBoardScreen';
import AddNewJokeScreen from './AddNewJokeScreen';
import WritingStreakScreen from './WritingStreakScreen';
import MapScreen from './MapScreen';
import JokeDetailsScreen from './JokeDetailsScreen';
import {
  buildPairingLink,
  clearStoredPairingSession,
  clearWorkspaceConnection,
  createGuestWorkspaceConnection,
  createPairingSession,
  hasFirebaseConfig,
  loadStoredWorkspaceConnection,
  persistWorkspaceConnection,
  redeemPairingCode,
  saveRemoteJokes,
  subscribeToRemoteJokes,
} from './src/services/firebase';
import {
  getSnapshotUpdatedAt,
  getWorkspaceJokesStorageKey,
  JOKES_STORAGE_KEY,
  normalizeJoke,
  parseStoredJokes,
} from './src/utils/jokeStorage';
import { STAGES } from './src/constants/stages';
import { getStoredValue, setStoredValue } from './src/utils/persistentStorage';

const FALLBACK_JOKES = mockJokes.map(normalizeJoke);
const createUpdatedAt = () => new Date().toISOString();
const isWebRuntime = Platform.OS === 'web';
const sortJokesByOrder = (left, right) => (left.order ?? 0) - (right.order ?? 0);
const stageOrderBase = (stage) => (STAGES.indexOf(stage) + 1) * 1000;

const parseInitialWebRoute = () => {
  if (!isWebRuntime || typeof window === 'undefined') {
    return {
      currentScreen: 'kanban',
      selectedJokeId: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const jokeId = params.get('joke');

  if (view === 'focus' && jokeId) {
    return {
      currentScreen: 'jokeDetails',
      selectedJokeId: jokeId,
    };
  }

  return {
    currentScreen: 'kanban',
    selectedJokeId: null,
  };
};

const readPairCodeFromUrl = () => {
  if (!isWebRuntime || typeof window === 'undefined') {
    return '';
  }

  return new URLSearchParams(window.location.search).get('pair') || '';
};

const clearPairCodeFromUrl = () => {
  if (!isWebRuntime || typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('pair');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

export default function App() {
  const initialRoute = useMemo(() => parseInitialWebRoute(), []);
  const hasRemoteSync = hasFirebaseConfig();
  const [currentScreen, setCurrentScreen] = useState(initialRoute.currentScreen);
  const [jokes, setJokes] = useState([]);
  const [jokesUpdatedAt, setJokesUpdatedAt] = useState(createUpdatedAt());
  const [selectedJokeId, setSelectedJokeId] = useState(initialRoute.selectedJokeId);
  const [workspaceConnection, setWorkspaceConnection] = useState(null);
  const [syncState, setSyncState] = useState(hasRemoteSync ? 'preparing' : 'local_ready');
  const [syncError, setSyncError] = useState('');
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [remoteHydrated, setRemoteHydrated] = useState(false);
  const [pairingSession, setPairingSession] = useState(null);
  const [pairingBusy, setPairingBusy] = useState(false);
  const [connectCodeInput, setConnectCodeInput] = useState(() => readPairCodeFromUrl().toUpperCase());

  const lastRemoteAppliedAtRef = useRef(null);
  const lastRemoteSyncedAtRef = useRef(null);
  const restoredLocalSnapshotRef = useRef(false);
  const jokesRef = useRef([]);
  const jokesUpdatedAtRef = useRef(jokesUpdatedAt);

  useEffect(() => {
    jokesRef.current = jokes;
    jokesUpdatedAtRef.current = jokesUpdatedAt;
  }, [jokes, jokesUpdatedAt]);

  const hydrateWorkspace = useCallback(
    async (connection, options = {}) => {
      const shouldUseFallbackJokes = options.useFallbackJokes ?? !isWebRuntime;
      const workspaceKey = connection?.workspaceKey;
      if (!workspaceKey) {
        setWorkspaceConnection(null);
        setJokes([]);
        setJokesUpdatedAt(createUpdatedAt());
        restoredLocalSnapshotRef.current = false;
        setRemoteHydrated(false);
        setPairingSession(null);
        return;
      }

      const nextConnection = {
        ...connection,
        lastOpenedAt: createUpdatedAt(),
      };

      await persistWorkspaceConnection(nextConnection);
      const workspaceStorageKey = getWorkspaceJokesStorageKey(workspaceKey);
      const storedSnapshot = parseStoredJokes(await getStoredValue(workspaceStorageKey));
      const legacySnapshot =
        !storedSnapshot && shouldUseFallbackJokes
          ? parseStoredJokes(await getStoredValue(JOKES_STORAGE_KEY))
          : null;
      const snapshot = storedSnapshot || legacySnapshot;
      const nextJokes =
        snapshot?.jokes?.length > 0 ? snapshot.jokes : shouldUseFallbackJokes ? FALLBACK_JOKES : [];
      const nextUpdatedAt = snapshot?.updatedAt || getSnapshotUpdatedAt(nextJokes);

      restoredLocalSnapshotRef.current = Boolean(snapshot);
      lastRemoteAppliedAtRef.current = null;
      lastRemoteSyncedAtRef.current = null;
      setWorkspaceConnection(nextConnection);
      setJokes(nextJokes);
      setJokesUpdatedAt(nextUpdatedAt);
      setPairingSession(null);
      setRemoteHydrated(false);
      setSyncError('');
      setSyncState(hasRemoteSync ? 'connecting' : 'local_ready');
    },
    [hasRemoteSync]
  );

  useEffect(() => {
    let isCancelled = false;

    const initializeWorkspace = async () => {
      try {
        const storedConnection = await loadStoredWorkspaceConnection();
        const urlPairCode = readPairCodeFromUrl();

        if (storedConnection?.workspaceKey) {
          if (!isCancelled) {
            await hydrateWorkspace(storedConnection, { useFallbackJokes: !isWebRuntime });
          }
          return;
        }

        if (isWebRuntime && urlPairCode) {
          try {
            const redeemedConnection = await redeemPairingCode(urlPairCode);
            clearPairCodeFromUrl();
            setConnectCodeInput('');
            if (!isCancelled) {
              await hydrateWorkspace(redeemedConnection, { useFallbackJokes: false });
            }
            return;
          } catch (error) {
            clearPairCodeFromUrl();
            if (!isCancelled) {
              setSyncError(error.message || 'That sync code could not be used.');
              setSyncState('connect_required');
            }
          }
        }

        if (!isWebRuntime) {
          const guestWorkspace = await createGuestWorkspaceConnection();
          if (!isCancelled) {
            await hydrateWorkspace(guestWorkspace, { useFallbackJokes: true });
          }
          return;
        }

        if (!isCancelled) {
          setCurrentScreen('kanban');
          setSelectedJokeId(null);
          setWorkspaceConnection(null);
          setJokes([]);
          setJokesUpdatedAt(createUpdatedAt());
          setSyncState('connect_required');
        }
      } catch (error) {
        console.warn('Unable to initialize workspace.', error);
        if (!isCancelled) {
          setSyncError(error.message || 'Workspace setup failed.');
          setSyncState('error');
        }
      } finally {
        if (!isCancelled) {
          setWorkspaceReady(true);
        }
      }
    };

    initializeWorkspace();

    return () => {
      isCancelled = true;
    };
  }, [hydrateWorkspace]);

  useEffect(() => {
    if (!workspaceReady || !workspaceConnection?.workspaceKey) {
      return;
    }

    const storageKey = getWorkspaceJokesStorageKey(workspaceConnection.workspaceKey);
    if (!storageKey) {
      return;
    }

    setStoredValue(
      storageKey,
      JSON.stringify({
        jokes,
        updatedAt: jokesUpdatedAt,
      })
    ).catch((error) => {
      console.warn('Unable to persist jokes to storage.', error);
    });
  }, [jokes, jokesUpdatedAt, workspaceConnection, workspaceReady]);

  useEffect(() => {
    if (!hasRemoteSync || !workspaceConnection?.workspaceKey) {
      return undefined;
    }

    setSyncState('connecting');
    const unsubscribe = subscribeToRemoteJokes(
      workspaceConnection.workspaceKey,
      (remoteSnapshot) => {
        const remoteJokes = Array.isArray(remoteSnapshot?.jokes)
          ? remoteSnapshot.jokes.map(normalizeJoke)
          : [];
        const remoteUpdatedAt = remoteSnapshot?.updatedAt;
        const localUpdatedAt = jokesUpdatedAtRef.current;

        if (!remoteUpdatedAt) {
          if (restoredLocalSnapshotRef.current && jokesRef.current.length > 0) {
            lastRemoteSyncedAtRef.current = null;
            setRemoteHydrated(true);
            setSyncState('syncing');
            return;
          }

          if (!restoredLocalSnapshotRef.current) {
            setJokes(isWebRuntime ? [] : FALLBACK_JOKES);
            setJokesUpdatedAt(createUpdatedAt());
          }
          setRemoteHydrated(true);
          setSyncState('synced');
          return;
        }

        lastRemoteSyncedAtRef.current = remoteUpdatedAt;
        if (!remoteHydrated || remoteUpdatedAt !== localUpdatedAt) {
          lastRemoteAppliedAtRef.current = remoteUpdatedAt;
          setJokes(remoteJokes);
          setJokesUpdatedAt(remoteUpdatedAt);
        }

        setRemoteHydrated(true);
        setSyncState('synced');
      },
      (error) => {
        console.warn('Workspace sync listener failed.', error);
        setSyncError('Cloud sync connection failed.');
        setSyncState('error');
      }
    );

    return unsubscribe;
  }, [hasRemoteSync, remoteHydrated, workspaceConnection]);

  const getSyncErrorMessage = (error) => {
    const code = error?.code || '';

    if (code.includes('permission-denied')) {
      return 'Cloud sync failed: Firestore rules are blocking this workspace from syncing.';
    }

    if (code.includes('failed-precondition')) {
      return 'Cloud sync failed: Firestore may not be fully enabled for this project yet.';
    }

    if (code.includes('unavailable')) {
      return 'Cloud sync failed: Firebase is temporarily unavailable. Your edits are still saved locally.';
    }

    return error?.message || 'Changes are still local because cloud sync failed.';
  };

  useEffect(() => {
    if (!hasRemoteSync || !workspaceConnection?.workspaceKey || !remoteHydrated) {
      return undefined;
    }

    if (lastRemoteAppliedAtRef.current === jokesUpdatedAt) {
      lastRemoteAppliedAtRef.current = null;
      return undefined;
    }

    if (lastRemoteSyncedAtRef.current === jokesUpdatedAt) {
      setSyncState('synced');
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      setSyncState('syncing');

      try {
        await saveRemoteJokes(workspaceConnection.workspaceKey, {
          jokes,
          updatedAt: jokesUpdatedAt,
        });
        lastRemoteSyncedAtRef.current = jokesUpdatedAt;
        setSyncState('synced');
        setSyncError('');
      } catch (error) {
        console.warn('Unable to sync joke changes to Firebase.', error);
        setSyncError(getSyncErrorMessage(error));
        setSyncState('error');
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasRemoteSync, jokes, jokesUpdatedAt, remoteHydrated, workspaceConnection]);

  const selectedJokeIndex = useMemo(
    () => jokes.findIndex((joke) => joke.id === selectedJokeId),
    [jokes, selectedJokeId]
  );

  const selectedJoke = selectedJokeIndex >= 0 ? jokes[selectedJokeIndex] : null;

  useEffect(() => {
    if (!isWebRuntime || typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    if (currentScreen === 'jokeDetails' && selectedJokeId) {
      url.searchParams.set('view', 'focus');
      url.searchParams.set('joke', selectedJokeId);
    } else {
      url.searchParams.delete('view');
      url.searchParams.delete('joke');
    }

    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [currentScreen, selectedJokeId]);

  useEffect(() => {
    if (currentScreen === 'jokeDetails' && selectedJokeId && !selectedJoke && jokes.length > 0) {
      setCurrentScreen('kanban');
      setSelectedJokeId(null);
    }
  }, [currentScreen, selectedJoke, selectedJokeId, jokes.length]);

  const handleAddNewJoke = () => {
    setCurrentScreen('addJoke');
  };

  const handleOpenMap = () => {
    setCurrentScreen('map');
  };

  const handleOpenStreak = () => {
    setCurrentScreen('streak');
  };

  const handleSelectJoke = (joke, mode = isWebRuntime ? 'peek' : 'full') => {
    setSelectedJokeId(joke.id);
    setCurrentScreen(mode === 'focus' || (!isWebRuntime && mode !== 'peek') ? 'jokeDetails' : 'kanban');
  };

  const handleCloseScreen = () => {
    setCurrentScreen('kanban');
    setSelectedJokeId(null);
  };

  const handleClosePeek = () => {
    setSelectedJokeId(null);
  };

  const handleAddJoke = (newJoke) => {
    const normalizedJoke = normalizeJoke(newJoke);
    const updatedAt = normalizedJoke.updatedAt || createUpdatedAt();
    setJokes((currentJokes) => {
      const stageJokes = currentJokes
        .filter((joke) => joke.stage === normalizedJoke.stage)
        .sort(sortJokesByOrder);
      const order = (stageJokes[stageJokes.length - 1]?.order ?? stageOrderBase(normalizedJoke.stage)) + 1;
      return [...currentJokes, { ...normalizedJoke, updatedAt, order }];
    });
    setJokesUpdatedAt(updatedAt);
    setCurrentScreen('kanban');
  };

  const handleUpdateJoke = (updatedJoke) => {
    const normalizedJoke = normalizeJoke(updatedJoke);
    const updatedAt = normalizedJoke.updatedAt || createUpdatedAt();
    const existingJoke = jokes.find((joke) => joke.id === normalizedJoke.id);
    const nextJoke = { ...normalizedJoke, updatedAt, order: normalizedJoke.order ?? existingJoke?.order ?? 0 };
    setJokes((currentJokes) =>
      currentJokes.map((joke) => (joke.id === nextJoke.id ? nextJoke : joke))
    );
    setJokesUpdatedAt(updatedAt);
    setSelectedJokeId(nextJoke.id);
  };

  const handleMoveJoke = (jokeId, direction) => {
    setJokes((currentJokes) => {
      const jokeToMove = currentJokes.find((item) => item.id === jokeId);
      if (!jokeToMove) {
        return currentJokes;
      }

      const currentStageIndex = STAGES.indexOf(jokeToMove.stage);
      if (currentStageIndex < 0) {
        return currentJokes;
      }

      const nextStageIndex = currentStageIndex + direction;
      if (nextStageIndex < 0 || nextStageIndex >= STAGES.length) {
        return currentJokes;
      }

      const updatedAt = createUpdatedAt();
      const nextJokes = currentJokes.map((item) =>
        item.id === jokeId
          ? {
              ...item,
              stage: STAGES[nextStageIndex],
              updatedAt,
            }
          : item
      );
      setJokesUpdatedAt(updatedAt);
      return nextJokes;
    });
  };

  const handleMoveJokeToStage = (jokeId, nextStage) => {
    if (!STAGES.includes(nextStage)) {
      return;
    }

    const updatedAt = createUpdatedAt();
    setJokes((currentJokes) => {
      const stageItems = currentJokes
        .filter((item) => item.stage === nextStage && item.id !== jokeId)
        .sort(sortJokesByOrder);
      const nextOrder = (stageItems[stageItems.length - 1]?.order ?? stageOrderBase(nextStage)) + 1;
      return currentJokes.map((item) =>
        item.id === jokeId
          ? {
              ...item,
              stage: nextStage,
              order: nextOrder,
              updatedAt,
            }
          : item
      );
    });
    setJokesUpdatedAt(updatedAt);
  };

  const handleReorderJoke = ({ jokeId, targetStage, targetIndex }) => {
    if (!STAGES.includes(targetStage)) {
      return;
    }

    const updatedAt = createUpdatedAt();

    setJokes((currentJokes) => {
      const draggedJoke = currentJokes.find((item) => item.id === jokeId);
      if (!draggedJoke) {
        return currentJokes;
      }

      const buckets = Object.fromEntries(
        STAGES.map((stage) => [
          stage,
          currentJokes.filter((item) => item.stage === stage).sort(sortJokesByOrder),
        ])
      );

      const sourceStage = draggedJoke.stage;
      const sourceBucket = buckets[sourceStage].filter((item) => item.id !== jokeId);
      const targetBucket = sourceStage === targetStage ? sourceBucket : [...buckets[targetStage]];
      const insertionIndex = Math.max(0, Math.min(targetIndex, targetBucket.length));

      targetBucket.splice(insertionIndex, 0, {
        ...draggedJoke,
        stage: targetStage,
        updatedAt,
      });

      buckets[sourceStage] = sourceStage === targetStage ? targetBucket : sourceBucket;
      buckets[targetStage] = targetBucket;

      return STAGES.flatMap((stage) =>
        buckets[stage].map((item, index) => ({
          ...item,
          stage,
          order: stageOrderBase(stage) + index,
          updatedAt:
            item.id === jokeId || stage === sourceStage || stage === targetStage
              ? updatedAt
              : item.updatedAt,
        }))
      );
    });

    setJokesUpdatedAt(updatedAt);
  };

  const handleDeleteJoke = (jokeId) => {
    const updatedAt = createUpdatedAt();
    setJokes((currentJokes) => currentJokes.filter((joke) => joke.id !== jokeId));
    setJokesUpdatedAt(updatedAt);
    if (selectedJokeId === jokeId) {
      setSelectedJokeId(null);
      if (currentScreen === 'jokeDetails') {
        setCurrentScreen('kanban');
      }
    }
  };

  const handleOpenJokeInNewTab = (joke) => {
    if (!isWebRuntime || typeof window === 'undefined') {
      handleSelectJoke(joke, 'full');
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('view', 'focus');
    url.searchParams.set('joke', joke.id);
    window.open(`${url.pathname}${url.search}${url.hash}`, '_blank', 'noopener,noreferrer');
  };

  const handleNavigateJoke = (direction) => {
    if (selectedJokeIndex < 0) {
      return;
    }

    const nextIndex = selectedJokeIndex + direction;
    if (nextIndex < 0 || nextIndex >= jokes.length) {
      return;
    }

    setSelectedJokeId(jokes[nextIndex].id);
  };

  const handleStartPairing = useCallback(async () => {
    if (!workspaceConnection?.workspaceKey) {
      return;
    }

    setPairingBusy(true);
    try {
      const nextPairingSession = await createPairingSession(workspaceConnection.workspaceKey);
      setPairingSession(nextPairingSession);
      setSyncError('');
      setSyncState((currentState) => (currentState === 'error' ? 'synced' : currentState));
    } catch (error) {
      console.warn('Unable to create pairing session.', error);
      setSyncError(error.message || 'Unable to create a sync code right now.');
      setSyncState('error');
    } finally {
      setPairingBusy(false);
    }
  }, [workspaceConnection]);

  const handleConnectExistingWorkspace = useCallback(async () => {
    setPairingBusy(true);
    try {
      const connection = await redeemPairingCode(connectCodeInput);
      clearPairCodeFromUrl();
      setConnectCodeInput('');
      await hydrateWorkspace(connection, { useFallbackJokes: false });
      setCurrentScreen('kanban');
      setSelectedJokeId(null);
      setWorkspaceReady(true);
    } catch (error) {
      console.warn('Unable to connect workspace from code.', error);
      setSyncError(error.message || 'That sync code could not be used.');
      setSyncState('connect_required');
    } finally {
      setPairingBusy(false);
    }
  }, [connectCodeInput, hydrateWorkspace]);

  const handleDisconnectCurrentBrowser = useCallback(async () => {
    await clearWorkspaceConnection();
    await clearStoredPairingSession();
    setWorkspaceConnection(null);
    setPairingSession(null);
    setJokes([]);
    setJokesUpdatedAt(createUpdatedAt());
    setRemoteHydrated(false);
    setCurrentScreen('kanban');
    setSelectedJokeId(null);
    setSyncError('');
    setSyncState('connect_required');
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'kanban':
        return (
          <KanbanBoardScreen
            jokes={jokes}
            onAddNewJoke={handleAddNewJoke}
            onOpenMap={handleOpenMap}
            onOpenStreak={handleOpenStreak}
            onSelectJoke={handleSelectJoke}
            onMoveJoke={handleMoveJoke}
            onMoveJokeToStage={handleMoveJokeToStage}
            onReorderJoke={handleReorderJoke}
            onDeleteJoke={handleDeleteJoke}
            onOpenJokeInNewTab={handleOpenJokeInNewTab}
            selectedJokeId={selectedJokeId}
            onClosePeek={handleClosePeek}
            peekContent={
              isWebRuntime && selectedJoke && currentScreen === 'kanban' ? (
                <JokeDetailsScreen
                  joke={selectedJoke}
                  jokes={jokes}
                  jokeIndex={selectedJokeIndex}
                  onClose={handleClosePeek}
                  onOpenInNewTab={() => handleOpenJokeInNewTab(selectedJoke)}
                  onDeleteJoke={handleDeleteJoke}
                  onUpdateJoke={handleUpdateJoke}
                  onNavigateNext={() => handleNavigateJoke(1)}
                  onNavigatePrevious={() => handleNavigateJoke(-1)}
                  layoutMode="peek"
                />
              ) : null
            }
            workspaceConnection={workspaceConnection}
            syncState={syncState}
            syncError={syncError}
            hasRemoteSync={hasRemoteSync}
            pairingSession={pairingSession}
            pairingBusy={pairingBusy}
            onStartPairing={handleStartPairing}
            connectCodeInput={connectCodeInput}
            onChangeConnectCode={setConnectCodeInput}
            onConnectExistingWorkspace={handleConnectExistingWorkspace}
            onDisconnectCurrentBrowser={handleDisconnectCurrentBrowser}
            hostedWebAppUrl={buildPairingLink('SYNC-CODE').replace('/?pair=SYNC-CODE', '')}
          />
        );
      case 'addJoke':
        return <AddNewJokeScreen onAddJoke={handleAddJoke} onClose={handleCloseScreen} />;
      case 'streak':
        return <WritingStreakScreen onClose={handleCloseScreen} />;
      case 'map':
        return <MapScreen onClose={handleCloseScreen} />;
      case 'jokeDetails':
        return selectedJoke ? (
          <JokeDetailsScreen
            joke={selectedJoke}
            jokes={jokes}
            jokeIndex={selectedJokeIndex}
            onClose={handleCloseScreen}
            onDeleteJoke={handleDeleteJoke}
            onUpdateJoke={handleUpdateJoke}
            onNavigateNext={() => handleNavigateJoke(1)}
            onNavigatePrevious={() => handleNavigateJoke(-1)}
            layoutMode="full"
          />
        ) : null;
      default:
        return null;
    }
  };

  if (!workspaceReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#171717',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#f7f6f3', fontSize: 16, fontWeight: '600' }}>Preparing workspace…</Text>
      </View>
    );
  }

  return <View style={{ flex: 1 }}>{renderScreen()}</View>;
}
