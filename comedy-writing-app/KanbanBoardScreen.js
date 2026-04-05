import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Linking,
  Image,
} from 'react-native';
import { STAGES, STAGE_COLORS } from './src/constants/stages';

const LEGAL_LINKS = {
  terms: 'https://joke-writing-app.web.app/terms.html',
  privacy: 'https://joke-writing-app.web.app/privacy.html',
  support: 'https://joke-writing-app.web.app/support.html',
};

const getSyncLabel = (syncState) => {
  switch (syncState) {
    case 'preparing':
      return 'Preparing your workspace...';
    case 'connect_required':
      return 'Connect your workspace';
    case 'connecting':
      return 'Connecting sync...';
    case 'syncing':
      return 'Syncing changes...';
    case 'synced':
      return 'All changes synced';
    case 'error':
      return 'Sync needs attention';
    case 'local_ready':
      return 'Private guest workspace ready';
    default:
      return 'Workspace ready';
  }
};

const WEB_FONT = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const WEB_KANBAN_STYLES = {
  shell: {
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
    flex: 1,
    minHeight: 0,
    padding: 18,
    paddingBottom: 34,
    fontFamily: WEB_FONT,
  },
  boardPane: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    borderRadius: 28,
    border: '1px solid rgba(255,255,255,0.06)',
    background:
      'radial-gradient(circle at top left, rgba(255,255,255,0.03), transparent 32%), linear-gradient(180deg, rgba(20,20,20,0.96), rgba(14,14,14,0.98))',
    boxShadow: '0 22px 80px rgba(0,0,0,0.32)',
    padding: 14,
  },
  peekPane: {
    width: 560,
    minWidth: 560,
    maxWidth: 560,
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'stretch',
    background:
      'linear-gradient(180deg, rgba(24,24,24,0.98), rgba(14,14,14,0.98))',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 0,
    height: '100%',
    boxShadow: '0 30px 80px rgba(0,0,0,0.34)',
  },
  boardViewport: {
    width: '100%',
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: 6,
    paddingBottom: 30,
    minHeight: 0,
    scrollbarWidth: 'thin',
    scrollPaddingLeft: 24,
  },
  column: {
    flex: '0 0 292px',
    width: 292,
    minWidth: 292,
    borderRadius: 22,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  columnHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: '4px 6px 14px',
  },
  columnBadge: {
    borderRadius: 999,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 700,
    color: '#101010',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
  },
  columnCount: {
    color: '#8e8e8e',
    fontSize: 12,
    marginLeft: 'auto',
    backgroundColor: 'rgba(0,0,0,0.16)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 999,
    padding: '4px 8px',
  },
  columnBody: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: 4,
    minHeight: 0,
  },
  dropZone: {
    height: 14,
    borderRadius: 999,
    margin: '4px 0',
    transition: 'all 140ms ease',
  },
  dropZoneActive: {
    backgroundColor: 'rgba(122, 153, 255, 0.9)',
    boxShadow: '0 0 0 1px rgba(122, 153, 255, 0.36), 0 0 22px rgba(122, 153, 255, 0.2)',
  },
  card: {
    borderRadius: 16,
    border: '1px solid transparent',
    padding: 12,
    marginBottom: 8,
    cursor: 'grab',
    userSelect: 'none',
    position: 'relative',
    transition: 'transform 140ms ease, box-shadow 140ms ease, border 140ms ease, opacity 140ms ease',
    boxShadow: '0 10px 26px rgba(0,0,0,0.14)',
  },
  cardActive: {
    boxShadow: '0 0 0 1px rgba(255,255,255,0.18), 0 16px 34px rgba(0,0,0,0.22)',
    transform: 'translateY(-1px)',
  },
  cardTop: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    color: '#f7f6f3',
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.42,
    letterSpacing: '-0.01em',
    flex: 1,
  },
  cardMetaRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  cardMetaChip: {
    borderRadius: 999,
    padding: '5px 9px',
    backgroundColor: 'rgba(0,0,0,0.18)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#d0d0ce',
    fontSize: 11,
    lineHeight: 1.2,
  },
  cardActions: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15,15,15,0.25)',
    color: '#dedcd6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 12,
  },
  menuWrap: {
    position: 'relative',
  },
  cardMenu: {
    position: 'absolute',
    top: 34,
    right: 0,
    width: 236,
    backgroundColor: '#1f1f1f',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    boxShadow: '0 20px 52px rgba(0,0,0,0.52)',
    padding: 8,
    zIndex: 20,
    backdropFilter: 'blur(18px)',
  },
  cardMenuButton: {
    width: '100%',
    border: 'none',
    borderRadius: 10,
    backgroundColor: 'transparent',
    color: '#f3f1eb',
    padding: '10px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 13,
  },
  cardMenuSectionLabel: {
    color: '#8b8b8b',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '10px 12px 6px',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    margin: '6px 0',
  },
  newPageButton: {
    width: '100%',
    marginTop: 10,
    border: '1px dashed rgba(255,255,255,0.12)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    color: '#aca9a2',
    padding: '13px 14px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
};

