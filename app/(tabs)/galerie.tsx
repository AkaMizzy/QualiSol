import SharedGalerieScreen from "@/components/galerie/SharedGalerieScreen";
import { ICONS } from "@/constants/Icons";
import React from "react";

export default function GalerieScreen() {
  return (
    <SharedGalerieScreen
      creationMode="upload"
      customButtonIcon={ICONS.galeriePNG}
    />
  );
}
