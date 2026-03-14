import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, PanResponder, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

const TARGET_SPEED_MPS = 2.5; // ~9 km/h
const WARNING_SPEED_MPS = 1.8; // ~6.5 km/h

export default function GameScreen() {
  const [hasStarted, setHasStarted] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [status, setStatus] = useState('Standby'); // Standby, Safe, Danger
  const [isSimulator, setIsSimulator] = useState(false);
  
  const [locationSubscription, setLocationSubscription] = useState(null);
  const warningCount = useRef(0);
  const lastUpdateRef = useRef(Date.now());
  const simulationIntervalRef = useRef(null);

  // For Draggable Simulation Guy
  const pan = useRef(new Animated.ValueXY()).current;
  const currentSimSpeedRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        // Calculate the simulated speed based on gesture velocity (vx, vy)
        // Magnifying the velocity slightly for easier testing
        const velocity = Math.sqrt(Math.pow(gestureState.vx, 2) + Math.pow(gestureState.vy, 2)) * 1.5;
        currentSimSpeedRef.current = velocity;
        
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(e, gestureState);
      },
      onPanResponderRelease: () => {
        // Guy stops moving
        currentSimSpeedRef.current = 0;
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminate: () => {
         // Guy stops moving
         currentSimSpeedRef.current = 0;
         Animated.spring(pan, {
           toValue: { x: 0, y: 0 },
           useNativeDriver: false,
         }).start();
      }
    })
  ).current;

  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      Speech.stop();
    };
  }, [locationSubscription]);

  const startGame = async () => {
    if (!isSimulator) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }
    }

    setHasStarted(true);
    setStatus('Safe');
    warningCount.current = 0;
    
    // Handler Intro
    Speech.speak("Agent, this is Handler. Your mission is to reach the safe zone 3 kilometers away. Keep your pace up.", {
      rate: 1.1,
      pitch: 0.9,
    });

    if (isSimulator) {
      // Simulator Loop
      simulationIntervalRef.current = setInterval(() => {
        const currentSpeed = currentSimSpeedRef.current;
        setSpeed(currentSpeed);
        
        const now = Date.now();
        if (now - lastUpdateRef.current > 5000) {
          evaluateSituation(currentSpeed);
          lastUpdateRef.current = now;
        }
      }, 500); // Check visual speed every 500ms
    } else {
      // Real GPS Loop
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (loc) => {
          const currentSpeed = loc.coords.speed || 0;
          setSpeed(currentSpeed);
          
          const now = Date.now();
          if (now - lastUpdateRef.current > 5000) {
            evaluateSituation(currentSpeed);
            lastUpdateRef.current = now;
          }
        }
      );
      setLocationSubscription(sub);
    }
  };

  const stopGame = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    
    setHasStarted(false);
    setStatus('Standby');
    setSpeed(0);
    currentSimSpeedRef.current = 0;
    Speech.speak("Mission aborted. Evac incoming.", { rate: 1.1, pitch: 0.9 });
  };

  const evaluateSituation = (currentSpeed) => {
    if (currentSpeed >= TARGET_SPEED_MPS) {
      if (status !== 'Safe') {
        setStatus('Safe');
        warningCount.current = 0;
        Speech.speak("You're clear. Keep this up.", { rate: 1.1, pitch: 0.9 });
      }
    } else if (currentSpeed < WARNING_SPEED_MPS) {
      handleDanger();
    }
  };

  const handleDanger = () => {
    setStatus('Danger');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const count = warningCount.current;
    
    if (count === 0) {
      Speech.speak("Warning. Movement detected behind you. Pick up the pace!", { rate: 1.2, pitch: 0.9 });
    } else if (count === 1) {
      Speech.speak("They're closing in! Run faster!", { rate: 1.3, pitch: 0.8 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Speech.speak("Sprint!", { rate: 1.5, pitch: 0.7 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    warningCount.current += 1;
  };

  const formatSpeed = (mps) => {
    return (mps * 3.6).toFixed(1); // convert m/s to km/h
  };

  return (
    <SafeAreaView style={[styles.container, status === 'Danger' && styles.containerDanger]}>
      <View style={styles.header}>
        <Text style={styles.title}>Bio-Hazard Run</Text>
        <Text style={styles.subtitle}>Handler Uplink: {hasStarted ? 'Active' : 'Offline'}</Text>

        {!hasStarted && (
          <TouchableOpacity 
            style={[styles.toggleModeBtn, isSimulator && styles.toggleModeBtnActive]} 
            onPress={() => setIsSimulator(!isSimulator)}
          >
            <Text style={styles.toggleModeText}>
              {isSimulator ? 'Simulated Drag Mode ON' : 'Real GPS Mode ON'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.hud}>
        <Text style={styles.speedValue}>{formatSpeed(speed)}</Text>
        <Text style={styles.speedLabel}>km/h</Text>
        
        {hasStarted && (
          <View style={[styles.statusBadge, status === 'Danger' ? styles.badgeDanger : styles.badgeSafe]}>
            <Text style={styles.statusText}>{status.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* DRAG SIMULATOR AREA */}
      {(isSimulator || true) && (
        <View style={styles.simulatorAreaWrapper}>
          {isSimulator && hasStarted ? (
            <View style={styles.simulatorArea}>
              <Text style={styles.simText}>DRAG FAST TO RUN</Text>
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.draggableGuy,
                  { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
                ]}
              />
            </View>
          ) : (
            <View style={styles.simulatorAreaSpacer} />
          )}
        </View>
      )}

      <View style={styles.controls}>
        {!hasStarted ? (
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.buttonText}>START MISSION</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={stopGame}>
            <Text style={styles.buttonText}>ABORT MISSION</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'space-between',
  },
  containerDanger: {
    backgroundColor: '#3a0000',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff00',
    fontFamily: 'Courier',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 8,
  },
  toggleModeBtn: {
    marginTop: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
  },
  toggleModeBtnActive: {
    borderColor: '#00ccff',
    backgroundColor: 'rgba(0, 204, 255, 0.1)',
  },
  toggleModeText: {
    color: '#ccc',
    fontSize: 14,
  },
  hud: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedValue: {
    fontSize: 96,
    fontWeight: 'bold',
    color: '#fff',
  },
  speedLabel: {
    fontSize: 24,
    color: '#aaa',
  },
  statusBadge: {
    marginTop: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  badgeSafe: {
    borderColor: '#00ff00',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  badgeDanger: {
    borderColor: '#ff0000',
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  simulatorAreaWrapper: {
    height: 180,
    justifyContent: 'center',
  },
  simulatorArea: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    marginHorizontal: 30,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  simulatorAreaSpacer: {
    height: 150,
  },
  simText: {
    color: '#444',
    position: 'absolute',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  draggableGuy: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00ccff',
    zIndex: 10,
    shadowColor: '#00ccff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  controls: {
    padding: 30,
    paddingBottom: 20,
  },
  startButton: {
    backgroundColor: '#00ff00',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#ff0000',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
