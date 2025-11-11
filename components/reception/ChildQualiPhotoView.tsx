import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ICONS } from '@/constants/Icons';
import { Comment, QualiPhotoItem } from '@/services/qualiphotoService';
import { PhotoActions } from './PhotoActions';
import { PhotoCard } from './PhotoCard';

const cameraIcon = require('@/assets/icons/camera.gif');

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

function MetaRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, multiline && styles.metaMultiline]}>{value}</Text>
    </View>
  );
}

type ChildQualiPhotoViewProps = {
    item: QualiPhotoItem;
    initialItem: QualiPhotoItem | null | undefined;
    setItem: (item: QualiPhotoItem | null) => void;
    subtitle: string;
    setEditPlanVisible: (visible: boolean) => void;
    setImagePreviewVisible: (visible: boolean) => void;
    hasActionsOrDescription: boolean;
    isActionsVisible: boolean;
    setActionsVisible: React.Dispatch<React.SetStateAction<boolean>>;
    playSound: () => void;
    isPlaying: boolean;
    handleMapPress: () => void;
    setCommentModalVisible: (visible: boolean) => void;
    setDeclPrefill: (prefill: any) => void;
    setDeclModalVisible: (visible: boolean) => void;
    comments: Comment[];
    isLoadingComments: boolean;
    complement: QualiPhotoItem | null;
    isLoadingComplement: boolean;
    handleCompare: (beforeUrl: string | null, afterUrl: string | null) => void;
    deleteComplement: () => void;
    setPreviewImageUri: (uri: string | null) => void;
    hasComplementActionsOrDescription: boolean;
    isComplementActionsVisible: boolean;
    setComplementActionsVisible: React.Dispatch<React.SetStateAction<boolean>>;
    playComplementSound: () => void;
    isPlayingComp: boolean;
    handleComplementMapPress: () => void;
    setComplementModalVisible: (visible: boolean) => void;
  };

