import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  OPEN_MIC_DAY_LABELS,
  OPEN_MIC_SNAPSHOT_DATE,
  buildCalendarEvent,
  createCalendarDownloadUrl,
  getOpenMicSnapshot,
} from './src/services/comediqOpenMics';

const TODAY = new Date();
const TODAY_LABEL = OPEN_MIC_DAY_LABELS[TODAY.getDay()];

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getCurrentMinutes = () => TODAY.getHours() * 60 + TODAY.getMinutes();

const formatTimeWindow = (mic) =>
  mic.latestEndTime ? `${mic.startTime} - ${mic.latestEndTime}` : mic.startTime;

const isMicDoneForSelectedDay = (mic, selectedDay) =>
  selectedDay === TODAY_LABEL &&
  typeof mic.startMinutes === 'number' &&
  mic.startMinutes < getCurrentMinutes();

const buildPopupHtml = (mic, isNative = false) => {
  const callAction = (action) =>
    isNative
      ? `window.ReactNativeWebView.postMessage(JSON.stringify({ type: '${action}', id: '${mic.id}' })); return false;`
      : `window.__comedyWritingMap.${action}('${mic.id}'); return false;`;

  return `
    <div style="min-width: 240px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${escapeHtml(mic.day)}</div>
      <div style="font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 2px;">${escapeHtml(
        mic.openMic
      )}</div>
      <div style="font-size: 13px; color: #111827; margin-bottom: 8px;">${escapeHtml(mic.venueName)}</div>
      <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">Time: ${escapeHtml(
        formatTimeWindow(mic)
      )}</div>
      <div style="font-size: 12px; color: #374151; margin-bottom: 2px;">Cost: ${escapeHtml(
        mic.cost || 'Free'
      )}</div>
      <div style="font-size: 12px; color: #374151;">${escapeHtml(mic.location || '')}</div>
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button onclick="${callAction('focusMic')}" style="flex: 1; border: none; border-radius: 8px; padding: 8px 10px; background: #111827; color: white; font-size: 12px;">Focus</button>
        <button onclick="${callAction('addToCalendar')}" style="flex: 1; border: none; border-radius: 8px; padding: 8px 10px; background: #2563eb; color: white; font-size: 12px;">Add to Calendar</button>
      </div>
    </div>
  `;
};

const buildNativeMapHtml = (mics) => {
  const markers = JSON.stringify(
    mics
      .filter((mic) => mic.lat && mic.lng)
      .map((mic) => ({
        id: mic.id,
        lat: mic.lat,
        lng: mic.lng,
        popupHtml: buildPopupHtml(mic, true),
      }))
  );

  return `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #121212; }
        .leaflet-container { background: #121212; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map').setView([40.758, -73.9855], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        const markers = ${markers};
        const bounds = [];
        markers.forEach((mic) => {
          const marker = L.circleMarker([mic.lat, mic.lng], {
            radius: 8,
            color: '#ffffff',
            weight: 2,
            fillColor: '#ff5d4d',
            fillOpacity: 0.95
          }).addTo(map);
          marker.bindPopup(mic.popupHtml);
          marker.on('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'focusMic', id: mic.id }));
          });
          bounds.push([mic.lat, mic.lng]);
        });
        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [18, 18] });
        }
      </script>
    </body>
  </html>`;
};

