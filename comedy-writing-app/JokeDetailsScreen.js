import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import {
  analyzePerformanceWithOpenAI,
  hasOpenAIConfig,
  transcribePerformanceAudio,
} from './src/services/openaiPerformance';
import { hasGooglePlacesConfig, lookupNearbyVenue } from './src/services/places';
import { STAGES } from './src/constants/stages';
const VENUE_CATALOG = [
  { name: 'The Comedy Cellar', lat: 40.7295, lng: -73.9965 },
  { name: 'Stand Up NY', lat: 40.7833, lng: -73.9820 },
  { name: "Zofia's Hideout", lat: 40.7307, lng: -73.9884 },
];
const SWIPE_THRESHOLD = 90;
const SILENCE_THRESHOLD = 0.018;
const SILENCE_MIN_MS = 700;

const formatDisplayDate = (dateValue) => {
  const parsedDate = new Date(dateValue || Date.now());
  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTimeOfDay = (dateValue) => {
  const parsedDate = new Date(dateValue || Date.now());
  return parsedDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDuration = (durationMs = 0) => {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const formatVoiceMemoMeta = (recording) => {
  if (!recording) {
    return '';
  }

  if (recording.timeOfDay) {
    return recording.timeOfDay;
  }

  return formatDuration(recording.durationMs);
};

const toDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const fileUriToDataUrl = async (fileUri, mimeType = 'audio/x-m4a') => {
  const legacy = FileSystem.readAsStringAsync;
  const encodingType = FileSystem.EncodingType?.Base64;

  if (typeof legacy !== 'function' || !encodingType) {
    throw new Error('Base64 file conversion is unavailable on this runtime.');
  }

  const base64Audio = await legacy(fileUri, {
    encoding: encodingType,
  });

  return `data:${mimeType};base64,${base64Audio}`;
};

const getDistanceKm = (left, right) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(right.lat - left.lat);
  const deltaLng = toRadians(right.lng - left.lng);
  const startLat = toRadians(left.lat);
  const endLat = toRadians(right.lat);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const detectPauses = (samples) => {
  const pauses = [];
  let silenceStart = null;

  samples.forEach((sample, index) => {
    const isSilent = sample.rms < SILENCE_THRESHOLD;
    if (isSilent && silenceStart === null) {
      silenceStart = sample.timeMs;
    }

    const nextSample = samples[index + 1];
    if ((!isSilent || !nextSample) && silenceStart !== null) {
      const endTime = isSilent && !nextSample ? sample.timeMs : sample.timeMs;
      const durationMs = endTime - silenceStart;
      if (durationMs >= SILENCE_MIN_MS) {
        pauses.push({
          startMs: silenceStart,
          endMs: endTime,
          durationMs,
        });
      }
      silenceStart = null;
    }
  });

  return pauses;
};

const deriveTranscript = (rawTranscript, fallbackScript, pauses) => {
  const baseTranscript = rawTranscript.trim() || fallbackScript.trim() || 'No transcript available.';
  if (pauses.length === 0) {
    return baseTranscript;
  }

  const pauseNotes = pauses
    .slice(0, 4)
    .map(
      (pause) => `[pause ${formatDuration(pause.durationMs)} near ${formatDuration(pause.startMs)}]`
    )
    .join(' ');

  return `${baseTranscript} ${pauseNotes}`.trim();
};

const buildPerformanceFeedback = ({
  jokeTitle,
  jokeText,
  transcript,
  recording,
  previousFeedback,
}) => {
  const feedbackLines = [];
  const punchlineClauses = jokeText
    .split(/[.!?]/)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const endingClause = punchlineClauses[punchlineClauses.length - 1] || jokeText;
  const pacingScore = recording.durationMs > 0
    ? Math.round((transcript.split(/\s+/).filter(Boolean).length / (recording.durationMs / 60000 || 1)) * 10) / 10
    : 0;
  const avgEnergy = recording.metrics.avgEnergy;
  const peakEnergy = recording.metrics.peakEnergy;
  const dynamicRange = Math.max(0, peakEnergy - avgEnergy);

  feedbackLines.push(`Performance Review for "${jokeTitle}"`);
  feedbackLines.push('');
  feedbackLines.push(`Set snapshot: ${recording.locationName} on ${formatDisplayDate(recording.createdAt)}.`);
  feedbackLines.push(`Delivery metrics: ${formatDuration(recording.durationMs)} total, ${recording.metrics.pauseCount} notable pauses, energy peak ${peakEnergy.toFixed(2)}.`);
  feedbackLines.push('');
  feedbackLines.push('Surgical notes:');

  if (recording.metrics.pauseCount > 2) {
    feedbackLines.push(`- Tighten the setup before "${endingClause}". The pauses suggest the audience may be waiting too long for the turn.`);
  } else {
    feedbackLines.push(`- The structure is compact. Keep the setup lean and protect the turn in "${endingClause}".`);
  }

  if (dynamicRange < 0.03) {
    feedbackLines.push('- Add more contrast in the last line. A bigger vocal lift on the punch word should make the button land harder.');
  } else {
    feedbackLines.push('- Your vocal contrast is helping. Preserve that rise into the final phrase instead of flattening it after the setup.');
  }

  if (recording.metrics.audienceReactionCount > 0) {
    feedbackLines.push(`- Audience-reaction spikes showed up ${recording.metrics.audienceReactionCount} time(s). Consider adding a short tag immediately after the strongest hit.`);
  } else {
    feedbackLines.push('- No clear audience-reaction spike was detected. Test a faster tag after the punchline so the bit feels less final on first impact.');
  }

  if (pacingScore > 165) {
    feedbackLines.push('- The pace is hot. Leave one extra beat before the reveal so the audience can picture the setup.');
  } else if (pacingScore < 110) {
    feedbackLines.push('- The pace is measured. You can trim filler words in the first sentence to make the laugh arrive sooner.');
  } else {
    feedbackLines.push('- The speaking pace is in a workable zone. Focus on keeping the wording precise rather than adding more material.');
  }

  feedbackLines.push(`- Suggested tag direction: write one extra button that heightens "${endingClause}" without changing the core premise.`);

  if (previousFeedback) {
    feedbackLines.push('');
    feedbackLines.push('Compared with the previous pass:');

    const previousPauseCount = previousFeedback.metrics?.pauseCount ?? 0;
    const pauseDelta = recording.metrics.pauseCount - previousPauseCount;
    if (pauseDelta < 0) {
      feedbackLines.push(`- You reduced long pauses by ${Math.abs(pauseDelta)}. The rhythm is getting tighter.`);
    } else if (pauseDelta > 0) {
      feedbackLines.push(`- Long pauses increased by ${pauseDelta}. Rehearse the setup-to-punch transition once more before the next set.`);
    } else {
      feedbackLines.push('- Pause count stayed stable. That gives you a clean baseline for testing new tags.');
    }

    const reactionDelta = recording.metrics.audienceReactionCount - (previousFeedback.metrics?.audienceReactionCount ?? 0);
    if (reactionDelta > 0) {
      feedbackLines.push(`- Audience-reaction spikes improved by ${reactionDelta}. Keep the current wording and test a sharper closer.`);
    } else if (reactionDelta < 0) {
      feedbackLines.push(`- Audience-reaction spikes dipped by ${Math.abs(reactionDelta)}. Check whether the new phrasing softened the punchline.`);
    } else {
      feedbackLines.push('- Audience reaction stayed similar, so your next lever is wording precision rather than structure changes.');
    }
  }

  feedbackLines.push('');
  feedbackLines.push('Transcript with pauses:');
  feedbackLines.push(transcript);

  return feedbackLines.join('\n');
};

const getBrowserLocation = () =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is unavailable.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      reject,
      {
        enableHighAccuracy: true,
        timeout: 7000,
      }
    );
  });

