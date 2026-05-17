/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, Users, ChevronRight, ThumbsUp, Search, Send,
  Building2, ArrowLeft, Clock, Eye, Edit3, X, ChevronDown,
  Megaphone, BarChart2, Zap, Star, Loader2, Menu, Trash2,
  Pencil, Check, TrendingUp, Clock3, Upload, ImageIcon,
  Moon, Sun, User, Settings, LogOut, Camera, ChevronLeft
} from 'lucide-react';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';
// @ts-ignore
import imageCompression from 'browser-image-compression';

// ── 전역 컨텍스트 ────────────────────────────────────────
interface UserProfile {
  name: string;
  avatar: string; // 이니셜 or URL
  avatarUrl?: string;
}
interface AppContextType {
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}
const AppContext = createContext<AppContextType>({
  user: null, setUser: () => {}, darkMode: false, toggleDarkMode: () => {},
});

// ── 타입 ──────────────────────────────────────────────────
interface Brief {
  id: string; company_name: string; title: string; problem: string;
  target: string; campaign_info: string; reward: string; deadline: string;
  participants: number; status: '진행중' | '종료'; category: string;
  bg_color: string; image_url?: string; views?: number;
}
interface CopyEntry {
  id: string; brief_id: string; author: string; content: string;
  upvotes: number; created_at: string;
}
interface Reply {
  id: string; comment_id: string; author: string; avatar: string;
  content: string; likes: number; created_at: string;
}
interface Comment {
  id: string; post_id: string; author: string; avatar: string;
  content: string; likes: number; created_at: string; replies: Reply[];
}
interface Post {
  id: string; category: string; title: string; content: string;
  author: string; avatar: string; views: number; likes: number; dislikes: number;
  created_at: string; is_pinned: boolean; comments: Comment[];
}

const CATEGORIES = ['전체', '자유 게시판', '크리에이터 토크', '브랜드 뉴스'];
const BRIEF_CATS = ['전체', 'F&B', '핀테크', '라이프스타일', '패션'];
const KEY = '#05D560';

// 다크모드 색상
const D = {
  bg: '#17171C',        // 최외곽 배경
  card: '#2C2C35',      // 카드/패널
  border: '#3a3a45',    // 구분선
  text: '#f0f0f0',      // 기본 텍스트
  muted: '#8888a0',     // 보조 텍스트
  hover: '#35353f',     // 호버
};

// 사용자 고유 키 (localStorage fingerprint)
const getVoterKey = () => {
  let k = localStorage.getItem('cc_voter_key');
  if (!k) { k = Math.random().toString(36).slice(2) + Date.now(); localStorage.setItem('cc_voter_key', k); }
  return k;
};

const timeAgo = (ts: string) => {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};
const PALETTE = ['bg-slate-500', 'bg-zinc-600', 'bg-stone-500', 'bg-neutral-600', 'bg-gray-600'];
const getAvatarColor = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

// ── 공통 ──────────────────────────────────────────────────
function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
      className={cn('rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', getAvatarColor(name))}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
function Spinner() {
  return <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-gray-300" /></div>;
}

// ── 로그인 페이지 ─────────────────────────────────────────
function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useContext(AppContext);

  const handleLogin = (provider: 'naver' | 'kakao') => {
    // 실제 OAuth 연결 전 임시 로그인
    setUser({ name: provider === 'naver' ? '네이버유저' : '카카오유저', avatar: provider === 'naver' ? 'NV' : 'KK' });
    localStorage.setItem('cc_user', JSON.stringify({ name: provider === 'naver' ? '네이버유저' : '카카오유저', avatar: provider === 'naver' ? 'NV' : 'KK' }));
    navigate(-1);
  };

  return (
    <DarkWrapper className="min-h-screen flex items-center justify-center px-4 pt-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs mb-8 transition-colors" style={{ color: D.muted }}>
          <ArrowLeft size={14} /> 돌아가기
        </button>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'inherit' }}>로그인</h1>
        <p className="text-sm mb-8" style={{ color: D.muted }}>소셜 계정으로 간편하게 시작하세요.</p>

        <div className="space-y-3">
          {/* 네이버 */}
          <button onClick={() => handleLogin('naver')}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-98"
            style={{ backgroundColor: '#03C75A' }}>
            <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center shrink-0">
              <span className="text-[#03C75A] font-black text-xs leading-none">N</span>
            </div>
            네이버로 로그인
          </button>

          {/* 카카오 */}
          <button onClick={() => handleLogin('kakao')}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-98"
            style={{ backgroundColor: '#FEE500', color: '#191919' }}>
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#191919">
                <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.663 1.713 5.001 4.31 6.376L5.23 21l5.21-3.136c.5.07 1.01.106 1.56.106 5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
              </svg>
            </div>
            카카오로 로그인
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: D.muted }}>
          로그인 시 <span style={{ color: KEY }}>이용약관</span>과 <span style={{ color: KEY }}>개인정보처리방침</span>에 동의합니다.
        </p>
      </motion.div>
    </DarkWrapper>
  );
}

