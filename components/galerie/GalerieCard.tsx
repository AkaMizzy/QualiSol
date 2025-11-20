import API_CONFIG from '@/app/config/api';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { Ged } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GalerieCardProps {
  item: Ged;
  onPress: () => void;
  hasVoiceNote?: boolean;
}

export default function GalerieCard({ item, onPress, hasVoiceNote }: GalerieCardProps) {
  const GofG = API_CONFIG.BASE_URL
  const formattedDate = new Date(item.created_at).toLocaleDateString('fr-FR');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: `${GofG}${item.url}` }}
          style={styles.image}
        />
        {hasVoiceNote && (
          <View style={styles.voiceNoteIcon}>
            <Ionicons name="mic" size={18} color={COLORS.white} />
          </View>
        )}
        <View style={styles.overlay}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
      </View>
      {item.author && (
        <View style={styles.content}>
            <Text style={styles.author} numberOfLines={1}>
            {item.author}
            </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    borderTopLeftRadius: SIZES.medium,
    borderTopRightRadius: SIZES.medium,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    padding: SIZES.medium,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    color: COLORS.primary,
    flex: 1,
    marginRight: SIZES.small,
  },
  date: {
    fontWeight: '600',
    fontSize: SIZES.small,
    color: '#f87b1b',
  },
  author: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginTop: 4,
  },
  voiceNoteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 4,
  },
});
