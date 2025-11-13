import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ged } from '@/services/gedService';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import API_CONFIG from '@/app/config/api';

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
      <Image 
        source={{ uri: `${GofG}${item.url}` }}
        style={styles.image}
      />
      {hasVoiceNote && (
        <View style={styles.voiceNoteIcon}>
          <Ionicons name="mic" size={18} color={COLORS.white} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
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
  image: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: SIZES.medium,
    borderTopRightRadius: SIZES.medium,
  },
  content: {
    padding: SIZES.medium,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: SIZES.medium,
    marginBottom: 4,
  },
  date: {
    fontFamily: FONT.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
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
