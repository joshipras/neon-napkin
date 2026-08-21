import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { deserializeAudioFrame, serializeAudioFrame } from "@/audio/AudioFeatureExtractor";
import type { AudioFrame, SerializedAudioFrame } from "@/audio/types";

export interface TvRealtimeAdapter {
  readonly enabled: boolean;
  publish(roomCode: string, frame: AudioFrame): Promise<void>;
  subscribe(roomCode: string, onFrame: (frame: AudioFrame) => void, onLost: () => void): Promise<() => void>;
}

class DisabledAdapter implements TvRealtimeAdapter {
  readonly enabled = false;

  async publish() {}

  async subscribe() {
    return () => {};
  }
}

class SupabaseBroadcastAdapter implements TvRealtimeAdapter {
  readonly enabled = true;
  private client: SupabaseClient;
  private channels = new Map<string, RealtimeChannel>();

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 30
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  async publish(roomCode: string, frame: AudioFrame) {
    const channel = this.getChannel(roomCode);
    const payload: SerializedAudioFrame = serializeAudioFrame(frame, 32);
    await channel.send({
      type: "broadcast",
      event: "features",
      payload
    });
  }

  async subscribe(roomCode: string, onFrame: (frame: AudioFrame) => void, onLost: () => void) {
    const channel = this.getChannel(roomCode);
    channel.on("broadcast", { event: "features" }, ({ payload }) => {
      onFrame(deserializeAudioFrame(payload as SerializedAudioFrame));
    });
    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") onLost();
    });

    return () => {
      void this.client.removeChannel(channel);
      this.channels.delete(roomCode);
    };
  }

  private getChannel(roomCode: string) {
    const name = `visualize-fm:${roomCode}`;
    const existing = this.channels.get(name);
    if (existing) return existing;
    const channel = this.client.channel(name, {
      config: {
        broadcast: {
          self: false
        },
        presence: {
          key: roomCode
        }
      }
    });
    this.channels.set(name, channel);
    return channel;
  }
}

let adapter: TvRealtimeAdapter | null = null;

export function getTvRealtimeAdapter(): TvRealtimeAdapter {
  if (adapter) return adapter;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  adapter = url && anonKey ? new SupabaseBroadcastAdapter(url, anonKey) : new DisabledAdapter();
  return adapter;
}
