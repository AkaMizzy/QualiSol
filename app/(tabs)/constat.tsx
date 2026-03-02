import SharedGalerieScreen from "@/components/galerie/SharedGalerieScreen";
import { useAuth } from "@/contexts/AuthContext";
import companyService from "@/services/companyService";
import React, { useEffect, useState } from "react";

export default function ConstatScreen() {
  const { token } = useAuth();
  const [helpMessage, setHelpMessage] = useState<string | null>(null);

  useEffect(() => {
    companyService
      .getCompany()
      .then((c) => setHelpMessage(c?.constahelp ?? null))
      .catch(() => {});
  }, [token]);

  return (
    <SharedGalerieScreen
      creationMode="capture"
      allowOffline={true}
      openModalOnFocus={true}
      helpMessage={helpMessage}
    />
  );
}
