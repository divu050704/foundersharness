"use client";

import TopViewOfficeFloor from "./TopViewOfficeFloor";

export default function OfficeFloorMap({
  agents,
  selectedAgentId,
  onSelectAgent,
  onOpenConference,
  onTriggerCoffee,
  onOpenDundies
}) {
  return (
    <div className="w-full h-full flex flex-col bg-[#0c0f12] select-none font-mono">
      {/* Interactive Top-View 2D Office Floorplan & Realtime Camera Tracking Viewport */}
      <div className="flex-1 w-full h-full min-h-[500px]">
        <TopViewOfficeFloor
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={onSelectAgent}
          onOpenConference={onOpenConference}
          onTriggerCoffee={onTriggerCoffee}
          onOpenDundies={onOpenDundies}
        />
      </div>
    </div>
  );
}
