import FolderListScreen from "@/components/folder/FolderListScreen";
import { ICONS } from "@/constants/Icons";
import { getAllFolderTypes } from "@/services/folderTypeService";
import { getGedsBySource } from "@/services/gedService";
import { getAuthToken } from "@/services/secureStore";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import API_CONFIG from "../config/api";

export default function DynamicFolderScreen() {
  const { foldertype } = useLocalSearchParams<{ foldertype: string }>();
  const [folderTypeIcon, setFolderTypeIcon] = useState<any>(ICONS.folder);
  const [folderTypeImageUrl, setFolderTypeImageUrl] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    async function loadFolderTypeIcon() {
      try {
        const token = await getAuthToken();
        if (!token || !foldertype) return;

        const folderTypes = await getAllFolderTypes(token);
        const currentFolderType = folderTypes.find(
          (ft) => ft.title === foldertype,
        );

        if (!currentFolderType) return;

        // Resolve icon via GED (folder_type_icon relationship)
        try {
          const geds = await getGedsBySource(
            token,
            currentFolderType.id,
            "folder_type_icon",
          );
          if (geds.length > 0 && geds[0].url) {
            const url = `${API_CONFIG.BASE_URL}${geds[0].url}`;
            setFolderTypeIcon({ uri: url });
            setFolderTypeImageUrl(url);
            return;
          }
        } catch (err) {
          console.error("Failed to fetch GED icon for folder type:", err);
        }

        // Fallback: use imageUrl already on the folderType if present
        if (currentFolderType.imageUrl) {
          setFolderTypeIcon({ uri: currentFolderType.imageUrl });
          setFolderTypeImageUrl(currentFolderType.imageUrl);
        }
      } catch (error) {
        console.error("Failed to load folder type icon:", error);
      }
    }
    loadFolderTypeIcon();
  }, [foldertype]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FolderListScreen
        folderTypeTitle={foldertype || ""}
        folderTypeIcon={folderTypeIcon}
        folderTypeImageUrl={folderTypeImageUrl}
      />
    </>
  );
}
