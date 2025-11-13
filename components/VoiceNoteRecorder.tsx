import { useAuth } from '@/contexts/AuthContext';
import { transcribeAudio } from '@/services/gedService';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type VoiceNoteRecorderProps = {
  onRecordingComplete: (uri: string | null) => void;
  onTranscriptionComplete: (text: string) => void;
};

export default function VoiceNoteRecorder({ onRecordingComplete, onTranscriptionComplete }: VoiceNoteRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [status, setStatus] = useState<'idle' | 'recording' | 'recorded' | 'playing'>('idle');
  const [duration, setDuration] = useState(0);
  const { token } = useAuth();

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'recording') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else if (status === 'idle') {
        setDuration(0);
    }
    return () => clearInterval(interval);
  }, [status]);


  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setStatus('recording');
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement.');
      setStatus('idle');
    }
  }

  async function stopRecording() {
    if (!recording) return;

    setStatus('idle');
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    setRecordingUri(uri);
    setRecording(null);
    setStatus('recorded');
    onRecordingComplete(uri);
  }

  async function playSound() {
    if (!recordingUri) return;

    try {
      setStatus('playing');
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri });
      setSound(sound);
      sound.setOnPlaybackStatusUpdate(playbackStatus => {
        if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
          setStatus('recorded');
        }
      });
      await sound.playAsync();
    } catch (error) {
        console.log(error)
      setStatus('recorded');
    }
  }

  function handleDelete() {
    setRecordingUri(null);
    setStatus('idle');
    setDuration(0);
    onRecordingComplete(null);
    setTranscribedText(null);
  }

  function formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  async function handleTranscribe() {
    if (!recordingUri || !token) return;

    setIsTranscribing(true);
    setTranscribedText(null);

    try {
      const fileName = recordingUri.split('/').pop() || 'voicememo.m4a';
      const file = {
        uri: recordingUri,
        type: 'audio/m4a',
        name: fileName,
      };

      const text = await transcribeAudio(token, file);
      setTranscribedText(text);
      onTranscriptionComplete(text);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
      Alert.alert('Erreur de Transcription', `La transcription a échoué: ${errorMessage}`);
    } finally {
      setIsTranscribing(false);
    }
  }


  if (status === 'recording') {
    return (
      <View style={[styles.container, styles.recordingContainer]}>
        <ActivityIndicator size="small" color="#dc2626" />
        <Text style={styles.timerText}>{formatDuration(duration)}</Text>
        <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopRecording}>
          <Ionicons name="stop-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'recorded' || status === 'playing') {
    return (
      <View style={[styles.container, styles.recordedContainer]}>
        <TouchableOpacity style={styles.playButton} onPress={playSound} disabled={status === 'playing'}>
          <Ionicons name={status === 'playing' ? 'pause-circle' : 'play-circle'} size={24} color="#11224e" />
        </TouchableOpacity>
        <Text style={styles.recordedText}>Note vocale ({formatDuration(duration)})</Text>
        {isTranscribing ? (
          <ActivityIndicator color="#11224e" />
        ) : (
          !transcribedText && (
          <TouchableOpacity style={styles.transcribeButton} onPress={handleTranscribe}>
            <Ionicons name="sparkles-outline" size={24} color="#11224e" />
          </TouchableOpacity>
          )
        )}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>
    );
  }


  return (
    <TouchableOpacity style={styles.container} onPress={startRecording}>
      <Ionicons name="mic-outline" size={24} color="#11224e" />
      <Text style={styles.text}>Ajouter une note vocale</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      backgroundColor: '#f8fafc',
      gap: 8,
      marginTop: 12,
    },
    text: {
      color: '#11224e',
      fontWeight: '600',
    },
    recordingContainer: {
      justifyContent: 'space-between',
      backgroundColor: '#fee2e2',
      borderColor: '#fca5a5',
    },
    timerText: {
      color: '#b91c1c',
      fontWeight: '600',
      fontSize: 16,
    },
    stopButton: {
      backgroundColor: '#dc2626',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 99,
    },
    button: {},
    recordedContainer: {
      justifyContent: 'space-between',
      backgroundColor: '#e0e7ff',
      borderColor: '#a5b4fc',
    },
    recordedText: {
      flex: 1,
      textAlign: 'center',
      color: '#3730a3',
      fontWeight: '600',
    },
    playButton: {},
    deleteButton: {},
    transcribeButton: {
      marginLeft: 10,
    },
  });
