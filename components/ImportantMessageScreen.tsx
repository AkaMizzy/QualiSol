import React from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions, ScrollView, SafeAreaView, Text } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { Ionicons } from '@expo/vector-icons';

interface ImportantMessageScreenProps {
  content: string;
  onClose: () => void;
}

export default function ImportantMessageScreen({ content, onClose }: ImportantMessageScreenProps) {
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Message Important</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.contentContainer}>
          <RenderHtml
            contentWidth={width - 32}
            source={{ html: content }}
            baseStyle={{
              fontSize: 14,
              color: "#11224e",
              textAlign: "center",
            }}
            defaultTextProps={{ selectable: true }}
            tagsStyles={{
              b: { fontWeight: "bold", color: "#FFFFFF" },
              strong: { fontWeight: "bold", color: "#FFFFFF" },
              u: { textDecorationLine: "underline" },
              i: { fontStyle: "italic" },
              em: { fontStyle: "italic" },
              h1: {
                fontSize: 17,
                fontWeight: "bold",
                color: "#FFFFFF",
                marginBottom: 4,
              },
              h2: {
                fontSize: 15,
                fontWeight: "bold",
                color: "#f87b1b",
                marginBottom: 2,
              },
              h3: {
                fontSize: 14,
                fontWeight: "600",
                color: "#CCCCCC",
                marginBottom: 2,
              },
            }}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
});
