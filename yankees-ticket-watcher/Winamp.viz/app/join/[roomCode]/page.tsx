import PhoneMicJoin from "@/components/PhoneMicJoin";
import { normalizeRoomCode } from "@/lib/roomCode";

export const metadata = {
  title: "Join TV Mode"
};

export default async function JoinPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  return <PhoneMicJoin roomCode={normalizeRoomCode(roomCode)} />;
}
