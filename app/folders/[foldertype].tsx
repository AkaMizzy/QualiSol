import FolderListScreen from '@/components/folder/FolderListScreen';
import { ICONS } from '@/constants/Icons';
import { getAllFolderTypes } from '@/services/folderTypeService';
import { getAuthToken } from '@/services/secureStore';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

export default function DynamicFolderScreen() {
  const { foldertype } = useLocalSearchParams<{ foldertype: string }>();
  const [folderTypeIcon, setFolderTypeIcon] = useState<any>(ICONS.folder);
  
  useEffect(() => {
    async function loadFolderTypeIcon() {
      try {
        const token = await getAuthToken();
        if (!token || !foldertype) return;
        
        const folderTypes = await getAllFolderTypes(token);
        const currentFolderType = folderTypes.find(ft => ft.title === foldertype);
        
        if (currentFolderType?.imageUrl) {
          setFolderTypeIcon({ uri: currentFolderType.imageUrl });
        }
      } catch (error) {
        console.error('Failed to load folder type icon:', error);
      }
    }
    loadFolderTypeIcon();
  }, [foldertype]);
  
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FolderListScreen 
        folderTypeTitle={foldertype || ''} 
        folderTypeIcon={folderTypeIcon}
      />
    </>
  );
}
