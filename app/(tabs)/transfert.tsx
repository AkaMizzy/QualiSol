import SharedGalerieScreen from "@/components/galerie/SharedGalerieScreen";
import { ICONS } from "@/constants/Icons";
import { useAuth } from "@/contexts/AuthContext";
import companyService from "@/services/companyService";
import React, { useEffect, useState } from "react";

export default function TransfertScreen() {
  const { token } = useAuth();
  const [helpMessage, setHelpMessage] = useState<string | null>(null);

  useEffect(() => {
    companyService
      .getCompany()
      .then((c) => setHelpMessage(c?.transferhelp ?? null))
      .catch(() => {});
  }, [token]);

  return (
    <SharedGalerieScreen
      creationMode="upload"
      customButtonIcon={ICONS.transfertPNG}
      allowOffline={false}
      useBulkModal={true}
      helpMessage={helpMessage}
    />
  );
}
