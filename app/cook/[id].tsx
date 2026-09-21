import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as repo from '../../src/storage/recipeRepo';
import type { Recipe } from '../../src/domain/types';
import { useCookingStore } from '../../src/store/cookingStore';
import { useTheme, space, type ThemeColors } from '../../src/ui/theme';

export default function CookingModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toggleStep = useCookingStore((s) => s.toggleStep);
  const checkedSteps = useCookingStore((s) => s.checkedSteps[id || ''] || new Set());
  
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [mainTimer, setMainTimer] = useState(0);
  const [isMainTimerRunning, setIsMainTimerRunning] = useState(false);
  const [stepTimer, setStepTimer] = useState(0);
  const [isStepTimerRunning, setIsStepTimerRunning] = useState(false);

  // Keep screen awake while in cooking mode
  useEffect(() => {
    void activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const r = id ? await repo.getRecipe(id) : null;
        if (!alive) return;
        setRecipe(r);
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [id])
  );

  // Main timer effect
  useEffect(() => {
    if (!isMainTimerRunning) return;
    const interval = setInterval(() => {
      setMainTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isMainTimerRunning]);

  // Step timer effect
  useEffect(() => {
    if (!isStepTimerRunning) return;
    const interval = setInterval(() => {
      setStepTimer((t) => {
        if (t <= 0) {
          setIsStepTimerRunning(false);
          Alert.alert('Timer complete!', 'Step timer finished.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isStepTimerRunning]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const setStepTimerMinutes = (minutes: number) => {
    setStepTimer(minutes * 60);
    setIsStepTimerRunning(true);
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  }

  if (!recipe || recipe.steps.length === 0) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>No steps available</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const sortedSteps = recipe.steps.slice().sort((a, b) => a.order - b.order);
  const currentStep = sortedSteps[currentStepIndex];
  const isCurrentStepChecked = currentStep ? checkedSteps.has(currentStep.id) : false;

  const goNext = () => {
    if (currentStepIndex < sortedSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setStepTimer(0);
      setIsStepTimerRunning(false);
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setStepTimer(0);
      setIsStepTimerRunning(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: `Cook: ${recipe.title}` }} />
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Main Timer */}
          <View style={styles.mainTimerCard}>
            <Text style={styles.mainTimerLabel}>Total Time</Text>
            <Text style={styles.mainTimerTime}>{formatTime(mainTimer)}</Text>
            <View style={styles.mainTimerButtons}>
              {!isMainTimerRunning ? (
                <Pressable
                  style={styles.timerBtn}
                  onPress={() => setIsMainTimerRunning(true)}
                >
                  <Text style={styles.timerBtnText}>Start</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.timerBtn}
                  onPress={() => setIsMainTimerRunning(false)}
                >
                  <Text style={styles.timerBtnText}>Pause</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.timerBtn}
                onPress={() => {
                  setMainTimer(0);
                  setIsMainTimerRunning(false);
                }}
              >
                <Text style={styles.timerBtnText}>Reset</Text>
              </Pressable>
            </View>
          </View>

          {/* Step Progress */}
          <Text style={styles.progressText}>
            Step {currentStepIndex + 1} of {sortedSteps.length}
          </Text>

          {/* Current Step */}
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNumber}>{currentStepIndex + 1}</Text>
              <Pressable
                style={styles.stepCheckbox}
                onPress={() => toggleStep(recipe.id, currentStep.id)}
              >
                {isCurrentStepChecked ? (
                  <View style={styles.stepCheckboxInner} />
                ) : null}
              </Pressable>
            </View>
            <Text style={styles.stepText}>{currentStep.text}</Text>
          </View>

          {/* Step Timer */}
          <View style={styles.stepTimerCard}>
            <Text style={styles.stepTimerLabel}>Step Timer</Text>
            <Text style={styles.stepTimerTime}>{formatTime(stepTimer)}</Text>
            <View style={styles.stepTimerButtons}>
              {stepTimer === 0 ? (
                <>
                  <Pressable
                    style={styles.quickTimerBtn}
                    onPress={() => setStepTimerMinutes(5)}
                  >
                    <Text style={styles.quickTimerText}>5m</Text>
                  </Pressable>
                  <Pressable
                    style={styles.quickTimerBtn}
                    onPress={() => setStepTimerMinutes(10)}
                  >
                    <Text style={styles.quickTimerText}>10m</Text>
                  </Pressable>
                  <Pressable
                    style={styles.quickTimerBtn}
                    onPress={() => setStepTimerMinutes(15)}
                  >
                    <Text style={styles.quickTimerText}>15m</Text>
                  </Pressable>
                  <Pressable
                    style={styles.quickTimerBtn}
                    onPress={() => setStepTimerMinutes(30)}
                  >
                    <Text style={styles.quickTimerText}>30m</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {!isStepTimerRunning ? (
                    <Pressable
                      style={styles.timerBtn}
                      onPress={() => setIsStepTimerRunning(true)}
                    >
                      <Text style={styles.timerBtnText}>Start</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.timerBtn}
                      onPress={() => setIsStepTimerRunning(false)}
                    >
                      <Text style={styles.timerBtnText}>Pause</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.timerBtn}
                    onPress={() => {
                      setStepTimer(0);
                      setIsStepTimerRunning(false);
                    }}
                  >
                    <Text style={styles.timerBtnText}>Reset</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <Pressable
              style={StyleSheet.flatten([
                styles.navBtn,
                currentStepIndex === 0 && styles.navBtnDisabled,
              ])}
              onPress={goPrev}
              disabled={currentStepIndex === 0}
            >
              <Text
                style={StyleSheet.flatten([
                  styles.navBtnText,
                  currentStepIndex === 0 && styles.navBtnTextDisabled,
                ])}
              >
                Previous
              </Text>
            </Pressable>
            <Pressable
              style={StyleSheet.flatten([
                styles.navBtn,
                currentStepIndex === sortedSteps.length - 1 && styles.navBtnDisabled,
              ])}
              onPress={goNext}
              disabled={currentStepIndex === sortedSteps.length - 1}
            >
              <Text
                style={StyleSheet.flatten([
                  styles.navBtnText,
                  currentStepIndex === sortedSteps.length - 1 && styles.navBtnTextDisabled,
                ])}
              >
                Next
              </Text>
            </Pressable>
          </View>

          {/* All Steps Overview */}
          <View style={styles.overviewCard}>
            <Text style={styles.overviewTitle}>All Steps</Text>
            {sortedSteps.map((step, idx) => {
              const isChecked = checkedSteps.has(step.id);
              const isCurrent = idx === currentStepIndex;
              return (
                <Pressable
                  key={step.id}
                  style={StyleSheet.flatten([
                    styles.overviewStep,
                    isCurrent && styles.overviewStepCurrent,
                  ])}
                  onPress={() => setCurrentStepIndex(idx)}
                >
                  <Text
                    style={StyleSheet.flatten([
                      styles.overviewStepNum,
                      isCurrent && styles.overviewStepNumCurrent,
                    ])}
                  >
                    {idx + 1}
                  </Text>
                  <Text
                    style={StyleSheet.flatten([
                      styles.overviewStepText,
                      isChecked && styles.overviewStepTextChecked,
                      isCurrent && styles.overviewStepTextCurrent,
                    ])}
                    numberOfLines={2}
                  >
                    {step.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: space.md, paddingBottom: space.xl },
    missing: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.md,
      backgroundColor: colors.bg,
    },
    missingText: { color: colors.text, fontSize: 16, fontWeight: '600' },
    mainTimerCard: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: space.lg,
      marginBottom: space.md,
      alignItems: 'center',
    },
    mainTimerLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.onPrimary,
      opacity: 0.8,
      marginBottom: space.sm,
    },
    mainTimerTime: {
      fontSize: 48,
      fontWeight: '700',
      color: colors.onPrimary,
      fontVariant: ['tabular-nums'],
    },
    mainTimerButtons: {
      flexDirection: 'row',
      gap: space.sm,
      marginTop: space.md,
    },
    timerBtn: {
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      borderRadius: 12,
      backgroundColor: colors.onPrimary,
    },
    timerBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    progressText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: space.md,
    },
    stepCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: space.lg,
      marginBottom: space.md,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    stepHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: space.md,
    },
    stepNumber: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      color: colors.onPrimary,
      textAlign: 'center',
      lineHeight: 48,
      fontSize: 24,
      fontWeight: '700',
      overflow: 'hidden',
    },
    stepCheckbox: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCheckboxInner: {
      width: 24,
      height: 24,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    stepText: {
      fontSize: 20,
      lineHeight: 30,
      color: colors.text,
      fontWeight: '500',
    },
    stepTimerCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: space.lg,
      marginBottom: space.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepTimerLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: space.sm,
    },
    stepTimerTime: {
      fontSize: 36,
      fontWeight: '700',
      color: colors.text,
      fontVariant: ['tabular-nums'],
      marginBottom: space.md,
    },
    stepTimerButtons: {
      flexDirection: 'row',
      gap: space.sm,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    quickTimerBtn: {
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    quickTimerText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    navigation: {
      flexDirection: 'row',
      gap: space.md,
      marginBottom: space.md,
    },
    navBtn: {
      flex: 1,
      paddingVertical: space.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    navBtnDisabled: {
      backgroundColor: colors.chip,
    },
    navBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.onPrimary,
    },
    navBtnTextDisabled: {
      color: colors.textMuted,
    },
    overviewCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: space.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    overviewTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: space.sm,
    },
    overviewStep: {
      flexDirection: 'row',
      gap: space.sm,
      padding: space.sm,
      borderRadius: 8,
      marginBottom: space.xs,
    },
    overviewStepCurrent: {
      backgroundColor: colors.primarySoft,
    },
    overviewStepNum: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.chip,
      color: colors.text,
      textAlign: 'center',
      lineHeight: 24,
      fontSize: 12,
      fontWeight: '700',
      overflow: 'hidden',
    },
    overviewStepNumCurrent: {
      backgroundColor: colors.primary,
      color: colors.onPrimary,
    },
    overviewStepText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
    },
    overviewStepTextChecked: {
      textDecorationLine: 'line-through',
      opacity: 0.5,
    },
    overviewStepTextCurrent: {
      fontWeight: '600',
      color: colors.primary,
    },
  });
