import SharedGalerieScreen from "@/components/galerie/SharedGalerieScreen";
import { ICONS } from "@/constants/Icons";
import React from "react";

export default function TransfertScreen() {
  return (
    <SharedGalerieScreen
      creationMode="upload"
      customButtonIcon={ICONS.transfertPNG}
      allowOffline={false}
      useBulkModal={true}
    />
  );
}
