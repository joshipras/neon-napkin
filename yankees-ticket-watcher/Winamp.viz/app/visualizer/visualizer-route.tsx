"use client";

import { useSearchParams } from "next/navigation";
import VisualizerExperience from "@/components/VisualizerExperience";

export default function VisualizerRoute() {
  const searchParams = useSearchParams();
  const source = searchParams.get("audioTest") === "1" ? "test" : searchParams.get("source") === "demo" ? "demo" : "mic";
  const debug = searchParams.get("debug") === "1";
  return <VisualizerExperience initialDebug={debug} source={source} />;
}
