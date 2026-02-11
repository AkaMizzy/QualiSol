import SharedGalerieScreen from "@/components/galerie/SharedGalerieScreen";
import { getCompanyImages } from "@/services/gedService";
import React from "react";

export default function ConstatsScreen() {
  return (
    <SharedGalerieScreen
      creationMode="capture"
      allowOffline={true}
      fetchData={getCompanyImages}
      enableAssignment={true}
    />
  );
}
