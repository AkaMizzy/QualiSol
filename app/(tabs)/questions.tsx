import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { getAllFolderTypes } from '@/services/folderTypeService';
import { getQuestionTypesByFolder, QuestionType } from '@/services/questionTypeService';

const QuestionTypeCard = ({ item }: { item: QuestionType }) => (
  <View style={styles.card}>
    <View style={styles.cardIcon}>
      <Ionicons name="help-circle-outline" size={24} color="#f87b1b" />
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
      <View style={styles.cardFooter}>
        <Ionicons name="pricetag-outline" size={14} color="#f87b1b" />
        <Text style={styles.cardType}>{item.type}</Text>
      </View>
    </View>
  </View>
);

export default function QuestionsScreen() {
  const { token, user } = useAuth();
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const folderTypes = await getAllFolderTypes(token);
      const testFolderType = folderTypes.find((ft) => ft.title === 'Test');

      if (testFolderType) {
        const questions = await getQuestionTypesByFolder(testFolderType.id, token);
        setQuestionTypes(questions);
      } else {
        setError('Le type de dossier "Test" est introuvable.');
      }
    } catch (err) {
      setError('Impossible de charger les questions.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#11224e" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader user={user || undefined} />
      <FlatList
        data={questionTypes}
        renderItem={({ item }) => <QuestionTypeCard item={item} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Aucune question trouvée.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#11224e',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  grid: {
    padding: 8,
  },
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#11224e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f87b1b',
    minHeight: 150,
    justifyContent: 'space-between',
  },
  cardIcon: {
    alignSelf: 'flex-start',
    backgroundColor: '#f87b1b1a',
    borderRadius: 9999,
    padding: 8,
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11224e',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 8,
  },
  cardType: {
    fontSize: 12,
    color: '#f87b1b',
    marginLeft: 4,
    textTransform: 'capitalize',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
