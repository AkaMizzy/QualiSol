import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';

type Props = {
  baseImageUri: string;
  onClose: () => void;
  onSaved: (image: { uri: string; name: string; type: string }) => void;
  title?: string;
};

type DrawPath = { color: string; width: number; d: string };

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#111827'];

export default function PictureAnnotator({ baseImageUri, onClose, onSaved, title }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<View>(null);
  const [imgW, setImgW] = useState<number | null>(null);
  const [imgH, setImgH] = useState<number | null>(null);
  const [areaW, setAreaW] = useState<number | null>(null);
  const [areaH, setAreaH] = useState<number | null>(null);

  const canSave = useMemo(() => !!baseImageUri && !submitting, [baseImageUri, submitting]);

  useEffect(() => {
    if (!baseImageUri) return;
    Image.getSize(baseImageUri, (w, h) => { setImgW(w); setImgH(h); }, () => {});
  }, [baseImageUri]);

  const fitted = useMemo(() => {
    if (!imgW || !imgH || !areaW || !areaH) return null;
    const scale = Math.min(areaW / imgW, areaH / imgH);
    const width = Math.max(1, Math.floor(imgW * scale));
    const height = Math.max(1, Math.floor(imgH * scale));
    return { width, height };
  }, [imgW, imgH, areaW, areaH]);

  const onAreaLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setAreaW(width);
    setAreaH(height);
  };

  const handlePanStart = useCallback((x: number, y: number) => { setCurrentPath(`M ${x} ${y}`); }, []);
  const handlePanMove = useCallback((x: number, y: number) => { setCurrentPath(prev => prev ? `${prev} L ${x} ${y}` : `M ${x} ${y}`); }, []);
  const handlePanEnd = useCallback(() => {
    if (!currentPath) return;
    setPaths(prev => [...prev, { color: selectedColor, width: strokeWidth, d: currentPath }]);
    setCurrentPath('');
  }, [currentPath, selectedColor, strokeWidth]);

  const handleUndo = () => setPaths(prev => prev.slice(0, -1));
  const handleClear = () => { setPaths([]); setCurrentPath(''); };

  const onCapture = async () => {
    if (!canvasRef.current) return;
    setSubmitting(true);
    try {
      const uri = await captureRef(canvasRef, { format: 'jpg', quality: 0.9, result: 'tmpfile' } as any);
      onSaved({ uri, name: `annotated-${Date.now()}.jpg`, type: 'image/jpeg' });
      onClose();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || "Échec de l'annotation de l'image");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.fullscreen} edges={['left','right']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}> 
        <TouchableOpacity onPress={onClose} style={styles.headerBtn} accessibilityLabel="Fermer">
          <Ionicons name="close" size={24} color="#f87b1b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title || 'Annoter la photo'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.toolsBar}>
        <View style={styles.colorsRow}>
          {COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => setSelectedColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, selectedColor === c && styles.colorSelected]} />
          ))}
        </View>
        <View style={styles.controlsRow}>
          {[3, 5, 8].map(w => (
            <TouchableOpacity key={w} onPress={() => setStrokeWidth(w)} style={[styles.widthBtn, strokeWidth === w && styles.widthBtnActive]}>
              <View style={{ width: w * 2, height: w, backgroundColor: selectedColor, borderRadius: 8 }} />
            </TouchableOpacity>
          ))}
          <View style={styles.separator} />
          <TouchableOpacity onPress={handleUndo} style={styles.actionBtn} accessibilityLabel="Annuler">
            <Ionicons name="arrow-undo" size={22} color="#11224e" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.actionBtn} accessibilityLabel="Effacer">
            <Ionicons name="trash" size={22} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content} onLayout={onAreaLayout}>
        {!baseImageUri ? (
          <ActivityIndicator size="large" color="#11224e" />
        ) : (
          <View style={styles.canvasFrame}>
            <View style={styles.centerWrap}>
              <ViewShot
                ref={canvasRef}
                style={[styles.canvasWrap, fitted ? { width: fitted.width, height: fitted.height } : null]}
                options={{ format: 'jpg', quality: 0.9 }}
              >
              <View style={[styles.imageContainer, fitted ? { width: fitted.width, height: fitted.height } : null]}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
                onResponderGrant={(e) => {
                  const { locationX, locationY } = e.nativeEvent;
                  handlePanStart(locationX, locationY);
                }}
                onResponderMove={(e) => {
                  const { locationX, locationY } = e.nativeEvent;
                  handlePanMove(locationX, locationY);
                }}
                onResponderRelease={() => handlePanEnd()}
              >
                <Image source={{ uri: baseImageUri }} style={styles.baseImage} />
                <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                  {paths.map((p, idx) => (
                    <Path key={idx} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  ))}
                  {currentPath ? (
                    <Path d={currentPath} stroke={selectedColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  ) : null}
                </Svg>
              </View>
              </ViewShot>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}> 
        <TouchableOpacity style={[styles.saveButton, (!canSave) && styles.saveButtonDisabled]} onPress={onCapture} disabled={!canSave}>
          {submitting ? (
            <>
              <Ionicons name="hourglass" size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Enregistrement...</Text>
            </>
          ) : (
            <>
              <Ionicons name="save" size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullscreen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11224e' },
  toolsBar: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#f8fafc' },
  colorsRow: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, alignItems: 'center', flexDirection: 'row', gap: 10 },
  controlsRow: { paddingHorizontal: 12, paddingBottom: 10, alignItems: 'center', flexDirection: 'row', gap: 10 },
  colorSwatch: { width: 24, height: 24, borderRadius: 12, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  colorSelected: { borderColor: '#11224e' },
  widthBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8, backgroundColor: '#fff' },
  widthBtnActive: { borderColor: '#f87b1b' },
  actionBtn: { padding: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, backgroundColor: '#fff', marginRight: 8 },
  separator: { width: 1, height: 20, backgroundColor: '#e5e7eb', marginHorizontal: 6 },
  content: { flex: 1, padding: 12 },
  canvasFrame: { flex: 1, borderWidth: 1, borderColor: '#f87b1b', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  canvasWrap: { flex: 1, backgroundColor: '#fff' },
  imageContainer: { flex: 1 },
  baseImage: { width: '100%', height: '100%' },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  saveButton: { backgroundColor: '#f87b1b', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, height: 48, alignSelf: 'center', width: '92%' },
  saveButtonDisabled: { backgroundColor: '#d1d5db' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});


