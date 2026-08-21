"use client";

import { useSearchParams } from "next/navigation";
import VisualizerExperience from "@/components/VisualizerExperience";

export default function VisualizerRoute() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") === "demo" ? "demo" : "mic";
  return <VisualizerExperience source={source} />;
}
