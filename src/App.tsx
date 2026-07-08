/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { StartScreen } from './components/StartScreen';
import { GameScreen } from './components/GameScreen';
import { EndScreen } from './components/EndScreen';
import { TutorialScreen } from './components/TutorialScreen';
import { LoginScreen } from './components/LoginScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { AchievementScreen } from './components/AchievementScreen';
import { AchievementUnlockModal } from './components/AchievementUnlockModal';
import { ScreenType, Difficulty, DLCConfig, AchievementId, AchievementLevel } from './types';
import { audio } from './lib/audio';
import { Language } from './lib/i18n';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { achievementManager, SessionAchievementTracker, createSessionTracker } from './lib/achievements';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [currentScreen, setCurrentScreen] = useState<ScreenType | 'login' | 'leaderboard' | 'achievements'>('login');
  const [lastScore, setLastScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [lang, setLang] = useState<Language>('zh');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [dlcConfig, setDlcConfig] = useState<DLCConfig>({ activeModes: [], pressureLevel: 1, obstacleLevel: 1 });
  
  // 成就系统状态
  const [achievementVersion, setAchievementVersion] = useState(0); // 用于触发重渲染
  const [unlockQueue, setUnlockQueue] = useState<{ id: AchievementId; level: AchievementLevel }[]>([]);
  const sessionTrackerRef = useRef<SessionAchievementTracker | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // 加载成就数据
        achievementManager.setUserId(user.uid);
        await achievementManager.loadFromFirebase(user.uid);
        setAchievementVersion(v => v + 1);
        // Fetch personal best
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setPersonalBest(docSnap.data().personalBest || 0);
          }
        } catch (err) {
          console.error("Failed to fetch user data:", err);
        }
        setCurrentScreen('start');
      } else {
        setCurrentUser(null);
        achievementManager.setUserId(null);
        // 未登录时从本地加载
        achievementManager.loadFromLocal();
        setAchievementVersion(v => v + 1);
        setCurrentScreen('login');
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (user: any, pb: number) => {
    setCurrentUser(user);
    setPersonalBest(pb);
    setCurrentScreen('start');
  };

  const handleLogout = async () => {
    if (currentUser) {
      await signOut(auth);
    } else {
      setCurrentUser(null);
      setCurrentScreen('login');
    }
  };

  const handleStart = (selectedDifficulty: Difficulty, selectedDlcConfig: DLCConfig) => {
    audio.init();
    setDifficulty(selectedDifficulty);
    setDlcConfig(selectedDlcConfig);
    setIsNewRecord(false);
    // 创建新的一局成就追踪器
    sessionTrackerRef.current = null;
    audio.playBGM();
    setCurrentScreen('game');
  };

  const handleTutorial = () => {
    audio.init();
    setCurrentScreen('tutorial');
  };

  const handleLeaderboard = () => {
    setCurrentScreen('leaderboard');
  };

  const handleAchievements = () => {
    setCurrentScreen('achievements');
  };

  const handleAchievementBack = () => {
    setCurrentScreen('start');
  };

  const handleCloseUnlockModal = () => {
    setUnlockQueue([]);
  };

  /** 获取session tracker（延迟创建，在GameScreen中由maxHealth初始化） */
  const getSessionTracker = (maxHealth: number): SessionAchievementTracker => {
    if (!sessionTrackerRef.current) {
      sessionTrackerRef.current = createSessionTracker(maxHealth);
    }
    return sessionTrackerRef.current;
  };

  /** 游戏结束时的成就结算（在GameScreen中调用） */
  const handleSettleAchievements = async () => {
    if (!sessionTrackerRef.current) return;
    const newUnlocks = achievementManager.settleSession(sessionTrackerRef.current);
    setAchievementVersion(v => v + 1);
    if (newUnlocks.length > 0) {
      setUnlockQueue(newUnlocks);
    }
    sessionTrackerRef.current = null;
  };

  const handleGameOver = async (score: number) => {
    audio.stopBGM();
    audio.playGameOver();
    setLastScore(score);
    
    // 先结算成就
    await handleSettleAchievements();
    
    let newRecord = false;
    if (currentUser) {
      if (score > personalBest) {
        setPersonalBest(score);
        newRecord = true;
      }
      
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        let topScores: {score: number, date: string}[] = [];
        if (userDoc.exists() && userDoc.data().topScores) {
          topScores = userDoc.data().topScores;
        }
        
        if (topScores.length < 10 || score > topScores[topScores.length - 1].score) {
          topScores.push({ score, date: new Date().toISOString() });
          topScores.sort((a, b) => b.score - a.score);
          topScores = topScores.slice(0, 10);
          
          await setDoc(userRef, {
            username: currentUser.email?.split('@')[0] || 'Player',
            personalBest: topScores[0].score,
            topScores: topScores,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (err) {
        console.error('Failed to update scores:', err);
      }
    }
    
    setIsNewRecord(newRecord);
    setCurrentScreen('end');
  };

  const handleRestart = () => {
    setCurrentScreen('start');
  };

  if (isAuthChecking) {
    return <div className="w-full h-screen bg-[#050505] text-[#00FF41] flex items-center justify-center font-mono">LOADING...</div>;
  }

  return (
    <div className="w-full h-screen bg-[#000000] text-[#FFFFFF] font-sans overflow-hidden flex flex-col border-4 border-[#00FF41]">
      {currentScreen === 'login' && <LoginScreen onLogin={handleLogin} lang={lang} />}
      {currentScreen === 'start' && <StartScreen onStart={handleStart} onTutorial={handleTutorial} onLeaderboard={handleLeaderboard} onAchievements={handleAchievements} lang={lang} setLang={setLang} onLogout={handleLogout} currentUser={currentUser} />}
      {currentScreen === 'game' && <GameScreen onGameOver={handleGameOver} onQuit={handleRestart} lang={lang} setLang={setLang} difficulty={difficulty} dlcConfig={dlcConfig} getSessionTracker={getSessionTracker} />}
      {currentScreen === 'end' && <EndScreen score={lastScore} onRestart={handleRestart} lang={lang} setLang={setLang} personalBest={personalBest} isNewRecord={isNewRecord} currentUser={currentUser} />}
      {currentScreen === 'tutorial' && <TutorialScreen onFinish={handleRestart} lang={lang} />}
      {currentScreen === 'leaderboard' && <LeaderboardScreen onBack={handleRestart} lang={lang} currentUser={currentUser} personalBest={personalBest} />}
      {currentScreen === 'achievements' && <AchievementScreen lang={lang} onBack={handleAchievementBack} getAchievement={(id) => achievementManager.getAchievement(id)} />}
      {/* 成就解锁弹窗 */}
      {unlockQueue.length > 0 && <AchievementUnlockModal lang={lang} unlocks={unlockQueue} onClose={handleCloseUnlockModal} />}
    </div>
  );
}