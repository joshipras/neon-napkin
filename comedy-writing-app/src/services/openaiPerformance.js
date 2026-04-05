const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.EXPO_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com/v1';
const TRANSCRIPTION_MODEL =
  process.env.EXPO_PUBLIC_OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';
const ANALYSIS_MODEL = process.env.EXPO_PUBLIC_OPENAI_ANALYSIS_MODEL || 'gpt-5-mini';

const parseDataUrl = (dataUrl) => {
  const [header, base64] = dataUrl.split(',');
  const mimeType = header.match(/data:(.*?);base64/)?.[1] || 'audio/webm';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
};

const extractOutputText = (payload) => {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks =
    payload.output
      ?.flatMap((item) => item.content || [])
      ?.filter((item) => item.type === 'output_text' && item.text)
      ?.map((item) => item.text) || [];

  return chunks.join('\n').trim();
};

export const hasOpenAIConfig = () => Boolean(OPENAI_API_KEY);

export async function transcribePerformanceAudio(audioDataUrl) {
  if (!OPENAI_API_KEY || !audioDataUrl) {
    return null;
  }

  const audioBlob = parseDataUrl(audioDataUrl);
  const formData = new FormData();
  formData.append('file', audioBlob, 'performance.webm');
  formData.append('model', TRANSCRIPTION_MODEL);
  formData.append('response_format', 'text');

  const response = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI transcription failed: ${response.status} ${errorText}`);
  }

  return (await response.text()).trim();
}

export async function analyzePerformanceWithOpenAI({
  jokeTitle,
  jokeText,
  transcript,
  recording,
  previousFeedback,
}) {
  if (!OPENAI_API_KEY) {
    return null;
  }

  const prompt = [
    'You are a comedy performance coach.',
    'Analyze one recorded set and return surgical notes only.',
    'Do not rewrite the entire joke.',
    'Focus on small edits, pacing, tags, delivery adjustments, and audience response interpretation.',
    'Return plain text with short bullet points.',
    '',
    `Joke title: ${jokeTitle}`,
    `Joke text: ${jokeText}`,
    `Venue: ${recording.locationName}`,
    `Recorded on: ${recording.createdAt}`,
    `Duration: ${recording.durationMs} ms`,
    `Pause count: ${recording.metrics.pauseCount}`,
    `Average energy: ${recording.metrics.avgEnergy}`,
    `Peak energy: ${recording.metrics.peakEnergy}`,
    `Audience reaction spikes: ${recording.metrics.audienceReactionCount}`,
    `Transcript: ${transcript}`,
    previousFeedback
      ? `Previous feedback to compare against: ${previousFeedback.text}`
      : 'Previous feedback to compare against: none',
  ].join('\n');

  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI analysis failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return extractOutputText(payload);
}
