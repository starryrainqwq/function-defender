import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';

interface LeaderboardScreenProps {
  onBack: () => void;
  lang: 'en' | 'zh';
  currentUser: any;
  personalBest: number;
}

interface ServerBestEntry {
  username: string;
  score: number;
}

interface PersonalBestEntry {
  score: number;
  date: string;
}

export function LeaderboardScreen({ onBack, lang, currentUser, personalBest }: LeaderboardScreenProps) {
  const [serverBests, setServerBests] = useState<ServerBestEntry[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBestEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        // Fetch Top 10 Server Best
        const q = query(collection(db, 'users'), orderBy('personalBest', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        const serverData: ServerBestEntry[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          serverData.push({
            username: data.username || 'Unknown',
            score: data.personalBest || 0,
          });
        });
        setServerBests(serverData);

        // Fetch Top 10 Personal Best
        if (currentUser) {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.topScores) {
              setPersonalBests(data.topScores);
            } else if (data.personalBest) {
              // Fallback if topScores array doesn't exist yet
              setPersonalBests([{ score: data.personalBest, date: data.updatedAt || new Date().toISOString() }]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching leaderboards', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboards();
  }, [currentUser]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[#050505] p-4 py-12"
      style={{ backgroundImage: 'radial-gradient(#00FF41 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center' }}>
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-20">
        <div className="w-full h-[2px] bg-[#00FF41]"></div>
        <div className="h-full w-[2px] bg-[#00FF41]"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl bg-black/90 border border-[#00FF41]/60 p-6 md:p-10 shadow-[0_0_20px_rgba(0,255,65,0.2)] max-h-[90vh] overflow-y-auto">
        <h1 className="text-3xl md:text-4xl font-black text-center text-[#FFB000] tracking-widest mb-8 uppercase font-mono drop-shadow-[0_0_10px_#FFB000]">
          {lang === 'zh' ? '排行榜' : 'LEADERBOARD'}
        </h1>
        
        {loading ? (
          <div className="text-2xl font-mono text-[#00FF41]/60 animate-pulse text-center my-20">LOADING...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Server Best */}
            <div className="bg-[#001100] border border-[#00FF41]/40 p-4 md:p-6 flex flex-col">
              <h2 className="text-[#00FF41] font-mono tracking-widest uppercase text-lg mb-4 text-center border-b border-[#00FF41]/40 pb-2">
                🌍 {lang === 'zh' ? '全球前十' : 'Global Top 10'}
              </h2>
              <div className="space-y-3">
                {serverBests.length > 0 ? serverBests.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center font-mono">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className={`w-6 text-center ${index === 0 ? 'text-[#FFB000] font-bold' : index < 3 ? 'text-[#00FF41] font-bold' : 'text-[#00FF41]/60'}`}>
                        {index + 1}.
                      </span>
                      <span className="text-[#00FF41]/90 truncate uppercase" title={entry.username}>
                        {entry.username}
                      </span>
                    </div>
                    <span className={`font-black tracking-widest ml-4 ${index === 0 ? 'text-[#FFB000]' : 'text-[#00FF41]'}`}>
                      {entry.score.toString().padStart(6, '0')}
                    </span>
                  </div>
                )) : (
                  <div className="text-center text-[#00FF41]/40 font-mono py-4">No data</div>
                )}
              </div>
            </div>

            {/* Personal Best */}
            <div className="bg-[#001100] border border-[#00FF41]/40 p-4 md:p-6 flex flex-col">
              <h2 className="text-[#00FF41] font-mono tracking-widest uppercase text-lg mb-4 text-center border-b border-[#00FF41]/40 pb-2">
                👤 {lang === 'zh' ? '个人前十' : 'Personal Top 10'}
              </h2>
              <div className="space-y-3">
                {personalBests.length > 0 ? personalBests.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center font-mono">
                    <div className="flex items-center gap-3 text-[#00FF41]/80">
                      <span className="w-6 text-center">{index + 1}.</span>
                      <span className="text-sm">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-[#00FF41] font-black tracking-widest">
                      {entry.score.toString().padStart(6, '0')}
                    </span>
                  </div>
                )) : (
                  <div className="text-center text-[#00FF41]/40 font-mono py-4">No records yet</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <button 
            onClick={onBack}
            className="px-10 py-3 bg-transparent border-2 border-[#00FF41] text-[#00FF41] font-black font-mono uppercase tracking-widest hover:bg-[#00FF41] hover:text-black transition-colors"
          >
            {lang === 'zh' ? '返回主菜单' : 'BACK TO MENU'}
          </button>
        </div>
      </div>
    </div>
  );
}
