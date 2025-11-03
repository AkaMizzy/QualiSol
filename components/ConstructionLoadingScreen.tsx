import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


interface ConstructionLoadingScreenProps {
  onLoadingComplete: () => void;
  duration?: number; // Duration in milliseconds, default 3000ms (3 seconds)
}

export default function ConstructionLoadingScreen({ 
  onLoadingComplete, 
  duration = 2000 
}: ConstructionLoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min((elapsed / duration) * 100, 100);
      setProgress(progressPercent);

      if (elapsed >= duration) {
        clearInterval(interval);
        onLoadingComplete();
      }
    }, 50); // Update every 50ms for smooth animation

    return () => clearInterval(interval);
  }, [duration, onLoadingComplete]);

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.content}>
        {/* Construction GIF */}
        <View style={styles.gifContainer}>
          <Image
            source={require('../assets/icons/construction.gif')}
            style={styles.constructionGif}
            contentFit="contain"
          />
        </View>

        {/* Loading Text */}
        <Text style={styles.loadingText}>Loading Qualisol...</Text>
        <Text style={styles.subText}>Preparation de votre espace de travail</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  logoContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
  logo: {
    width: 80,
    height: 80,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  gifContainer: {
    width: 200,
    height: 200,
    marginBottom: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  constructionGif: {
    width: '90%',
    height: '90%',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});
