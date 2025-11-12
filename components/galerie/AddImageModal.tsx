import VoiceNoteRecorder from '@/components/VoiceNoteRecorder';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AddImageModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; description: string; image: ImagePicker.ImagePickerAsset | null; voiceNote: { uri: string; type: string; name: string; } | null }) => void;
}

export default function AddImageModal({ visible, onClose, onAdd }: AddImageModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [voiceNote, setVoiceNote] = useState<{ uri: string; type: string; name: string; } | null>(null);

  const handleChoosePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleAdd = () => {
    if (!title || !image) {
      Alert.alert('Missing Information', 'Please provide a title and an image.');
      return;
    }
    onAdd({ title, description, image, voiceNote });
    setTitle('');
    setDescription('');
    setImage(null);
    setVoiceNote(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Add New Image</Text>
          
          <TouchableOpacity style={styles.imagePicker} onPress={handleChoosePhoto}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Ionicons name="camera" size={40} color={COLORS.gray} />
                <Text style={styles.imagePickerText}>Tap to add image</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          
          <VoiceNoteRecorder onRecordingComplete={(uri) => {
            if (uri) {
              setVoiceNote({
                uri,
                type: 'audio/mpeg',
                name: `voicenote-${Date.now()}.mp3`,
              });
            } else {
              setVoiceNote(null);
            }
          }} />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleAdd}>
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium,
    padding: SIZES.large,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: SIZES.xLarge,
    marginBottom: SIZES.medium,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.lightWhite,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.small,
    marginBottom: SIZES.medium,
  },
  imagePickerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    fontFamily: FONT.regular,
    color: COLORS.gray,
    marginTop: SIZES.small,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: SIZES.small,
  },
  input: {
    width: '100%',
    padding: SIZES.medium,
    backgroundColor: COLORS.lightWhite,
    borderRadius: SIZES.small,
    marginBottom: SIZES.medium,
    fontFamily: FONT.regular,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    padding: SIZES.medium,
    borderRadius: SIZES.small,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.gray2,
    marginRight: SIZES.small,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    marginLeft: SIZES.small,
  },
  buttonText: {
    color: COLORS.white,
    fontFamily: FONT.medium,
  },
});
