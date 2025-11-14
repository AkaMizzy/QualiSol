import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type PhotoCardProps = {
  uri: string | null;
  title?: string | null;
  userName?: string | null;
  userLastName?: string | null;
  date?: string | null;
  onPress: () => void;
  onToggleActions?: () => void;
  isActionsVisible?: boolean;
  borderColor?: string;
};

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

export const PhotoCard: React.FC<PhotoCardProps> = ({
  uri,
  title,
  userName,
  userLastName,
  date,
  onPress,
  onToggleActions,
  isActionsVisible,
  borderColor,
}) => {
  if (!uri) {
    return null;
  }

  return (
    <View>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View style={[styles.imageWrap, borderColor ? { borderColor } : {}]}>
          <Image source={{ uri }} style={styles.image} />
          <View style={[styles.overlay, { gap: 4 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                {userName && (
                  <Text style={styles.date} numberOfLines={1}>
                    {`${userName} ${userLastName || ''}`.trim()}
                  </Text>
                )}
              </View>
              <View style={{ flexShrink: 0 }}>
                {date && <Text style={styles.date}>{formatDate(date)}</Text>}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {onToggleActions && (
        <TouchableOpacity
          style={styles.toggleActionsButton}
          onPress={onToggleActions}
          accessibilityLabel={isActionsVisible ? 'Masquer les actions' : 'Afficher les actions'}
        >
          <Ionicons name={isActionsVisible ? 'close' : 'ellipsis-horizontal'} size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  imageWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#f3f4f6',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  date: {
    color: '#f87b1b',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleActionsButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});
