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
  BarChart2, Zap, Star, Loader2
} from 'lucide-react';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';

// ── 타입 정의 ──────────────────────────────────────────────
interface Brief {
  id: string;
  company_name: string;
  title: string;
  problem: string;
  target: string;
  campaign_info: string;
  reward: string;
  deadline: string;
  participants: number;
  status: '진행중' | '종료';
  category: string;
  bg_color: string;
}

interface CopyEntry {
  id: string;
  brief_id: string;
  author: string;
  content: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

interface Reply {
  id: string;
  comment_id: string;
  author: string;
  avatar: string;
  content: string;
  likes: number;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  author: string;
  avatar: string;
  content: string;
  likes: number;
  created_at: string;
  replies: Reply[];
}

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  author: string;
  avatar: string;
  views: number;
  likes: number;
  created_at: string;
  is_pinned: boolean;
  comments: Comment[];
}

const CATEGORIES = ['전체', '팁&노하우', '크리에이터 토크', '질문&답변', '자유 게시판', '브랜드 뉴스'];
const BRIEF_CATS = ['전체', 'F&B', '핀테크', '라이프스타일', '패션'];

const timeAgo = (ts: string) => {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

const PALETTE = ['bg-slate-600', 'bg-zinc-700', 'bg-stone-600', 'bg-neutral-700', 'bg-gray-700'];
const getAvatarColor = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
      className={cn('rounded-full flex items-center justify-center text-white text-xs font-black shrink-0', getAvatarColor(name))}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  );
}

