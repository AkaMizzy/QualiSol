import SharedGalerieScreen from "@/components/galerie/SharedGalerieScreen";
import { ICONS } from "@/constants/Icons";
import React from "react";

export default function TransfertScreen() {
  return (
    <SharedGalerieScreen
      creationMode="upload"
      customButtonIcon={ICONS.galeriePNG}
      allowOffline={false}
      useBulkModal={true}
    />
  );
}