export const ChildQualiPhotoView: React.FC<ChildQualiPhotoViewProps> = ({
    item,
    initialItem,
    setItem,
    subtitle,
    setEditPlanVisible,
    setImagePreviewVisible,
    hasActionsOrDescription,
    isActionsVisible,
    setActionsVisible,
    playSound,
    isPlaying,
    handleMapPress,
    setCommentModalVisible,
    setDeclPrefill,
    setDeclModalVisible,
    comments,
    isLoadingComments,
    complement,
    isLoadingComplement,
    handleCompare,
    deleteComplement,
    setPreviewImageUri,
    hasComplementActionsOrDescription,
    isComplementActionsVisible,
    setComplementActionsVisible,
    playComplementSound,
    isPlayingComp,
    handleComplementMapPress,
    setComplementModalVisible,
}) => {

    const header = (
        <View style={styles.header}>
          {item?.id_qualiphoto_parent ? (
            <Pressable onPress={() => setItem(initialItem || null)} style={styles.closeBtn}>
              <Ionicons name="arrow-back" size={28} color="#f87b1b" />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer les détails"
              onPress={() => {}}
              style={styles.closeBtn}
            >
              <Ionicons name="arrow-back" size={28} color="#f87b1b" />
            </Pressable>
          )}
          <View style={styles.headerTitles}>
          {!!item?.title && <Text style={styles.title}>{item.title}</Text>}
          {!!item && <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>}
          {!!item?.date_taken && <Text style={styles.subtitle}>{formatDate(item.date_taken)}</Text>}
          </View>
          <View style={styles.headerActionsContainer}>
            {item?.id_qualiphoto_parent && (
              <TouchableOpacity style={styles.headerAction} onPress={() => setEditPlanVisible(true)} accessibilityLabel="Éditer le plan de zone">
                  <Image 
                    source={item.photo_plan ? { uri: item.photo_plan } : require('@/assets/icons/plan.png')} 
                    style={[styles.headerPlanIcon]} 
                  />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    return(
        <>
          {header}
          <ScrollView bounces>
            <View style={styles.content}>

              <View>
                <Text style={styles.sectionTitle}>Situation avant</Text>
                {item.photo ? (
                  <PhotoCard
                    uri={item.photo}
                    title={item.title}
                    userName={item.user_name}
                    userLastName={item.user_lastname}
                    date={item.date_taken}
                    onPress={() => setImagePreviewVisible(true)}
                    onToggleActions={() => setActionsVisible(v => !v)}
                    isActionsVisible={isActionsVisible}
                  />
                ) : (
                  hasActionsOrDescription ? (
                    <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                      <TouchableOpacity
                        style={styles.inlineActionsButton}
                        onPress={() => setActionsVisible(v => !v)}
                        accessibilityLabel={isActionsVisible ? 'Masquer les actions' : 'Afficher les actions'}
                      >
                        <Ionicons name={isActionsVisible ? 'close' : 'ellipsis-horizontal'} size={20} color="#11224e" />
                      </TouchableOpacity>
                    </View>
                  ) : null
                )}
              </View>

              {isActionsVisible && (
                <>
                  <PhotoActions
                    item={item}
                    isPlaying={isPlaying}
                    onPlaySound={playSound}
                    onMapPress={handleMapPress}
                    onAddComment={() => setCommentModalVisible(true)}
                    onCreateDeclaration={() => {
                        const isAbsolute = typeof item.photo === 'string' && /^(https?:)?\/\//.test(item.photo);
                        const prefillPhoto = isAbsolute
                          ? { photoUri: item.photo }
                          : { photoPath: (item as any).photo_path || item.photo };
                        setDeclPrefill({
                          id_zone: (item as any).id_zone,
                          id_project: (item as any).id_project,
                          latitude: (item as any).latitude,
                          longitude: (item as any).longitude,
                          title: initialItem?.title || '',
                          description: initialItem?.commentaire || '',
                          disableFields: true,
                          ...prefillPhoto,
                        });
                        setDeclModalVisible(true);
                      }}
                  />
                  {(typeof item.commentaire === 'string' && item.commentaire.trim().length > 0) ? (
                    <View style={styles.metaCard}>
                      {typeof item.commentaire === 'string' && item.commentaire.trim().length > 0 ? (
                        <View style={[styles.metaRow, { borderTopWidth: 0, paddingTop: 0 }]}>
                          <Text style={styles.metaLabel}>Description</Text>
                          <Text style={[styles.metaValue, styles.metaMultiline]}>{item.commentaire}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </>
              )}

              <View>
                <View style={styles.sectionHeaderRow}>
                  {complement ? <Text style={styles.sectionTitle}>Situation après</Text> : <View />}
                  {complement && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={deleteComplement}
                        accessibilityLabel="Supprimer la photo complémentaire"
                        style={{ marginLeft: 12 }}
                      >
                        <Ionicons name="trash-outline" size={22} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                {isLoadingComplement ? (
                  <ActivityIndicator style={{ marginVertical: 12 }} />
                ) : complement ? (
                  <>
                    <PhotoCard
                        uri={complement.photo_comp || complement.photo}
                        title={complement.title}
                        userName={complement.user_name}
                        userLastName={complement.user_lastname}
                        date={complement.date_taken}
                        onPress={() => {
                            const compUri = complement.photo_comp || complement.photo;
                            if (compUri) {
                                setPreviewImageUri(compUri);
                                setImagePreviewVisible(true);
                            }
                        }}
                        onToggleActions={() => setComplementActionsVisible(v => !v)}
                        isActionsVisible={isComplementActionsVisible}
                    />
                    {isComplementActionsVisible && (
                      <>
                        {(complement.voice_note || (complement.latitude && complement.longitude)) && (
                          <View style={[styles.actionsContainer, { marginBottom: 8 }]}>
                            {complement.voice_note && (
                              <TouchableOpacity style={styles.actionButton} onPress={playComplementSound}>
                                <Ionicons name={isPlayingComp ? 'pause-circle' : 'play-circle'} size={32} color="#11224e" />
                              </TouchableOpacity>
                            )}
                            {complement.latitude && complement.longitude && (
                              <TouchableOpacity style={styles.actionButton} onPress={handleComplementMapPress}>
                                <Image source={ICONS.map} style={styles.actionIcon} />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                        {(complement.user_name || (typeof complement.commentaire === 'string' && complement.commentaire.trim().length > 0)) ? (
                          <View style={styles.metaCard}>
                            {typeof complement.commentaire === 'string' && complement.commentaire.trim().length > 0 ? (
                              <View style={[styles.metaRow, complement.user_name ? { borderTopWidth: 0, paddingTop: 0 } : null]}>
                                <Text style={styles.metaLabel}>Description</Text>
                                <Text style={[styles.metaValue, styles.metaMultiline]}>{complement.commentaire}</Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </>
                    )}
                  </>
                ) : (
                  <View style={{ alignItems: 'center', marginVertical: 16 }}>
                    <TouchableOpacity
                      onPress={() => setComplementModalVisible(true)}
                      accessibilityLabel="Ajouter une photo complémentaire"
                      style={styles.cameraCTA}
                    >
                      <Image source={cameraIcon} style={styles.cameraCTAIcon} />
                      <Text style={styles.cameraCTALabel}>Prendre la situation après</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {!!item.id_qualiphoto_parent && (comments.length > 0 || isLoadingComments) && (
                <View style={styles.metaCard}>
                  <Text style={styles.sectionTitle}>Commentaires</Text>
                  {isLoadingComments && <ActivityIndicator style={{ marginVertical: 16 }} />}
                  {comments.map((comment) => (
                    <MetaRow
                      key={comment.id}
                      label={`De ${comment.user_name || 'Utilisateur'} le ${formatDate(comment.created_at)}`}
                      value={comment.commentaire_text}
                      multiline
                    />
                  ))}
                </View>
              )}

            </View>
          </ScrollView>
        </>
      );
}

const styles = StyleSheet.create({
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
      content: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 24,
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
      metaMultiline: {
        lineHeight: 20,
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
});