export default function KanbanBoardScreen({
  jokes,
  onAddNewJoke,
  onOpenMap,
  onOpenStreak,
  onSelectJoke,
  onMoveJoke,
  onMoveJokeToStage,
  onReorderJoke,
  onDeleteJoke,
  onOpenJokeInNewTab,
  selectedJokeId,
  peekContent,
  onClosePeek,
  workspaceConnection,
  syncState,
  syncError,
  hasRemoteSync,
  pairingSession,
  pairingBusy,
  onStartPairing,
  connectCodeInput,
  onChangeConnectCode,
  onConnectExistingWorkspace,
  onDisconnectCurrentBrowser,
  hostedWebAppUrl,
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [draggedJokeId, setDraggedJokeId] = React.useState(null);
  const [dragTarget, setDragTarget] = React.useState(null);
  const [openCardMenuId, setOpenCardMenuId] = React.useState(null);
  const [showSyncPanel, setShowSyncPanel] = React.useState(false);
  const isWeb = Platform.OS === 'web';

  const getJokesForStage = React.useCallback(
    (stage) =>
      jokes
        .filter((joke) => joke.stage === stage)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    [jokes]
  );

  React.useEffect(() => {
    if (!isWeb || typeof window === 'undefined') {
      return undefined;
    }

    const closeMenus = () => {
      setOpenCardMenuId(null);
      setMenuOpen(false);
    };

    window.addEventListener('click', closeMenus);
    return () => {
      window.removeEventListener('click', closeMenus);
    };
  }, [isWeb]);

  const handleMovePrompt = (joke) => {
    const stageIndex = STAGES.indexOf(joke.stage);
    const actions = [];

    if (stageIndex > 0) {
      actions.push({
        text: `Move Left to ${STAGES[stageIndex - 1]}`,
        onPress: () => onMoveJoke?.(joke.id, -1),
      });
    }

    if (stageIndex < STAGES.length - 1) {
      actions.push({
        text: `Move Right to ${STAGES[stageIndex + 1]}`,
        onPress: () => onMoveJoke?.(joke.id, 1),
      });
    }

    actions.push({
      text: 'Delete Joke',
      style: 'destructive',
      onPress: () => onDeleteJoke?.(joke.id),
    });

    actions.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(joke.title, 'Move this joke to another stack or delete it.', actions);
  };

  const openExternalUrl = React.useCallback(async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Unable to open external URL.', error);
    }
  }, []);

  const renderConnectScreen = () => (
    <SafeAreaView style={styles.authScreen}>
      <KeyboardAvoidingView
        style={styles.authKeyboardShell}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.authScroller}
          contentContainerStyle={styles.authScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.authShell}>
            <View style={styles.authLogo}>
              <Text style={styles.authLogoText}>J</Text>
            </View>
            <Text style={styles.authEyebrow}>On Deck</Text>
            <Text style={styles.authHeadline}>Your joke workspace.</Text>
            <Text style={styles.authSubhead}>
              Open the app on your phone, generate a sync code, and pair this browser to the same private workspace.
            </Text>

            <View style={styles.authCard}>
              <TextInput
                value={connectCodeInput}
                onChangeText={(value) => onChangeConnectCode?.(value.toUpperCase())}
                placeholder="Enter sync code"
                placeholderTextColor="#7c7c7c"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                style={styles.authInput}
              />

              <TouchableOpacity onPress={onConnectExistingWorkspace} style={styles.authPrimaryButton}>
                <Text style={styles.authPrimaryButtonText}>
                  {pairingBusy ? 'Connecting…' : 'Connect Existing Workspace'}
                </Text>
              </TouchableOpacity>

              {syncError ? <Text style={styles.authInlineError}>{syncError}</Text> : null}

              <Text style={styles.authFinePrint}>
                Your jokes and recordings stay private to the workspace you pair. The developer does not routinely browse user content.
              </Text>

              <View style={styles.legalLinksRow}>
                <TouchableOpacity onPress={() => openExternalUrl(LEGAL_LINKS.terms)}>
                  <Text style={styles.legalLink}>Terms</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openExternalUrl(LEGAL_LINKS.privacy)}>
                  <Text style={styles.legalLink}>Privacy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openExternalUrl(LEGAL_LINKS.support)}>
                  <Text style={styles.legalLink}>Support</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => openExternalUrl(hostedWebAppUrl)}
                style={styles.authSecondaryButton}
              >
                <Text style={styles.authSecondaryButtonText}>Open hosted website</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const renderPairingPanel = () => {
    if (isWeb || !showSyncPanel) {
      return null;
    }

    return (
      <View style={styles.pairingPanel}>
        <View style={styles.pairingPanelHeader}>
          <View>
            <Text style={styles.pairingPanelTitle}>Sync to web</Text>
            <Text style={styles.pairingPanelSubhead}>
              Open the website on desktop and enter this code to connect the same private workspace.
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowSyncPanel(false)} style={styles.pairingCloseButton}>
            <Text style={styles.pairingCloseButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={onStartPairing}
          style={styles.syncPrimaryButton}
        >
          <Text style={styles.syncPrimaryButtonText}>
            {pairingBusy ? 'Generating…' : pairingSession ? 'Refresh Sync Code' : 'Show Sync Code'}
          </Text>
        </TouchableOpacity>

        {pairingSession ? (
          <View style={styles.pairingContent}>
            <View style={styles.codePreview}>
              <Text style={styles.codePreviewLabel}>Sync code</Text>
              <Text style={styles.codePreviewValue}>{pairingSession.code}</Text>
              <Text style={styles.codePreviewExpiry}>
                Expires at {new Date(pairingSession.expiresAtMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
              <Text style={styles.codePreviewLinkLabel}>Desktop site</Text>
              <Text style={styles.codePreviewLink}>{hostedWebAppUrl}</Text>
            </View>

            {pairingSession.qrDataUrl ? (
              <View style={styles.qrCard}>
                <Image source={{ uri: pairingSession.qrDataUrl }} style={styles.qrImage} />
                <Text style={styles.qrCaption}>Scan this QR to open the pairing page.</Text>
              </View>
            ) : (
              <View style={styles.qrCard}>
                <Text style={styles.qrCaption}>
                  QR preview is shown on web only. On iPhone, open the desktop site and enter the sync code above.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.pairingPanelSubhead}>
            Generate a fresh code whenever you want to connect a browser.
          </Text>
        )}

        <Text style={styles.authFinePrint}>
          Private by default. Your content syncs only to devices that know this workspace code.
        </Text>
      </View>
    );
  };

  if (isWeb && !workspaceConnection) {
    return renderConnectScreen();
  }

  const renderWebCardMenu = (joke) => (
    <div
      style={WEB_KANBAN_STYLES.cardMenu}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <button
        style={WEB_KANBAN_STYLES.cardMenuButton}
        onClick={() => {
          onSelectJoke?.(joke, 'peek');
          setOpenCardMenuId(null);
        }}
      >
        Side peek
      </button>
      <button
        style={WEB_KANBAN_STYLES.cardMenuButton}
        onClick={() => {
          onOpenJokeInNewTab?.(joke);
          setOpenCardMenuId(null);
        }}
      >
        New tab
      </button>
      <div style={WEB_KANBAN_STYLES.divider} />
      <div style={WEB_KANBAN_STYLES.cardMenuSectionLabel}>Move to stack</div>
      {STAGES.filter((stage) => stage !== joke.stage).map((stage) => (
        <button
          key={stage}
          style={WEB_KANBAN_STYLES.cardMenuButton}
          onClick={() => {
            onMoveJokeToStage?.(joke.id, stage);
            setOpenCardMenuId(null);
          }}
        >
          {stage}
        </button>
      ))}
      <div style={WEB_KANBAN_STYLES.divider} />
      <button
        style={{
          ...WEB_KANBAN_STYLES.cardMenuButton,
          color: '#ff8a80',
        }}
        onClick={() => {
          onDeleteJoke?.(joke.id);
          setOpenCardMenuId(null);
        }}
      >
        Delete joke
      </button>
    </div>
  );

  const renderWebKanbanBoard = () => (
    <div style={WEB_KANBAN_STYLES.shell}>
      <div style={WEB_KANBAN_STYLES.boardPane}>
        <div
          id="kanban-board-viewport"
          style={WEB_KANBAN_STYLES.boardViewport}
          onWheel={(event) => {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
              event.currentTarget.scrollLeft += event.deltaY;
            }
          }}
        >
          {STAGES.map((stage) => {
            const stageJokes = getJokesForStage(stage);
            const stageTheme = STAGE_COLORS[stage];
            return (
              <div
                key={stage}
                style={{
                  ...WEB_KANBAN_STYLES.column,
                  backgroundColor: stageTheme.column,
                  border: `1px solid ${stageTheme.border}`,
                }}
              >
                <div style={WEB_KANBAN_STYLES.columnHeader}>
                  <span
                    style={{
                      ...WEB_KANBAN_STYLES.columnBadge,
                      backgroundColor: stageTheme.pill,
                    }}
                  >
                    {stage}
                  </span>
                  <span style={WEB_KANBAN_STYLES.columnCount}>{stageJokes.length}</span>
                </div>

                <div style={WEB_KANBAN_STYLES.columnBody}>
                  <div
                    style={{
                      ...WEB_KANBAN_STYLES.dropZone,
                      ...(dragTarget?.stage === stage && dragTarget?.index === 0
                        ? WEB_KANBAN_STYLES.dropZoneActive
                        : null),
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragTarget({ stage, index: 0 });
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const jokeId = event.dataTransfer.getData('text/plain') || draggedJokeId;
                      if (jokeId) {
                        onReorderJoke?.({ jokeId, targetStage: stage, targetIndex: 0 });
                      }
                      setDraggedJokeId(null);
                      setDragTarget(null);
                    }}
                  />

                  {stageJokes.map((joke, index) => (
                    <React.Fragment key={joke.id}>
                      <div
                        draggable
                        style={{
                          ...WEB_KANBAN_STYLES.card,
                          backgroundColor: stageTheme.card,
                          borderColor:
                            selectedJokeId === joke.id ? 'rgba(255,255,255,0.26)' : stageTheme.border,
                          opacity: draggedJokeId === joke.id ? 0.58 : 1,
                          ...(selectedJokeId === joke.id ? WEB_KANBAN_STYLES.cardActive : null),
                        }}
                        onClick={() => {
                          if (!draggedJokeId) {
                            onSelectJoke?.(joke, 'peek');
                          }
                        }}
                        onDragStart={(event) => {
                          setDraggedJokeId(joke.id);
                          event.dataTransfer.setData('text/plain', joke.id);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedJokeId(null);
                          setDragTarget(null);
                        }}
                      >
                        <div style={WEB_KANBAN_STYLES.cardTop}>
                          <div style={WEB_KANBAN_STYLES.cardTitle}>{joke.title}</div>
                          <div style={WEB_KANBAN_STYLES.cardActions}>
                            <button
                              style={WEB_KANBAN_STYLES.iconButton}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectJoke?.(joke, 'peek');
                              }}
                            >
                              ✎
                            </button>
                            <div style={WEB_KANBAN_STYLES.menuWrap}>
                              <button
                                style={WEB_KANBAN_STYLES.iconButton}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenCardMenuId((current) => (current === joke.id ? null : joke.id));
                                }}
                              >
                                ⋯
                              </button>
                              {openCardMenuId === joke.id ? renderWebCardMenu(joke) : null}
                            </div>
                          </div>
                        </div>
                        <div style={WEB_KANBAN_STYLES.cardMetaRow}>
                          <span style={WEB_KANBAN_STYLES.cardMetaChip}>
                            {(joke.tags?.length || 0) > 0
                              ? `${joke.tags.length} tag${joke.tags.length === 1 ? '' : 's'}`
                              : 'No tags'}
                          </span>
                          <span style={WEB_KANBAN_STYLES.cardMetaChip}>
                            {(joke.recordings?.length || 0) > 0
                              ? `${joke.recordings.length} take${joke.recordings.length === 1 ? '' : 's'}`
                              : 'No takes'}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          ...WEB_KANBAN_STYLES.dropZone,
                          ...(dragTarget?.stage === stage && dragTarget?.index === index + 1
                            ? WEB_KANBAN_STYLES.dropZoneActive
                            : null),
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragTarget({ stage, index: index + 1 });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const jokeId = event.dataTransfer.getData('text/plain') || draggedJokeId;
                          if (jokeId) {
                            onReorderJoke?.({
                              jokeId,
                              targetStage: stage,
                              targetIndex: index + 1,
                            });
                          }
                          setDraggedJokeId(null);
                          setDragTarget(null);
                        }}
                      />
                    </React.Fragment>
                  ))}

                  <button onClick={onAddNewJoke} style={WEB_KANBAN_STYLES.newPageButton}>
                    + New joke
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {peekContent ? <div style={WEB_KANBAN_STYLES.peekPane}>{peekContent}</div> : null}
    </div>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.boardShell}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>Jokes</Text>
            {isWeb ? (
              <Text style={styles.desktopSubhead}>
                Drag cards between stacks, click once to open a side peek, or pop a joke into its own focused tab.
              </Text>
            ) : null}
          </View>
          <View style={styles.headerActions}>
            {isWeb ? (
              <TouchableOpacity onPress={onAddNewJoke} style={styles.desktopPrimaryButton}>
                <Text style={styles.desktopPrimaryButtonText}>+ New Joke</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.accountMenuWrap}>
              <TouchableOpacity
                onPress={() => setMenuOpen((open) => !open)}
                style={styles.menuTrigger}
              >
                <Text style={styles.menuTriggerText}>⋯</Text>
              </TouchableOpacity>
              {menuOpen ? (
                <View style={styles.menuDropdown}>
                  <Text style={styles.menuEmail} numberOfLines={1}>
                    {workspaceConnection?.mode === 'paired_web'
                      ? 'Connected browser'
                      : 'Guest workspace'}
                  </Text>
                  {!isWeb ? (
                    <TouchableOpacity
                      onPress={() => {
                        setMenuOpen(false);
                        setShowSyncPanel((current) => !current);
                        if (!pairingSession) {
                          onStartPairing?.();
                        }
                      }}
                      style={styles.menuItem}
                    >
                      <Text style={styles.menuItemText}>Sync to web</Text>
                    </TouchableOpacity>
                  ) : null}
                  {isWeb && peekContent ? (
                    <TouchableOpacity
                      onPress={() => {
                        setMenuOpen(false);
                        onClosePeek?.();
                      }}
                      style={styles.menuItem}
                    >
                      <Text style={styles.menuItemText}>Close side peek</Text>
                    </TouchableOpacity>
                  ) : null}
                  {isWeb ? (
                    <TouchableOpacity
                      onPress={() => {
                        setMenuOpen(false);
                        onDisconnectCurrentBrowser?.();
                      }}
                      style={styles.menuItem}
                    >
                      <Text style={styles.menuItemText}>Disconnect this browser</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.actionBar}>
          <TouchableOpacity onPress={onOpenMap} style={styles.actionButton}>
            <Text style={styles.actionEmoji}>🎤</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenStreak} style={styles.actionButton}>
            <Text style={styles.actionEmoji}>🔥</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.syncRow}>
          <View style={styles.syncCopy}>
            <View
              style={[
                styles.syncDot,
                syncState === 'synced'
                  ? styles.syncDotSuccess
                  : syncState === 'error'
                    ? styles.syncDotError
                    : styles.syncDotIdle,
              ]}
            />
            <View style={styles.syncTextBlock}>
              <Text style={styles.syncLabel}>{getSyncLabel(syncState)}</Text>
              <Text style={styles.syncCaption}>
                {!hasRemoteSync
                  ? 'Add Firebase config to sync across devices.'
                  : isWeb
                    ? 'This browser can edit jokes once it is paired to a phone workspace.'
                    : 'Use Sync to web to pair this phone workspace with the hosted desktop app.'}
              </Text>
              {syncError ? <Text style={styles.syncError}>{syncError}</Text> : null}
            </View>
          </View>
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>
              {syncState === 'synced'
                ? 'Synced'
                : syncState === 'syncing'
                  ? 'Syncing'
                  : syncState === 'connect_required'
                    ? 'Pair'
                    : 'Cloud'}
            </Text>
          </View>
        </View>

        {renderPairingPanel()}

        {isWeb ? (
          renderWebKanbanBoard()
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.kanban}
            contentContainerStyle={styles.kanbanContent}
          >
            {STAGES.map((stage) => {
              const stageJokes = getJokesForStage(stage);
              return (
                <View key={stage} style={styles.column}>
                  <View style={styles.columnHeader}>
                    <View style={[styles.colorDot, { backgroundColor: STAGE_COLORS[stage].pill }]} />
                    <Text style={styles.columnTitle}>{stage}</Text>
                    <Text style={styles.columnCount}>{stageJokes.length}</Text>
                  </View>

                  <ScrollView style={styles.columnContent}>
                    {stageJokes.map((joke) => (
                      <TouchableOpacity
                        key={joke.id}
                        onPress={() => onSelectJoke?.(joke, 'full')}
                        onLongPress={() => handleMovePrompt(joke)}
                        delayLongPress={220}
                        style={[styles.jokeCard, { borderColor: STAGE_COLORS[stage].border }]}
                      >
                        <Text style={styles.jokeTitle}>{joke.title}</Text>
                        <Text style={styles.jokePreview} numberOfLines={1}>
                          {(joke.tags?.length || 0) > 0 ? `${joke.tags.length} tags` : 'Tap to open'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={onAddNewJoke} style={styles.addNewPage}>
                      <Text style={styles.addNewPageText}>+ New joke</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {!isWeb ? (
        <TouchableOpacity onPress={onAddNewJoke} style={styles.fab}>
          <Text style={styles.fabText}>+</Text>
          <Text style={styles.fabLabel}>New</Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authScreen: {
    flex: 1,
    backgroundColor: '#161616',
  },
  authKeyboardShell: {
    flex: 1,
  },
  authScroller: {
    flex: 1,
  },
  authScrollContent: {
    flexGrow: 1,
  },
  authShell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  authLogo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    backgroundColor: '#1c1c1c',
  },
  authLogoText: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '800',
  },
  authEyebrow: {
    color: '#9c9c9c',
    fontSize: 15,
    marginBottom: 8,
  },
  authHeadline: {
    color: '#fff',
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    marginBottom: 10,
  },
  authSubhead: {
    color: '#8a8a8a',
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 26,
    maxWidth: 500,
  },
  authCard: {
    borderWidth: 1,
    borderColor: '#343434',
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#1e1e1e',
    gap: 12,
    maxWidth: 560,
  },
  authPrimaryButton: {
    backgroundColor: '#0f0f10',
    borderWidth: 1,
    borderColor: '#3d3d3d',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  authPrimaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  authSecondaryButton: {
    borderWidth: 1,
    borderColor: '#3d3d3d',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#1a1a1b',
  },
  authSecondaryButtonText: {
    color: '#d7d7d7',
    fontSize: 14,
    fontWeight: '600',
  },
  authInlineError: {
    color: '#ff8d8d',
    fontSize: 13,
    lineHeight: 20,
  },
  authFinePrint: {
    color: '#7c7c7c',
    fontSize: 13,
    lineHeight: 20,
  },
  legalLinksRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  legalLink: {
    color: '#d9d4ca',
    fontSize: 13,
    fontWeight: '600',
  },
  authModeRow: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 4,
    gap: 6,
  },
  authModeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  authModeButtonActive: {
    backgroundColor: '#2e2e2e',
  },
  authModeText: {
    color: '#9f9f9f',
    fontSize: 12,
    fontWeight: '600',
  },
  authModeTextActive: {
    color: '#fff',
  },
  authInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#383838',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
  },
  codePreview: {
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#383838',
    padding: 16,
    alignItems: 'center',
  },
  codePreviewLabel: {
    color: '#8f8f8f',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  codePreviewValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
  },
  codePreviewExpiry: {
    color: '#8f8f8f',
    fontSize: 12,
    marginTop: 8,
  },
  codePreviewLinkLabel: {
    color: '#8f8f8f',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  codePreviewLink: {
    color: '#d9d4ca',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#171717',
  },
  boardShell: {
    flex: 1,
    width: '100%',
    maxWidth: 1720,
    alignSelf: 'center',
    minHeight: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 22,
    marginBottom: 10,
    zIndex: 20,
  },
  title: {
    color: '#f7f6f3',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  desktopSubhead: {
    color: '#9b978e',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 700,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopPrimaryButton: {
    backgroundColor: '#f3efe6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 3,
  },
  desktopPrimaryButtonText: {
    color: '#161616',
    fontSize: 13,
    fontWeight: '800',
  },
  accountMenuWrap: {
    position: 'relative',
  },
  menuTrigger: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#252423',
    borderWidth: 1,
    borderColor: '#31302e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTriggerText: {
    color: '#f5f4f1',
    fontSize: 22,
    lineHeight: 24,
    marginTop: -4,
  },
  menuDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    minWidth: 210,
    backgroundColor: '#1c1c1c',
    borderColor: '#333230',
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 6,
  },
  menuEmail: {
    color: '#aaa69b',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 6,
  },
  menuItem: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemText: {
    color: '#f4f2ed',
    fontSize: 13,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262523',
    paddingBottom: 14,
  },
  actionButton: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#242321',
    borderWidth: 1,
    borderColor: '#31302d',
  },
  actionEmoji: {
    fontSize: 24,
  },
  syncRow: {
    marginHorizontal: 18,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#1d1c1a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2926',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  syncCopy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  syncDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  syncDotIdle: {
    backgroundColor: '#f4be55',
  },
  syncDotSuccess: {
    backgroundColor: '#6bc490',
  },
  syncDotError: {
    backgroundColor: '#f67c7c',
  },
  syncTextBlock: {
    flex: 1,
  },
  syncLabel: {
    color: '#f7f4ee',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  syncCaption: {
    color: '#a9a398',
    fontSize: 11,
    lineHeight: 16,
  },
  syncError: {
    color: '#ff948b',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  syncBadge: {
    backgroundColor: '#111111',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2f2d2a',
  },
  syncBadgeText: {
    color: '#f3f0eb',
    fontSize: 12,
    fontWeight: '700',
  },
  pairingPanel: {
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2f2d2a',
    backgroundColor: '#1b1a18',
    padding: 16,
    gap: 14,
  },
  pairingPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pairingPanelTitle: {
    color: '#f7f4ee',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  pairingPanelSubhead: {
    color: '#a9a398',
    fontSize: 13,
    lineHeight: 20,
    flexShrink: 1,
  },
  pairingCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#34322f',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121211',
  },
  pairingCloseButtonText: {
    color: '#f4f2ed',
    fontSize: 22,
    lineHeight: 24,
    marginTop: -2,
  },
  syncPrimaryButton: {
    backgroundColor: '#0f0f10',
    borderWidth: 1,
    borderColor: '#3d3d3d',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  syncPrimaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  pairingContent: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  qrCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#383838',
    padding: 14,
    alignItems: 'center',
  },
  qrImage: {
    width: 170,
    height: 170,
    borderRadius: 12,
    marginBottom: 10,
  },
  qrCaption: {
    color: '#8f8f8f',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 170,
    lineHeight: 18,
  },
  kanban: {
    flex: 1,
    paddingHorizontal: 16,
  },
  kanbanContent: {
    paddingBottom: 120,
    alignItems: 'flex-start',
  },
  column: {
    width: 280,
    marginRight: 12,
    backgroundColor: '#232323',
    borderRadius: 12,
    overflow: 'hidden',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#343434',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  columnTitle: {
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  columnCount: {
    color: '#999',
    fontSize: 12,
  },
  columnContent: {
    maxHeight: 560,
    padding: 12,
  },
  jokeCard: {
    backgroundColor: '#2d2d2d',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  jokeTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 6,
  },
  jokePreview: {
    color: '#aaa',
    fontSize: 12,
  },
  addNewPage: {
    borderWidth: 1,
    borderColor: '#444',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewPageText: {
    color: '#888',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
  fabLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