// ── 브리프 카드 ──────────────────────────────────────────
function BriefCard({ brief, onClick }: { brief: Brief; onClick: () => void }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} onClick={onClick}
      className="cursor-pointer group rounded-2xl overflow-hidden">
      <div className={cn("relative h-52 rounded-2xl overflow-hidden mb-3", brief.bg_color)}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center mb-3 shadow-sm">
            <Megaphone size={24} className="text-gray-700" />
          </div>
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{brief.category}</p>
        </div>
        <div className="absolute top-3 left-3">
          <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full",
            brief.status === '진행중' ? "bg-white text-[#00BE00]" : "bg-white text-gray-400")}>
            {brief.status}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-black text-white">
            {brief.reward}
          </span>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-black leading-snug line-clamp-2 group-hover:text-black mb-1">{brief.title}</h4>
        <p className="text-xs text-gray-500 font-bold flex items-center gap-1 mb-1">
          <Building2 size={10} /> {brief.company_name}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 flex items-center gap-1">
            <Users size={10} /> {brief.participants.toLocaleString()}명 참여
          </p>
          {brief.status === '진행중' && (
            <p className="text-xs font-bold text-gray-400 flex items-center gap-1">
              <Clock size={10} /> {brief.deadline}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── 브리프 모달 ──────────────────────────────────────────
function BriefPage() {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [copies, setCopies] = useState<CopyEntry[]>([]);
  const [newCopy, setNewCopy] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 브리프 로드
  useEffect(() => {
    if (!briefId) return;
    supabase.from('briefs').select('*').eq('id', briefId).single().then(({ data }) => {
      setBrief(data);
      setBriefLoading(false);
    });
  }, [briefId]);

  useEffect(() => {
    if (!briefId) return;
    setLoading(true);
    supabase.from('copies').select('*').eq('brief_id', briefId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCopies(data ?? []); setLoading(false); });

    const channel = supabase.channel(`copies-${briefId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'copies', filter: `brief_id=eq.${briefId}` },
        ({ eventType, new: nr, old: or }) => {
          if (eventType === 'INSERT') setCopies(prev => [nr as CopyEntry, ...prev]);
          else if (eventType === 'UPDATE') setCopies(prev => prev.map(c => c.id === (nr as CopyEntry).id ? nr as CopyEntry : c));
          else if (eventType === 'DELETE') setCopies(prev => prev.filter(c => c.id !== (or as CopyEntry).id));
        }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [briefId]);

  const sorted = useMemo(() =>
    [...copies].sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)), [copies]);

  const handleSubmitCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCopy.trim() || submitting) return;
    setSubmitting(true);
    await supabase.from('copies').insert({ brief_id: briefId, author: '나', content: newCopy.trim(), upvotes: 0, downvotes: 0 });
    setNewCopy('');
    setSubmitting(false);
  };

  const handleVote = async (id: string, delta: number) => {
    const copy = copies.find(c => c.id === id);
    if (!copy) return;
    if (delta > 0) await supabase.from('copies').update({ upvotes: copy.upvotes + 1 }).eq('id', id);
    else await supabase.from('copies').update({ downvotes: copy.downvotes + 1 }).eq('id', id);
  };

  if (briefLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!brief) return <div className="min-h-screen flex items-center justify-center text-gray-400">브리프를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 배너 */}
      <div className={cn("relative h-56", brief.bg_color)}>
        <button onClick={() => navigate('/catchcopy/brief')}
          className="absolute top-6 left-6 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black transition-colors bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl">
          <ArrowLeft size={15} /> 브리프 목록
        </button>
        <div className="absolute bottom-6 left-8 flex items-center gap-3">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md">
            <Megaphone size={22} className="text-gray-700" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{brief.category}</p>
            <p className="text-base font-black text-gray-800">{brief.company_name}</p>
          </div>
        </div>
        <div className="absolute bottom-6 right-8">
          <span className={cn("text-xs font-black px-3 py-1.5 rounded-full",
            brief.status === '진행중' ? "bg-[#00BE00] text-white" : "bg-gray-200 text-gray-500")}>
            {brief.status}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <h1 className="text-2xl font-black leading-snug">{brief.title}</h1>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black">{brief.reward}</p>
            <p className="text-xs font-bold text-gray-400">{brief.participants.toLocaleString()}명 참여</p>
          </div>
        </div>
        <hr className="border-gray-100 mb-6" />
        <div className="space-y-5 mb-8">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">해결할 문제</p>
            <p className="text-sm font-bold text-gray-800 leading-relaxed">{brief.problem}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">타겟</p>
              <p className="text-sm font-bold text-gray-700 leading-relaxed">{brief.target}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">캠페인 방향</p>
              <p className="text-sm font-bold text-gray-700 leading-relaxed">{brief.campaign_info}</p>
            </div>
          </div>
          {brief.status === '진행중' && (
            <div className="flex items-center gap-2 p-3 bg-[#00BE00]/5 rounded-xl border border-[#00BE00]/20">
              <Clock size={14} className="text-[#00BE00]" />
              <p className="text-sm font-black text-[#00BE00]">{brief.deadline}</p>
            </div>
          )}
        </div>

        {brief.status === '진행중' && (
          <>
            <hr className="border-gray-100 mb-6" />
            <div className="mb-6">
              <p className="text-sm font-black mb-3">✍️ 나의 한 줄 카피 제출</p>
              <form onSubmit={handleSubmitCopy} className="relative">
                <input type="text" value={newCopy} onChange={e => setNewCopy(e.target.value)}
                  placeholder="당신의 한 줄을 제안하세요."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 pr-14 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
                <button type="submit"
                  className={cn("absolute right-2 top-2 bottom-2 w-11 rounded-xl flex items-center justify-center transition-all",
                    newCopy.trim() && !submitting ? "bg-black text-white" : "bg-gray-200 text-gray-400 pointer-events-none")}>
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </form>
            </div>
          </>
        )}

        {loading ? <Spinner /> : sorted.length > 0 && (
          <>
            <hr className="border-gray-100 mb-6" />
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-gray-400" />
                <p className="text-sm font-black">실시간 랭킹</p>
                <span className="text-xs font-bold text-gray-400">{sorted.length}개 카피</span>
              </div>
              <div className="space-y-3">
                {sorted.map((copy, idx) => (
                  <div key={copy.id} className={cn("p-4 rounded-2xl border transition-all",
                    idx === 0 ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100")}>
                    {idx === 0 && <span className="text-[10px] font-black text-[#00BE00] bg-[#00BE00]/10 px-2 py-0.5 rounded mb-2 inline-block">🥇 1위</span>}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5",
                          idx === 0 ? "bg-black text-white" : "bg-gray-100 text-gray-500")}>{idx + 1}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-800 leading-snug">"{copy.content}"</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-1">{copy.author}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleVote(copy.id, 1)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-black text-gray-400 hover:text-[#00BE00] hover:bg-[#00BE00]/10 transition-all">
                          <ThumbsUp size={12} /> {copy.upvotes}
                        </button>
                        <button onClick={() => handleVote(copy.id, -1)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-black text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                          <ThumbsDown size={12} /> {copy.downvotes}
                        </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
}

// ── 게시글 상세 ──────────────────────────────────────────
function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const onBack = () => navigate('/catchcopy/community');
  const [post, setPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    const { data } = await supabase.from('posts').select('*, comments(*, replies(*))').eq('id', postId).single();
    if (data) setPost(data);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    // 조회수 증가
    supabase.from('posts').select('views').eq('id', postId).single().then(({ data }) => {
      if (data) supabase.from('posts').update({ views: data.views + 1 }).eq('id', postId);
    });
    fetchPost();

    const channel = supabase.channel(`post-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, fetchPost)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, fetchPost)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId, fetchPost]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await supabase.from('comments').insert({ post_id: postId, author: '나', avatar: 'ME', content: newComment.trim(), likes: 0 });
    setNewComment('');
  };

  const handleReply = async (commentId: string) => {
    if (!replyContent.trim()) return;
    await supabase.from('replies').insert({ comment_id: commentId, author: '나', avatar: 'ME', content: replyContent.trim(), likes: 0 });
    setReplyTo(null); setReplyContent('');
  };

  const likeComment = async (commentId: string, currentLikes: number) => {
    await supabase.from('comments').update({ likes: currentLikes + 1 }).eq('id', commentId);
  };

  if (loading) return <Spinner />;
  if (!post) return <div className="text-center py-20 text-gray-400">게시글을 찾을 수 없습니다.</div>;

  const sortedComments = [...(post.comments ?? [])].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors mb-8">
        <ArrowLeft size={16} /> 목록으로
      </button>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {post.is_pinned && <span className="text-xs font-black px-3 py-1 rounded-full bg-black text-white">공지</span>}
          <span className="text-xs font-black px-3 py-1 rounded-full bg-gray-100 text-gray-500">{post.category}</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-6 leading-tight">{post.title}</h1>
        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar name={post.avatar} size={9} />
            <div><p className="text-sm font-black">{post.author}</p><p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p></div>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
            <span className="flex items-center gap-1"><Eye size={12} /> {post.views.toLocaleString()}</span>
            <span className="flex items-center gap-1"><ThumbsUp size={12} /> {post.likes}</span>
          </div>
        </div>
      </div>
      <div className="mb-12 space-y-1">
        {post.content.split('\n').map((line, i) => (
          <p key={i} className={cn("text-[15px] leading-relaxed text-gray-700", line === '' ? 'h-3' : '')}>{line}</p>
        ))}
      </div>
      <div className="border-t border-gray-100 pt-10">
        <h3 className="text-lg font-black mb-8">댓글 {sortedComments.length}</h3>
        <form onSubmit={handleComment} className="flex gap-3 mb-10">
          <Avatar name="ME" size={9} />
          <div className="flex-1 relative">
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="댓글을 입력하세요." rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
            <button type="submit" disabled={!newComment.trim()}
              className="absolute bottom-3 right-3 px-4 py-1.5 bg-black text-white text-xs font-black rounded-xl disabled:opacity-30 hover:bg-gray-800 transition-colors">등록</button>
          </div>
        </form>
        <div className="space-y-8">
          {sortedComments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <Avatar name={comment.avatar} size={9} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-black">{comment.author}</span>
                  <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="text-[14px] text-gray-700 leading-relaxed mb-3">{comment.content}</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => likeComment(comment.id, comment.likes)}
                    className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-black transition-colors">
                    <ThumbsUp size={12} /> {comment.likes}
                  </button>
                  <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    className="text-xs font-bold text-gray-400 hover:text-black transition-colors">답글</button>
                </div>
                {replyTo === comment.id && (
                  <div className="flex gap-3 mt-4">
                    <Avatar name="ME" size={7} />
                    <div className="flex-1">
                      <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="답글을 입력하세요." rows={2}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setReplyTo(null)} className="text-xs font-bold text-gray-400 hover:text-black px-3 py-1.5 transition-colors">취소</button>
                        <button onClick={() => handleReply(comment.id)} disabled={!replyContent.trim()}
                          className="px-4 py-1.5 bg-black text-white text-xs font-black rounded-xl disabled:opacity-30 hover:bg-gray-800 transition-colors">등록</button>
                      </div>
                    </div>
                  </div>
                )}
                {(comment.replies ?? []).length > 0 && (
                  <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-100">
                    {[...(comment.replies ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(reply => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar name={reply.avatar} size={7} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black">{reply.author}</span>
                            <span className="text-xs text-gray-400">{timeAgo(reply.created_at)}</span>
                          </div>
                          <p className="text-[13px] text-gray-700 leading-relaxed">{reply.content}</p>
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

  const setActiveTab = (tab: 'home' | 'brief' | 'community') => {
    if (tab === 'home') navigate('/catchcopy');
    else navigate(`/catchcopy/${tab}`);
  };

  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [activeBriefCat, setActiveBriefCat] = useState('전체');
  const [briefStatusFilter, setBriefStatusFilter] = useState<'전체' | '진행중' | '종료'>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [writeForm, setWriteForm] = useState({ title: '', content: '', category: '자유 게시판' });
  const [briefsLoading, setBriefsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [stats, setStats] = useState({ activeBriefs: 0, monthlyUsers: 0 });

  // 브리프 로드 + 실시간
  useEffect(() => {
    supabase.from('briefs').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      const d = data ?? [];
      setBriefs(d);
      setBriefsLoading(false);
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

  // 게시글 로드 + 실시간
  useEffect(() => {
    supabase.from('posts').select('*, comments(*, replies(*))').order('created_at', { ascending: false }).then(({ data }) => {
      setPosts(data ?? []);
      setPostsLoading(false);
    });
    const ch = supabase.channel('posts-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async () => {
        const { data } = await supabase.from('posts').select('*, comments(*, replies(*))').order('created_at', { ascending: false });
        setPosts(data ?? []);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleWritePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeForm.title.trim() || !writeForm.content.trim()) return;
    await supabase.from('posts').insert({
      category: writeForm.category, title: writeForm.title.trim(), content: writeForm.content.trim(),
      author: '나', avatar: 'ME', views: 0, likes: 0, is_pinned: false,
    });
    setWriteForm({ title: '', content: '', category: '자유 게시판' });
    setShowWriteModal(false);
  };

  const filteredBriefs = useMemo(() => briefs.filter(b => {
    const matchStatus = briefStatusFilter === '전체' || b.status === briefStatusFilter;
    const matchCat = activeBriefCat === '전체' || b.category === activeBriefCat;
    return matchStatus && matchCat;
  }), [briefs, briefStatusFilter, activeBriefCat]);

  const filteredPosts = useMemo(() => posts.filter(p => {
    const matchCat = activeCategory === '전체' || p.category === activeCategory;
    const matchSearch = !searchQuery || p.title.includes(searchQuery) || p.author.includes(searchQuery);
    return matchCat && matchSearch;
  }).sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [posts, activeCategory, searchQuery]);

  const homeBriefs = useMemo(() => briefs.filter(b => b.status === '진행중').slice(0, 3), [briefs]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1a1a1a]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <button onClick={() => { setActiveTab('home'); }} className="flex items-center">
              <img src="/logo.png" alt="CatchCopy" className="h-8 w-auto object-contain" />
            </button>
            <nav className="hidden md:flex items-center gap-1">
              {[{ id: 'brief', label: '브리프' }, { id: 'community', label: '커뮤니티' }].map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); }}
                  className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                    activeTab === tab.id ? "bg-gray-100 text-black" : "text-gray-400 hover:text-black hover:bg-gray-50")}>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-sm font-bold text-gray-400 hover:text-black px-3 py-1.5 transition-colors">로그인</button>
            <button onClick={() => setShowWriteModal(true)}
              className="bg-black text-white text-sm font-black px-5 py-2 rounded-lg hover:bg-gray-800 active:scale-95 transition-all">글쓰기</button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-14">
        {activeTab === 'home' && (
          <div>
            <section className="pt-20 pb-16 px-6 text-center border-b border-gray-100">
              <div className="max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-200 mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00BE00] animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500">실시간 경쟁 진행 중</span>
                </div>
                <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6 leading-[1.05]">단 한 줄로<br /><span className="italic">설득하라.</span></h2>
                <p className="text-lg text-gray-500 font-medium mb-10 max-w-xl mx-auto leading-relaxed">브랜드의 고민을 해결하는 한 줄의 카피.<br />지금 바로 도전하고 보상을 쟁취하세요.</p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => setActiveTab('brief')} className="bg-black text-white font-black px-7 py-3 rounded-lg hover:bg-gray-800 transition-all active:scale-95">브리프 보기</button>
                  <button className="border border-gray-200 font-bold px-7 py-3 rounded-lg hover:border-black hover:bg-gray-50 transition-all">더 알아보기</button>
                </div>
              </div>
            </section>
            <section className="border-b border-gray-100">
              <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-3 divide-x divide-gray-100">
                {[
                  { label: '진행중인 브리프', value: `${stats.activeBriefs}개`, icon: <Zap size={16} /> },
                  { label: '이번 달 참여자', value: `${stats.monthlyUsers.toLocaleString()}명`, icon: <Users size={16} /> },
                  { label: '지급된 총 상금', value: '₩ 48,000,000', icon: <Star size={16} /> },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-4 px-8">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500">{s.icon}</div>
                    <div><p className="text-xl font-black">{s.value}</p><p className="text-xs font-bold text-gray-400">{s.label}</p></div>
                  </div>
                ))}
              </div>
            </section>
            <section className="max-w-7xl mx-auto px-6 py-14">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black tracking-tight">참여 가능한 브리프</h3>
                <button onClick={() => setActiveTab('brief')} className="text-sm font-bold text-gray-400 hover:text-black flex items-center gap-1 transition-colors">
                  전체보기 <ChevronRight size={14} />
                </button>
              </div>
              {briefsLoading ? <Spinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {homeBriefs.map(brief => <BriefCard key={brief.id} brief={brief} onClick={() => navigate(`/catchcopy/brief/${brief.id}`)} />)}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'brief' && (
          <div className="max-w-7xl mx-auto px-6 py-14">
            <div className="mb-8">
              <h2 className="text-4xl font-black tracking-tighter mb-2">브리프 아카이브</h2>
              <p className="text-gray-400 font-bold">진행 중이거나 최근 종료된 카피 공모전 목록입니다.</p>
            </div>
            <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-4 overflow-x-auto">
              <div className="flex bg-gray-100 p-1 rounded-xl gap-1 shrink-0">
                {(['전체', '진행중', '종료'] as const).map(f => (
                  <button key={f} onClick={() => setBriefStatusFilter(f)}
                    className={cn("px-4 py-1.5 rounded-lg text-sm font-black transition-all whitespace-nowrap",
                      briefStatusFilter === f ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black")}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-gray-200 shrink-0" />
              {BRIEF_CATS.map(cat => (
                <button key={cat} onClick={() => setActiveBriefCat(cat)}
                  className={cn("text-sm font-black px-3 py-1.5 rounded-lg transition-all whitespace-nowrap",
                    activeBriefCat === cat ? "bg-black text-white" : "text-gray-400 hover:text-black")}>
                  {cat}
                </button>
              ))}
            </div>
            {briefsLoading ? <Spinner /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBriefs.map(brief => <BriefCard key={brief.id} brief={brief} onClick={() => navigate(`/catchcopy/brief/${brief.id}`)} />)}
                {filteredBriefs.length === 0 && (
                  <div className="col-span-full text-center py-20 text-gray-300">
                    <p className="text-sm font-bold">해당하는 브리프가 없습니다.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'community' && (
            <div className="max-w-6xl mx-auto px-6 py-12">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                <aside className="lg:col-span-1">
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
                    <div className="mt-8 pt-8 border-t border-gray-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Top 크리에이터</p>
                      <div className="space-y-3">
                        {[{ name: 'CopyMaster', level: 42 }, { name: 'BrandGuru', level: 38 }, { name: 'NamingKing', level: 31 }].map((u, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Avatar name={u.name.slice(0, 2).toUpperCase()} size={8} />
                            <div><p className="text-sm font-black">{u.name}</p><p className="text-xs font-bold text-gray-400">Lv. {u.level}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </aside>
                <div className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black tracking-tight">{activeCategory}</h2>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="검색"
                          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold w-40 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all pr-8" />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                      </div>
                      <button onClick={() => setShowWriteModal(true)}
                        className="flex items-center gap-1.5 bg-black text-white text-sm font-black px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors">
                        <Edit3 size={13} /> 글쓰기
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
                        <motion.div key={post.id} whileHover={{ x: 3 }} onClick={() => navigate(`/catchcopy/community/post/${post.id}`)}
                          className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-md cursor-pointer transition-all">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2.5">
                                {post.is_pinned && <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-black text-white">공지</span>}
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{post.category}</span>
                              </div>
                              <h4 className="text-base font-black mb-2 leading-snug">{post.title}</h4>
                              <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
                                <span>{post.author}</span>
                                <span>{timeAgo(post.created_at)}</span>
                                <span className="flex items-center gap-1"><Eye size={10} /> {post.views.toLocaleString()}</span>
                                <span className="flex items-center gap-1"><MessageSquare size={10} /> {(post.comments ?? []).length}</span>
                              </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-center justify-center py-2 px-3 bg-gray-50 rounded-xl min-w-[48px]">
                              <ThumbsUp size={13} className="text-gray-400 mb-1" />
                              <span className="text-xs font-black text-gray-700">{post.likes}</span>
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

      <AnimatePresence>
        {showWriteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowWriteModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-lg font-black">글쓰기</h3>
                <button onClick={() => setShowWriteModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"><X size={16} /></button>
              </div>
              <form onSubmit={handleWritePost} className="p-6 space-y-4">
                <div className="relative">
                  <select value={writeForm.category} onChange={e => setWriteForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all">
                    {CATEGORIES.filter(c => c !== '전체').map(c => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <input type="text" value={writeForm.title} onChange={e => setWriteForm(f => ({ ...f, title: e.target.value }))} placeholder="제목을 입력하세요."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
                <textarea value={writeForm.content} onChange={e => setWriteForm(f => ({ ...f, content: e.target.value }))} placeholder="내용을 입력하세요." rows={8}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowWriteModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-black transition-colors">취소</button>
                  <button type="submit" disabled={!writeForm.title.trim() || !writeForm.content.trim()}
                    className="px-6 py-2.5 bg-black text-white text-sm font-black rounded-xl disabled:opacity-30 disabled:pointer-events-none hover:bg-gray-800 transition-colors">등록하기</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-gray-100 py-10 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <img src="/logo.png" alt="CatchCopy" className="h-7 w-auto object-contain" />
          <p className="text-xs font-bold text-gray-400">© 2025 CATCHCOPY. All rights reserved.</p>
          <div className="flex gap-6 text-xs font-bold text-gray-400">
            <span className="hover:text-black cursor-pointer transition-colors">개인정보처리방침</span>
            <span className="hover:text-black cursor-pointer transition-colors">이용약관</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/catchcopy/brief/:briefId" element={<BriefPage />} />
        <Route path="/catchcopy/community/post/:postId" element={<PostDetail />} />
        <Route path="/catchcopy/*" element={<AppInner />} />
        <Route path="*" element={<AppInner />} />
      </Routes>
    </BrowserRouter>
  );
}
