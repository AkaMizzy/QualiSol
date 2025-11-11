import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ged } from '@/services/gedService';
import { Folder } from '@/services/qualiphotoService';
import { PhotoCard } from './PhotoCard';

const cameraIcon = require('@/assets/icons/camera.gif');

function formatDate(dateStr: string) {
  const replaced = dateStr.replace(' ', 'T');
  const date = new Date(replaced);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

type ChildQualiPhotoViewProps = {
  item: Ged;
  parentFolder: Folder;
  onClose: () => void;
  subtitle: string;
};

export const ChildQualiPhotoView: React.FC<ChildQualiPhotoViewProps> = ({
  item,
  parentFolder,
  onClose,
  subtitle,
}) => {
  const [afterPhoto, setAfterPhoto] = React.useState<Ged | null>(null);
  const [isLoadingAfter, setIsLoadingAfter] = React.useState(false);

  // TODO: Implement fetching and creating the "after" photo
  const handleAddAfterPhoto = () => {
    console.log('TODO: Implement adding after photo');
  };

  const header = (
    <View style={styles.header}>
      <Pressable onPress={onClose} style={styles.closeBtn}>
        <Ionicons name="arrow-back" size={28} color="#f87b1b" />
      </Pressable>
      <View style={styles.headerTitles}>
        <Text style={styles.title}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
        {/* <Text style={styles.subtitle}>{formatDate(item.createdAt)}</Text> */}
      </View>
      <View style={styles.headerActionsContainer} />
    </View>
  );

  return (
    <>
      {header}
      <ScrollView bounces>
        <View style={styles.content}>
          <View>
            <Text style={styles.sectionTitle}>Situation avant</Text>
            {item.url ? (
              <PhotoCard
                uri={item.url}
                title={item.title}
                userName={item.author}
                // date={item.createdAt}
                onPress={() => {}}
                isActionsVisible={false}
              />
            ) : null}
            {item.description && (
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Description</Text>
                <Text style={[styles.metaValue, styles.metaMultiline]}>{item.description}</Text>
              </View>
            )}
          </View>

          <View>
            <Text style={styles.sectionTitle}>Situation après</Text>
            {isLoadingAfter ? (
              <ActivityIndicator style={{ marginVertical: 12 }} />
            ) : afterPhoto?.url ? (
              <PhotoCard
                uri={afterPhoto.url}
                title={afterPhoto.title}
                userName={afterPhoto.author}
                // date={afterPhoto.createdAt}
                onPress={() => {}}
                isActionsVisible={false}
              />
            ) : (
              <View style={{ alignItems: 'center', marginVertical: 16 }}>
                <TouchableOpacity
                  onPress={handleAddAfterPhoto}
                  accessibilityLabel="Ajouter une photo complémentaire"
                  style={styles.cameraCTA}
                >
                  <Image source={cameraIcon} style={styles.cameraCTAIcon} />
                  <Text style={styles.cameraCTALabel}>Prendre la situation après</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
        backgroundColor: '#FFFFFF',
      },
      closeBtn: {
        width: 40,
        height: 40,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f87b1b',
      },
      headerTitles: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      },
      headerActionsContainer: {
        width: 40, // to balance the close button
      },
      title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#11224e',
      },
      subtitle: {
        marginTop: 2,
        fontSize: 12,
        color: '#8E8E93',
      },
      content: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 24,
        gap: 24,
      },
      metaCard: {
        marginTop: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f87b1b',
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      },
      metaLabel: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 2,
        fontWeight: '600',
      },
      metaValue: {
        color: '#0f172a',
        fontSize: 14,
        fontWeight: '600',
      },
      metaMultiline: {
        lineHeight: 20,
      },
      sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#f87b1b',
        marginBottom: 8,
      },
      cameraCTALabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#11224e',
        marginLeft: 8,
      },
      cameraCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        marginHorizontal: 12,
      },
      cameraCTAIcon: {
        width: 30,
        height: 30,
        resizeMode: 'contain',
      },
});
