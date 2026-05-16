/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, Users, ChevronRight,
  ThumbsUp, ThumbsDown, Search, Send, Building2, ArrowLeft,
  Clock, Eye, Edit3, X, ChevronDown, Megaphone,
  BarChart2, Zap, Star, Loader2, Menu, Trash2, Pencil, Check, TrendingUp, Clock3
} from 'lucide-react';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';

// ── 타입 정의 ──────────────────────────────────────────────
interface Brief {
  id: string; company_name: string; title: string; problem: string;
  target: string; campaign_info: string; reward: string; deadline: string;
  participants: number; status: '진행중' | '종료'; category: string; bg_color: string;
}
interface CopyEntry {
  id: string; brief_id: string; author: string; content: string;
  upvotes: number; downvotes: number; created_at: string;
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

// 팁&노하우, 질문&답변 제거
const CATEGORIES = ['전체', '크리에이터 토크', '자유 게시판', '브랜드 뉴스'];
const BRIEF_CATS = ['전체', 'F&B', '핀테크', '라이프스타일', '패션'];

const timeAgo = (ts: string) => {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};
const PALETTE = ['bg-slate-600', 'bg-zinc-700', 'bg-stone-600', 'bg-neutral-700', 'bg-gray-700'];
const getAvatarColor = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

// ── 공통 컴포넌트 ──────────────────────────────────────────
function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
      className={cn('rounded-full flex items-center justify-center text-white text-xs font-black shrink-0', getAvatarColor(name))}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
function Spinner() {
  return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-gray-300" /></div>;
}

// ── 공통 헤더 ──────────────────────────────────────────────
function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeTab = (() => {
    if (location.pathname.startsWith('/catchcopy/brief')) return 'brief';
    if (location.pathname.startsWith('/catchcopy/community')) return 'community';
    return 'home';
  })();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/catchcopy')} className="flex items-center">
            <img src="/logo.png" alt="CatchCopy" className="h-5 w-auto object-contain" />
          </button>
          <nav className="hidden md:flex items-center gap-1">
            {[{ id: 'brief', label: '브리프' }, { id: 'community', label: '커뮤니티' }].map(tab => (
              <button key={tab.id} onClick={() => navigate(`/catchcopy/${tab.id}`)}
                className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                  activeTab === tab.id ? "bg-gray-100 text-black" : "text-gray-400 hover:text-black hover:bg-gray-50")}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button className="hidden sm:block text-sm font-bold text-gray-400 hover:text-black px-3 py-1.5 transition-colors">로그인</button>
          <button onClick={() => navigate('/catchcopy/community/write')}
            className="hidden sm:flex items-center gap-1.5 bg-black text-white text-sm font-black px-4 py-2 rounded-lg hover:bg-gray-800 active:scale-95 transition-all">
            <Edit3 size={13} /> 글쓰기
          </button>
          <button onClick={() => setMobileMenuOpen(v => !v)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
            <div className="pt-3 space-y-1">
              {[{ id: 'brief', label: '브리프' }, { id: 'community', label: '커뮤니티' }].map(tab => (
                <button key={tab.id} onClick={() => { navigate(`/catchcopy/${tab.id}`); setMobileMenuOpen(false); }}
                  className={cn("w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all",
                    activeTab === tab.id ? "bg-gray-100 text-black" : "text-gray-500 hover:bg-gray-50")}>
                  {tab.label}
                </button>
              ))}
              <button onClick={() => { navigate('/catchcopy/community/write'); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-black text-black bg-gray-50 hover:bg-gray-100 transition-all flex items-center gap-2">
                <Edit3 size={14} /> 글쓰기
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all">
                로그인
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ── 브리프 카드 ──────────────────────────────────────────
// Sana 스타일 대형 브리프 카드
function BriefCard({ brief, onClick }: { brief: Brief; onClick: () => void }) {
  return (
    <motion.div
      whileHover="hover"
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="cursor-pointer group relative rounded-3xl overflow-hidden"
      style={{ aspectRatio: '4/3' }}
    >
      {/* 배경 */}
      <div className={cn("absolute inset-0 transition-transform duration-500 group-hover:scale-105", brief.bg_color)} />

      {/* 중앙 아이콘 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-3xl bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-lg opacity-60 group-hover:opacity-30 transition-opacity duration-300">
          <Megaphone size={28} className="text-gray-700" />
        </div>
      </div>

      {/* 좌하단: 회사명 + 제목 */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
        <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">{brief.company_name}</p>
        <h4 className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2">{brief.title}</h4>
        <div className="flex items-center gap-3 mt-2">
          <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full",
            brief.status === '진행중' ? "bg-[#00BE00] text-white" : "bg-white/20 text-white/70")}>
            {brief.status}
          </span>
          <span className="text-[10px] font-bold text-white/70 flex items-center gap-1">
            <Users size={9} /> {brief.participants.toLocaleString()}명
          </span>
        </div>
      </div>

      {/* 우상단: 참여하기 버튼 + 상금 */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <motion.div
          variants={{ hover: { scale: 1.05 } }}
          className="bg-black text-white text-xs font-black px-4 py-2 rounded-full shadow-lg"
        >
          참여하기 →
        </motion.div>
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/90 text-gray-800 shadow">
          {brief.reward}
        </span>
      </div>

      {/* 좌상단: 마감 */}
      {brief.status === '진행중' && (
        <div className="absolute top-4 left-4">
          <span className="text-[10px] font-bold text-white/80 flex items-center gap-1 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <Clock size={9} /> {brief.deadline}
          </span>
        </div>
      )}

      {/* 호버 오버레이 */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-3xl" />
    </motion.div>
  );
}

// ── 브리프 상세 페이지 ──────────────────────────────────
function BriefPage() {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [copies, setCopies] = useState<CopyEntry[]>([]);
  const [newCopy, setNewCopy] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!briefId) return;
    supabase.from('briefs').select('*').eq('id', briefId).single().then(({ data }) => {
      setBrief(data); setBriefLoading(false);
    });
  }, [briefId]);

  useEffect(() => {
    if (!briefId) return;
    setLoading(true);
    supabase.from('copies').select('*').eq('brief_id', briefId).order('created_at', { ascending: false })
      .then(({ data }) => { setCopies(data ?? []); setLoading(false); });
    const ch = supabase.channel(`copies-${briefId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'copies', filter: `brief_id=eq.${briefId}` },
        ({ eventType, new: nr, old: or }) => {
          if (eventType === 'INSERT') setCopies(p => [nr as CopyEntry, ...p]);
          else if (eventType === 'UPDATE') setCopies(p => p.map(c => c.id === (nr as CopyEntry).id ? nr as CopyEntry : c));
          else if (eventType === 'DELETE') setCopies(p => p.filter(c => c.id !== (or as CopyEntry).id));
        }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [briefId]);

  const sorted = useMemo(() => [...copies].sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)), [copies]);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const handleSubmitCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCopy.trim() || submitting) return;
    setSubmitting(true);
    await supabase.from('copies').insert({ brief_id: briefId, author: '나', content: newCopy.trim(), upvotes: 0, downvotes: 0 });
    setNewCopy(''); setSubmitting(false);
  };

  const handleVote = async (id: string, delta: number) => {
    const copy = copies.find(c => c.id === id);
    if (!copy) return;
    if (delta > 0) await supabase.from('copies').update({ upvotes: copy.upvotes + 1 }).eq('id', id);
    else await supabase.from('copies').update({ downvotes: copy.downvotes + 1 }).eq('id', id);
  };

  if (briefLoading) return <div className="min-h-screen flex items-center justify-center pt-14"><Spinner /></div>;
  if (!brief) return <div className="min-h-screen flex items-center justify-center pt-14 text-gray-400">브리프를 찾을 수 없습니다.</div>;

  const MEDAL = ['🥇', '🥈', '🥉'];
  const MEDAL_BG = ['bg-amber-50 border-amber-200', 'bg-gray-50 border-gray-200', 'bg-orange-50 border-orange-200'];
  const MEDAL_RANK_BG = ['bg-amber-400 text-white', 'bg-gray-400 text-white', 'bg-orange-400 text-white'];

  return (
    <div className="min-h-screen bg-white pt-14">

      {/* ── 풀스크린 헤더 배너 ── */}
      <div className={cn("relative w-full", brief.bg_color)} style={{ minHeight: '40vh' }}>
        {/* 뒤로 */}
        <button onClick={() => navigate('/catchcopy/brief')}
          className="absolute top-5 left-5 z-10 flex items-center gap-2 text-sm font-bold bg-white/80 backdrop-blur text-gray-700 hover:text-black px-3 py-2 rounded-xl transition-colors shadow-sm">
          <ArrowLeft size={15} /> 목록
        </button>

        {/* 중앙 메가폰 아이콘 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <Megaphone size={180} className="text-black" />
        </div>

        {/* 카테고리 + 상태 */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-black/10 backdrop-blur text-white uppercase tracking-widest">{brief.category}</span>
          <span className={cn("text-xs font-black px-3 py-1.5 rounded-full",
            brief.status === '진행중' ? "bg-[#00BE00] text-white" : "bg-white/30 text-white")}>
            {brief.status}
          </span>
        </div>

        {/* 하단: 회사명 + 제목 + 상금 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <p className="text-xs sm:text-sm font-black text-white/60 uppercase tracking-widest mb-2">{brief.company_name}</p>
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight max-w-2xl">{brief.title}</h1>
            <div className="text-right shrink-0">
              <p className="text-2xl sm:text-3xl font-black text-white">{brief.reward}</p>
              <p className="text-xs font-bold text-white/60">{brief.participants.toLocaleString()}명 참여</p>
            </div>
          </div>
          {brief.status === '진행중' && (
            <div className="inline-flex items-center gap-2 mt-3 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full">
              <Clock size={12} className="text-white" />
              <p className="text-xs font-black text-white">{brief.deadline}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 2단 레이아웃: 좌=브리프 정보, 우=카피 경쟁 ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

          {/* 좌: 브리프 상세 */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">해결할 문제</p>
              <p className="text-sm font-bold text-gray-800 leading-relaxed">{brief.problem}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">타겟</p>
              <p className="text-sm font-bold text-gray-700 leading-relaxed">{brief.target}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">캠페인 방향</p>
              <p className="text-sm font-bold text-gray-700 leading-relaxed">{brief.campaign_info}</p>
            </div>

            {/* 카피 제출 폼 */}
            {brief.status === '진행중' && (
              <div className="pt-2">
                <p className="text-sm font-black mb-3">✍️ 내 카피 제출</p>
                <form onSubmit={handleSubmitCopy} className="relative">
                  <input type="text" value={newCopy} onChange={e => setNewCopy(e.target.value)}
                    placeholder="당신의 한 줄을 제안하세요."
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-5 py-4 pr-14 text-sm font-bold focus:outline-none focus:border-black transition-all" />
                  <button type="submit"
                    className={cn("absolute right-2 top-2 bottom-2 w-11 rounded-xl flex items-center justify-center transition-all",
                      newCopy.trim() && !submitting ? "bg-black text-white" : "bg-gray-200 text-gray-400 pointer-events-none")}>
                    {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* 우: 실시간 카피 경쟁 */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-6">
              <BarChart2 size={16} className="text-gray-400" />
              <p className="text-base font-black">실시간 경쟁 랭킹</p>
              <span className="ml-auto text-xs font-bold text-gray-400">{sorted.length}개 참여</span>
              {sorted.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#00BE00] animate-pulse" />
              )}
            </div>

            {loading ? <Spinner /> : sorted.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-3xl">
                <p className="text-3xl mb-3">✍️</p>
                <p className="text-sm font-black text-gray-400">첫 번째 카피를 제출해보세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 🥇🥈🥉 포디움 TOP 3 */}
                {top3.map((copy, idx) => (
                  <motion.div key={copy.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("p-5 rounded-2xl border-2 transition-all", MEDAL_BG[idx])}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* 메달 뱃지 */}
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5 shadow-sm", MEDAL_RANK_BG[idx])}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{MEDAL[idx]}</span>
                            {idx === 0 && (
                              <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">1위</span>
                            )}
                          </div>
                          <p className="text-sm sm:text-base font-black text-gray-900 leading-snug break-words">"{copy.content}"</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-1.5">{copy.author}</p>
                        </div>
                      </div>
                      {/* 추천/비추천 */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <button onClick={() => handleVote(copy.id, 1)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-gray-500 hover:text-[#00BE00] hover:bg-[#00BE00]/10 transition-all border border-transparent hover:border-[#00BE00]/20">
                          <ThumbsUp size={13} /> {copy.upvotes}
                        </button>
                        <button onClick={() => handleVote(copy.id, -1)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-200">
                          <ThumbsDown size={13} /> {copy.downvotes}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* 4위 이하 */}
                {rest.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">그 외 참여작</p>
                    {rest.map((copy, idx) => (
                      <motion.div key={copy.id}
                        layout
                        className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 transition-all">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500 shrink-0">{idx + 4}</span>
                        <p className="text-sm font-bold text-gray-700 flex-1 break-words min-w-0">"{copy.content}"</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleVote(copy.id, 1)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-black text-gray-400 hover:text-[#00BE00] hover:bg-[#00BE00]/10 transition-all">
                            <ThumbsUp size={11} /> {copy.upvotes}
                          </button>
                          <button onClick={() => handleVote(copy.id, -1)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-black text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                            <ThumbsDown size={11} /> {copy.downvotes}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 글쓰기 / 수정 페이지 ──────────────────────────────────
function WritePage() {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId?: string }>();
  const isEdit = !!postId;
  const [form, setForm] = useState({ title: '', content: '', category: '자유 게시판' });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  // 수정 모드면 기존 글 로드
  useEffect(() => {
    if (!isEdit) return;
    supabase.from('posts').select('*').eq('id', postId).single().then(({ data }) => {
      if (data) setForm({ title: data.title, content: data.content, category: data.category });
      setLoading(false);
    });
  }, [postId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || submitting) return;
    setSubmitting(true);
    if (isEdit) {
      await supabase.from('posts').update({
        title: form.title.trim(), content: form.content.trim(), category: form.category,
      }).eq('id', postId);
      navigate(`/catchcopy/community/post/${postId}`);
    } else {
      const { data } = await supabase.from('posts').insert({
        category: form.category, title: form.title.trim(), content: form.content.trim(),
        author: '나', avatar: 'ME', views: 0, likes: 0, dislikes: 0, is_pinned: false,
      }).select().single();
      if (data) navigate(`/catchcopy/community/post/${data.id}`);
      else navigate('/catchcopy/community');
    }
    setSubmitting(false);
  };

  const canSubmit = form.title.trim() && form.content.trim() && !submitting;

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-14"><Spinner /></div>;

  return (
    <div className="min-h-screen bg-white pt-14">
      <div className="sticky top-14 z-40 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors">
            <ArrowLeft size={16} /> 취소
          </button>
          <h2 className="text-sm font-black">{isEdit ? '글 수정' : '새 글 작성'}</h2>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className={cn("px-5 py-2 text-sm font-black rounded-xl transition-all",
              canSubmit ? "bg-black text-white hover:bg-gray-800 active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : isEdit ? '저장' : '등록'}
          </button>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all text-gray-700">
              {CATEGORIES.filter(c => c !== '전체').map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="제목을 입력하세요."
            className="w-full bg-transparent border-0 border-b-2 border-gray-100 px-0 py-3 text-xl sm:text-2xl font-black placeholder:text-gray-200 focus:outline-none focus:border-black transition-colors" />
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="내용을 자유롭게 작성하세요."
            className="w-full bg-transparent border-0 px-0 py-3 text-base text-gray-700 font-medium placeholder:text-gray-300 focus:outline-none resize-none leading-relaxed"
            style={{ minHeight: 'calc(100vh - 320px)' }} />
        </form>
      </div>
    </div>
  );
}

// ── 게시글 상세 페이지 ──────────────────────────────────
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

  const fetchPost = useCallback(async () => {
    const { data } = await supabase.from('posts').select('*, comments(*, replies(*))').eq('id', postId).single();
    if (data) setPost(data);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    supabase.from('posts').select('views').eq('id', postId).single().then(({ data }) => {
      if (data) supabase.from('posts').update({ views: data.views + 1 }).eq('id', postId);
    });
    fetchPost();
    const ch = supabase.channel(`post-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, fetchPost)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, fetchPost)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId, fetchPost]);

  // 게시글 추천/비추천
  const handlePostVote = async (type: 'like' | 'dislike') => {
    if (!post) return;
    if (type === 'like') await supabase.from('posts').update({ likes: post.likes + 1 }).eq('id', postId);
    else await supabase.from('posts').update({ dislikes: (post.dislikes ?? 0) + 1 }).eq('id', postId);
    fetchPost();
  };

  // 게시글 삭제
  const handleDeletePost = async () => {
    await supabase.from('posts').delete().eq('id', postId);
    navigate('/catchcopy/community');
  };

  // 댓글 등록
  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await supabase.from('comments').insert({ post_id: postId, author: '나', avatar: 'ME', content: newComment.trim(), likes: 0 });
    setNewComment('');
  };

  // 댓글 수정
  const handleEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;
    await supabase.from('comments').update({ content: editCommentContent.trim() }).eq('id', commentId);
    setEditingCommentId(null); setEditCommentContent('');
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId);
  };

  // 답글 등록
  const handleReply = async (commentId: string) => {
    if (!replyContent.trim()) return;
    await supabase.from('replies').insert({ comment_id: commentId, author: '나', avatar: 'ME', content: replyContent.trim(), likes: 0 });
    setReplyTo(null); setReplyContent('');
  };

  if (loading) return <div className="pt-14"><Spinner /></div>;
  if (!post) return <div className="pt-14 text-center py-20 text-gray-400">게시글을 찾을 수 없습니다.</div>;

  const sortedComments = [...(post.comments ?? [])].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="min-h-screen bg-white pt-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button onClick={() => navigate('/catchcopy/community')}
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors mb-8">
          <ArrowLeft size={16} /> 목록으로
        </button>

        {/* 글 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {post.is_pinned && <span className="text-xs font-black px-3 py-1 rounded-full bg-black text-white">공지</span>}
            <span className="text-xs font-black px-3 py-1 rounded-full bg-gray-100 text-gray-500">{post.category}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-6 leading-tight">{post.title}</h1>
          <div className="flex items-center justify-between pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Avatar name={post.avatar} size={9} />
              <div>
                <p className="text-sm font-black">{post.author}</p>
                <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs font-bold text-gray-400"><Eye size={12} /> {post.views.toLocaleString()}</span>
              {/* 수정 / 삭제 버튼 */}
              <button onClick={() => navigate(`/catchcopy/community/edit/${post.id}`)}
                className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-black transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100">
                <Pencil size={12} /> 수정
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-red-500">삭제할까요?</span>
                  <button onClick={handleDeletePost} className="text-xs font-black text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">확인</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs font-bold text-gray-400 hover:text-black px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">취소</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50">
                  <Trash2 size={12} /> 삭제
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="mb-10 space-y-1">
          {post.content.split('\n').map((line, i) => (
            <p key={i} className={cn("text-[15px] leading-relaxed text-gray-700", line === '' ? 'h-3' : '')}>{line}</p>
          ))}
        </div>

        {/* 추천 / 비추천 버튼 */}
        <div className="flex items-center justify-center gap-3 py-8 border-y border-gray-100 mb-10">
          <button onClick={() => handlePostVote('like')}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-gray-200 hover:border-[#00BE00] hover:bg-[#00BE00]/5 transition-all group">
            <ThumbsUp size={18} className="text-gray-400 group-hover:text-[#00BE00] transition-colors" />
            <span className="text-sm font-black text-gray-500 group-hover:text-[#00BE00] transition-colors">추천 {post.likes}</span>
          </button>
          <button onClick={() => handlePostVote('dislike')}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition-all group">
            <ThumbsDown size={18} className="text-gray-400 group-hover:text-red-500 transition-colors" />
            <span className="text-sm font-black text-gray-500 group-hover:text-red-500 transition-colors">비추천 {post.dislikes ?? 0}</span>
          </button>
        </div>

        {/* 댓글 영역 */}
        <div>
          <h3 className="text-base font-black mb-6">댓글 {sortedComments.length}</h3>
          <form onSubmit={handleComment} className="flex gap-3 mb-8">
            <Avatar name="ME" size={9} />
            <div className="flex-1 relative">
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="댓글을 입력하세요." rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
              <button type="submit" disabled={!newComment.trim()}
                className="absolute bottom-3 right-3 px-3 py-1.5 bg-black text-white text-xs font-black rounded-xl disabled:opacity-30 hover:bg-gray-800 transition-colors">등록</button>
            </div>
          </form>

          <div className="space-y-6">
            {sortedComments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <Avatar name={comment.avatar} size={8} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black">{comment.author}</span>
                      <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                    </div>
                    {/* 댓글 수정/삭제 */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditCommentContent(comment.content);
                      }} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => handleDeleteComment(comment.id)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {editingCommentId === comment.id ? (
                    <div className="mb-2">
                      <textarea value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)} rows={2}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
                      <div className="flex justify-end gap-2 mt-1.5">
                        <button onClick={() => setEditingCommentId(null)} className="text-xs font-bold text-gray-400 hover:text-black px-3 py-1.5 transition-colors">취소</button>
                        <button onClick={() => handleEditComment(comment.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs font-black rounded-xl hover:bg-gray-800 transition-colors">
                          <Check size={11} /> 저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[14px] text-gray-700 leading-relaxed mb-2 break-words">{comment.content}</p>
                  )}

                  <div className="flex items-center gap-3">
                    <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      className="text-xs font-bold text-gray-400 hover:text-black transition-colors">답글</button>
                  </div>

                  {replyTo === comment.id && (
                    <div className="flex gap-2 mt-3">
                      <Avatar name="ME" size={7} />
                      <div className="flex-1">
                        <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)}
                          placeholder="답글을 입력하세요." rows={2}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
                        <div className="flex justify-end gap-2 mt-1.5">
                          <button onClick={() => setReplyTo(null)} className="text-xs font-bold text-gray-400 hover:text-black px-3 py-1.5 transition-colors">취소</button>
                          <button onClick={() => handleReply(comment.id)} disabled={!replyContent.trim()}
                            className="px-3 py-1.5 bg-black text-white text-xs font-black rounded-xl disabled:opacity-30 hover:bg-gray-800 transition-colors">등록</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {(comment.replies ?? []).length > 0 && (
                    <div className="mt-3 space-y-3 pl-3 border-l-2 border-gray-100">
                      {[...(comment.replies ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(reply => (
                        <div key={reply.id} className="flex gap-2">
                          <Avatar name={reply.avatar} size={7} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-black">{reply.author}</span>
                              <span className="text-xs text-gray-400">{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="text-[13px] text-gray-700 leading-relaxed break-words">{reply.content}</p>
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
  );
}

// ── Main AppInner ──────────────────────────────────────────────
function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab: 'home' | 'brief' | 'community' = (() => {
    if (location.pathname.startsWith('/catchcopy/brief')) return 'brief';
    if (location.pathname.startsWith('/catchcopy/community')) return 'community';
    return 'home';
  })();

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

  useEffect(() => {
    supabase.from('briefs').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      const d = data ?? [];
      setBriefs(d); setBriefsLoading(false);
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
      setPosts(data ?? []); setPostsLoading(false);
    });
    const ch = supabase.channel('posts-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async () => {
        const { data } = await supabase.from('posts').select('*, comments(*, replies(*))').order('created_at', { ascending: false });
        setPosts(data ?? []);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filteredBriefs = useMemo(() => briefs.filter(b => {
    return (briefStatusFilter === '전체' || b.status === briefStatusFilter) &&
      (activeBriefCat === '전체' || b.category === activeBriefCat);
  }), [briefs, briefStatusFilter, activeBriefCat]);

  const filteredPosts = useMemo(() => {
    const filtered = posts.filter(p => {
      const matchCat = activeCategory === '전체' || p.category === activeCategory;
      const matchSearch = !searchQuery || p.title.includes(searchQuery) || p.author.includes(searchQuery);
      return matchCat && matchSearch;
    });
    return [...filtered].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      if (sortOrder === 'popular') return (b.likes ?? 0) - (a.likes ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [posts, activeCategory, searchQuery, sortOrder]);

  const homeBriefs = useMemo(() => briefs.filter(b => b.status === '진행중').slice(0, 3), [briefs]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1a1a1a]">
      <main className="flex-1 pt-14">

        {/* ── HOME ── */}
        {activeTab === 'home' && (
          <div>
            <section className="pt-14 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 text-center border-b border-gray-100">
              <div className="max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-200 mb-6 sm:mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00BE00] animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500">실시간 경쟁 진행 중</span>
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-5 sm:mb-6 leading-[1.05]">
                  단 한 줄로<br /><span className="italic">설득하라.</span>
                </h2>
                <p className="text-base sm:text-lg text-gray-500 font-medium mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed">
                  브랜드의 고민을 해결하는 한 줄의 카피.<br />지금 바로 도전하고 보상을 쟁취하세요.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => navigate('/catchcopy/brief')}
                    className="bg-black text-white font-black px-6 sm:px-7 py-3 rounded-lg hover:bg-gray-800 transition-all active:scale-95 text-sm sm:text-base">
                    브리프 보기
                  </button>
                  <button className="border border-gray-200 font-bold px-6 sm:px-7 py-3 rounded-lg hover:border-black hover:bg-gray-50 transition-all text-sm sm:text-base">
                    더 알아보기
                  </button>
                </div>
              </div>
            </section>
            <section className="border-b border-gray-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-3 divide-x divide-gray-100">
                {[
                  { label: '진행중인 브리프', value: `${stats.activeBriefs}개`, icon: <Zap size={14} /> },
                  { label: '이번 달 참여자', value: `${stats.monthlyUsers.toLocaleString()}명`, icon: <Users size={14} /> },
                  { label: '지급된 총 상금', value: '₩48M', icon: <Star size={14} /> },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 px-3 sm:px-8 text-center sm:text-left">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">{s.icon}</div>
                    <div>
                      <p className="text-base sm:text-xl font-black">{s.value}</p>
                      <p className="text-[10px] sm:text-xs font-bold text-gray-400">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">참여 가능한 브리프</h3>
                <button onClick={() => navigate('/catchcopy/brief')}
                  className="text-sm font-bold text-gray-400 hover:text-black flex items-center gap-1 transition-colors">
                  전체보기 <ChevronRight size={14} />
                </button>
              </div>
              {briefsLoading ? <Spinner /> : (
                <div className="space-y-4">
                  {/* 첫 2개 대형 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {homeBriefs.slice(0, 2).map(brief => (
                      <BriefCard key={brief.id} brief={brief} onClick={() => navigate(`/catchcopy/brief/${brief.id}`)} />
                    ))}
                  </div>
                  {/* 3번째 단독 or 없으면 생략 */}
                  {homeBriefs[2] && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <BriefCard brief={homeBriefs[2]} onClick={() => navigate(`/catchcopy/brief/${homeBriefs[2].id}`)} />
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── BRIEF ── */}
        {activeTab === 'brief' && (
          <div className="px-4 sm:px-6 py-8 sm:py-12 max-w-7xl mx-auto">
            {/* 헤더 + 필터 */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-1">브리프 아카이브</h2>
                <p className="text-gray-400 font-bold text-sm">진행 중인 카피 공모전에 참여하세요.</p>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                <div className="flex bg-gray-100 p-1 rounded-xl gap-1 shrink-0">
                  {(['전체', '진행중', '종료'] as const).map(f => (
                    <button key={f} onClick={() => setBriefStatusFilter(f)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap",
                        briefStatusFilter === f ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black")}>
                      {f}
                    </button>
                  ))}
                </div>
                <div className="w-px h-5 bg-gray-200 shrink-0" />
                {BRIEF_CATS.map(cat => (
                  <button key={cat} onClick={() => setActiveBriefCat(cat)}
                    className={cn("text-xs font-black px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0",
                      activeBriefCat === cat ? "bg-black text-white" : "text-gray-400 hover:text-black")}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {briefsLoading ? <Spinner /> : filteredBriefs.length === 0 ? (
              <div className="text-center py-32 text-gray-300">
                <Megaphone size={40} className="mx-auto mb-4" />
                <p className="text-sm font-bold">해당하는 브리프가 없습니다.</p>
              </div>
            ) : (
              /* Sana 스타일: 첫 2개는 나란히 큰 카드, 나머지는 3열 */
              <div className="space-y-4">
                {/* 첫 번째 행: 2개 대형 카드 */}
                {filteredBriefs.length >= 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredBriefs.slice(0, 2).map(brief => (
                      <BriefCard key={brief.id} brief={brief} onClick={() => navigate(`/catchcopy/brief/${brief.id}`)} />
                    ))}
                  </div>
                )}
                {/* 나머지: 3열 중형 카드 */}
                {filteredBriefs.length > 2 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredBriefs.slice(2).map(brief => (
                      <motion.div
                        key={brief.id}
                        whileHover="hover"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/catchcopy/brief/${brief.id}`)}
                        className="cursor-pointer group relative rounded-2xl overflow-hidden"
                        style={{ aspectRatio: '1/1' }}
                      >
                        <div className={cn("absolute inset-0 transition-transform duration-500 group-hover:scale-105", brief.bg_color)} />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-0.5">{brief.company_name}</p>
                          <h4 className="text-xs font-black text-white leading-snug line-clamp-2">{brief.title}</h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full",
                              brief.status === '진행중' ? "bg-[#00BE00] text-white" : "bg-white/20 text-white/70")}>
                              {brief.status}
                            </span>
                            <span className="text-[9px] font-black text-white/60">{brief.reward}</span>
                          </div>
                        </div>
                        <div className="absolute top-3 right-3">
                          <motion.div variants={{ hover: { scale: 1.1 } }}
                            className="bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow">
                            참여 →
                          </motion.div>
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-2xl" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── COMMUNITY ── */}
        {activeTab === 'community' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* 모바일 카테고리 탭 */}
            <div className="flex lg:hidden gap-2 overflow-x-auto pb-3 scrollbar-hide mb-6">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={cn("whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0",
                    activeCategory === cat ? "bg-black text-white" : "bg-gray-100 text-gray-500")}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-10">
              {/* 데스크톱 사이드바 */}
              <aside className="hidden lg:block lg:col-span-1">
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 lg:sticky lg:top-20">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">게시판</p>
                  <div className="space-y-0.5">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={cn("w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                          activeCategory === cat ? "bg-white border border-gray-200 text-black shadow-sm" : "text-gray-500 hover:text-black hover:bg-white")}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="lg:col-span-3">
                {/* 상단 컨트롤 바 */}
                <div className="flex items-center justify-between mb-5 gap-3">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight shrink-0">{activeCategory}</h2>
                  <div className="flex items-center gap-2">
                    {/* 정렬 토글 */}
                    <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                      <button onClick={() => setSortOrder('latest')}
                        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                          sortOrder === 'latest' ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black")}>
                        <Clock3 size={12} /> 최신순
                      </button>
                      <button onClick={() => setSortOrder('popular')}
                        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                          sortOrder === 'popular' ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black")}>
                        <TrendingUp size={12} /> 인기순
                      </button>
                    </div>
                    <div className="relative">
                      <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="검색"
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold w-24 sm:w-36 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all pr-7" />
                      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                    </div>
                    <button onClick={() => navigate('/catchcopy/community/write')}
                      className="flex items-center gap-1.5 bg-black text-white text-sm font-black px-3 sm:px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors shrink-0">
                      <Edit3 size={13} /> <span className="hidden sm:inline">글쓰기</span>
                    </button>
                  </div>
                </div>

                {postsLoading ? <Spinner /> : (
                  <div className="space-y-3">
                    {filteredPosts.length === 0 ? (
                      <div className="text-center py-20 text-gray-300">
                        <MessageSquare size={32} className="mx-auto mb-3" />
                        <p className="text-sm font-bold">게시글이 없습니다.</p>
                      </div>
                    ) : filteredPosts.map(post => (
                      <motion.div key={post.id} whileTap={{ scale: 0.99 }}
                        onClick={() => navigate(`/catchcopy/community/post/${post.id}`)}
                        className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-md cursor-pointer transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {post.is_pinned && <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-black text-white">공지</span>}
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{post.category}</span>
                            </div>
                            <h4 className="text-sm sm:text-base font-black mb-2 leading-snug">{post.title}</h4>
                            <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold text-gray-400 flex-wrap">
                              <span>{post.author}</span>
                              <span>{timeAgo(post.created_at)}</span>
                              <span className="flex items-center gap-1"><Eye size={10} /> {post.views.toLocaleString()}</span>
                              <span className="flex items-center gap-1"><MessageSquare size={10} /> {(post.comments ?? []).length}</span>
                            </div>
                          </div>
                          {/* 추천/비추천 표시 */}
                          <div className="shrink-0 flex flex-col items-center gap-1 py-2 px-2.5 bg-gray-50 rounded-xl min-w-[52px]">
                            <div className="flex items-center gap-0.5 text-[#00BE00]">
                              <ThumbsUp size={11} />
                              <span className="text-xs font-black">{post.likes}</span>
                            </div>
                            <div className="w-full h-px bg-gray-200" />
                            <div className="flex items-center gap-0.5 text-red-400">
                              <ThumbsDown size={11} />
                              <span className="text-xs font-black">{post.dislikes ?? 0}</span>
                            </div>
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

      <footer className="border-t border-gray-100 py-8 sm:py-10 mt-10 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <img src="/logo.png" alt="CatchCopy" className="h-4 sm:h-5 w-auto object-contain" />
          <p className="text-xs font-bold text-gray-400">© 2025 CATCHCOPY. All rights reserved.</p>
          <div className="flex gap-4 sm:gap-6 text-xs font-bold text-gray-400">
            <span className="hover:text-black cursor-pointer transition-colors">개인정보처리방침</span>
            <span className="hover:text-black cursor-pointer transition-colors">이용약관</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Router ──────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/catchcopy/brief/:briefId" element={<BriefPage />} />
        <Route path="/catchcopy/community/post/:postId" element={<PostDetail />} />
        <Route path="/catchcopy/community/write" element={<WritePage />} />
        <Route path="/catchcopy/community/edit/:postId" element={<WritePage />} />
        <Route path="/catchcopy/*" element={<AppInner />} />
        <Route path="*" element={<AppInner />} />
      </Routes>
    </BrowserRouter>
  );
}