const toGoogleCalendarUrl = (event) => {
  const formatGoogleDate = (date) =>
    date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.start)}/${formatGoogleDate(event.end)}`,
    details: event.description,
    location: event.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export default function MapScreen({ onClose }) {
  const [selectedDay, setSelectedDay] = useState(TODAY_LABEL);
  const [selectedMicId, setSelectedMicId] = useState(null);
  const [mapsStatus, setMapsStatus] = useState(Platform.OS === 'web' ? 'loading' : 'ready');
  const [mapError, setMapError] = useState('');
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const allMics = useMemo(() => getOpenMicSnapshot(), []);

  const filteredMics = useMemo(() => {
    const sorted = allMics.filter((mic) => mic.day === selectedDay);

    sorted.sort((left, right) => {
      const leftDone = isMicDoneForSelectedDay(left, selectedDay);
      const rightDone = isMicDoneForSelectedDay(right, selectedDay);

      if (leftDone !== rightDone) {
        return leftDone ? 1 : -1;
      }

      const leftMinutes = typeof left.startMinutes === 'number' ? left.startMinutes : 1440;
      const rightMinutes = typeof right.startMinutes === 'number' ? right.startMinutes : 1440;

      if (leftMinutes !== rightMinutes) {
        return leftMinutes - rightMinutes;
      }

      return left.venueName.localeCompare(right.venueName);
    });

    return sorted;
  }, [allMics, selectedDay]);

  const pinnedMics = useMemo(
    () => filteredMics.filter((mic) => typeof mic.lat === 'number' && typeof mic.lng === 'number'),
    [filteredMics]
  );

  const selectedMic =
    filteredMics.find((mic) => mic.id === selectedMicId) || filteredMics[0] || null;

  useEffect(() => {
    setSelectedMicId((currentId) =>
      filteredMics.some((mic) => mic.id === currentId) ? currentId : filteredMics[0]?.id || null
    );
  }, [filteredMics]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      setMapsStatus('unsupported');
      return undefined;
    }

    let isActive = true;
    const styleId = 'leaflet-stylesheet';
    let styleTag = document.getElementById(styleId);

    if (!styleTag) {
      styleTag = document.createElement('link');
      styleTag.id = styleId;
      styleTag.rel = 'stylesheet';
      styleTag.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(styleTag);
    }

    import('leaflet')
      .then(() => {
        if (isActive) {
          setMapsStatus('ready');
        }
      })
      .catch(() => {
        if (isActive) {
          setMapsStatus('error');
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleGetDirections = (mic) => {
    const mapsUrl =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${mic.lat},${mic.lng}&q=${encodeURIComponent(mic.venueName)}`
        : `https://www.google.com/maps/search/${encodeURIComponent(mic.location || mic.venueName)}`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(mapsUrl, '_blank');
      }
      return;
    }

    Linking.openURL(mapsUrl).catch(() => {});
  };

  const handleAddToCalendar = (mic) => {
    const event = buildCalendarEvent(mic);

    if (Platform.OS === 'web') {
      const url = createCalendarDownloadUrl(event);
      if (!url || typeof document === 'undefined') {
        setMapError('Calendar download is unavailable in this browser.');
        return;
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = `${mic.openMic || mic.venueName}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return;
    }

    Linking.openURL(toGoogleCalendarUrl(event)).catch(() => {
      setMapError('Calendar handoff could not be opened on this device.');
    });
  };

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    if (mapsStatus !== 'ready' || !mapRef.current || pinnedMics.length === 0) {
      return undefined;
    }

    let isActive = true;

    import('leaflet')
      .then((leafletModule) => {
        if (!isActive || !mapRef.current) {
          return;
        }

        const L = leafletModule.default ?? leafletModule;

        if (mapInstanceRef.current) {
          Object.values(markersRef.current).forEach((marker) => marker.remove());
          markersRef.current = {};
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapRef.current, {
          center: [40.758, -73.9855],
          zoom: 11,
          zoomControl: true,
        });

        mapInstanceRef.current = map;
        window.__comedyWritingMap = {
          focusMic: (micId) => {
            const nextMic = filteredMics.find((mic) => mic.id === micId);
            if (nextMic) {
              setSelectedMicId(nextMic.id);
            }
          },
          addToCalendar: (micId) => {
            const nextMic = filteredMics.find((mic) => mic.id === micId);
            if (nextMic) {
              setSelectedMicId(nextMic.id);
              handleAddToCalendar(nextMic);
            }
          },
        };

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const bounds = [];
        pinnedMics.forEach((mic) => {
          const marker = L.circleMarker([mic.lat, mic.lng], {
            radius: 8,
            color: '#ffffff',
            weight: 2,
            fillColor: isMicDoneForSelectedDay(mic, selectedDay) ? '#6f6f6f' : '#ff5d4d',
            fillOpacity: 0.95,
          }).addTo(map);

          marker.bindPopup(buildPopupHtml(mic));
          marker.on('click', () => {
            setSelectedMicId(mic.id);
          });

          markersRef.current[mic.id] = marker;
          bounds.push([mic.lat, mic.lng]);
        });

        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [24, 24] });
        }
      })
      .catch(() => {
        setMapsStatus('error');
      });

    return () => {
      isActive = false;
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (typeof window !== 'undefined') {
        delete window.__comedyWritingMap;
      }
    };
  }, [filteredMics, mapsStatus, pinnedMics, selectedDay]);

  useEffect(() => {
    if (!selectedMic || !mapInstanceRef.current || !markersRef.current[selectedMic.id]) {
      return;
    }

    mapInstanceRef.current.setView([selectedMic.lat, selectedMic.lng], 13);
    markersRef.current[selectedMic.id].openPopup();
  }, [selectedMic]);

  const handleNativeMessage = (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      const nextMic = filteredMics.find((mic) => mic.id === payload.id);
      if (!nextMic) {
        return;
      }

      setSelectedMicId(nextMic.id);
      if (payload.type === 'addToCalendar') {
        handleAddToCalendar(nextMic);
      }
    } catch (error) {
      console.warn('Unable to parse native map action.', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButtonTap}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Open Mics</Text>
        <View style={styles.backButtonTap} />
      </View>

      <View style={styles.toolbarCard}>
        <View style={styles.toolbarCopy}>
          <Text style={styles.toolbarTitle}>Tonight planner</Text>
          <Text style={styles.toolbarCaption}>
            Snapshot updated {OPEN_MIC_SNAPSHOT_DATE}. {filteredMics.length} {selectedDay} mic{filteredMics.length === 1 ? '' : 's'} on deck.
          </Text>
        </View>
        <View style={styles.dayPickerWrap}>
          <TouchableOpacity
            onPress={() => setDayMenuOpen((current) => !current)}
            style={styles.dayPickerButton}
          >
            <Text style={styles.dayPickerButtonText}>{selectedDay}</Text>
            <Text style={styles.dayPickerButtonCaret}>{dayMenuOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {dayMenuOpen ? (
            <View style={styles.dayMenu}>
              {OPEN_MIC_DAY_LABELS.map((day) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => {
                    setSelectedDay(day);
                    setDayMenuOpen(false);
                  }}
                  style={[styles.dayMenuItem, selectedDay === day && styles.dayMenuItemActive]}
                >
                  <Text
                    style={[
                      styles.dayMenuItemText,
                      selectedDay === day && styles.dayMenuItemTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.mapWrapper}>
        {Platform.OS === 'web' ? (
          <>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
            {mapsStatus !== 'ready' ? (
              <View style={styles.mapOverlay}>
                <Text style={styles.mapOverlayTitle}>
                  {mapsStatus === 'error' ? 'Map unavailable' : 'Loading map...'}
                </Text>
                <Text style={styles.mapOverlayText}>
                  {mapsStatus === 'error'
                    ? 'The map tiles could not be loaded right now.'
                    : 'Preparing your NYC open-mic map.'}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html: buildNativeMapHtml(pinnedMics) }}
            style={styles.nativeMap}
            onMessage={handleNativeMessage}
            scrollEnabled={false}
          />
        )}
      </View>

      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator>
        {mapError ? <Text style={styles.errorText}>{mapError}</Text> : null}

        <View style={styles.listShell}>
          {filteredMics.map((mic) => {
            const isDone = isMicDoneForSelectedDay(mic, selectedDay);
            const isActive = selectedMic?.id === mic.id;

            return (
              <TouchableOpacity
                key={mic.id}
                onPress={() => setSelectedMicId(mic.id)}
                style={[
                  styles.micListItem,
                  isActive && styles.micListItemActive,
                  isDone && styles.micListItemDone,
                ]}
              >
                <View style={styles.timeColumn}>
                  <Text style={[styles.timeText, isDone && styles.mutedText]}>{mic.startTime}</Text>
                  {isDone ? <Text style={styles.doneBadge}>Done</Text> : null}
                </View>

                <View style={styles.micListCopy}>
                  <Text style={[styles.micListName, isDone && styles.mutedText]}>{mic.openMic}</Text>
                  <Text style={[styles.micListClub, isDone && styles.mutedText]}>
                    {mic.venueName}
                  </Text>
                  <Text style={[styles.micListMeta, isDone && styles.mutedText]}>
                    {mic.cost || 'Free'} • {formatTimeWindow(mic)} • {mic.neighborhood || mic.borough}
                  </Text>
                  <Text style={[styles.micListLocation, isDone && styles.mutedText]}>
                    {mic.location}
                  </Text>
                </View>

                <View style={styles.inlineActions}>
                  <TouchableOpacity
                    onPress={() => handleAddToCalendar(mic)}
                    style={styles.inlineActionButton}
                  >
                    <Text style={styles.inlineActionText}>Calendar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleGetDirections(mic)}
                    style={[styles.inlineActionButton, styles.inlineSecondaryButton]}
                  >
                    <Text style={styles.inlineSecondaryText}>Route</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2f2f2f',
  },
  backButtonTap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    color: '#4f8cff',
    fontSize: 32,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  toolbarCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#1f1f1f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f2f2f',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    zIndex: 4,
  },
  toolbarCopy: {
    flex: 1,
  },
  toolbarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  toolbarCaption: {
    color: '#9d9d9d',
    fontSize: 13,
    lineHeight: 20,
  },
  dayPickerWrap: {
    minWidth: 160,
    position: 'relative',
  },
  dayPickerButton: {
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#343434',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dayPickerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dayPickerButtonCaret: {
    color: '#8f8f8f',
    fontSize: 12,
  },
  dayMenu: {
    position: 'absolute',
    top: 52,
    right: 0,
    left: 0,
    backgroundColor: '#1b1b1b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    padding: 8,
    gap: 4,
  },
  dayMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dayMenuItemActive: {
    backgroundColor: '#2b3857',
  },
  dayMenuItemText: {
    color: '#cfcfcf',
    fontSize: 13,
  },
  dayMenuItemTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  mapWrapper: {
    height: 320,
    backgroundColor: '#1f1f1f',
    borderTopWidth: 1,
    borderTopColor: '#2f2f2f',
    borderBottomWidth: 1,
    borderBottomColor: '#2f2f2f',
  },
  nativeMap: {
    flex: 1,
    backgroundColor: '#1f1f1f',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.78)',
    paddingHorizontal: 30,
  },
  mapOverlayTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  mapOverlayText: {
    color: '#b8b8b8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  contentScroll: {
    flex: 1,
  },
  errorText: {
    color: '#ff8d8d',
    fontSize: 13,
    lineHeight: 20,
    marginHorizontal: 16,
    marginTop: 16,
  },
  listShell: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 28,
    gap: 10,
  },
  micListItem: {
    backgroundColor: '#1f1f1f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f2f2f',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  micListItemActive: {
    borderColor: '#4f8cff',
    backgroundColor: '#1f2636',
  },
  micListItemDone: {
    opacity: 0.56,
  },
  timeColumn: {
    width: 82,
    alignItems: 'flex-start',
    gap: 6,
  },
  timeText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  doneBadge: {
    color: '#9b9b9b',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  micListCopy: {
    flex: 1,
    gap: 2,
  },
  micListName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  micListClub: {
    color: '#d2d2d2',
    fontSize: 13,
  },
  micListMeta: {
    color: '#b4b4b4',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  micListLocation: {
    color: '#808080',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },
  inlineActions: {
    width: 108,
    gap: 8,
  },
  inlineActionButton: {
    backgroundColor: '#2962ff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  inlineSecondaryButton: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#3b3b3b',
  },
  inlineActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineSecondaryText: {
    color: '#d0d0d0',
    fontSize: 12,
    fontWeight: '700',
  },
  mutedText: {
    color: '#8a8a8a',
  },
});
