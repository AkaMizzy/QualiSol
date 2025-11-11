import API_CONFIG from '@/app/config/api';
import CreateDeclarationModal from '@/components/CreateDeclarationModal';
import ZonePictureEditor from '@/components/ZonePictureEditor';
import { useAuth } from '@/contexts/AuthContext';
import declarationService from '@/services/declarationService';
import qualiphotoService, { Comment, QualiPhotoItem } from '@/services/qualiphotoService';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { ChildQualiPhotoView } from './ChildQualiPhotoView';
import ComparisonModal from './ComparisonModal';
import { CreateChildQualiPhotoForm } from './CreateChildQualiPhotoModal';
import CreateComplementaireQualiPhotoModal from './CreateComplementaireQualiPhotoModal';
import { ParentQualiPhotoView } from './ParentQualiPhotoView';
import SignatureFieldQualiphoto from './SignatureFieldQualiphoto';



if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  visible: boolean;
  onClose: () => void;
  item?: QualiPhotoItem | null;
};

// type reserved for future enhancements

 export default function QualiPhotoDetail({ visible, onClose, item: initialItem }: Props) {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [compSound, setCompSound] = useState<Audio.Sound | null>(null);
  const [isPlayingComp, setIsPlayingComp] = useState(false);
  const [isMapDetailVisible, setMapDetailVisible] = useState(false);
  const [isComplementMapVisible, setComplementMapVisible] = useState(false);
  const [isChildModalVisible, setChildModalVisible] = useState(false);
  const [isComplementModalVisible, setComplementModalVisible] = useState(false);
  const [isEditPlanVisible, setEditPlanVisible] = useState(false);
  const [children, setChildren] = useState<QualiPhotoItem[]>([]);
  const [childIdToHasComplement, setChildIdToHasComplement] = useState<Record<string, boolean>>({});
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [complement, setComplement] = useState<QualiPhotoItem | null>(null);
  const [isLoadingComplement, setIsLoadingComplement] = useState(false);
  const [item, setItem] = useState<QualiPhotoItem | null>(initialItem || null);
  const [isImagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isCommentModalVisible, setCommentModalVisible] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isActionsVisible, setActionsVisible] = useState(false);
  const [isComplementActionsVisible, setComplementActionsVisible] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('list');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSignatureModalVisible, setSignatureModalVisible] = useState(false);
  const [isDeclModalVisible, setDeclModalVisible] = useState(false);
  const [declLoading, setDeclLoading] = useState(false);
  const [declTypes, setDeclTypes] = useState<any[]>([]);
  const [declZones, setDeclZones] = useState<any[]>([]);
  const [declProjects, setDeclProjects] = useState<any[]>([]);
  const [declCompanyUsers, setDeclCompanyUsers] = useState<any[]>([]);
  const [declPrefill, setDeclPrefill] = useState<any | null>(null);
  const [isComparisonModalVisible, setComparisonModalVisible] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonDescription, setComparisonDescription] = useState<string | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Signature states
  const [signatures, setSignatures] = useState<{
    technicien: { signature: string } | null;
    control: { signature: string } | null;
    admin: { signature: string } | null;
  }>({
    technicien: null,
    control: null,
    admin: null,
  });
  const [, setIsLoadingSignatures] = useState(false);
  const [projectUsers, setProjectUsers] = useState<{ [key: string]: { firstname: string; lastname: string } }>({});

  useEffect(() => {
    setItem(initialItem || null);
    setSortOrder('desc'); // Reset sort order when item changes
    setActionsVisible(false);
    setComplementActionsVisible(false);
    setLayoutMode('list');
    setComplement(null);
    setSignatures({ technicien: null, control: null, admin: null });
  }, [initialItem]);

  const handleCompare = async (beforeUrl: string | null, afterUrl: string | null) => {
    if (!token || !beforeUrl || !afterUrl) {
      Alert.alert('Erreur', 'Les deux images sont requises pour la comparaison.');
      return;
    }
    setComparisonDescription(null);
    setComparisonError(null);
    setIsComparing(true);
    setComparisonModalVisible(true);
    try {
      const result = await qualiphotoService.compareImages(beforeUrl, afterUrl, token);
      setComparisonDescription(result.description);
    } catch (e: any) {
      setComparisonError(e?.message || "Une erreur est survenue lors de la comparaison des images.");
    } finally {
      setIsComparing(false);
    }
  };

  const loadSignatures = useCallback(async () => {
    if (!item || !token) return;
    setIsLoadingSignatures(true);
    try {
      const data = await qualiphotoService.getQualiPhotoSignatures(item.id, token);
      const newSignatures = {
        technicien: data.signatures.technicien ? { signature: '' } : null,
        control: data.signatures.control ? { signature: '' } : null,
        admin: data.signatures.admin ? { signature: '' } : null,
      };
      setSignatures(newSignatures);
    } catch (err) {
      console.error('Failed to load signatures:', err);
    } finally {
      setIsLoadingSignatures(false);
    }
  }, [item, token]);


  useEffect(() => {
    if (!token || !isDeclModalVisible) return;
    let cancelled = false;
    (async () => {
      try {
        const [types, zonesRes, projectsRes, users] = await Promise.all([
          declarationService.getDeclarationTypes(token!),
          declarationService.getZones(token!),
          declarationService.getCompanyProjects(token!),
          declarationService.getCompanyUsers(token!),
        ]);
        if (cancelled) return;
        setDeclTypes(types);
        setDeclZones(zonesRes);
        setDeclProjects(projectsRes);
        setDeclCompanyUsers(users);
      } catch {
        if (cancelled) return;
        setDeclTypes([]);
        setDeclZones([]);
        setDeclProjects([]);
        setDeclCompanyUsers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [token, isDeclModalVisible]);

  useEffect(() => {
    if (item && item.id && token) {
      if (item.id_qualiphoto_parent) {
        setIsLoadingComments(true);
        qualiphotoService.getComments(item.id, token)
          .then(setComments)
          .catch(() => setComments([]))
          .finally(() => setIsLoadingComments(false));
      } else {
        setComments([]);
      }

      if (!item.id_qualiphoto_parent) {
        setIsLoadingChildren(true);
        qualiphotoService.getChildren(item.id, token, sortOrder)
          .then(async (rows) => {
            setChildren(rows);
            // Fetch complements flags in background
            try {
              const entries = await Promise.all(rows.map(async (r) => {
                try {
                  const kids = await qualiphotoService.getChildren(r.id, token);
                  const comp = kids.find(c => !!c.photo_comp);
                  return [String(r.id), !!comp] as const;
                } catch {
                  return [String(r.id), false] as const;
                }
              }));
              const map: Record<string, boolean> = {};
              entries.forEach(([id, has]) => { map[id] = has; });
              setChildIdToHasComplement(map);
            } catch {
              setChildIdToHasComplement({});
            }
          })
          .catch(() => setChildren([]))
          .finally(() => setIsLoadingChildren(false));
      } else {
        setChildren([]);
        setChildIdToHasComplement({});
      }

      // If viewing a child, fetch its complementary photo (before=0, after=0)
      if (item.id_qualiphoto_parent) {
        setIsLoadingComplement(true);
        qualiphotoService.getChildren(item.id, token)
          .then((rows) => {
            const comp = rows.find(r => !!r.photo_comp);
            setComplement(comp || null);
          })
          .catch(() => setComplement(null))
          .finally(() => setIsLoadingComplement(false));
      } else {
        setComplement(null);
      }
      
      // Load signatures
      loadSignatures();

      // Load project users for signature display
      if (item.project_owner_id || item.project_control_id || item.project_technicien_id) {
        const userIds = [item.project_owner_id, item.project_control_id, item.project_technicien_id].filter(Boolean);
        Promise.all(userIds.map(async (userId) => {
          try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/users/${userId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined as any,
            });
            const data = await res.json();
            if (res.ok) {
              return { userId, firstname: data.firstname, lastname: data.lastname };
            }
            return null;
          } catch {
            return null;
          }
        })).then(results => {
          const usersMap: { [key: string]: { firstname: string; lastname: string } } = {};
          results.forEach(result => {
            if (result && result.userId) {
              usersMap[result.userId] = { firstname: result.firstname, lastname: result.lastname };
            }
          });
          setProjectUsers(usersMap);
        });
      }
    } else {
      setChildren([]);
      setComments([]);
      setComplement(null);
    }
  }, [item, token, sortOrder, loadSignatures]);

  const handleSignatureComplete = async (role: string, signature: string, email: string) => {
    if (!item || !token) return;
    try {
      await qualiphotoService.saveSignature({
        id_qualiphoto: item.id,
        signature_role: role as 'technicien' | 'control' | 'admin',
        signature,
      }, token);
      
      // Optimistic update
      setSignatures(prev => ({ ...prev, [role]: { signature } }));

      // Reload to confirm
      await loadSignatures();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save signature.');
    }
  };

  const subtitle = useMemo(() => {
    if (!item) return '';
    const project = item.project_title || '—';
    const zone = item.zone_title || '—';
    return `${project} • ${zone}`;
  }, [item]);

  async function playSound() {
    if (!item?.voice_note) return;

    if (isPlaying && sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
      return;
    }

    if (sound) {
      await sound.replayAsync();
      setIsPlaying(true);
      return;
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: item.voice_note });
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          newSound.setPositionAsync(0);
        }
      });

      await newSound.playAsync();
    } catch (err) {
      console.error("Failed to play sound", err);
    }
  }

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
      compSound?.unloadAsync();
    };
  }, [sound, compSound]);

  useEffect(() => {
    if (!visible) {
      sound?.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setImagePreviewVisible(false);
      setActionsVisible(false);
      setComplementActionsVisible(false);
    }
  }, [visible, sound]);

  const handleChildSuccess = (createdItem: Partial<QualiPhotoItem>) => {
    if (item && token && !item.id_qualiphoto_parent) {
      setIsLoadingChildren(true);
      qualiphotoService.getChildren(item.id, token, sortOrder)
        .then(setChildren)
        .catch(() => setChildren([]))
        .finally(() => setIsLoadingChildren(false));
    }
  };

  const handleComplementSuccess = (createdItem: Partial<QualiPhotoItem>) => {
    // Immediately reflect the newly created complementary item
    setComplement((prev) => ({ ...(prev || {}), ...(createdItem as any) }) as any);
    setComplementModalVisible(false);
  };

  const hasActionsOrDescription = useMemo(() => {
    if (!item) return false;
    const hasActions = item.voice_note || 
                       (item.latitude && item.longitude) || 
                       (!item.id_qualiphoto_parent && children.length > 0) || 
                       !!item.id_qualiphoto_parent;
    const hasDescription = typeof item.commentaire === 'string' && item.commentaire.trim().length > 0;
    return hasActions || hasDescription;
  }, [item, children]);

  const hasComplementActionsOrDescription = useMemo(() => {
    if (!complement) return false;
    const hasActions = complement.voice_note || (complement.latitude && complement.longitude);
    const hasDescription = typeof complement.commentaire === 'string' && complement.commentaire.trim().length > 0;
    return hasActions || hasDescription;
  }, [complement]);

  const handleMapPress = () => {
    if (!item?.latitude || !item.longitude) return;

    const url = Platform.select({
      ios: `maps:${item.latitude},${item.longitude}?q=${item.latitude},${item.longitude}`,
      android: `geo:${item.latitude},${item.longitude}?q=${item.latitude},${item.longitude}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert("Erreur", "Impossible d'ouvrir l'application de cartographie.");
      });
    }
  };

  const handleComplementMapPress = () => {
    if (!complement?.latitude || !complement.longitude) return;

    const url = Platform.select({
      ios: `maps:${complement.latitude},${complement.longitude}?q=${complement.latitude},${complement.longitude}`,
      android: `geo:${complement.latitude},${complement.longitude}?q=${complement.latitude},${complement.longitude}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert("Erreur", "Impossible d'ouvrir l'application de cartographie.");
      });
    }
  };

  // list/grid items rendered inline elsewhere

   const renderMapView = () => (
    <>
        <View style={styles.header}>
            <Pressable onPress={() => setMapDetailVisible(false)} style={styles.closeBtn}>
                <Ionicons name="arrow-back" size={24} color="#f87b1b" />
            </Pressable>
            <View style={styles.headerTitles}>
                <Text style={styles.title}>Localisation de la Photo</Text>
            </View>
            <View style={{ width: 40 }} />
        </View>
        <MapView
            style={{ flex: 1 }}
            initialRegion={{
                latitude: item!.latitude!,
                longitude: item!.longitude!,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }}
        >
            <Marker coordinate={{ latitude: item!.latitude!, longitude: item!.longitude! }} />
        </MapView>
    </>
   );

   const renderComplementMapView = () => (
    <>
        <View style={styles.header}>
            <Pressable onPress={() => setComplementMapVisible(false)} style={styles.closeBtn}>
                <Ionicons name="arrow-back" size={24} color="#f87b1b" />
            </Pressable>
            <View style={styles.headerTitles}>
                <Text style={styles.title}>Localisation de la Photo après</Text>
            </View>
            <View style={{ width: 40 }} />
        </View>
        <MapView
            style={{ flex: 1 }}
            initialRegion={{
                latitude: complement!.latitude!,
                longitude: complement!.longitude!,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }}
        >
            <Marker coordinate={{ latitude: complement!.latitude!, longitude: complement!.longitude! }} />
        </MapView>
    </>
   );

   const renderDetailView = () => {
    if (!item) return null;

    if (item?.id === initialItem?.id) {
      return (
        <ParentQualiPhotoView
          item={item}
          initialItem={initialItem}
          onClose={onClose}
          subtitle={subtitle}
          handleGeneratePdf={handleGeneratePdf}
          isGeneratingPdf={isGeneratingPdf}
          setSignatureModalVisible={setSignatureModalVisible}
          setImagePreviewVisible={setImagePreviewVisible}
          childPhotos={children}
          playSound={playSound}
          isPlaying={isPlaying}
          handleMapPress={handleMapPress}
          setCommentModalVisible={setCommentModalVisible}
          setComplementModalVisible={setComplementModalVisible}
          complement={complement}
          isLoadingComplement={isLoadingComplement}
          comments={comments}
          isLoadingComments={isLoadingComments}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          setChildModalVisible={setChildModalVisible}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          isLoadingChildren={isLoadingChildren}
          childIdToHasComplement={childIdToHasComplement}
          setItem={setItem}
        />
      );
    } else {
        const playComplementSound = async () => {
            if (!complement?.voice_note) return;
                                try {
                                  if (isPlayingComp && compSound) { await compSound.pauseAsync(); setIsPlayingComp(false); return; }
                                  if (compSound) { await compSound.playAsync(); setIsPlayingComp(true); return; }
                                  const { sound: newSound } = await Audio.Sound.createAsync({ uri: complement.voice_note! });
                                  setCompSound(newSound);
                                  setIsPlayingComp(true);
                                  newSound.setOnPlaybackStatusUpdate((status) => {
                                    if (status.isLoaded && status.didJustFinish) { setIsPlayingComp(false); newSound.setPositionAsync(0); }
                                  });
                                  await newSound.playAsync();
                                } catch {}
          };

          const deleteComplement = async () => {
                          if (!token || !complement?.id) return;
                          try {
                            await qualiphotoService.deleteComplementaire(complement.id, token);
                            setComplement(null);
                          } catch {
                            Alert.alert('Erreur', "Échec de la suppression de la photo complémentaire.");
                          }
          }
                        return (
        <ChildQualiPhotoView
            item={item}
            initialItem={initialItem || null}
            setItem={setItem}
            subtitle={subtitle}
            setEditPlanVisible={setEditPlanVisible}
            setImagePreviewVisible={setImagePreviewVisible}
            hasActionsOrDescription={!!hasActionsOrDescription}
            isActionsVisible={isActionsVisible}
            setActionsVisible={setActionsVisible}
            playSound={playSound}
            isPlaying={isPlaying}
            handleMapPress={handleMapPress}
            setCommentModalVisible={setCommentModalVisible}
            setDeclPrefill={setDeclPrefill}
            setDeclModalVisible={setDeclModalVisible}
            comments={comments}
            isLoadingComments={isLoadingComments}
            complement={complement}
            isLoadingComplement={isLoadingComplement}
            handleCompare={handleCompare}
            deleteComplement={deleteComplement}
            setPreviewImageUri={setPreviewImageUri}
            hasComplementActionsOrDescription={!!hasComplementActionsOrDescription}
            isComplementActionsVisible={isComplementActionsVisible}
            setComplementActionsVisible={setComplementActionsVisible}
            playComplementSound={playComplementSound}
            isPlayingComp={isPlayingComp}
            handleComplementMapPress={handleComplementMapPress}
            setComplementModalVisible={setComplementModalVisible}
        />
      );
    }
  };
   const handleGeneratePdf = async () => {
    if (!item || !token) return;
    setIsGeneratingPdf(true);
    try {
        const { fileUrl } = await qualiphotoService.generatePdf(item.id, token);
        const absoluteUrl = `${API_CONFIG.BASE_URL}${fileUrl}`;
        
        // Check if linking is supported
        const supported = await Linking.canOpenURL(absoluteUrl);
        if (supported) {
            await Linking.openURL(absoluteUrl);
        } else {
            Alert.alert('Erreur', `Impossible d'ouvrir l'URL: ${absoluteUrl}`);
        }
        } catch (err) {
        console.error("PDF Generation Error", err);
        Alert.alert('Erreur', 'Échec de la génération du PDF.');
    } finally {
        setIsGeneratingPdf(false);
    }
   };

   const handleAddComment = async () => {
    if (!item || !token || !newComment.trim()) {
      Alert.alert('Erreur', 'Le commentaire ne peut pas être vide.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      await qualiphotoService.addComment(item.id, newComment, token);
      
      // Refetch comments
      const updatedComments = await qualiphotoService.getComments(item.id, token);
      setComments(updatedComments);

      setCommentModalVisible(false);
      setNewComment('');
      Alert.alert('Succès', 'Commentaire ajouté avec succès.');
    } catch (error) {
      console.error('Failed to add comment:', error);
      Alert.alert('Erreur', 'Échec de l\'ajout du commentaire.');
    } finally {
      setIsSubmittingComment(false);
    }
   };

   const renderCommentModal = () => (
    <Modal
      visible={isCommentModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setCommentModalVisible(false)}
    >
      <View style={styles.commentModalContainer}>
        <View style={styles.commentModalContent}>
          <Text style={styles.commentModalTitle}>Ajouter un Commentaire</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Saisissez votre commentaire..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <View style={styles.commentModalActions}>
            <TouchableOpacity
              style={styles.commentModalButton}
              onPress={() => setCommentModalVisible(false)}
            >
              <Text style={styles.commentModalButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.commentModalButton, styles.commentModalSaveButton]}
              onPress={handleAddComment}
              disabled={isSubmittingComment}
            >
              {isSubmittingComment ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.commentModalButtonText, { color: '#fff' }]}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderImagePreview = () => {
    const uri = previewImageUri || (item && item.photo) || null;
    if (!uri) return null;
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri }} style={styles.previewImage} resizeMode="contain" />
        <TouchableOpacity
          style={[styles.previewCloseButton, { top: insets.top + 10 }]}
          onPress={() => { setImagePreviewVisible(false); setPreviewImageUri(null); }}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSignatureModal = () => (
    <Modal
      visible={isSignatureModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setSignatureModalVisible(false)}
    >
      <View style={styles.signatureModalContainer}>
        <View style={styles.signatureModalContent}>
          <View style={styles.signatureModalHeader}>
            <Pressable onPress={() => setSignatureModalVisible(false)}>
              <Ionicons name="close" size={28} color="#11224e" />
            </Pressable>
            <Text style={styles.title}>Signatures</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.signatureFieldsContainer}>
            <SignatureFieldQualiphoto
              role="technicien"
              roleLabel="Technicien"
              onSignatureComplete={handleSignatureComplete}
              isCompleted={!!signatures.technicien}
              disabled={!!signatures.technicien || String(user?.id) !== String(item?.project_technicien_id)}
              signerName={item?.project_technicien_id && projectUsers[item.project_technicien_id] ? `${projectUsers[item.project_technicien_id].firstname} ${projectUsers[item.project_technicien_id].lastname}`.trim() : undefined}
            />
            <SignatureFieldQualiphoto
              role="control"
              roleLabel="Contrôle"
              onSignatureComplete={handleSignatureComplete}
              isCompleted={!!signatures.control}
              disabled={!!signatures.control || String(user?.id) !== String(item?.project_control_id)}
              signerName={item?.project_control_id && projectUsers[item.project_control_id] ? `${projectUsers[item.project_control_id].firstname} ${projectUsers[item.project_control_id].lastname}`.trim() : undefined}
            />
            <SignatureFieldQualiphoto
              role="admin"
              roleLabel="Admin"
              onSignatureComplete={handleSignatureComplete}
              isCompleted={!!signatures.admin}
              disabled={!!signatures.admin || String(user?.id) !== String(item?.project_owner_id)}
              signerName={item?.project_owner_id && projectUsers[item.project_owner_id] ? `${projectUsers[item.project_owner_id].firstname} ${projectUsers[item.project_owner_id].lastname}`.trim() : undefined}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

   return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppHeader user={user || undefined} onNavigate={onClose} />
        {isImagePreviewVisible ? (
          renderImagePreview()
        ) : item && isChildModalVisible ? (
          <CreateChildQualiPhotoForm
            parentItem={item}
            onSuccess={handleChildSuccess}
            onClose={() => setChildModalVisible(false)}
          />
        ) : isMapDetailVisible ? (
          renderMapView()
        ) : isComplementMapVisible ? (
          renderComplementMapView()
        ) : (
          renderDetailView()
        )}
        <CreateDeclarationModal
          visible={isDeclModalVisible}
          onClose={() => setDeclModalVisible(false)}
          onSubmit={async (data) => {
            if (!token) return;
            try {
              setDeclLoading(true);
              await declarationService.createDeclaration(data, token);
              setDeclModalVisible(false);
            } finally {
              setDeclLoading(false);
            }
          }}
          declarationTypes={declTypes}
          zones={declZones}
          projects={declProjects}
          companyUsers={declCompanyUsers}
          currentUser={{
            id: user?.id || '',
            firstname: user?.firstname || '',
            lastname: user?.lastname || '',
            email: user?.email || '',
          }}
          isLoading={declLoading}
          prefill={declPrefill || undefined}
        />
        {item && item.id_qualiphoto_parent && (
          <CreateComplementaireQualiPhotoModal
            visible={isComplementModalVisible}
            onClose={() => setComplementModalVisible(false)}
            onSuccess={handleComplementSuccess}
            childItem={item}
            parentTitle={initialItem?.title || initialItem?.project_title || undefined}
          />
        )}
        {item && isEditPlanVisible && (
          <Modal
            animationType="fade"
            visible={isEditPlanVisible}
            onRequestClose={() => setEditPlanVisible(false)}
          >
            <ZonePictureEditor
              baseImageUri={item.photo_plan || null}
              onClose={() => setEditPlanVisible(false)}
              onSaved={(res) => {
                // update current item with new photo_plan and refresh children list
                setItem(prev => (prev ? ({ ...prev, photo_plan: res.uri } as any) : prev));
                setEditPlanVisible(false);
              }}
              title="Éditer le plan de zone"
            />
          </Modal>
        )}
        {renderCommentModal()}
        {renderSignatureModal()}
      </View>
      <ComparisonModal
        visible={isComparisonModalVisible}
        onClose={() => setComparisonModalVisible(false)}
        isLoading={isComparing}
        description={comparisonDescription}
        error={comparisonError}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerActionIcon: {
    width: 40,
    height: 40,
  },
  headerPlanIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#f87b1b',
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
  scrollContent: {},
  content: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  staticContent: {
    gap: 12,
  },
  imageWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f87b1b',
    overflow: 'hidden',
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
  inlineActionsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#f87b1b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 16/9,
    backgroundColor: '#f3f4f6'
  },
  metaCard: {
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
  metaRow: {
    marginBottom: 10,
    borderTopWidth: 1,
    borderColor: '#f87b1b',
    paddingTop: 10,
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
  metaMuted: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  metaMultiline: {
    lineHeight: 20,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactImage: {
    width: 110,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f87b1b',
    overflow: 'hidden',
  },
  compactRight: {
    flex: 1,
    gap: 6,
  },
  compactAudio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactAudioText: {
    color: '#11224e',
    fontWeight: '600',
  },
  compactDescription: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  compImageLine: {
    marginBottom: 8,
  },
  compImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 16/9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f87b1b',
  },
  compRowBelow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compDescriptionFull: {
    flex: 1,
    color: '#0f172a',
    fontSize: 13,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  playButton: {
    // styles for the play button
  },
  playerMeta: {
    flex: 1,
  },
  playerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  playerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  mapPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  addChildButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#11224e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addChildButtonTextView: {
    flex: 1,
  },
  addChildButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  childListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f87b1b',
    marginBottom: 8,

  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  childListContainer: {
    marginTop: 8,
    gap: 12,
  },
  childItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  childThumbnail: {
    width: '100%',
    aspectRatio: 16/9,
    backgroundColor: '#f3f4f6',
  },
  childItemContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  childComment: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'right',
  },
  childDate: {
    fontSize: 11,
    color: '#6b7280',
    marginRight: 8,
  },
  complementaireContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderColor: '#f87b1b',
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  compareButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f87b1b',
  },
  childGridItem: {
    width: '49%',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  childGridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    gap: 2,
  },
  childGridTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  childGridDate: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  eyeIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 4,
  },
  noChildrenText: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 16,
    fontSize: 13,
  },
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
  inlineMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  inlineMetaItem: {
    flex: 1,
  },
  borderedMetaRow: {
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    paddingTop: 10,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewCloseButton: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
  },
  commentModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: '#f87b1b',
  },
  commentModalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  commentInput: {
    width: '100%',
    height: 100,
    borderColor: '#f87b1b',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    textAlignVertical: 'top',
  },
  commentModalActions: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-between',
    width: '100%',
  },
  commentModalButton: {
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  commentModalSaveButton: {
    backgroundColor: '#f87b1b',
  },
  commentModalButtonText: {
    fontSize: 16,
  },
  hiddenImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f87b1b',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  hiddenImageText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  hiddenImageSubText: {
    marginTop: 4,
    color: '#9ca3af',
    fontSize: 12,
  },
  childListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  cameraCTAContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  sortButton: {
    width: 40, // Adjusted for symmetry
    height: 40, // Adjusted for symmetry
    justifyContent: 'center',
    alignItems: 'center',
  },
  layoutToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f87b1b',
    overflow: 'hidden',
    width: 80, // Fixed width for two buttons
    height: 40,
  },
  layoutToggleButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  layoutToggleButtonActive: {
    backgroundColor: '#f87b1b',
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f87b1b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  childList: {
    marginTop: 8,
  },
  childListColumnWrapper: {
    justifyContent: 'space-between',
  },
  childGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  childPicturesContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: '#f87b1b',
    marginVertical: 16,
    marginHorizontal: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f87b1b',
  },
  signatureFieldsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  signatureModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  signatureModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40, // for safe area
  },
  signatureModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
});


