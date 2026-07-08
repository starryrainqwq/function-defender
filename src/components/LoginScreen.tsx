import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface LoginScreenProps {
  onLogin: (user: any, personalBest: number) => void;
  lang: 'en' | 'zh';
}

export function LoginScreen({ onLogin, lang }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError(lang === 'zh' ? '请输入用户名和密码' : 'Please enter username and password');
      return;
    }

    setLoading(true);
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@funcdefender.local`;

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          username: username,
          personalBest: 0,
          updatedAt: new Date().toISOString()
        });
        
        onLogin(user, 0);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Fetch personal best
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        let pb = 0;
        if (docSnap.exists()) {
          pb = docSnap.data().personalBest || 0;
        } else {
          // If for some reason document doesn't exist, create it
          await setDoc(docRef, {
            username: username,
            personalBest: 0,
            updatedAt: new Date().toISOString()
          });
        }
        
        onLogin(user, pb);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError(lang === 'zh' ? '该用户名已被注册' : 'Username already taken');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError(lang === 'zh' ? '用户名或密码错误' : 'Invalid username or password');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[#050505]"
      style={{ backgroundImage: 'radial-gradient(#00FF41 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center' }}>
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-20">
        <div className="w-full h-[2px] bg-[#00FF41]"></div>
        <div className="h-full w-[2px] bg-[#00FF41]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-black/90 border border-[#00FF41]/60 p-8 shadow-[0_0_20px_rgba(0,255,65,0.2)]">
        <h1 className="text-3xl font-black text-center text-[#00FF41] tracking-widest mb-8 uppercase font-mono">
          {lang === 'zh' ? '系统登录' : 'System Login'}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[#00FF41] text-xs font-mono tracking-widest uppercase mb-2">
              {lang === 'zh' ? '用户名 (Username)' : 'Username'}
            </label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-[#00FF41]/40 p-3 text-[#00FF41] font-mono focus:border-[#00FF41] outline-none transition-colors"
              placeholder={lang === 'zh' ? '输入用户名...' : 'Enter username...'}
            />
          </div>
          
          <div>
            <label className="block text-[#00FF41] text-xs font-mono tracking-widest uppercase mb-2">
              {lang === 'zh' ? '密码 (Password)' : 'Password'}
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-[#00FF41]/40 p-3 text-[#00FF41] font-mono focus:border-[#00FF41] outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-[#FF3D00] text-xs font-mono text-center animate-pulse">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 font-black uppercase tracking-widest transition-colors ${
              loading ? 'bg-[#00FF41]/50 text-black cursor-not-allowed' : 'bg-[#00FF41] text-black hover:bg-[#00cc33]'
            }`}
          >
            {loading ? (lang === 'zh' ? '验证中...' : 'Verifying...') : (isRegistering ? (lang === 'zh' ? '注册并登录' : 'Register & Login') : (lang === 'zh' ? '登录' : 'Login'))}
          </button>

          <button 
            type="button"
            disabled={loading}
            onClick={() => onLogin(null, 0)}
            className={`w-full py-3 border border-[#00FF41] text-[#00FF41] font-black uppercase tracking-widest transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#00FF41] hover:text-black'
            }`}
          >
            {lang === 'zh' ? '游客模式 (跳过登录)' : 'Guest Mode (Skip Login)'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-[#00FF41]/60 text-xs font-mono hover:text-[#00FF41] transition-colors tracking-widest uppercase"
          >
            {isRegistering 
              ? (lang === 'zh' ? '已有账号？返回登录' : 'Have an account? Login') 
              : (lang === 'zh' ? '没有账号？点击注册' : 'No account? Register')}
          </button>
        </div>
      </div>
    </div>
  );
}
