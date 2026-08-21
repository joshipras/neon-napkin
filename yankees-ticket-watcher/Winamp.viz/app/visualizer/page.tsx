import { Suspense } from "react";
import VisualizerRoute from "./visualizer-route";

export const metadata = {
  title: "Visualizer"
};

export default function VisualizerPage() {
  return (
    <Suspense>
      <VisualizerRoute />
    </Suspense>
  );
}
