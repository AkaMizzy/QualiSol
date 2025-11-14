import { ICONS } from '@/constants/Icons';
import { Folder } from '@/services/qualiphotoService';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

type PhotoActionsProps = {
  item: Folder;
  onPlaySound: () => void;
  isPlaying: boolean;
  onMapPress: () => void;
  onEdit?: () => void;
};

export const PhotoActions: React.FC<PhotoActionsProps> = ({
  item,
  onPlaySound,
  isPlaying,
  onMapPress,
  onEdit,
}) => {
  return (
    <View style={styles.actionsContainer}>
      <TouchableOpacity style={styles.actionButton} onPress={onPlaySound}>
        <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={32} color="#11224e" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={onMapPress}>
        <Image source={ICONS.map} style={styles.actionIcon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f87b1b',
  },
  actionButton: {
    padding: 8,
  },
  actionIcon: {
    width: 32,
    height: 32,
  },
});