// ── 마이페이지 ────────────────────────────────────────────
function MyPage() {
  const navigate = useNavigate();
  const { user, setUser, darkMode, toggleDarkMode } = useContext(AppContext);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) { navigate('/catchcopy/login'); return null; }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      // 압축 후 base64로 변환 → localStorage 저장 (Storage 버킷 불필요)
      const compressed = await imageCompression(file, { maxSizeMB: 0.1, maxWidthOrHeight: 300, useWebWorker: true });
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setAvatarPreview(base64);
        const updated = { ...user!, avatarUrl: base64 };
        setUser(updated);
        localStorage.setItem('cc_user', JSON.stringify(updated));
        setSaving(false);
      };
      reader.onerror = () => { alert('이미지 읽기 실패'); setSaving(false); };
      reader.readAsDataURL(compressed);
    } catch (err) {
      alert('이미지 처리 실패: ' + String(err));
      setSaving(false);
    }
  };

  const handleSave = () => {
    const updated = { ...user, name: editName.trim() || user.name };
    setUser(updated);
    localStorage.setItem('cc_user', JSON.stringify(updated));
    navigate(-1);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('cc_user');
    navigate('/catchcopy');
  };

  const dm = darkMode;

  return (
    <DarkWrapper className="min-h-screen pt-12">
      <div className="sticky top-12 z-40 border-b" style={{ backgroundColor: dm ? D.card : 'white', borderColor: dm ? D.border : '#f3f4f6' }}>
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: D.muted }}>
            <ArrowLeft size={14} /> 뒤로
          </button>
          <span className="text-sm font-semibold">마이페이지</span>
          <button onClick={handleSave}
            className="text-xs font-semibold text-white px-4 py-1.5 rounded-lg hover:opacity-90 transition-all"
            style={{ backgroundColor: KEY }}>
            저장
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* 프로필 */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: dm ? D.card : 'white', border: `1px solid ${dm ? D.border : '#f3f4f6'}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-4" style={{ color: D.muted }}>프로필</p>
          {/* 아바타 */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ backgroundColor: avatarPreview ? 'transparent' : KEY }}>
                {avatarPreview
                  ? <img src={avatarPreview} className="w-full h-full object-cover" />
                  : user.avatar
                }
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={saving}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md"
                style={{ backgroundColor: KEY }}>
                {saving ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>
            <div>
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs mt-0.5" style={{ color: D.muted }}>프로필 사진을 변경하려면 카메라를 클릭하세요.</p>
            </div>
          </div>
          {/* 닉네임 */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: D.muted }}>닉네임</label>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors border"
              style={{ backgroundColor: dm ? D.bg : '#f9fafb', borderColor: dm ? D.border : '#f3f4f6', color: dm ? D.text : '#111' }} />
          </div>
        </div>

        {/* 개인정보 설정 */}
        <div className="rounded-2xl" style={{ backgroundColor: dm ? D.card : 'white', border: `1px solid ${dm ? D.border : '#f3f4f6'}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider px-5 pt-5 pb-3" style={{ color: D.muted }}>개인정보 설정</p>
          {[
            { label: '이메일 수신 동의', sub: '브리프 마감, 당선 알림 등' },
            { label: '마케팅 정보 수신', sub: '새로운 브리프 소식' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5 border-t" style={{ borderColor: dm ? D.border : '#f9fafb' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: dm ? D.text : '#111' }}>{item.label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: D.muted }}>{item.sub}</p>
              </div>
              <div className="w-10 h-5 rounded-full relative cursor-pointer" style={{ backgroundColor: KEY }}>
                <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          ))}
        </div>

        {/* 디스플레이 */}
        <div className="rounded-2xl" style={{ backgroundColor: dm ? D.card : 'white', border: `1px solid ${dm ? D.border : '#f3f4f6'}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider px-5 pt-5 pb-3" style={{ color: D.muted }}>디스플레이</p>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={16} style={{ color: KEY }} /> : <Sun size={16} className="text-amber-400" />}
              <div>
                <p className="text-sm font-medium" style={{ color: dm ? D.text : '#111' }}>다크모드</p>
                <p className="text-[11px]" style={{ color: D.muted }}>{darkMode ? '어두운 테마 사용 중' : '밝은 테마 사용 중'}</p>
              </div>
            </div>
            <button onClick={toggleDarkMode}
              className="w-11 h-6 rounded-full relative transition-all duration-300"
              style={{ backgroundColor: darkMode ? KEY : '#e5e7eb' }}>
              <motion.div animate={{ x: darkMode ? 22 : 2 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </button>
          </div>
        </div>

        {/* 로그아웃 */}
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all border"
          style={{ color: '#ef4444', borderColor: dm ? D.border : '#fee2e2', backgroundColor: dm ? D.card : '#fff5f5' }}>
          <LogOut size={15} /> 로그아웃
        </button>
      </div>
    </DarkWrapper>
  );
}

// ── 다크모드 래퍼 ─────────────────────────────────────────
function DarkWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  const { darkMode } = useContext(AppContext);
  return (
    <div className={className} style={{ backgroundColor: darkMode ? D.bg : undefined, color: darkMode ? D.text : undefined }}>
      {children}
    </div>
  );
}

// ── 헤더 ──────────────────────────────────────────────────
function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, darkMode } = useContext(AppContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dm = darkMode;
  const activeTab = location.pathname.startsWith('/catchcopy/brief') ? 'brief'
    : location.pathname.startsWith('/catchcopy/community') ? 'community'
    : location.pathname.startsWith('/catchcopy/wallet') ? 'wallet' : 'home';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b transition-colors"
      style={{ backgroundColor: dm ? D.card : 'white', borderColor: dm ? D.border : '#f3f4f6' }}>
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/catchcopy')} className="flex items-center">
            <img src={dm ? "/logo2.png" : "/logo.png"} alt="CatchCopy" className="h-5 w-auto object-contain" />
          </button>
          <nav className="hidden md:flex items-center gap-0.5">
            {[{ id: 'brief', label: '브리프' }, { id: 'community', label: '커뮤니티' }, { id: 'wallet', label: '내 지갑' }].map(t => (
              <button key={t.id} onClick={() => navigate(`/catchcopy/${t.id}`)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ color: activeTab === t.id ? KEY : dm ? D.muted : '#6b7280', backgroundColor: activeTab === t.id ? `${KEY}15` : 'transparent' }}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigate('/catchcopy/admin')}
            className="hidden sm:block text-xs font-medium px-3 py-1.5 rounded-lg border transition-all"
            style={{ color: dm ? D.muted : '#9ca3af', borderColor: dm ? D.border : '#e5e7eb' }}>
            관리자
          </button>
          {user ? (
            <button onClick={() => navigate('/catchcopy/mypage')}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border"
              style={{ color: dm ? D.text : '#374151', borderColor: dm ? D.border : '#e5e7eb', backgroundColor: dm ? D.hover : '#f9fafb' }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} className="w-4 h-4 rounded-full object-cover" />
                : <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black" style={{ backgroundColor: KEY }}>{user.avatar}</div>
              }
              마이페이지
            </button>
          ) : (
            <button onClick={() => navigate('/catchcopy/login')}
              className="hidden sm:block text-xs font-medium px-3 py-1.5 transition-colors"
              style={{ color: dm ? D.muted : '#6b7280' }}>
              로그인
            </button>
          )}
          <button onClick={() => setMobileOpen(v => !v)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: dm ? D.text : '#374151' }}>
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="md:hidden border-t px-4 pb-3"
            style={{ backgroundColor: dm ? D.card : 'white', borderColor: dm ? D.border : '#f3f4f6' }}>
            <div className="pt-2 space-y-0.5">
              {[{ id: 'brief', label: '브리프' }, { id: 'community', label: '커뮤니티' }, { id: 'wallet', label: '내 지갑' }].map(t => (
                <button key={t.id} onClick={() => { navigate(`/catchcopy/${t.id}`); setMobileOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{ color: activeTab === t.id ? KEY : dm ? D.muted : '#6b7280', backgroundColor: activeTab === t.id ? `${KEY}15` : 'transparent' }}>
                  {t.label}
                </button>
              ))}
              {user ? (
                <button onClick={() => { navigate('/catchcopy/mypage'); setMobileOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ color: dm ? D.text : '#374151' }}>
                  마이페이지
                </button>
              ) : (
                <button onClick={() => { navigate('/catchcopy/login'); setMobileOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium"
                  style={{ color: dm ? D.muted : '#6b7280' }}>
                  로그인
                </button>
              )}
              <button onClick={() => { navigate('/catchcopy/admin'); setMobileOpen(false); }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: dm ? D.muted : '#9ca3af' }}>
                관리자
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ── 브리프 카드 ──────────────────────────────────────────
function BriefCard({ brief, onClick, large }: { brief: Brief; onClick: () => void; large?: boolean }) {
  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} onClick={onClick}
      className="cursor-pointer group rounded-2xl overflow-hidden bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all">
      {/* 이미지 영역 */}
      <div className={cn("relative overflow-hidden", large ? "h-52 sm:h-64" : "h-40 sm:h-48",
        !brief.image_url && brief.bg_color)}>
        {brief.image_url ? (
          <img src={brief.image_url} alt={brief.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Megaphone size={large ? 40 : 28} className="text-white/40" />
          </div>
        )}
        {/* 그라디언트 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* 뱃지들 */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
            brief.status === '진행중' ? "bg-[#05D560] text-white" : "bg-white/80 text-gray-500")}>
            {brief.status}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">{brief.reward}</span>
        </div>
        {/* 하단 정보 */}
        <div className="absolute bottom-3 left-3 right-12">
          <p className="text-[10px] text-white/70 font-medium mb-0.5">{brief.company_name}</p>
          <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">{brief.title}</h4>
        </div>
        <div className="absolute bottom-3 right-3">
          <div className="bg-white text-[10px] font-bold px-2.5 py-1 rounded-full text-gray-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            참여 →
          </div>
        </div>
      </div>
      {/* 하단 메타 */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><Users size={10} /> {brief.participants.toLocaleString()}명</span>
          {brief.status === '진행중' && <span className="flex items-center gap-1"><Clock size={10} /> {brief.deadline}</span>}
        </div>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{brief.category}</span>
      </div>
    </motion.div>
  );
}

// ── 브리프 상세 ──────────────────────────────────────────
function BriefPage() {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [copies, setCopies] = useState<CopyEntry[]>([]);
  const [newCopy, setNewCopy] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // copy_id → 이 기기가 투표했는지
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!briefId) return;
    supabase.from('briefs').select('*').eq('id', briefId).single().then(async ({ data }) => {
      if (data) {
        // 조회수 +1
        await supabase.from('briefs').update({ views: (data.views ?? 0) + 1 }).eq('id', briefId);
        setBrief({ ...data, views: (data.views ?? 0) + 1 });
      }
      setBriefLoading(false);
    });
  }, [briefId]);

  useEffect(() => {
    if (!briefId) return;
    setLoading(true);
    supabase.from('copies').select('*').eq('brief_id', briefId).order('upvotes', { ascending: false })
      .then(({ data }) => { setCopies(data ?? []); setLoading(false); });

    // 이 기기가 투표한 카피들 조회 (DB + localStorage 모두)
    const vk = getVoterKey();
    supabase.from('copy_votes').select('copy_id').eq('voter_key', vk)
      .then(({ data }) => {
        const dbVoted = new Set((data ?? []).map((r: any) => r.copy_id));
        // localStorage에서도 복원
        const lsVoted = new Set<string>();
        Object.keys(localStorage).forEach(k => {
          const m = k.match(/^copy_voted_([^_]+)_/);
          if (m) lsVoted.add(m[1]);
        });
        setMyVotes(new Set([...dbVoted, ...lsVoted]));
      });

    const ch = supabase.channel(`copies-${briefId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'copies', filter: `brief_id=eq.${briefId}` },
        ({ eventType, new: nr, old: or }) => {
          if (eventType === 'INSERT') setCopies(p => [...p, nr as CopyEntry].sort((a, b) => b.upvotes - a.upvotes));
          else if (eventType === 'UPDATE') setCopies(p => [...p.map(c => c.id === (nr as CopyEntry).id ? nr as CopyEntry : c)].sort((a, b) => b.upvotes - a.upvotes));
          else if (eventType === 'DELETE') setCopies(p => p.filter(c => c.id !== (or as CopyEntry).id));
        }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [briefId]);

  const handleSubmitCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCopy.trim() || submitting) return;
    setSubmitting(true);
    await supabase.from('copies').insert({ brief_id: briefId, author: '나', content: newCopy.trim(), upvotes: 0 });
    setNewCopy(''); setSubmitting(false);
  };

  const handleVote = async (copyId: string) => {
    const vk = getVoterKey();
    const lsKey = `copy_voted_${copyId}_${vk}`;
    const alreadyVoted = myVotes.has(copyId) || !!localStorage.getItem(lsKey);

    if (alreadyVoted) {
      // 취소: DB에서 최신 upvotes 가져와서 -1
      const { data: cur } = await supabase.from('copies').select('upvotes').eq('id', copyId).single();
      await supabase.from('copies').update({ upvotes: Math.max(0, (cur?.upvotes ?? 1) - 1) }).eq('id', copyId);
      await supabase.from('copy_votes').delete().eq('copy_id', copyId).eq('voter_key', vk);
      localStorage.removeItem(lsKey);
      setMyVotes(p => { const n = new Set(p); n.delete(copyId); return n; });
    } else {
      // 추천: localStorage 먼저 세팅해서 중복 클릭 차단
      localStorage.setItem(lsKey, '1');
      setMyVotes(p => new Set([...p, copyId]));
      const { data: cur } = await supabase.from('copies').select('upvotes').eq('id', copyId).single();
      const { error } = await supabase.from('copy_votes').insert({ copy_id: copyId, voter_key: vk });
      // copy_votes 테이블 없어도 localStorage로 차단되므로 error 무시 안 함
      if (!error || error.code === '42P01') {
        // 테이블 없으면(42P01) localStorage만으로 처리
        await supabase.from('copies').update({ upvotes: (cur?.upvotes ?? 0) + 1 }).eq('id', copyId);
      } else {
        // UNIQUE 위반 등 실제 중복이면 롤백
        localStorage.removeItem(lsKey);
        setMyVotes(p => { const n = new Set(p); n.delete(copyId); return n; });
      }
    }
  };

  if (briefLoading) return <div className="min-h-screen flex items-center justify-center pt-12"><Spinner /></div>;
  if (!brief) return <div className="min-h-screen flex items-center justify-center pt-12 text-gray-400 text-sm">브리프를 찾을 수 없습니다.</div>;

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      {/* 풀스크린 이미지/컬러 헤더 */}
      <div className={cn("relative w-full", !brief.image_url && brief.bg_color)} style={{ height: '45vh', minHeight: 260 }}>
        {brief.image_url
          ? <img src={brief.image_url} alt={brief.title} className="w-full h-full object-cover" />
          : <div className="absolute inset-0 flex items-center justify-center"><Megaphone size={100} className="text-white/20" /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button onClick={() => navigate('/catchcopy/brief')}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-xs font-medium bg-white/20 backdrop-blur text-white px-3 py-1.5 rounded-full hover:bg-white/30 transition-all">
          <ArrowLeft size={13} /> 목록
        </button>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full",
            brief.status === '진행중' ? "bg-[#05D560] text-white" : "bg-white/20 text-white")}>
            {brief.status}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <p className="text-xs text-white/60 font-medium mb-1">{brief.company_name} · {brief.category}</p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug max-w-xl">{brief.title}</h1>
            <div className="text-right shrink-0">
              <p className="text-lg sm:text-xl font-bold text-white">{brief.reward}</p>
              <p className="text-xs text-white/60">{brief.participants.toLocaleString()}명 참여 · 조회 {(brief.views ?? 0).toLocaleString()}</p>
            </div>
          </div>
          {brief.status === '진행중' && (
            <p className="text-xs text-white/70 mt-2 flex items-center gap-1"><Clock size={11} /> {brief.deadline}</p>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 좌: 브리프 정보 */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">해결할 문제</p>
              <p className="text-sm text-gray-700 leading-relaxed">{brief.problem}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">타겟</p>
                <p className="text-xs text-gray-700 leading-relaxed">{brief.target}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">캠페인</p>
                <p className="text-xs text-gray-700 leading-relaxed">{brief.campaign_info}</p>
              </div>
            </div>
            {brief.status === '진행중' && (
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">내 카피 제출</p>
                <form onSubmit={handleSubmitCopy} className="relative">
                  <input type="text" value={newCopy} onChange={e => setNewCopy(e.target.value)}
                    placeholder="한 줄 카피를 입력하세요."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#05D560] transition-colors" />
                  <button type="submit"
                    className={cn("absolute right-1.5 top-1.5 bottom-1.5 w-7 rounded-md flex items-center justify-center transition-all text-white text-xs",
                      newCopy.trim() && !submitting ? "" : "pointer-events-none opacity-40")}
                    style={{ backgroundColor: newCopy.trim() && !submitting ? KEY : '#ccc' }}>
                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* 우: 실시간 랭킹 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 size={14} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-800">실시간 경쟁 랭킹</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">{copies.length}개 참여</span>
                  {copies.length > 0 && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: KEY }} />}
                </div>
              </div>
              {loading ? <Spinner /> : copies.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-2xl mb-2">✍️</p>
                  <p className="text-xs text-gray-400">첫 번째 카피를 제출해보세요!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {copies.map((copy, idx) => {
                    const isTop3 = idx < 3;
                    const voted = myVotes.has(copy.id);
                    return (
                      <motion.div key={copy.id} layout
                        className={cn("px-4 py-3.5 flex items-start gap-3 transition-colors",
                          idx === 0 ? "bg-[#05D560]/3" : "hover:bg-gray-50/50")}>
                        {/* 순위 */}
                        <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                          style={idx === 0 ? { backgroundColor: KEY, color: 'white' }
                            : idx === 1 ? { backgroundColor: '#9CA3AF', color: 'white' }
                              : idx === 2 ? { backgroundColor: '#D97706', color: 'white' }
                                : { backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                          {isTop3 ? MEDAL[idx] : idx + 1}
                        </div>
                        {/* 카피 내용 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 leading-snug break-words">"{copy.content}"</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{copy.author}</p>
                        </div>
                        {/* 추천 버튼 */}
                        <button onClick={() => handleVote(copy.id)}
                          className={cn("shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                            voted
                              ? "border-[#05D560] text-[#05D560] bg-[#05D560]/5"
                              : "border-gray-200 text-gray-400 hover:border-[#05D560]/50 hover:text-[#05D560]")}>
                          <ThumbsUp size={11} /> {copy.upvotes}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 브리프 관리자 작성 ──────────────────────────────────
// ── 마감일 캘린더 피커 ────────────────────────────────────
function DeadlinePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // value를 날짜로 파싱 (YYYY-MM-DD 또는 기존 텍스트)
  const parseDate = (v: string) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  const selectedDate = parseDate(value);

  // 캘린더 상태
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // 바깥 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handleSelect = (day: number) => {
    const picked = new Date(viewYear, viewMonth, day);
    picked.setHours(0, 0, 0, 0);
    const diff = Math.ceil((picked.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // "D-7", "D-30" 형태로 저장
    const label = diff <= 0 ? '마감' : diff === 1 ? '내일 마감' : `D-${diff}`;
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} (${label})`);
    setOpen(false);
  };

  const displayValue = value
    ? value.split(' ')[0] + (value.includes('(') ? ' ' + value.split(' ').slice(1).join(' ') : '')
    : '';

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 text-sm text-left focus:outline-none focus:border-[#05D560] transition-colors flex items-center justify-between">
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {displayValue || '마감일 선택'}
        </span>
        <Clock size={13} className="text-gray-400 shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 top-full mt-1.5 left-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
            style={{ width: 260 }}>
            {/* 월 네비게이션 */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
              <button type="button" onClick={() => {
                if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
                else setViewMonth(m => m - 1);
              }} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors">
                <ChevronDown size={13} className="rotate-90" />
              </button>
              <span className="text-xs font-semibold text-gray-700">{viewYear}년 {MONTHS[viewMonth]}</span>
              <button type="button" onClick={() => {
                if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
                else setViewMonth(m => m + 1);
              }} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-colors">
                <ChevronDown size={13} className="-rotate-90" />
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 px-2 pt-2">
              {DAYS.map((d, i) => (
                <div key={d} className={cn("text-center text-[10px] font-semibold py-1",
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400")}>
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 px-2 pb-3 gap-y-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const thisDate = new Date(viewYear, viewMonth, day);
                thisDate.setHours(0, 0, 0, 0);
                const isPast = thisDate < today;
                const isToday = thisDate.getTime() === today.getTime();
                const isSelected = selectedDate && thisDate.getTime() === selectedDate.getTime();
                const dow = thisDate.getDay();
                return (
                  <button key={day} type="button" disabled={isPast} onClick={() => handleSelect(day)}
                    className={cn("w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all",
                      isSelected ? "text-white" : isPast ? "text-gray-300 cursor-not-allowed"
                        : isToday ? "font-bold"
                          : dow === 0 ? "text-red-400 hover:bg-red-50"
                            : dow === 6 ? "text-blue-400 hover:bg-blue-50"
                              : "text-gray-700 hover:bg-gray-100")}
                    style={isSelected ? { backgroundColor: KEY } : isToday && !isSelected ? { color: KEY } : {}}>
                    {day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BriefWritePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    company_name: '', title: '', problem: '', target: '', campaign_info: '',
    reward: '', deadline: '', category: 'F&B', status: '진행중' as '진행중' | '종료',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = ['company_name', 'title', 'problem', 'target', 'campaign_info', 'reward', 'deadline'];
    if (required.some(k => !(form as any)[k].trim())) return alert('모든 항목을 입력해주세요.');
    setSubmitting(true);

    let image_url = '';
    if (imageFile) {
      const compressed = await imageCompression(imageFile, { maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: true });
      const ext = imageFile.name.split('.').pop();
      const path = `briefs/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('brief-images').upload(path, compressed, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from('brief-images').getPublicUrl(path);
        image_url = data.publicUrl;
      }
    }

    const { error } = await supabase.from('briefs').insert({
      ...form, participants: 0, bg_color: 'bg-gray-200', image_url: image_url || null,
    });
    setSubmitting(false);
    if (!error) navigate('/catchcopy/brief');
    else alert('저장 중 오류: ' + error.message);
  };

  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#05D560] transition-colors";

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className="sticky top-12 z-40 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={14} /> 취소
          </button>
          <span className="text-sm font-semibold">브리프 등록</span>
          <button onClick={handleSubmit} disabled={submitting}
            className="text-xs font-semibold text-white px-4 py-1.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: KEY }}>
            {submitting ? <Loader2 size={13} className="animate-spin" /> : '등록'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이미지 업로드 */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">브리프 이미지 <span className="text-gray-400 normal-case font-normal">(권장: 800×500px, PNG/JPG)</span></p>
            <div onClick={() => fileRef.current?.click()}
              className={cn("relative cursor-pointer rounded-xl overflow-hidden border-2 border-dashed transition-all",
                imagePreview ? "border-transparent" : "border-gray-200 hover:border-[#05D560]/50")}
              style={{ height: 200 }}>
              {imagePreview
                ? <img src={imagePreview} className="w-full h-full object-cover" />
                : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Upload size={24} />
                  <p className="text-xs font-medium">클릭해서 이미지 업로드</p>
                  <p className="text-[11px]">800 × 500px PNG 권장</p>
                </div>
              }
              {imagePreview && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center">
                  <p className="text-white text-xs font-medium opacity-0 hover:opacity-100">클릭해서 변경</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">상태</label>
              <div className="flex bg-gray-100 p-0.5 rounded-lg gap-0.5">
                {(['진행중', '종료'] as const).map(s => (
                  <button key={s} type="button" onClick={() => set('status', s)}
                    className={cn("flex-1 py-1.5 rounded-md text-xs font-semibold transition-all",
                      form.status === s ? "bg-white shadow-sm text-gray-800" : "text-gray-400")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">카테고리</label>
              <div className="relative">
                <select value={form.category} onChange={e => set('category', e.target.value)} className={inputClass + " appearance-none pr-7"}>
                  {BRIEF_CATS.filter(c => c !== '전체').map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {[
            { key: 'company_name', label: '회사명', placeholder: '카페인 (Cafe-In)', multi: false },
            { key: 'title', label: '브리프 제목', placeholder: 'MZ세대를 위한 새로운 디카페인 커피 브랜드 런칭', multi: false },
            { key: 'problem', label: '해결할 문제', placeholder: '기존 디카페인 커피는 맛이 없다는 편견이 강해 젊은 층의 유입이 적음.', multi: true },
            { key: 'target', label: '타겟', placeholder: '커피를 좋아하지만 카페인 민감도가 높은 2030 직장인', multi: false },
            { key: 'campaign_info', label: '캠페인 방향', placeholder: '맛과 향을 모두 잡은 스위스 워터 프로세스 공법 강조', multi: true },
          ].map(({ key, label, placeholder, multi }) => (
            <div key={key}>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{label}</label>
              {multi
                ? <textarea value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={2}
                  className={inputClass + " resize-none"} />
                : <input type="text" value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} className={inputClass} />
              }
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">상금</label>
              <input type="text" value={form.reward} onChange={e => set('reward', e.target.value)} placeholder="₩ 1,000,000" className={inputClass} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">마감일</label>
              <DeadlinePicker value={form.deadline} onChange={v => set('deadline', v)} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 관리자 대시보드 ──────────────────────────────────────
function AdminPage() {
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('briefs').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setBriefs(data ?? []); setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('briefs').delete().eq('id', id);
    if (!error) setBriefs(p => p.filter(b => b.id !== id));
    else alert('삭제 오류: ' + error.message);
    setDeletingId(null); setConfirmId(null);
  };

  const toggleStatus = async (brief: Brief) => {
    const newStatus = brief.status === '진행중' ? '종료' : '진행중';
    const { error } = await supabase.from('briefs').update({ status: newStatus }).eq('id', brief.id);
    if (!error) setBriefs(p => p.map(b => b.id === brief.id ? { ...b, status: newStatus } : b));
  };

  const inputClass = "w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#05D560] transition-colors";

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className="sticky top-12 z-40 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={14} /> 뒤로
          </button>
          <span className="text-sm font-semibold">브리프 관리</span>
          <button onClick={() => navigate('/catchcopy/admin/brief/write')}
            className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-all"
            style={{ backgroundColor: KEY }}>
            <Edit3 size={11} /> 새 브리프
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* 요약 통계 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: '전체 브리프', value: briefs.length },
            { label: '진행중', value: briefs.filter(b => b.status === '진행중').length },
            { label: '종료', value: briefs.filter(b => b.status === '종료').length },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? <Spinner /> : briefs.length === 0 ? (
          <div className="text-center py-20 text-gray-300">
            <Megaphone size={32} className="mx-auto mb-3" />
            <p className="text-xs">등록된 브리프가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {briefs.map(brief => (
              <div key={brief.id} className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  {/* 썸네일 */}
                  <div className={cn("w-14 h-14 rounded-lg shrink-0 overflow-hidden", !brief.image_url && brief.bg_color)}>
                    {brief.image_url
                      ? <img src={brief.image_url} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Megaphone size={20} className="text-white/40" /></div>
                    }
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        brief.status === '진행중' ? "bg-[#05D560]/10 text-[#05D560]" : "bg-gray-100 text-gray-400")}>
                        {brief.status}
                      </span>
                      <span className="text-[10px] text-gray-400">{brief.category}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{brief.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{brief.company_name} · {brief.reward} · {brief.participants.toLocaleString()}명 참여</p>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* 상태 토글 */}
                    <button onClick={() => toggleStatus(brief)}
                      className={cn("text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all",
                        brief.status === '진행중'
                          ? "border-gray-200 text-gray-500 hover:border-gray-300"
                          : "border-[#05D560]/30 text-[#05D560] hover:bg-[#05D560]/5")}>
                      {brief.status === '진행중' ? '종료 처리' : '재개'}
                    </button>
                    {/* 수정 */}
                    <button onClick={() => navigate(`/catchcopy/admin/brief/edit/${brief.id}`)}
                      className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                      <Pencil size={11} /> 수정
                    </button>
                    {/* 삭제 */}
                    {confirmId === brief.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-red-400 font-medium">삭제?</span>
                        <button onClick={() => handleDelete(brief.id)}
                          disabled={deletingId === brief.id}
                          className="text-[11px] font-semibold text-red-500 hover:text-red-700 px-2 py-1.5 transition-colors disabled:opacity-40">
                          {deletingId === brief.id ? <Loader2 size={11} className="animate-spin" /> : '확인'}
                        </button>
                        <button onClick={() => setConfirmId(null)} className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors">취소</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmId(brief.id)}
                        className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-500 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 transition-all">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 브리프 수정 페이지 ────────────────────────────────────
function BriefEditPage() {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    company_name: '', title: '', problem: '', target: '', campaign_info: '',
    reward: '', deadline: '', category: 'F&B', status: '진행중' as '진행중' | '종료',
    image_url: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!briefId) return;
    supabase.from('briefs').select('*').eq('id', briefId).single().then(({ data }) => {
      if (data) {
        setForm({
          company_name: data.company_name, title: data.title, problem: data.problem,
          target: data.target, campaign_info: data.campaign_info, reward: data.reward,
          deadline: data.deadline, category: data.category, status: data.status,
          image_url: data.image_url ?? '',
        });
        if (data.image_url) setImagePreview(data.image_url);
      }
      setLoading(false);
    });
  }, [briefId]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = ['company_name', 'title', 'problem', 'target', 'campaign_info', 'reward', 'deadline'];
    if (required.some(k => !(form as any)[k].trim())) return alert('모든 항목을 입력해주세요.');
    setSubmitting(true);

    let image_url = form.image_url;
    if (imageFile) {
      const compressed = await imageCompression(imageFile, { maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: true });
      const ext = imageFile.name.split('.').pop();
      const path = `briefs/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('brief-images').upload(path, compressed, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from('brief-images').getPublicUrl(path);
        image_url = data.publicUrl;
      }
    }

    const { error } = await supabase.from('briefs').update({
      company_name: form.company_name, title: form.title, problem: form.problem,
      target: form.target, campaign_info: form.campaign_info, reward: form.reward,
      deadline: form.deadline, category: form.category, status: form.status,
      image_url: image_url || null,
    }).eq('id', briefId!);

    setSubmitting(false);
    if (!error) navigate('/catchcopy/admin');
    else alert('수정 오류: ' + error.message);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-12"><Spinner /></div>;

  const inputClass = "w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#05D560] transition-colors";

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className="sticky top-12 z-40 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <button onClick={() => navigate('/catchcopy/admin')} className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={14} /> 관리자
          </button>
          <span className="text-sm font-semibold">브리프 수정</span>
          <button onClick={handleSubmit} disabled={submitting}
            className="text-xs font-semibold text-white px-4 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-40 transition-all"
            style={{ backgroundColor: KEY }}>
            {submitting ? <Loader2 size={13} className="animate-spin" /> : '저장'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이미지 */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              브리프 이미지 <span className="text-gray-400 normal-case font-normal">(권장: 800×500px)</span>
            </p>
            <div onClick={() => fileRef.current?.click()}
              className={cn("relative cursor-pointer rounded-xl overflow-hidden border border-dashed transition-all",
                imagePreview ? "border-transparent" : "border-gray-200 hover:border-[#05D560]/50")}
              style={{ height: 180 }}>
              {imagePreview
                ? <img src={imagePreview} className="w-full h-full object-cover" />
                : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Upload size={20} />
                  <p className="text-xs">클릭해서 이미지 업로드</p>
                </div>
              }
              {imagePreview && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center">
                  <span className="text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full opacity-0 hover:opacity-100 transition-opacity">변경</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">상태</label>
              <div className="flex bg-gray-100 p-0.5 rounded-lg gap-0.5">
                {(['진행중', '종료'] as const).map(s => (
                  <button key={s} type="button" onClick={() => set('status', s)}
                    className={cn("flex-1 py-1.5 rounded-md text-xs font-semibold transition-all",
                      form.status === s ? "bg-white shadow-sm text-gray-800" : "text-gray-400")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">카테고리</label>
              <div className="relative">
                <select value={form.category} onChange={e => set('category', e.target.value)} className={inputClass + " appearance-none pr-7"}>
                  {BRIEF_CATS.filter(c => c !== '전체').map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {[
            { key: 'company_name', label: '회사명', placeholder: '카페인 (Cafe-In)', multi: false },
            { key: 'title', label: '브리프 제목', placeholder: 'MZ세대를 위한 새로운 디카페인 커피 브랜드 런칭', multi: false },
            { key: 'problem', label: '해결할 문제', placeholder: '기존 디카페인 커피는 맛이 없다는 편견이 강해 젊은 층의 유입이 적음.', multi: true },
            { key: 'target', label: '타겟', placeholder: '커피를 좋아하지만 카페인 민감도가 높은 2030 직장인', multi: false },
            { key: 'campaign_info', label: '캠페인 방향', placeholder: '맛과 향을 모두 잡은 스위스 워터 프로세스 공법 강조', multi: true },
          ].map(({ key, label, placeholder, multi }) => (
            <div key={key}>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{label}</label>
              {multi
                ? <textarea value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={2} className={inputClass + " resize-none"} />
                : <input type="text" value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} className={inputClass} />
              }
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">상금</label>
              <input type="text" value={form.reward} onChange={e => set('reward', e.target.value)} placeholder="₩ 1,000,000" className={inputClass} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">마감일</label>
              <DeadlinePicker value={form.deadline} onChange={v => set('deadline', v)} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 글쓰기/수정 ───────────────────────────────────────────
function WritePage() {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId?: string }>();
  const isEdit = !!postId;
  const [form, setForm] = useState({ title: '', category: '자유 게시판' });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [uploadingImage, setUploadingImage] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEdit) return;
    supabase.from('posts').select('*').eq('id', postId).single().then(({ data }) => {
      if (data) {
        setForm({ title: data.title, category: data.category });
        if (editorRef.current) editorRef.current.innerHTML = data.content;
      }
      setLoading(false);
    });
  }, [postId, isEdit]);

  const execCmd = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      // 압축
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });
      const ext = file.name.split('.').pop();
      const path = `posts/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('post-images').upload(path, compressed, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('post-images').getPublicUrl(path);
        execCmd('insertHTML', `<img src="${data.publicUrl}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`);
      }
    } catch (err) {
      alert('이미지 업로드 실패');
    }
    setUploadingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    const content = editorRef.current?.innerHTML ?? '';
    const textContent = editorRef.current?.innerText?.trim() ?? '';
    if (!form.title.trim() || !textContent || submitting) return;
    setSubmitting(true);
    if (isEdit) {
      await supabase.from('posts').update({ title: form.title.trim(), content, category: form.category }).eq('id', postId);
      navigate(`/catchcopy/community/post/${postId}`);
    } else {
      const { data } = await supabase.from('posts').insert({
        category: form.category, title: form.title.trim(), content,
        author: '나', avatar: 'ME', views: 0, likes: 0, dislikes: 0, is_pinned: false,
      }).select().single();
      if (data) navigate(`/catchcopy/community/post/${data.id}`);
      else navigate('/catchcopy/community');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-12"><Spinner /></div>;

  return (
    <div className="min-h-screen bg-white pt-12 flex flex-col">
      {/* 상단 바 — 취소만 */}
      <div className="sticky top-12 z-40 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={14} /> 취소
          </button>
          <span className="text-sm font-semibold">{isEdit ? '글 수정' : '새 글 작성'}</span>
          <div className="w-12" /> {/* 중앙 정렬용 spacer */}
        </div>
      </div>

      {/* 에디터 본문 */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col">
        {/* 카테고리 */}
        <div className="relative mb-4">
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600 appearance-none focus:outline-none focus:border-[#05D560] transition-colors">
            {CATEGORIES.filter(c => c !== '전체').map(c => <option key={c}>{c}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* 제목 */}
        <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="제목"
          className="w-full bg-transparent border-0 border-b border-gray-100 py-3 text-xl font-bold placeholder:text-gray-200 focus:outline-none focus:border-gray-300 transition-colors mb-4" />

        {/* 리치 에디터 */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => {}} // 리렌더 방지
          data-placeholder="내용을 작성하세요."
          className="flex-1 outline-none text-sm text-gray-700 leading-relaxed min-h-64"
          style={{ minHeight: 'calc(100vh - 420px)' }}
        />
      </div>

      {/* 하단 툴바 — 고정 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center gap-1">
          {/* 서식 버튼들 */}
          <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('bold'); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 font-bold text-sm transition-colors"
            title="굵게">B</button>
          <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('underline'); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 text-sm transition-colors underline"
            title="밑줄">U</button>
          <button type="button" onMouseDown={e => { e.preventDefault(); execCmd('hiliteColor', '#FEFF9C'); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 text-sm transition-colors"
            title="형광펜">
            <span className="text-sm font-bold" style={{ background: '#FEFF9C', padding: '0 3px', borderRadius: 2 }}>A</span>
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* 이미지 업로드 */}
          <button type="button" onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
            title="사진 삽입">
            {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

          {/* spacer */}
          <div className="flex-1" />

          {/* 등록 버튼 */}
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-30 transition-all active:scale-95"
            style={{ backgroundColor: KEY }}>
            {submitting ? <Loader2 size={13} className="animate-spin" /> : isEdit ? '저장' : '등록'}
          </button>
        </div>
      </div>

      {/* placeholder 스타일 */}
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #d1d5db;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

// ── 게시글 상세 ───────────────────────────────────────────
function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const voteKey = `vote_post_${postId}`;
  const [voted, setVoted] = useState<'like' | 'dislike' | null>(() => {
    try { return localStorage.getItem(voteKey) as 'like' | 'dislike' | null; } catch { return null; }
  });

  const fetchPost = useCallback(async () => {
    const { data } = await supabase.from('posts').select('*, comments(*, replies(*))').eq('id', postId).single();
    if (data) setPost(data);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    // 조회수 +1 후 fetchPost
    const incrementAndFetch = async () => {
      const { data } = await supabase.from('posts').select('views').eq('id', postId).single();
      if (data) await supabase.from('posts').update({ views: data.views + 1 }).eq('id', postId);
      await fetchPost();
    };
    incrementAndFetch();
    const ch = supabase.channel(`post-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, fetchPost)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, fetchPost)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId, fetchPost]);

  // 삭제
  const handleDeletePost = async () => {
    const { error } = await supabase.from('posts').delete().eq('id', postId!);
    if (!error) navigate('/catchcopy/community');
    else { alert('삭제 오류: ' + error.message); setConfirmDelete(false); }
  };

  // 추천/비추천 토글
  const handlePostVote = async (type: 'like' | 'dislike') => {
    if (!post) return;
    if (voted === type) {
      const col = type === 'like' ? 'likes' : 'dislikes';
      const cur = type === 'like' ? post.likes : (post.dislikes ?? 0);
      await supabase.from('posts').update({ [col]: Math.max(0, cur - 1) }).eq('id', postId);
      setVoted(null); try { localStorage.removeItem(voteKey); } catch {}
    } else {
      const updates: Record<string, number> = {};
      if (voted === 'like') updates['likes'] = Math.max(0, post.likes - 1);
      if (voted === 'dislike') updates['dislikes'] = Math.max(0, (post.dislikes ?? 0) - 1);
      if (type === 'like') updates['likes'] = (updates['likes'] ?? post.likes) + 1;
      else updates['dislikes'] = (updates['dislikes'] ?? (post.dislikes ?? 0)) + 1;
      await supabase.from('posts').update(updates).eq('id', postId);
      setVoted(type); try { localStorage.setItem(voteKey, type); } catch {}
    }
    fetchPost();
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await supabase.from('comments').insert({ post_id: postId, author: '나', avatar: 'ME', content: newComment.trim(), likes: 0 });
    setNewComment('');
  };
  const handleEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;
    await supabase.from('comments').update({ content: editCommentContent.trim() }).eq('id', commentId);
    setEditingCommentId(null); setEditCommentContent('');
  };
  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) alert('댓글 삭제 오류: ' + error.message);
  };
  const handleReply = async (commentId: string) => {
    if (!replyContent.trim()) return;
    await supabase.from('replies').insert({ comment_id: commentId, author: '나', avatar: 'ME', content: replyContent.trim(), likes: 0 });
    setReplyTo(null); setReplyContent('');
  };

  if (loading) return <div className="pt-12"><Spinner /></div>;
  if (!post) return <div className="pt-12 text-center py-20 text-sm text-gray-400">게시글을 찾을 수 없습니다.</div>;

  const sortedComments = [...(post.comments ?? [])].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/catchcopy/community')}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors mb-5">
          <ArrowLeft size={13} /> 목록
        </button>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              {post.is_pinned && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-900 text-white">공지</span>}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{post.category}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 leading-snug">{post.title}</h1>
            <div className="flex items-center justify-between pb-4 border-b border-gray-50">
              <div className="flex items-center gap-2.5">
                <Avatar name={post.avatar} size={8} />
                <div>
                  <p className="text-xs font-semibold text-gray-700">{post.author}</p>
                  <p className="text-[11px] text-gray-400">{timeAgo(post.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-400 flex items-center gap-1"><Eye size={11} /> {post.views.toLocaleString()}</span>
                <button onClick={() => navigate(`/catchcopy/community/edit/${post.id}`)}
                  className="text-[11px] text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
                  <Pencil size={11} /> 수정
                </button>
                {confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-red-400">삭제할까요?</span>
                    <button onClick={handleDeletePost} className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors">확인</button>
                    <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">취소</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)}
                    className="text-[11px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                    <Trash2 size={11} /> 삭제
                  </button>
                )}
              </div>
            </div>

            <div
                className="py-5 text-sm leading-relaxed text-gray-700"
                dangerouslySetInnerHTML={{ __html: post.content }}
                style={{ wordBreak: 'break-word' }}
              />

            {/* 추천/비추천 */}
            <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-50">
              <button onClick={() => handlePostVote('like')}
                className={cn("flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold border transition-all",
                  voted === 'like' ? "border-[#05D560] text-[#05D560] bg-[#05D560]/5" : "border-gray-200 text-gray-500 hover:border-gray-300")}>
                <ThumbsUp size={13} /> 추천 {post.likes}
              </button>
              <button onClick={() => handlePostVote('dislike')}
                className={cn("flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold border transition-all",
                  voted === 'dislike' ? "border-[#05D560] text-[#05D560] bg-[#05D560]/5" : "border-gray-200 text-gray-500 hover:border-gray-300")}>
                비추천 {post.dislikes ?? 0}
              </button>
            </div>
          </div>
        </div>

        {/* 댓글 */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <span className="text-sm font-semibold text-gray-800">댓글 {sortedComments.length}</span>
          </div>

          <div className="p-5">
            <form onSubmit={handleComment} className="flex gap-3 mb-6">
              <Avatar name="ME" size={8} />
              <div className="flex-1 relative">
                <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder="댓글을 입력하세요." rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#05D560] transition-colors" />
                <button type="submit" disabled={!newComment.trim()}
                  className="absolute bottom-2 right-2 px-3 py-1 text-xs font-semibold text-white rounded-md disabled:opacity-30 transition-all"
                  style={{ backgroundColor: KEY }}>등록</button>
              </div>
            </form>

            <div className="space-y-5">
              {sortedComments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar name={comment.avatar} size={8} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">{comment.author}</span>
                        <span className="text-[11px] text-gray-400">{timeAgo(comment.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); }}
                          className="text-gray-300 hover:text-gray-500 transition-colors"><Pencil size={11} /></button>
                        <button onClick={() => handleDeleteComment(comment.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                      </div>
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="mb-2">
                        <textarea value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)} rows={2}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#05D560] transition-colors" />
                        <div className="flex justify-end gap-2 mt-1.5">
                          <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>
                          <button onClick={() => handleEditComment(comment.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-white px-2.5 py-1 rounded-md"
                            style={{ backgroundColor: KEY }}>
                            <Check size={10} /> 저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 leading-relaxed break-words mb-2">{comment.content}</p>
                    )}
                    <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors">답글</button>
                    {replyTo === comment.id && (
                      <div className="flex gap-2 mt-3">
                        <Avatar name="ME" size={7} />
                        <div className="flex-1">
                          <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="답글을 입력하세요." rows={2}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#05D560] transition-colors" />
                          <div className="flex justify-end gap-2 mt-1.5">
                            <button onClick={() => setReplyTo(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>
                            <button onClick={() => handleReply(comment.id)} disabled={!replyContent.trim()}
                              className="text-xs font-semibold text-white px-2.5 py-1 rounded-md disabled:opacity-30"
                              style={{ backgroundColor: KEY }}>등록</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {(comment.replies ?? []).length > 0 && (
                      <div className="mt-3 space-y-3 pl-3 border-l border-gray-100">
                        {[...(comment.replies ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(reply => (
                          <div key={reply.id} className="flex gap-2">
                            <Avatar name={reply.avatar} size={7} />
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-gray-700">{reply.author}</span>
                                <span className="text-[11px] text-gray-400">{timeAgo(reply.created_at)}</span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed break-words">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main AppInner ──────────────────────────────────────────
function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab: 'home' | 'brief' | 'community' = location.pathname.startsWith('/catchcopy/brief') ? 'brief'
    : location.pathname.startsWith('/catchcopy/community') ? 'community' : 'home';

  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [activeBriefCat, setActiveBriefCat] = useState('전체');
  const [briefStatusFilter, setBriefStatusFilter] = useState<'전체' | '진행중' | '종료'>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'popular'>('latest');
  const [briefsLoading, setBriefsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [stats, setStats] = useState({ activeBriefs: 0, monthlyUsers: 0 });
  const [hotPosts, setHotPosts] = useState<Post[]>([]);

  useEffect(() => {
    supabase.from('briefs').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      const d = data ?? []; setBriefs(d); setBriefsLoading(false);
      setStats({ activeBriefs: d.filter(b => b.status === '진행중').length, monthlyUsers: d.reduce((s, b) => s + b.participants, 0) });
    });
    const ch = supabase.channel('briefs-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'briefs' }, ({ eventType, new: nr, old: or }) => {
        if (eventType === 'INSERT') setBriefs(p => [nr as Brief, ...p]);
        else if (eventType === 'UPDATE') setBriefs(p => p.map(b => b.id === (nr as Brief).id ? nr as Brief : b));
        else if (eventType === 'DELETE') setBriefs(p => p.filter(b => b.id !== (or as Brief).id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    supabase.from('posts').select('*, comments(*, replies(*))').order('created_at', { ascending: false }).then(({ data }) => {
      const d = data ?? [];
      setPosts(d); setPostsLoading(false);
      // 5시간 이내 게시글 중 점수(조회수 30% + 좋아요 70%) 상위 5개
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const score = (p: Post) => (p.views ?? 0) * 0.3 + (p.likes ?? 0) * 0.7;
      const hot = [...d]
        .filter(p => new Date(p.created_at) >= fiveHoursAgo)
        .sort((a, b) => score(b) - score(a))
        .slice(0, 5);
      // 5시간 내 글이 5개 미만이면 전체에서 채우기
      if (hot.length < 5) {
        const extra = [...d]
          .filter(p => !hot.find(h => h.id === p.id))
          .sort((a, b) => score(b) - score(a))
          .slice(0, 5 - hot.length);
        setHotPosts([...hot, ...extra]);
      } else {
        setHotPosts(hot);
      }
    });
    const ch = supabase.channel('posts-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async () => {
        const { data } = await supabase.from('posts').select('*, comments(*, replies(*))').order('created_at', { ascending: false });
        const d = data ?? [];
        setPosts(d);
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
        const score2 = (p: Post) => (p.views ?? 0) * 0.3 + (p.likes ?? 0) * 0.7;
        const hot = [...d].filter(p => new Date(p.created_at) >= fiveHoursAgo).sort((a, b) => score2(b) - score2(a)).slice(0, 5);
        if (hot.length < 5) {
          const extra = [...d].filter(p => !hot.find(h => h.id === p.id)).sort((a, b) => score2(b) - score2(a)).slice(0, 5 - hot.length);
          setHotPosts([...hot, ...extra]);
        } else setHotPosts(hot);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filteredBriefs = useMemo(() => briefs.filter(b =>
    (briefStatusFilter === '전체' || b.status === briefStatusFilter) &&
    (activeBriefCat === '전체' || b.category === activeBriefCat)
  ), [briefs, briefStatusFilter, activeBriefCat]);

  const filteredPosts = useMemo(() => {
    const f = posts.filter(p =>
      (activeCategory === '전체' || p.category === activeCategory) &&
      (!searchQuery || p.title.includes(searchQuery) || p.author.includes(searchQuery))
    );
    return [...f].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return sortOrder === 'popular'
        ? (b.likes ?? 0) - (a.likes ?? 0)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [posts, activeCategory, searchQuery, sortOrder]);

  const homeBriefs = useMemo(() => briefs.filter(b => b.status === '진행중').slice(0, 4), [briefs]);
  const { darkMode } = useContext(AppContext);
  const dm = darkMode;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: dm ? D.bg : '#f9fafb', color: dm ? D.text : '#111' }}>
      <main className="pt-12 flex-1">

        {/* ── HOME ── */}
        {activeTab === 'home' && (
          <div className="overflow-y-scroll" style={{ height: 'calc(100vh - 48px)', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}>
            {/* 히어로 */}
            <section className="px-4 text-center flex flex-col items-center justify-center border-b transition-colors" style={{ minHeight: 'calc(100vh - 48px)', scrollSnapAlign: 'start', scrollSnapStop: 'always', backgroundColor: dm ? D.card : 'white', borderColor: dm ? D.border : '#f3f4f6' }}>
              <div className="max-w-2xl mx-auto w-full">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-tight">
                  돈이 되는 한 줄의 문장,<br />캐치카피
                </h2>
                <p className="text-sm sm:text-base text-gray-500 mb-10 leading-relaxed">브랜드의 고민을 해결하는 한 줄의 카피.<br />지금 바로 도전하고 보상을 쟁취하세요.</p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => navigate('/catchcopy/brief')}
                    className="text-sm font-semibold text-white px-6 py-3 rounded-lg hover:opacity-90 transition-all active:scale-95"
                    style={{ backgroundColor: KEY }}>
                    브리프 보기
                  </button>
                  <button className="text-sm font-medium text-gray-600 px-6 py-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                    더 알아보기
                  </button>
                </div>
                {/* 스크롤 유도 */}
                <div className="mt-16 flex flex-col items-center gap-1.5 text-gray-300 animate-bounce">
                  <ChevronDown size={18} />
                  <span className="text-[11px]">스크롤해서 브리프 보기</span>
                </div>
              </div>
            </section>

            {/* 통계 + 브리프 그리드 — 두 번째 스냅 포인트 */}
            <div style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
            {/* 통계 */}
            <section className="border-b transition-colors" style={{ backgroundColor: dm ? D.card : 'white', borderColor: dm ? D.border : '#f3f4f6' }}>
              <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-3" style={{ divideColor: dm ? D.border : '#f3f4f6' }}>
                {[
                  { label: '진행중인 브리프', value: `${stats.activeBriefs}개`, icon: <Zap size={13} /> },
                  { label: '이번 달 참여자', value: `${stats.monthlyUsers.toLocaleString()}명`, icon: <Users size={13} /> },
                  { label: '지급된 총 상금', value: '₩48M', icon: <Star size={13} /> },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 sm:px-8">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">{s.icon}</div>
                    <div>
                      <p className="text-sm sm:text-base font-bold">{s.value}</p>
                      <p className="text-[10px] sm:text-xs text-gray-400">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 브리프 그리드 */}
            <section className="max-w-6xl mx-auto px-4 py-8">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold">참여 가능한 브리프</h3>
                <button onClick={() => navigate('/catchcopy/brief')}
                  className="text-xs font-medium text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
                  전체보기 <ChevronRight size={12} />
                </button>
              </div>
              {briefsLoading ? <Spinner /> : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {homeBriefs.map((brief, i) => (
                    <BriefCard key={brief.id} brief={brief} large={i === 0} onClick={() => navigate(`/catchcopy/brief/${brief.id}`)} />
                  ))}
                </div>
              )}
            </section>
            </div> {/* 두 번째 스냅 섹션 끝 */}
          </div>
        )}

        {/* ── BRIEF ── */}
        {activeTab === 'brief' && (
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold mb-0.5">브리프 아카이브</h2>
                <p className="text-xs text-gray-400">진행 중인 카피 공모전에 참여하세요.</p>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                <div className="flex bg-gray-100 p-0.5 rounded-lg gap-0.5 shrink-0">
                  {(['전체', '진행중', '종료'] as const).map(f => (
                    <button key={f} onClick={() => setBriefStatusFilter(f)}
                      className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
                        briefStatusFilter === f ? "bg-white shadow-sm text-gray-800" : "text-gray-400")}>
                      {f}
                    </button>
                  ))}
                </div>
                <div className="w-px h-4 bg-gray-200 shrink-0" />
                {BRIEF_CATS.map(cat => (
                  <button key={cat} onClick={() => setActiveBriefCat(cat)}
                    className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0",
                      activeBriefCat === cat ? "text-white" : "text-gray-400 hover:text-gray-700")}
                    style={activeBriefCat === cat ? { backgroundColor: KEY } : {}}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            {briefsLoading ? <Spinner /> : filteredBriefs.length === 0 ? (
              <div className="text-center py-20 text-gray-300">
                <Megaphone size={32} className="mx-auto mb-3" />
                <p className="text-xs">해당하는 브리프가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 상위 2개 대형 */}
                {filteredBriefs.length >= 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredBriefs.slice(0, 2).map(brief => (
                      <BriefCard key={brief.id} large brief={brief} onClick={() => navigate(`/catchcopy/brief/${brief.id}`)} />
                    ))}
                  </div>
                )}
                {filteredBriefs.length > 2 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredBriefs.slice(2).map(brief => (
                      <BriefCard key={brief.id} brief={brief} onClick={() => navigate(`/catchcopy/brief/${brief.id}`)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── COMMUNITY ── */}
        {activeTab === 'community' && (
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* 모바일 카테고리 */}
            <div className="flex lg:hidden gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={cn("whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border",
                    activeCategory === cat ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-500")}
                  style={activeCategory === cat ? { backgroundColor: KEY } : {}}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              {/* 사이드바 (데스크톱) */}
              <aside className="hidden lg:block lg:col-span-1">
                <div className="rounded-xl p-4 lg:sticky lg:top-16 border" style={{ backgroundColor: dm ? D.card : 'white', borderColor: dm ? D.border : '#f3f4f6' }}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">게시판</p>
                  <div className="space-y-0.5">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={cn("w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all",
                          activeCategory === cat ? "text-[#05D560] bg-[#05D560]/8" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50")}>
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* 인기글 */}
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 mb-3">
                      <TrendingUp size={11} className="text-[#05D560]" />
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">인기글 TOP 5</p>
                      <span className="text-[9px] text-gray-300 ml-auto">5시간 내</span>
                    </div>
                    {hotPosts.length === 0 ? (
                      <p className="text-[11px] text-gray-300 text-center py-3">아직 인기글이 없어요.</p>
                    ) : (
                      <div className="space-y-2">
                        {hotPosts.map((post, idx) => (
                          <button key={post.id} onClick={() => navigate(`/catchcopy/community/post/${post.id}`)}
                            className="w-full text-left flex items-start gap-2 group">
                            <span className={cn("text-[11px] font-bold shrink-0 w-4 mt-0.5",
                              idx === 0 ? "text-[#05D560]" : idx === 1 ? "text-gray-500" : idx === 2 ? "text-orange-400" : "text-gray-300")}>
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] text-gray-600 group-hover:text-gray-900 leading-snug line-clamp-2 transition-colors">
                                {post.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                  <ThumbsUp size={9} /> {post.likes}
                                </span>
                                <span className="text-[10px] text-gray-300">{post.category}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </aside>

              <div className="lg:col-span-3">
                {/* 컨트롤 바 */}
                <div className="flex items-center justify-between mb-4 gap-3">
                  <h2 className="text-base font-bold shrink-0">{activeCategory}</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 p-0.5 rounded-lg gap-0.5">
                      <button onClick={() => setSortOrder('latest')}
                        className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                          sortOrder === 'latest' ? "bg-white shadow-sm text-gray-800" : "text-gray-400")}>
                        <Clock3 size={10} /> 최신
                      </button>
                      <button onClick={() => setSortOrder('popular')}
                        className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                          sortOrder === 'popular' ? "bg-white shadow-sm text-gray-800" : "text-gray-400")}>
                        <TrendingUp size={10} /> 인기
                      </button>
                    </div>
                    <div className="relative">
                      <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="검색"
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-24 sm:w-32 focus:outline-none focus:border-[#05D560] transition-colors pr-6" />
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={11} />
                    </div>
                    <button onClick={() => navigate('/catchcopy/community/write')}
                      className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-colors shrink-0"
                      style={{ backgroundColor: KEY }}>
                      <Edit3 size={11} /> <span className="hidden sm:inline">글쓰기</span>
                    </button>
                  </div>
                </div>

                {/* 게시글 목록 */}
                {postsLoading ? <Spinner /> : (
                  <div className="space-y-2">
                    {filteredPosts.length === 0 ? (
                      <div className="text-center py-16 text-gray-300">
                        <MessageSquare size={28} className="mx-auto mb-3" />
                        <p className="text-xs">게시글이 없습니다.</p>
                      </div>
                    ) : filteredPosts.map(post => (
                      <motion.div key={post.id} whileTap={{ scale: 0.995 }}
                        onClick={() => navigate(`/catchcopy/community/post/${post.id}`)}
                        className="rounded-xl px-4 py-3.5 cursor-pointer transition-all border" style={{ backgroundColor: dm ? D.card : 'white', borderColor: dm ? D.border : '#f3f4f6' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {post.is_pinned && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-900 text-white">공지</span>}
                              <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{post.category}</span>
                            </div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-1.5 leading-snug">{post.title}</h4>
                            <div className="flex items-center gap-2 text-[11px] text-gray-400">
                              <span>{post.author}</span>
                              <span>·</span>
                              <span>{timeAgo(post.created_at)}</span>
                              <span>·</span>
                              <span className="flex items-center gap-0.5"><Eye size={10} /> {post.views.toLocaleString()}</span>
                              <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {(post.comments ?? []).length}</span>
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-center gap-0.5 text-[11px] text-gray-400 min-w-[36px] text-center">
                            <ThumbsUp size={11} />
                            <span className="font-semibold text-gray-600">{post.likes}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t py-6 mt-8 transition-colors" style={{ backgroundColor: dm ? D.card : 'white', borderColor: dm ? D.border : '#f3f4f6' }}>
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <img src={dm ? "/logo2.png" : "/logo.png"} alt="CatchCopy" className="h-4 w-auto object-contain" />
          <p className="text-[11px] text-gray-400">© 2026 CATCHCOPY. All rights reserved.</p>
          <div className="flex gap-4 text-[11px] text-gray-400">
            <span className="hover:text-gray-600 cursor-pointer transition-colors">개인정보처리방침</span>
            <span className="hover:text-gray-600 cursor-pointer transition-colors">이용약관</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try { const s = localStorage.getItem('cc_user'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('cc_dark') === '1');

  const toggleDarkMode = () => {
    setDarkMode(d => {
      localStorage.setItem('cc_dark', d ? '0' : '1');
      return !d;
    });
  };

  return (
    <AppContext.Provider value={{ user, setUser, darkMode, toggleDarkMode }}>
      <div style={{ minHeight: '100vh', backgroundColor: darkMode ? D.bg : 'white', color: darkMode ? D.text : '#111', transition: 'background-color 0.3s, color 0.3s' }}>
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/catchcopy/login" element={<LoginPage />} />
            <Route path="/catchcopy/mypage" element={<MyPage />} />
            <Route path="/catchcopy/admin" element={<AdminPage />} />
            <Route path="/catchcopy/admin/brief/write" element={<BriefWritePage />} />
            <Route path="/catchcopy/admin/brief/edit/:briefId" element={<BriefEditPage />} />
            <Route path="/catchcopy/brief/:briefId" element={<BriefPage />} />
            <Route path="/catchcopy/community/post/:postId" element={<PostDetail />} />
            <Route path="/catchcopy/community/write" element={<WritePage />} />
            <Route path="/catchcopy/community/edit/:postId" element={<WritePage />} />
            <Route path="/catchcopy/*" element={<AppInner />} />
            <Route path="*" element={<AppInner />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AppContext.Provider>
  );
}
