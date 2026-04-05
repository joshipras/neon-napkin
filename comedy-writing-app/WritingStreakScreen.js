import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

export default function WritingStreakScreen({ onClose }) {
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'short' });
  const dateFull = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButtonTap}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Writing Streak</Text>
        <View style={{ width: 20 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.titleEmoji}>🔥</Text>
          <Text style={styles.titleText}>Writing Streak</Text>
          <Text style={styles.subtitle}>Track your comedy writing journey</Text>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakNumber}>1</Text>
          <Text style={styles.streakLabel}>DAY</Text>
          <Text style={styles.streakMessage}>Great start! Keep the momentum going! 🚀</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>1</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Total Days</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>1</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        {/* Streak Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>Streak Details</Text>
          <Text style={styles.detailsText}>Last written: {dateFull}</Text>
          <Text style={styles.detailsText}>Keep writing every day to maintain your streak!</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButtonTap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    color: '#2196F3',
    fontSize: 32,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  titleEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  titleText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#999',
    fontSize: 14,
  },
  streakCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  streakEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  streakNumber: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '700',
  },
  streakLabel: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
  streakMessage: {
    color: '#999',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  statBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 24,
    minWidth: 140,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  detailsSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    width: '100%',
  },
  detailsTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailsText: {
    color: '#999',
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 18,
  },
});
