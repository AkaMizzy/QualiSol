import VoiceNoteRecorder from '@/components/VoiceNoteRecorder';
import { COLORS, FONT, SIZES } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.headerTitle}>Add New Image</Text>
                
                <TouchableOpacity style={styles.imagePicker} onPress={handleChoosePhoto}>
                  {image ? (
                    <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="camera-outline" size={48} color={COLORS.gray} />
                      <Text style={styles.imagePickerText}>Capture Image</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <View style={styles.form}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 'Site Inspection Photo'"
                    placeholderTextColor={COLORS.gray}
                    value={title}
                    onChangeText={setTitle}
                  />
                  
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add a short description (optional)"
                    placeholderTextColor={COLORS.gray}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />
                </View>
                
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
                    <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleAdd}>
                    <Text style={styles.buttonText}>Add Image</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        maxHeight: '90%',
        backgroundColor: COLORS.white,
        borderTopLeftRadius: SIZES.xLarge,
        borderTopRightRadius: SIZES.xLarge,
        padding: SIZES.large,
    },
    headerTitle: {
        textAlign: 'center',
        fontFamily: FONT.bold,
        fontSize: SIZES.xLarge,
        marginBottom: SIZES.large,
        color: COLORS.secondary,
    },
    imagePicker: {
        width: '100%',
        height: 180,
        backgroundColor: COLORS.lightWhite,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: SIZES.medium,
        marginBottom: SIZES.large,
        borderWidth: 2,
        borderColor: COLORS.gray2,
        borderStyle: 'dashed',
    },
    imagePickerPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePickerText: {
        fontFamily: FONT.medium,
        color: COLORS.gray,
        marginTop: SIZES.small,
        fontSize: SIZES.medium,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        borderRadius: SIZES.medium,
    },
    form: {
        width: '100%',
        marginBottom: SIZES.medium,
    },
    label: {
        fontFamily: FONT.medium,
        fontSize: SIZES.medium,
        color: COLORS.secondary,
        marginBottom: SIZES.small,
        alignSelf: 'flex-start',
    },
    input: {
        width: '100%',
        padding: SIZES.medium,
        backgroundColor: COLORS.lightWhite,
        borderRadius: SIZES.small,
        marginBottom: SIZES.medium,
        fontFamily: FONT.regular,
        fontSize: SIZES.medium,
        borderWidth: 1,
        borderColor: COLORS.gray2,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: SIZES.large,
        width: '100%',
        paddingBottom: SIZES.medium,
    },
    button: {
        flex: 1,
        paddingVertical: SIZES.medium,
        borderRadius: SIZES.medium,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.lightWhite,
        marginRight: SIZES.small,
        borderWidth: 1,
        borderColor: COLORS.gray2,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        marginLeft: SIZES.small,
    },
    buttonText: {
        color: COLORS.white,
        fontFamily: FONT.bold,
        fontSize: SIZES.medium,
    },
    cancelButtonText: {
        color: COLORS.secondary,
    },
});
