import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, SafeAreaView } from 'react-native';
import { STAGES } from './src/constants/stages';

export default function AddNewJokeScreen({ onAddJoke, onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedStage, setSelectedStage] = useState('Ideas');

  const handleAddJoke = () => {
    if (title.trim() && content.trim()) {
      onAddJoke({
        id: Date.now().toString(),
        title,
        content,
        stage: selectedStage,
        date: new Date().toLocaleDateString(),
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButtonTap}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Joke</Text>
        <View style={{ width: 20 }} />
      </View>

      {/* Form */}
      <ScrollView style={styles.form}>
        {/* Title Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter the title of your joke"
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Content Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={[styles.input, styles.contentInput]}
            placeholder="Write your joke here..."
            placeholderTextColor="#666"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={8}
          />
          <Text style={styles.charCount}>{content.length}/2000 characters</Text>
        </View>

        {/* Stage Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Stage</Text>
          <Text style={styles.stageDescription}>Choose which stage this joke should start in:</Text>
          <View style={styles.stageGrid}>
            {STAGES.map((stage) => (
              <TouchableOpacity
                key={stage}
                onPress={() => setSelectedStage(stage)}
                style={[
                  styles.stageButton,
                  selectedStage === stage && styles.stageButtonSelected,
                ]}
              >
                <Text style={styles.stageButtonText}>{stage}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          onPress={handleAddJoke}
          style={[styles.addButton, (!title.trim() || !content.trim()) && styles.addButtonDisabled]}
          disabled={!title.trim() || !content.trim()}
        >
          <Text style={styles.addButtonText}>Add Joke</Text>
        </TouchableOpacity>
      </ScrollView>
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
  form: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  contentInput: {
    textAlignVertical: 'top',
    minHeight: 120,
  },
  charCount: {
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  stageDescription: {
    color: '#999',
    fontSize: 12,
    marginBottom: 12,
  },
  stageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 6,
    backgroundColor: '#333',
  },
  stageButtonSelected: {
    borderColor: '#fff',
    backgroundColor: '#444',
  },
  stageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 32,
  },
  addButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
