import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import {
  CameraType,
  CameraView,
  FlashMode,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onMediaCaptured: (media: {
    uri: string;
    type: "image" | "video";
    width?: number;
    height?: number;
  }) => void;
}

export default function CaptureModal({
  visible,
  onClose,
  onMediaCaptured,
}: CaptureModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [mode, setMode] = useState<"picture" | "video">("picture");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [zoom, setZoom] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      if (!permission?.granted) requestPermission();
      if (!micPermission?.granted) requestMicPermission();
    }
  }, [visible]);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000) as any;
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const toggleFlash = () => {
    setFlash((current) =>
      current === "off" ? "on" : current === "on" ? "auto" : "off",
    );
  };

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    if (mode === "picture") {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: true, // Faster capture
        });
        if (photo) {
          onMediaCaptured({
            uri: photo.uri,
            type: "image",
            width: photo.width,
            height: photo.height,
          });
          onClose(); // Auto close after capture? Or maybe show preview? For now auto close to return to AddImageModal
        }
      } catch (error) {
        console.error("Failed to take picture:", error);
        Alert.alert("Erreur", "Impossible de prendre la photo.");
      }
    } else {
      // Video Mode
      if (isRecording) {
        // Stop recording
        setIsRecording(false);
        cameraRef.current.stopRecording();
      } else {
        // Start recording
        try {
          if (!micPermission?.granted) {
            const permissionResponse = await requestMicPermission();
            if (!permissionResponse.granted) {
              Alert.alert(
                "Permission requise",
                "L'accès au micro est nécessaire pour filmer.",
              );
              return;
            }
          }

          setIsRecording(true);
          const video = await cameraRef.current.recordAsync({
            maxDuration: 60, // Limit to 60s for example or let user stop
          });

          if (video) {
            onMediaCaptured({ uri: video.uri, type: "video" });
            onClose();
          }
        } catch (error) {
          console.error("Failed to record video:", error);
          setIsRecording(false);
          Alert.alert("Erreur", "Impossible d'enregistrer la vidéo.");
        }
      }
    }
  };

  // If permission is not granted yet
  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.message}>
            Nous avons besoin de votre permission pour utiliser la caméra
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>
              Accorder la permission
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <StatusBar hidden />
        <CameraView
          style={styles.camera}
          facing={facing}
          mode={mode}
          flash={flash}
          zoom={zoom}
          ref={cameraRef}
          animateShutter={false} // We handle our own animation/feedback
        >
          <SafeAreaView style={styles.overlay}>
            {/* Top Control Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>

              {isRecording && (
                <View style={styles.timerContainer}>
                  <View style={styles.redDot} />
                  <Text style={styles.timerText}>
                    {formatDuration(recordingDuration)}
                  </Text>
                </View>
              )}

              <TouchableOpacity onPress={toggleFlash} style={styles.iconButton}>
                <Ionicons
                  name={
                    flash === "on"
                      ? "flash"
                      : flash === "auto"
                        ? "flash-outline"
                        : "flash-off"
                  }
                  size={24}
                  color={flash === "on" ? "#FFD700" : "white"}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.spacer} />

            <View style={styles.bottomControls}>
              {/* Zoom Slider */}
              <View style={styles.zoomContainer}>
                <Ionicons name="remove" size={20} color="white" />
                <Slider
                  style={{ flex: 1, marginHorizontal: 10 }}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.01}
                  value={zoom}
                  onValueChange={setZoom}
                  minimumTrackTintColor="#FFFFFF"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#FFFFFF"
                />
                <Ionicons name="add" size={20} color="white" />
              </View>

              {/* Mode Switcher */}
              {!isRecording && (
                <View style={styles.modeSwitcher}>
                  <TouchableOpacity
                    onPress={() => setMode("picture")}
                    style={[
                      styles.modeButton,
                      mode === "picture" && styles.activeModeButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeText,
                        mode === "picture" && styles.activeModeText,
                      ]}
                    >
                      PHOTO
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setMode("video")}
                    style={[
                      styles.modeButton,
                      mode === "video" && styles.activeModeButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeText,
                        mode === "video" && styles.activeModeText,
                      ]}
                    >
                      VIDÉO
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.actionRow}>
                {/* Gallery PlaceHolder (Optional) - Keeping it simple for now, just spacing */}
                <View style={{ width: 40 }} />

                {/* Shutter Button */}
                <TouchableOpacity onPress={handleCapture} activeOpacity={0.8}>
                  <View
                    style={[
                      styles.shutterOuter,
                      mode === "video"
                        ? { borderColor: isRecording ? "transparent" : "white" }
                        : {},
                    ]}
                  >
                    {mode === "picture" ? (
                      <View style={styles.shutterInnerPhoto} />
                    ) : (
                      <View
                        style={[
                          styles.shutterInnerVideo,
                          isRecording && styles.shutterInnerRecording,
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Flip Camera */}
                {!isRecording ? (
                  <TouchableOpacity
                    onPress={toggleCameraFacing}
                    style={styles.iconButton}
                  >
                    <Ionicons name="camera-reverse" size={32} color="white" />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 40 }} />
                )}
              </View>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 10,
  },
  spacer: {
    flex: 1,
  },
  bottomControls: {
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.3)", // Slight tint for readability
  },
  zoomContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 40,
    marginBottom: 20,
    paddingTop: 10,
  },
  modeSwitcher: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 20,
  },
  modeButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  activeModeButton: {
    backgroundColor: "rgba(50, 50, 50, 0.6)",
  },
  modeText: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    fontSize: 14,
  },
  activeModeText: {
    color: "#FFD700", // Gold/Yellow for active
    fontWeight: "bold",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  iconButton: {
    padding: 10,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  shutterInnerPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "white",
  },
  shutterInnerVideo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ff4444",
  },
  shutterInnerRecording: {
    width: 40,
    height: 40,
    borderRadius: 6, // Square when recording
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
    color: "white",
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  permissionButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  closeButton: {
    marginTop: 20,
  },
  closeButtonText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff4444",
    marginRight: 6,
  },
  timerText: {
    color: "white",
    fontWeight: "600",
  },
});