const getDeviceLocation = async () => {
  if (Platform.OS === 'web') {
    return getBrowserLocation();
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Location permission was denied.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
};

const getNearestVenue = (coords) => {
  if (!coords) {
    return {
      name: 'Current Location',
      coords: null,
    };
  }

  const nearestVenue = VENUE_CATALOG.reduce((bestMatch, venue) => {
    const distanceKm = getDistanceKm(coords, venue);
    if (!bestMatch || distanceKm < bestMatch.distanceKm) {
      return {
        ...venue,
        distanceKm,
      };
    }
    return bestMatch;
  }, null);

  if (!nearestVenue) {
    return {
      name: 'Current Location',
      coords,
    };
  }

  if (nearestVenue.distanceKm <= 1.2) {
    return {
      name: nearestVenue.name,
      coords,
    };
  }

  return {
    name: 'Nearby mic spot',
    coords,
  };
};

const reverseLookupLocationLabel = async (coords) => {
  if (!coords) {
    return null;
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      coords.lat
    )}&lon=${encodeURIComponent(coords.lng)}`
  );

  if (!response.ok) {
    throw new Error(`Reverse geocoder returned ${response.status}.`);
  }

  const payload = await response.json();
  const address = payload?.address || {};
  const businessName = payload?.name || payload?.display_name?.split(',')?.[0];
  const streetLabel = [address.house_number, address.road].filter(Boolean).join(' ').trim();
  const neighborhoodLabel = address.neighbourhood || address.suburb || address.city_district || '';

  return {
    name: businessName || streetLabel || neighborhoodLabel || 'Nearby mic spot',
    address: streetLabel || payload?.display_name || '',
  };
};

const createBasicRecordingEntry = ({
  jokeId,
  createdAt,
  locationName,
  locationAddress,
  locationSource,
  durationMs,
  audioDataUrl,
  audioUri,
  mimeType,
  transcript,
}) => ({
  id: `${jokeId}-recording-${createdAt}`,
  createdAt: new Date(createdAt).toISOString(),
  locationName: locationName || 'Saved Recording',
  locationAddress: locationAddress || '',
  locationSource: locationSource || 'local-catalog',
  durationMs,
  timeOfDay: formatTimeOfDay(createdAt),
  dateLabel: formatDisplayDate(createdAt),
  audioDataUrl: audioDataUrl || '',
  audioUri: audioUri || '',
  audioMimeType: mimeType || 'audio/x-m4a',
  transcript: transcript || 'Transcript unavailable for this take.',
  metrics: {
    avgEnergy: 0,
    peakEnergy: 0,
    pauseCount: 0,
    pauses: [],
    audienceReactionCount: 0,
  },
});

export default function JokeDetailsScreen({
  joke,
  jokes,
  jokeIndex,
  onClose,
  onOpenInNewTab,
  onDeleteJoke,
  onUpdateJoke,
  onNavigateNext,
  onNavigatePrevious,
  layoutMode = 'full',
}) {
  const [selectedStage, setSelectedStage] = useState(joke.stage);
  const [tags, setTags] = useState(joke.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(joke.title);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState(joke.content);
  const [recordings, setRecordings] = useState(joke.recordings || []);
  const [feedbackHistory, setFeedbackHistory] = useState(joke.feedbackHistory || []);
  const [selectedRecordingId, setSelectedRecordingId] = useState(joke.recordings?.[0]?.id || null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);
  const [liveDurationMs, setLiveDurationMs] = useState(0);
  const [recordingError, setRecordingError] = useState('');
  const [analysisText, setAnalysisText] = useState(joke.feedbackHistory?.[0]?.text || '');
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [locationStatus, setLocationStatus] = useState('');

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingMetaRef = useRef(null);
  const stopResolverRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const analyserIntervalRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const transcriptPartsRef = useRef([]);
  const swipeStartRef = useRef(null);
  const audioElementsRef = useRef({});
  const nativeRecordingRef = useRef(null);
  const nativeRecordingTickerRef = useRef(null);
  const nativeSoundRef = useRef(null);
  const nativeSoundRecordingIdRef = useRef(null);
  const recordingUrlsRef = useRef([]);
  const [playingRecordingId, setPlayingRecordingId] = useState(null);

  const canRecord = useMemo(() => {
    if (Platform.OS !== 'web') {
      return true;
    }

    if (typeof window === 'undefined') {
      return false;
    }
    return Boolean(
      window.MediaRecorder &&
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices?.getUserMedia
    );
  }, []);

  const selectedRecording =
    recordings.find((recording) => recording.id === selectedRecordingId) || recordings[0] || null;

  useEffect(() => {
    setSelectedStage(joke.stage);
    setTags(joke.tags || []);
    setEditedTitle(joke.title);
    setEditedContent(joke.content);
    setRecordings(joke.recordings || []);
    setFeedbackHistory(joke.feedbackHistory || []);
    setSelectedRecordingId(joke.recordings?.[0]?.id || null);
    setAnalysisText(joke.feedbackHistory?.[0]?.text || '');
    setAnalysisStatus('');
    setLocationStatus('');
    setRecordingError('');
    setIsEditingTitle(false);
    setIsEditingContent(false);
    setPlayingRecordingId(null);
  }, [joke]);

  useEffect(() => {
    recordingUrlsRef.current = recordings
      .map((recording) => recording.audioUri)
      .filter((uri) => uri?.startsWith?.('blob:'));
  }, [recordings]);

  useEffect(() => {
    if (!isRecording || !recordingStartedAt) {
      setLiveDurationMs(0);
      return undefined;
    }

    const intervalId = setInterval(() => {
      setLiveDurationMs(Date.now() - recordingStartedAt);
    }, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, [isRecording, recordingStartedAt]);

  useEffect(() => () => {
    Object.values(audioElementsRef.current).forEach((audio) => {
      audio.pause?.();
    });

    recordingUrlsRef.current.forEach((uri) => {
      if (typeof URL !== 'undefined') {
        URL.revokeObjectURL(uri);
      }
    });

    nativeSoundRef.current?.unloadAsync?.().catch(() => {});

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (nativeRecordingTickerRef.current) {
      clearInterval(nativeRecordingTickerRef.current);
    }

    if (analyserIntervalRef.current) {
      clearInterval(analyserIntervalRef.current);
    }

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const buildJokePayload = (overrides = {}) => ({
    ...joke,
    title: editedTitle,
    content: editedContent,
    stage: selectedStage,
    tags,
    recordings,
    feedbackHistory,
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  const commitJoke = (overrides = {}) => {
    if (!onUpdateJoke) {
      return;
    }

    onUpdateJoke(buildJokePayload(overrides));
  };

  const appendRecording = (nextRecording) => {
    const nextRecordings = [nextRecording, ...recordings];
    setRecordings(nextRecordings);
    setSelectedRecordingId(nextRecording.id);
    commitJoke({ recordings: nextRecordings });
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag) {
      return;
    }

    const nextTags = [...tags, trimmedTag];
    setTags(nextTags);
    setNewTag('');
    commitJoke({ tags: nextTags });
  };

  const handleRemoveTag = (index) => {
    const nextTags = tags.filter((_, tagIndex) => tagIndex !== index);
    setTags(nextTags);
    commitJoke({ tags: nextTags });
  };

  const handleMoveStage = (stage) => {
    setSelectedStage(stage);
    commitJoke({ stage });
  };

  const handleSaveTitle = () => {
    const nextTitle = editedTitle.trim();
    if (!nextTitle) {
      return;
    }

    setEditedTitle(nextTitle);
    setIsEditingTitle(false);
    commitJoke({ title: nextTitle });
  };

  const handleSaveContent = () => {
    const nextContent = editedContent.trim();
    if (!nextContent) {
      return;
    }

    setEditedContent(nextContent);
    setIsEditingContent(false);
    commitJoke({ content: nextContent });
  };

  const startAudioSampling = async (stream, startedAt) => {
    if (
      typeof window === 'undefined' ||
      (!window.AudioContext && !window.webkitAudioContext)
    ) {
      return;
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const waveform = new Uint8Array(analyser.frequencyBinCount);
    const samples = [];

    analyserIntervalRef.current = setInterval(() => {
      analyser.getByteTimeDomainData(waveform);
      let total = 0;
      for (let index = 0; index < waveform.length; index += 1) {
        const centered = (waveform[index] - 128) / 128;
        total += centered * centered;
      }
      const rms = Math.sqrt(total / waveform.length);
      samples.push({
        timeMs: Date.now() - startedAt,
        rms,
      });
    }, 200);

    return samples;
  };

  const startSpeechRecognition = (startedAt) => {
    if (typeof window === 'undefined') {
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return false;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result[0]?.transcript) {
          continue;
        }

        if (result.isFinal) {
          transcriptPartsRef.current.push({
            timeMs: Date.now() - startedAt,
            text: result[0].transcript.trim(),
          });
        }
      }
    };
    recognition.onerror = () => {};
    recognition.start();
    speechRecognitionRef.current = recognition;
    return true;
  };

  const finalizeRecording = async ({ audioDataUrl, audioUri, mimeType, transcriptOverride, durationMsOverride }) => {
    const recordingMeta = recordingMetaRef.current || {};
    const stoppedAt = Date.now();
    const durationMs = durationMsOverride ?? Math.max(0, stoppedAt - (recordingMeta.startedAt || stoppedAt));
    const samples = recordingMeta.samples || [];
    const pauses = detectPauses(samples);
    let transcript = transcriptOverride
      ? deriveTranscript(transcriptOverride, editedContent, pauses)
      : deriveTranscript(
          transcriptPartsRef.current.map((part) => `${formatDuration(part.timeMs)} ${part.text}`).join(' '),
          editedContent,
          pauses
        );

    if (hasOpenAIConfig() && audioDataUrl) {
      try {
        const remoteTranscript = await transcribePerformanceAudio(audioDataUrl);
        if (remoteTranscript) {
          transcript = deriveTranscript(remoteTranscript, editedContent, pauses);
        }
      } catch (error) {
        console.warn('Remote transcription failed, using browser transcript fallback.', error);
      }
    }

    const energyValues = samples.map((sample) => sample.rms);
    const avgEnergy =
      energyValues.length > 0
        ? energyValues.reduce((sum, value) => sum + value, 0) / energyValues.length
        : 0;
    const peakEnergy = energyValues.length > 0 ? Math.max(...energyValues) : 0;
    const audienceReactionCount = samples.filter(
      (sample) => sample.rms > Math.max(avgEnergy * 2.2, 0.06)
    ).length;

    const nextRecording = {
      ...createBasicRecordingEntry({
        jokeId: joke.id,
        createdAt: stoppedAt,
        locationName: recordingMeta.locationName,
        locationAddress: recordingMeta.locationAddress,
        locationSource: recordingMeta.locationSource,
        durationMs,
        audioDataUrl,
        audioUri,
        mimeType: mimeType || 'audio/webm',
        transcript,
      }),
      metrics: {
        avgEnergy,
        peakEnergy,
        pauseCount: pauses.length,
        pauses,
        audienceReactionCount,
      },
    };

    appendRecording(nextRecording);
  };

  const stopRecording = () =>
    new Promise((resolve) => {
      if (Platform.OS !== 'web') {
        const activeRecording = nativeRecordingRef.current;
        if (!activeRecording) {
          resolve();
          return;
        }

        activeRecording
          .stopAndUnloadAsync()
          .then(async (status) => {
            if (nativeRecordingTickerRef.current) {
              clearInterval(nativeRecordingTickerRef.current);
              nativeRecordingTickerRef.current = null;
            }

            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
            });

            const recordingUri = activeRecording.getURI();
            nativeRecordingRef.current = null;
            setIsRecording(false);
            setRecordingStartedAt(null);
            setLiveDurationMs(0);

            if (!recordingUri) {
              resolve();
              return;
            }

            try {
              let audioDataUrl = '';
              try {
                audioDataUrl = await fileUriToDataUrl(recordingUri);
              } catch (conversionError) {
                console.warn('Unable to create base64 audio payload for native recording.', conversionError);
              }

              await finalizeRecording({
                audioDataUrl,
                audioUri: recordingUri,
                mimeType: 'audio/x-m4a',
                transcriptOverride: editedContent,
                durationMsOverride: status.durationMillis || undefined,
              });
            } catch (error) {
              console.warn('Unable to finalize native recording.', error);
              appendRecording(
                createBasicRecordingEntry({
                  jokeId: joke.id,
                  createdAt: Date.now(),
                  locationName: recordingMetaRef.current?.locationName,
                  locationAddress: recordingMetaRef.current?.locationAddress,
                  locationSource: recordingMetaRef.current?.locationSource,
                  durationMs: status.durationMillis || 0,
                  audioUri: recordingUri,
                  mimeType: 'audio/x-m4a',
                  transcript: editedContent,
                })
              );
              setRecordingError('The take was saved without analysis metadata.');
            }

            resolve();
          })
          .catch((error) => {
            console.warn('Unable to stop native recording.', error);
            setRecordingError('The recording could not be stopped cleanly.');
            resolve();
          });
        return;
      }

      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        resolve();
        return;
      }

      stopResolverRef.current = resolve;
      mediaRecorderRef.current.stop();
    });

  const handleStartRecording = async () => {
    if (!canRecord) {
      setRecordingError('Recording is only available in supported browsers like Chrome.');
      return;
    }

    setRecordingError('');
    setAnalysisStatus('');
    setLocationStatus('');

    try {
      const coords = await getDeviceLocation().catch(() => null);
      let venue = getNearestVenue(coords);
      if (coords && hasGooglePlacesConfig()) {
        try {
          const liveVenue = await lookupNearbyVenue(coords);
          if (liveVenue) {
            venue = {
              name: liveVenue.name,
              address: liveVenue.address,
              source: liveVenue.source,
              coords,
            };
            setLocationStatus(`Venue matched with Google Places: ${liveVenue.name}`);
          } else {
            setLocationStatus(`Using local venue match: ${venue.name}`);
          }
        } catch (error) {
          console.warn('Google Places lookup failed, using local venue match.', error);
          setLocationStatus(`Using local venue match: ${venue.name}`);
        }
      } else {
        const reverseLabel = await reverseLookupLocationLabel(coords).catch(() => null);
        if (reverseLabel?.name) {
          venue = {
            ...venue,
            name: reverseLabel.name,
            address: reverseLabel.address || venue.address,
            source: 'osm-reverse-geocode',
          };
        }
        setLocationStatus(`Using local venue match: ${venue.name}`);
      }
      const startedAt = Date.now();

      if (Platform.OS !== 'web') {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          throw new Error('Microphone access was denied.');
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();

        nativeRecordingRef.current = recording;
        recordingMetaRef.current = {
          startedAt,
          locationName: venue.name,
          locationAddress: venue.address || '',
          locationSource: venue.source || 'local-catalog',
          samples: [],
        };

        setRecordingStartedAt(startedAt);
        setIsRecording(true);
        nativeRecordingTickerRef.current = setInterval(async () => {
          try {
            const status = await recording.getStatusAsync();
            if (status.isRecording) {
              setLiveDurationMs(status.durationMillis || Date.now() - startedAt);
            }
          } catch (error) {
            clearInterval(nativeRecordingTickerRef.current);
            nativeRecordingTickerRef.current = null;
          }
        }, 300);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);

      recordingChunksRef.current = [];
      transcriptPartsRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      const samples = (await startAudioSampling(stream, startedAt)) || [];
      startSpeechRecognition(startedAt);

      recordingMetaRef.current = {
        startedAt,
        locationName: venue.name,
        locationAddress: venue.address || '',
        locationSource: venue.source || 'local-catalog',
        samples,
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (analyserIntervalRef.current) {
          clearInterval(analyserIntervalRef.current);
          analyserIntervalRef.current = null;
        }

        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
          speechRecognitionRef.current = null;
        }

        if (audioContextRef.current) {
          await audioContextRef.current.close();
          audioContextRef.current = null;
        }

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        setIsRecording(false);
        setRecordingStartedAt(null);
        setLiveDurationMs(0);

        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(recordingChunksRef.current, { type: mimeType });
          const audioDataUrl = await toDataUrl(audioBlob);
          const audioUri =
            typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
              ? URL.createObjectURL(audioBlob)
              : '';

          await finalizeRecording({
            audioDataUrl,
            audioUri,
            mimeType,
          });
        } catch (error) {
          console.warn('Unable to finalize recording.', error);
          const audioBlob =
            recordingChunksRef.current.length > 0
              ? new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
              : null;
          appendRecording(
            createBasicRecordingEntry({
              jokeId: joke.id,
              createdAt: Date.now(),
              locationName: recordingMetaRef.current?.locationName,
              locationAddress: recordingMetaRef.current?.locationAddress,
              locationSource: recordingMetaRef.current?.locationSource,
              durationMs: Date.now() - startedAt,
              audioDataUrl: '',
              audioUri:
                audioBlob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
                  ? URL.createObjectURL(audioBlob)
                  : '',
              mimeType: recorder.mimeType || 'audio/webm',
              transcript: editedContent,
            })
          );
          setRecordingError('The take was saved without transcript analysis.');
        }

        if (stopResolverRef.current) {
          stopResolverRef.current();
          stopResolverRef.current = null;
        }
      };

      recorder.start();
      setRecordingStartedAt(startedAt);
      setIsRecording(true);
    } catch (error) {
      console.warn('Unable to start recording.', error);
      setRecordingError('Microphone access was denied or unavailable.');
    }
  };

  const handleRecordButton = async () => {
    if (isRecording) {
      await stopRecording();
      return;
    }

    await handleStartRecording();
  };

  const handleAnalyzePerformance = async () => {
    const recording = selectedRecording || recordings[0];
    if (!recording) {
      setAnalysisStatus('Record a set before requesting analysis.');
      return;
    }

    const previousFeedback = feedbackHistory[0];
    let nextFeedbackText = buildPerformanceFeedback({
      jokeTitle: editedTitle,
      jokeText: editedContent,
      transcript: recording.transcript,
      recording,
      previousFeedback,
    });

    if (hasOpenAIConfig()) {
      setAnalysisStatus('Analyzing with OpenAI...');
      try {
        const remoteFeedback = await analyzePerformanceWithOpenAI({
          jokeTitle: editedTitle,
          jokeText: editedContent,
          transcript: recording.transcript,
          recording,
          previousFeedback,
        });

        if (remoteFeedback) {
          nextFeedbackText = remoteFeedback;
        }
      } catch (error) {
        console.warn('Remote OpenAI analysis failed, using local fallback.', error);
        setAnalysisStatus('OpenAI analysis failed, saved local fallback feedback instead.');
      }
    }

    const nextFeedbackEntry = {
      id: `${recording.id}-analysis-${Date.now()}`,
      createdAt: new Date().toISOString(),
      recordingId: recording.id,
      text: nextFeedbackText,
      metrics: recording.metrics,
      jokeSnapshot: editedContent,
    };

    const nextFeedbackHistory = [nextFeedbackEntry, ...feedbackHistory];
    setFeedbackHistory(nextFeedbackHistory);
    setAnalysisText(nextFeedbackText);
    setAnalysisStatus(
      hasOpenAIConfig()
        ? 'Analysis saved locally with OpenAI-backed feedback.'
        : 'Analysis saved locally.'
    );
    commitJoke({ feedbackHistory: nextFeedbackHistory });
  };

  const handleTogglePlayback = (recording) => {
    setRecordingError('');
    setSelectedRecordingId(recording.id);

    if (Platform.OS !== 'web') {
      const playNativeSound = async () => {
        if (
          nativeSoundRef.current &&
          nativeSoundRecordingIdRef.current === recording.id &&
          playingRecordingId === recording.id
        ) {
          await nativeSoundRef.current.stopAsync();
          await nativeSoundRef.current.unloadAsync();
          nativeSoundRef.current = null;
          nativeSoundRecordingIdRef.current = null;
          setPlayingRecordingId(null);
          return;
        }

        if (nativeSoundRef.current) {
          await nativeSoundRef.current.unloadAsync();
          nativeSoundRef.current = null;
          nativeSoundRecordingIdRef.current = null;
        }

        const source = recording.audioUri
          ? { uri: recording.audioUri }
          : recording.audioDataUrl
            ? { uri: recording.audioDataUrl }
            : null;

        if (!source) {
          setRecordingError('This take does not have playable audio.');
          return;
        }

        try {
          const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
          nativeSoundRef.current = sound;
          nativeSoundRecordingIdRef.current = recording.id;
          setPlayingRecordingId(recording.id);
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish || !status.isLoaded) {
              setPlayingRecordingId(null);
            }
          });
        } catch (error) {
          console.warn('Native playback failed.', error);
          setRecordingError('Playback could not start on this device.');
        }
      };

      playNativeSound();
      return;
    }

    if (typeof window === 'undefined' || typeof window.Audio !== 'function') {
      setRecordingError('Audio playback is only available in supported browsers.');
      return;
    }

    const audioSource = recording.audioUri || recording.audioDataUrl;
    if (!audioSource) {
      setRecordingError('This take does not have playable audio.');
      return;
    }

    const currentAudio = audioElementsRef.current[recording.id] || new window.Audio(audioSource);
    audioElementsRef.current[recording.id] = currentAudio;

    Object.entries(audioElementsRef.current).forEach(([audioId, audio]) => {
      if (audioId !== recording.id) {
        audio.pause?.();
        if (audio.currentTime) {
          audio.currentTime = 0;
        }
      }
    });

    currentAudio.onended = () => {
      setPlayingRecordingId((currentId) => (currentId === recording.id ? null : currentId));
    };
    currentAudio.onpause = () => {
      if (currentAudio.ended) {
        return;
      }
      setPlayingRecordingId((currentId) => (currentId === recording.id ? null : currentId));
    };

    if (playingRecordingId === recording.id && !currentAudio.paused) {
      currentAudio.pause();
      setPlayingRecordingId(null);
      return;
    }

    currentAudio.play()
      .then(() => {
        setPlayingRecordingId(recording.id);
      })
      .catch(() => {
        setRecordingError('Playback could not start in this browser tab.');
      });
  };

  const handleDeleteRecording = (recordingId) => {
    if (nativeSoundRecordingIdRef.current === recordingId && nativeSoundRef.current) {
      nativeSoundRef.current.unloadAsync().catch(() => {});
      nativeSoundRef.current = null;
      nativeSoundRecordingIdRef.current = null;
    }

    const audio = audioElementsRef.current[recordingId];
    if (audio) {
      audio.pause?.();
      delete audioElementsRef.current[recordingId];
    }

    const recordingToDelete = recordings.find((recording) => recording.id === recordingId);
    if (recordingToDelete?.audioUri?.startsWith?.('blob:') && typeof URL !== 'undefined') {
      URL.revokeObjectURL(recordingToDelete.audioUri);
    }

    const nextRecordings = recordings.filter((recording) => recording.id !== recordingId);
    const nextFeedbackHistory = feedbackHistory.filter((feedback) => feedback.recordingId !== recordingId);
    const nextSelectedRecording = nextRecordings[0] || null;

    if (selectedRecordingId === recordingId) {
      setSelectedRecordingId(nextSelectedRecording?.id || null);
    }

    if (playingRecordingId === recordingId) {
      setPlayingRecordingId(null);
    }

    setRecordings(nextRecordings);
    setFeedbackHistory(nextFeedbackHistory);

    if (!nextFeedbackHistory.length) {
      setAnalysisText('');
    } else if (!nextFeedbackHistory.find((feedback) => feedback.id === feedbackHistory[0]?.id)) {
      setAnalysisText(nextFeedbackHistory[0]?.text || '');
    }

    commitJoke({
      recordings: nextRecordings,
      feedbackHistory: nextFeedbackHistory,
    });
  };

  const navigateSafely = async (direction) => {
    if (isRecording) {
      await stopRecording();
    }

    if (direction === 'next') {
      onNavigateNext?.();
    } else {
      onNavigatePrevious?.();
    }
  };

  const confirmDeleteJoke = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `"${editedTitle}" will be removed from your workspace. Continue?`
      );

      if (confirmed) {
        onDeleteJoke?.(joke.id);
      }
      return;
    }

    Alert.alert(
      'Delete joke?',
      `"${editedTitle}" will be removed from your workspace.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteJoke?.(joke.id);
          },
        },
      ]
    );
  };

  const handleTouchStart = (event) => {
    const touch = event.nativeEvent?.touches?.[0];
    if (!touch) {
      return;
    }

    swipeStartRef.current = {
      x: touch.pageX,
      y: touch.pageY,
    };
  };

  const handleTouchEnd = async (event) => {
    if (!swipeStartRef.current) {
      return;
    }

    const touch = event.nativeEvent?.changedTouches?.[0];
    if (!touch) {
      swipeStartRef.current = null;
      return;
    }

    const deltaX = touch.pageX - swipeStartRef.current.x;
    const deltaY = Math.abs(touch.pageY - swipeStartRef.current.y);
    swipeStartRef.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD || deltaY > 70) {
      return;
    }

    if (deltaX > 0) {
      await navigateSafely('next');
    } else {
      await navigateSafely('previous');
    }
  };

  const hasNextJoke = jokeIndex < jokes.length - 1;
  const hasPreviousJoke = jokeIndex > 0;
  const isPeekLayout = layoutMode === 'peek';

  return (
    <SafeAreaView
      style={[styles.container, isPeekLayout && styles.peekContainer]}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!isPeekLayout ? (
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButtonTap}>
            <Text style={styles.backButton}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Joke Details</Text>
          <TouchableOpacity onPress={confirmDeleteJoke} style={styles.headerDeleteTap}>
            <Text style={styles.headerDeleteIcon}>🗑</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        style={[styles.content, isPeekLayout && styles.peekScroll]}
        contentContainerStyle={isPeekLayout ? styles.peekContent : null}
        showsVerticalScrollIndicator={isPeekLayout}
        nestedScrollEnabled
      >
        <View style={[styles.heroSection, isPeekLayout && styles.peekHeroSection]}>
          {isPeekLayout ? (
            <View style={styles.peekControlsRow}>
              <View style={styles.peekControlGroup}>
                <TouchableOpacity
                  onPress={onOpenInNewTab}
                  style={styles.peekControlButton}
                  disabled={!onOpenInNewTab}
                >
                  <Text style={styles.peekControlButtonText}>Open full page</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.peekControlButton}>
                  <Text style={styles.peekControlButtonText}>Close side bar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmDeleteJoke} style={styles.peekDeleteButton}>
                  <Text style={styles.peekDeleteButtonText}>Delete joke</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          {isPeekLayout ? (
            <View style={styles.peekHeaderRow}>
              <Text style={styles.peekEyebrow}>Side Peek</Text>
              <TouchableOpacity onPress={onClose} style={styles.peekCloseButton}>
                <Text style={styles.peekCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {isEditingTitle ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.titleInput}
                value={editedTitle}
                onChangeText={setEditedTitle}
                placeholder="Joke title..."
                placeholderTextColor="#666"
                multiline
              />
              <TouchableOpacity onPress={handleSaveTitle} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsEditingTitle(true)}>
              <Text style={styles.jokeTitle}>{editedTitle}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.heroMetaRow}>
            <View style={styles.stageBadge}>
              <Text style={styles.stageBadgeText}>{selectedStage}</Text>
            </View>
            {!isPeekLayout ? (
              <Text style={styles.swipeHint}>
                {hasPreviousJoke || hasNextJoke ? 'Swipe horizontally to move through your set.' : 'Only one joke in this set.'}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body</Text>
          {isEditingContent ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.contentInput}
                value={editedContent}
                onChangeText={setEditedContent}
                placeholder="Joke content..."
                placeholderTextColor="#666"
                multiline
              />
              <TouchableOpacity onPress={handleSaveContent} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsEditingContent(true)}>
              <Text style={styles.jokeContent}>{editedContent}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.performanceHeader}>
            <View>
              <Text style={styles.sectionTitle}>Performance Recordings</Text>
            </View>
            <TouchableOpacity
              onPress={handleRecordButton}
              style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            >
              <Text style={styles.recordButtonIcon}>{isRecording ? '■' : '●'}</Text>
              <Text style={styles.recordButtonText}>
                {isRecording ? formatDuration(liveDurationMs) : 'Record'}
              </Text>
            </TouchableOpacity>
          </View>

          {recordingError ? <Text style={styles.errorText}>{recordingError}</Text> : null}
          {locationStatus ? <Text style={styles.sectionCaption}>{locationStatus}</Text> : null}

          {!canRecord ? (
            <Text style={styles.noTags}>
              Recording requires a browser with microphone support.
            </Text>
          ) : null}

          {recordings.length === 0 ? (
            <Text style={styles.noTags}>No recordings yet. Capture a set to start building feedback.</Text>
          ) : (
            <View style={styles.recordingsList}>
              {recordings.map((recording) => (
                <View
                  key={recording.id}
                  style={[
                    styles.recordingRow,
                    selectedRecordingId === recording.id && styles.recordingRowActive,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.recordingRowMain}
                    onPress={() => setSelectedRecordingId(recording.id)}
                  >
                    <View style={styles.recordingRowCopy}>
                      <Text style={styles.recordingVenue}>{recording.locationName}</Text>
                      <Text style={styles.recordingDate}>{recording.dateLabel}</Text>
                    </View>
                    <Text style={styles.recordingMeta}>{formatVoiceMemoMeta(recording)}</Text>
                  </TouchableOpacity>
                  <View style={styles.recordingActions}>
                    <TouchableOpacity
                      onPress={() => handleTogglePlayback(recording)}
                      style={styles.recordingActionButton}
                    >
                      <Text style={styles.playButtonText}>
                        {playingRecordingId === recording.id ? '❚❚' : '▶'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteRecording(recording.id)}
                      style={[styles.recordingActionButton, styles.deleteButton]}
                    >
                      <Text style={styles.deleteButtonText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          {tags.length === 0 ? (
            <Text style={styles.noTags}>No tags yet</Text>
          ) : (
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <TouchableOpacity
                  key={`${tag}-${index}`}
                  style={styles.tag}
                  onPress={() => handleRemoveTag(index)}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                  <Text style={styles.tagRemove}> ×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              placeholder="Add rehearsal tags..."
              placeholderTextColor="#666"
              value={newTag}
              onChangeText={setNewTag}
            />
            <TouchableOpacity
              onPress={handleAddTag}
              style={styles.addTagButton}
              disabled={!newTag.trim()}
            >
              <Text style={styles.addTagButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Move to Stage</Text>
          <View style={styles.stageButtonsGrid}>
            {STAGES.map((stage) => (
              <TouchableOpacity
                key={stage}
                onPress={() => handleMoveStage(stage)}
                style={[
                  styles.stageButton,
                  selectedStage === stage && styles.stageButtonActive,
                ]}
              >
                <Text style={styles.stageButtonText}>{stage}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            onPress={handleAnalyzePerformance}
            style={[styles.analyzeButton, !selectedRecording && styles.analyzeButtonDisabled]}
            disabled={!selectedRecording}
          >
            <Text style={styles.analyzeButtonText}>AI Analyze Performance (BETA)</Text>
          </TouchableOpacity>

          {analysisStatus ? <Text style={styles.sectionCaption}>{analysisStatus}</Text> : null}

          {analysisText ? (
            <View style={styles.analysisCard}>
              <Text style={styles.analysisText}>{analysisText}</Text>
            </View>
          ) : (
            <Text style={styles.noTags}>
              Analysis will compare this take against your previous rehearsal notes.
            </Text>
          )}
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => navigateSafely('previous')}
            style={[styles.navButton, !hasPreviousJoke && styles.navButtonDisabled]}
            disabled={!hasPreviousJoke}
          >
            <Text style={styles.navButtonText}>← Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigateSafely('next')}
            style={[styles.navButton, !hasNextJoke && styles.navButtonDisabled]}
            disabled={!hasNextJoke}
          >
            <Text style={styles.navButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>

        {!isPeekLayout ? (
          <View style={styles.metadataSection}>
            <Text style={styles.metadataText}>Created: {joke.date}</Text>
            <Text style={styles.metadataText}>Updated: {joke.updatedAt || joke.date}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
    minHeight: 0,
  },
  peekContainer: {
    backgroundColor: '#121212',
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1e',
  },
  backButtonTap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDeleteTap: {
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    color: '#0a84ff',
    fontSize: 32,
  },
  headerDeleteIcon: {
    color: '#ff453a',
    fontSize: 21,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  peekContent: {
    paddingBottom: 44,
    flexGrow: 1,
  },
  peekScroll: {
    flex: 1,
    minHeight: 0,
  },
  heroSection: {
    backgroundColor: '#111110',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#232321',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  peekHeroSection: {
    marginTop: 8,
  },
  peekControlsRow: {
    marginBottom: 14,
  },
  peekControlGroup: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  peekControlButton: {
    backgroundColor: '#181817',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2b2a28',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  peekControlButtonText: {
    color: '#f3efe7',
    fontSize: 12,
    fontWeight: '700',
  },
  peekDeleteButton: {
    backgroundColor: 'rgba(255,69,58,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.42)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  peekDeleteButtonText: {
    color: '#ff8f87',
    fontSize: 12,
    fontWeight: '700',
  },
  peekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  peekEyebrow: {
    color: '#aaa39a',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  peekCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#181817',
    borderWidth: 1,
    borderColor: '#2b2a28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekCloseButtonText: {
    color: '#ddd8cf',
    fontSize: 12,
    fontWeight: '700',
  },
  heroMetaRow: {
    marginTop: 14,
    gap: 10,
  },
  section: {
    marginBottom: 18,
    backgroundColor: '#111110',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232321',
  },
  sectionTitle: {
    color: '#f5f3ee',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  sectionCaption: {
    color: '#9c978f',
    fontSize: 12,
    lineHeight: 18,
  },
  jokeTitle: {
    color: '#f6f4ef',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  jokeContent: {
    color: '#d7d3cc',
    fontSize: 15,
    lineHeight: 24,
  },
  swipeHint: {
    color: '#9b968f',
    fontSize: 12,
    lineHeight: 18,
  },
  stageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#191816',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2b2a28',
  },
  stageBadgeText: {
    color: '#f4f1ea',
    fontSize: 12,
    fontWeight: '600',
  },
  editRow: {
    flexDirection: 'column',
  },
  titleInput: {
    color: '#f6f4ef',
    fontSize: 26,
    fontWeight: '800',
    backgroundColor: '#181817',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2b2a28',
    marginBottom: 12,
  },
  contentInput: {
    color: '#d7d3cc',
    fontSize: 15,
    lineHeight: 23,
    backgroundColor: '#181817',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2b2a28',
    marginBottom: 12,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#0a84ff',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  recordButton: {
    backgroundColor: '#181817',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2b2a28',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordButtonActive: {
    backgroundColor: '#ff453a',
    borderColor: '#ff453a',
  },
  recordButtonIcon: {
    color: '#ff5e57',
    fontSize: 14,
    fontWeight: '800',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff7b72',
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 18,
  },
  recordingsList: {
    borderTopWidth: 1,
    borderTopColor: '#232321',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#232321',
  },
  recordingRowActive: {
    backgroundColor: '#141413',
  },
  recordingRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingRight: 10,
  },
  recordingRowCopy: {
    flex: 1,
    paddingRight: 12,
  },
  recordingVenue: {
    color: '#f5f5f7',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  recordingDate: {
    color: '#8e8e93',
    fontSize: 14,
  },
  recordingMeta: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 6,
  },
  recordingActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171716',
    borderWidth: 1,
    borderColor: '#262523',
  },
  playButtonText: {
    color: '#30d158',
    fontSize: 18,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#221314',
  },
  deleteButtonText: {
    color: '#ff453a',
    fontSize: 18,
  },
  selectedRecordingCard: {
    marginTop: 16,
    backgroundColor: '#0d0d0c',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#232321',
  },
  selectedRecordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 12,
  },
  selectedRecordingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  selectedRecordingMeta: {
    color: '#8e8e93',
    fontSize: 13,
  },
  recordingSupportText: {
    color: '#8e8e93',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  transcriptLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  transcriptText: {
    color: '#d1d1d6',
    fontSize: 13,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181817',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#2a2927',
  },
  tagText: {
    color: '#f2f2f7',
    fontSize: 12,
    fontWeight: '500',
  },
  tagRemove: {
    color: '#8e8e93',
    fontSize: 12,
  },
  noTags: {
    color: '#8e8e93',
    fontSize: 12,
    lineHeight: 18,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#181817',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a2927',
  },
  addTagButton: {
    backgroundColor: '#0a84ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addTagButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  stageButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageButton: {
    borderWidth: 1,
    borderColor: '#2b2c30',
    borderRadius: 12,
    backgroundColor: '#1a1b1f',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  stageButtonActive: {
    backgroundColor: '#0a84ff',
    borderColor: '#0a84ff',
  },
  stageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  analyzeButton: {
    backgroundColor: '#30d158',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  analyzeButtonDisabled: {
    opacity: 0.45,
  },
  analyzeButtonText: {
    color: '#03120a',
    fontSize: 15,
    fontWeight: '700',
  },
  analysisCard: {
    backgroundColor: '#0c0d10',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  analysisText: {
    color: '#e5e5ea',
    fontSize: 13,
    lineHeight: 20,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#111214',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  metadataSection: {
    paddingHorizontal: 4,
    paddingBottom: 24,
  },
  metadataText: {
    color: '#8e8e93',
    fontSize: 12,
    marginBottom: 4,
  },
});
