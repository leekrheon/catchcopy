/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, MessageSquare, Users, Trophy, ChevronRight,
  ThumbsUp, ThumbsDown, Search, Send, Building2, ArrowLeft,
  Clock, Eye, Edit3, X, ChevronDown, Target, Megaphone,
  BarChart2, Zap, Star
} from 'lucide-react';
import { cn } from './lib/utils';

// ─── Types ───────────────────────────────────────────────
interface Brief {
  id: string; companyName: string; title: string; problem: string;
  target: string; campaignInfo: string; reward: string; deadline: string;
  participants: number; status: '진행중' | '종료'; detailUrl?: string;
}
interface CopyEntry {
  id: string; briefId: string; author: string; content: string;
  upvotes: number; downvotes: number; createdAt: number;
}
interface Reply {
  id: string; commentId: string; author: string; avatar: string;
  content: string; likes: number; createdAt: number;
}
interface Comment {
  id: string; postId: string; author: string; avatar: string;
  content: string; likes: number; createdAt: number; replies: Reply[];
}
interface Post {
  id: string; category: string; title: string; content: string;
  author: string; avatar: string; views: number; likes: number;
  createdAt: number; isPinned?: boolean; comments: Comment[];
}

// ─── Mock Data ────────────────────────────────────────────
const BRIEFS: Brief[] = [
  { id: '1', companyName: '카페인 (Cafe-In)', title: 'MZ세대를 위한 새로운 디카페인 커피 브랜드 런칭', problem: '기존 디카페인 커피는 "맛이 없다"는 편견이 강해 젊은 층의 유입이 적음.', target: '커피를 좋아하지만 카페인 민감도가 높은 2030 직장인 및 대학생', campaignInfo: '맛과 향을 모두 잡은 스위스 워터 프로세스 공법 강조', reward: '₩ 1,000,000', deadline: '3일 후 마감', participants: 248, status: '진행중' },
  { id: '2', companyName: '그린웨이브 (GreenWave)', title: '친환경 세탁 서비스 "에코워시" 캠페인', problem: '편리함 위주의 세탁 서비스 시장에서 "환경 보호"라는 가치가 비용 부담으로 느껴지는 문제.', target: '지속 가능한 소비를 지향하고 가치 소비를 즐기는 1인 가구', campaignInfo: '미세 플라스틱 저감 세탁망 및 생분해 세제 사용 어필', reward: '₩ 500,000', deadline: '7일 후 마감', participants: 134, status: '진행중' },
  { id: '3', companyName: '핀트 (Fint)', title: '신규 핀테크 서비스 메인 카피 공모', problem: '금융 앱이 딱딱하고 어렵다는 인식을 깨고 싶음.', target: '재테크에 관심 있는 2030 초보 투자자', campaignInfo: '쉽고 친근한 투자 경험을 강조, 앱의 UI/UX 연계', reward: '₩ 2,500,000', deadline: '14일 후 마감', participants: 512, status: '진행중' },
  { id: '4', companyName: '카페인 (Cafe-In)', title: '더 맑은 카페인, 세상을 깨우는 향', problem: '프리미엄 커피 시장에서 차별화된 브랜드 아이덴티티 확립 필요.', target: '고품질 커피를 추구하는 30~40대 직장인', campaignInfo: '원두 산지 강조, 핸드드립 공정 어필', reward: '₩ 1,000,000', deadline: '종료', participants: 1428, status: '종료' },
  { id: '5', companyName: '에코워시', title: '에코워시: 지구를 닦는 스마트 세탁', problem: '친환경 세탁 서비스의 가격 부담 이미지 탈피.', target: '환경에 관심 있는 2030 1인 가구', campaignInfo: '생분해 세제, 미세플라스틱 저감 어필', reward: '₩ 500,000', deadline: '종료', participants: 842, status: '종료' },
  { id: '6', companyName: '핀테크 스타트업', title: '신규 핀테크 서비스 네이밍', problem: '복잡한 금융을 쉽게 접근하게 하는 서비스명 필요.', target: '20~30대 초보 투자자', campaignInfo: '직관적이고 친근한 이름 선호', reward: '₩ 2,500,000', deadline: '종료', participants: 3102, status: '종료' },
  { id: '7', companyName: 'MZ패션', title: 'MZ세대 취향 저격 패키징 슬로건', problem: '패키징이 구매 결정에 미치는 영향 강화 필요.', target: '트렌드에 민감한 18~28세', campaignInfo: '감각적이고 공유하고 싶은 카피 원함', reward: '₩ 700,000', deadline: '종료', participants: 612, status: '종료' },
  { id: '8', companyName: '그린클로스', title: '친환경 소재 의류 캠페인 카피', problem: '친환경 패션의 가격 저항 극복.', target: '가치 소비를 추구하는 2030', campaignInfo: '지속가능성과 스타일 두 마리 토끼 강조', reward: '₩ 1,200,000', deadline: '종료', participants: 921, status: '종료' },
];

const INITIAL_COPIES: CopyEntry[] = [
  { id: 'c1', briefId: '1', author: '카피왕', content: '밤의 카페인은 덜어내고, 아침의 햇살만 남겼습니다.', upvotes: 42, downvotes: 3, createdAt: Date.now() - 3600000 },
  { id: 'c2', briefId: '1', author: '문장가', content: '맛은 그대로, 불안은 없이.', upvotes: 38, downvotes: 5, createdAt: Date.now() - 7200000 },
  { id: 'c3', briefId: '1', author: 'wordsmiths', content: '당신의 밤을 지켜주는 커피.', upvotes: 21, downvotes: 8, createdAt: Date.now() - 10800000 },
  { id: 'c4', briefId: '2', author: 'EcoWriter', content: '세탁기 한 번에, 지구 한 번 더.', upvotes: 55, downvotes: 2, createdAt: Date.now() - 3600000 },
  { id: 'c5', briefId: '2', author: '그린펜', content: '깨끗한 옷, 깨끗한 지구.', upvotes: 31, downvotes: 4, createdAt: Date.now() - 7200000 },
  { id: 'c6', briefId: '3', author: 'FinWriter', content: '투자, 어렵지 않아요. 핀트가 있으니까요.', upvotes: 67, downvotes: 6, createdAt: Date.now() - 3600000 },
];

const INITIAL_POSTS: Post[] = [
  { id: 'p1', category: '팁&노하우', title: '현직 카피라이터가 알려주는 아이디어 발상법 10가지', content: '좋은 카피는 제품이 아닌 사람에서 시작됩니다.\n\n1. 타깃의 하루를 상상하라\n제품을 쓰는 사람의 아침부터 밤까지를 떠올려보세요.\n\n2. 제품의 기능이 아닌 변화를 써라\n"방수 기능"이 아니라 "비 오는 날도 걱정 없는 하루"가 더 강합니다.\n\n3. 말하지 말고 보여줘라\n"혁신적인 제품입니다"는 약하고, "처음 써본 날, 두 번 다시 전 제품 쓰고 싶지 않았습니다"는 강합니다.\n\n4. 숫자를 구체적으로\n"많은 사람"보다 "127만 명"이 더 믿음직합니다.\n\n5. 소비자의 말을 빌려라\n가장 강한 카피는 소비자가 실제로 하는 말에서 나옵니다. 리뷰를 읽으세요.', author: 'CopyMaster', avatar: 'CM', views: 1240, likes: 82, createdAt: Date.now() - 86400000 * 2, isPinned: true, comments: [{ id: 'cm1', postId: 'p1', author: 'Creative_Lee', avatar: 'CL', content: '5번이 진짜 핵심인 것 같아요. 리뷰에서 카피를 찾는다는 발상이 신선합니다!', likes: 12, createdAt: Date.now() - 3600000, replies: [{ id: 'r1', commentId: 'cm1', author: 'CopyMaster', avatar: 'CM', content: '맞아요! 실제로 아마존 리뷰에서 헤드라인 뽑는 카피라이터들도 많습니다 ㅎㅎ', likes: 8, createdAt: Date.now() - 1800000 }] }, { id: 'cm2', postId: 'p1', author: 'BrandGuru', avatar: 'BG', content: '3번이 너무 공감돼요. 저도 항상 "보여줘라"를 모토로 씁니다.', likes: 7, createdAt: Date.now() - 7200000, replies: [] }] },
  { id: 'p2', category: '자유 게시판', title: '첫 수주 성공했습니다! 캐치카피 덕분에 인생이 바뀌네요.', content: '안녕하세요! 오늘 처음으로 브랜드 카피 수주에 성공했습니다.\n\n디카페인 커피 브리프에서 제 카피가 1등을 해서 상금 100만원을 받게 됐어요.\n\n사실 카피라이팅에는 완전 초보였는데, 이 플랫폼에서 여러 브리프에 도전하면서 실력이 많이 늘었습니다.\n\n앞으로도 열심히 참여할게요! 다들 도전해보세요 :)', author: 'Beginner_Win', avatar: 'BW', views: 3100, likes: 420, createdAt: Date.now() - 86400000, comments: [{ id: 'cm3', postId: 'p2', author: 'NamingKing', avatar: 'NK', content: '축하드려요!! 저도 처음엔 계속 떨어지다가 10번째 도전에서 처음 수주했어요. 포기하지 않으면 다 됩니다!', likes: 34, createdAt: Date.now() - 3600000, replies: [{ id: 'r2', commentId: 'cm3', author: 'Beginner_Win', avatar: 'BW', content: '감사합니다!! 앞으로도 열심히 하겠습니다 🙏', likes: 5, createdAt: Date.now() - 1800000 }] }] },
  { id: 'p3', category: '크리에이터 토크', title: '브랜딩에서 가장 중요한 건 로고가 아니라 한 줄의 메시지입니다.', content: '요즘 스타트업들을 보면 로고에는 수백만원을 쓰면서 슬로건에는 아무 신경도 안 쓰는 경우가 많습니다.\n\n하지만 애플의 "Think Different", 나이키의 "Just Do It"처럼 강력한 한 줄은 로고보다 오래 기억됩니다.\n\n브랜드를 만들 때 가장 먼저 물어야 할 질문은 "우리 브랜드를 한 줄로 설명하면?"입니다.', author: 'BrandGuru', avatar: 'BG', views: 2500, likes: 142, createdAt: Date.now() - 86400000 * 3, comments: [] },
  { id: 'p4', category: '질문&답변', title: '에코워시 브리프 참여하신 분 계신가요? 타겟 설정이 어렵네요.', content: '에코워시 브리프 도전 중인데 타겟 설정을 어떻게 해야 할지 모르겠어요.\n\n"1인 가구"라는 건 알겠는데, 카피를 너무 환경 중심으로 쓰면 딱딱하고 너무 편의 중심으로 쓰면 브랜드 아이덴티티가 흐려지는 것 같아서요.\n\n혹시 비슷한 고민 하신 분들 계신가요?', author: 'Creative_Lee', avatar: 'CL', views: 428, likes: 5, createdAt: Date.now() - 43200000, comments: [{ id: 'cm4', postId: 'p4', author: 'CopyMaster', avatar: 'CM', content: '"환경을 생각하는 나"라는 정체성에 초점을 맞춰보세요. 기능보다 자아 표현으로 가는 거예요.', likes: 18, createdAt: Date.now() - 3600000, replies: [] }] },
];

const CATEGORIES = ['전체', '팁&노하우', '크리에이터 토크', '질문&답변', '자유 게시판', '브랜드 뉴스'];

const timeAgo = (ts: number) => {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

const PALETTE = ['bg-slate-600', 'bg-zinc-700', 'bg-stone-600', 'bg-neutral-700', 'bg-gray-700'];
const getAvatarColor = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const sizeClass = `w-${size} h-${size}`;
  return (
    <div className={cn(sizeClass, 'rounded-full flex items-center justify-center text-white text-xs font-black shrink-0', getAvatarColor(name))}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── 폴더 모양 브리프 카드 ────────────────────────────────
function FolderCard({ item, onClick }: { item: Brief; onClick: () => void }) {
  const isActive = item.status === '진행중';
  return (
    <motion.div whileHover={{ y: -6 }} onClick={onClick} className="cursor-pointer group">
      {/* 폴더 탭 */}
      <div className={cn(
        "h-5 w-24 rounded-t-lg ml-4",
        isActive ? "bg-[#00BE00]" : "bg-gray-300"
      )} />
      {/* 폴더 본체 */}
      <div className={cn(
        "rounded-b-2xl rounded-tr-2xl border-2 overflow-hidden transition-all duration-300 group-hover:shadow-xl",
        isActive ? "border-[#00BE00] bg-white group-hover:border-[#00BE00]" : "border-gray-200 bg-white group-hover:border-gray-400"
      )}>
        {/* 컬러 상단 바 */}
        <div className={cn("h-1.5 w-full", isActive ? "bg-[#00BE00]" : "bg-gray-300")} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className={cn(
              "text-[10px] font-black px-2.5 py-1 rounded-full",
              isActive ? "bg-[#00BE00]/10 text-[#00BE00]" : "bg-gray-100 text-gray-400"
            )}>{item.status}</span>
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              isActive ? "bg-[#00BE00]/10" : "bg-gray-100"
            )}>
              <Target size={14} className={isActive ? "text-[#00BE00]" : "text-gray-400"} />
            </div>
          </div>
          <h4 className="text-sm font-black mb-3 leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-black transition-colors">{item.title}</h4>
          <p className="text-xs font-bold text-gray-400 flex items-center gap-1 mb-4">
            <Building2 size={10} /> {item.companyName}
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <p className="text-base font-black">{item.reward}</p>
            <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
              <Users size={10} /> {item.participants.toLocaleString()}명
            </div>
          </div>
          {isActive && (
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-gray-400">
              <Clock size={10} /> {item.deadline}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── 브리프 상세 패널 ─────────────────────────────────────
function BriefPanel({ brief, copies, onSubmit, onVote, newCopy, setNewCopy }: {
  brief: Brief; copies: CopyEntry[];
  onSubmit: (e: React.FormEvent) => void;
  onVote: (id: string, delta: number) => void;
  newCopy: string; setNewCopy: (v: string) => void;
}) {
  const sorted = [...copies].filter(c => c.briefId === brief.id).sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
  return (
    <motion.div key={brief.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 sticky top-20">
      {/* 브리프 정보 */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white shrink-0">
          <Megaphone size={18} />
        </div>
        <div>
          <h3 className="text-base font-black leading-snug">{brief.companyName}</h3>
          <p className="text-xs font-bold text-gray-400">{brief.reward} · {brief.deadline}</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">미션</p>
          <p className="text-sm font-bold text-gray-800 leading-relaxed">{brief.problem}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">타겟</p>
          <p className="text-sm font-bold text-gray-700">{brief.target}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">캠페인 방향</p>
          <p className="text-sm font-bold text-gray-700">{brief.campaignInfo}</p>
        </div>
      </div>

      {/* 카피 제출 */}
      {brief.status === '진행중' && (
        <form onSubmit={onSubmit} className="relative mb-6">
          <input type="text" value={newCopy} onChange={e => setNewCopy(e.target.value)}
            placeholder="당신의 한 줄을 제안하세요."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 pr-14 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black/20 transition-all" />
          <button type="submit"
            className={cn("absolute right-2 top-2 bottom-2 w-10 rounded-lg flex items-center justify-center transition-all",
              newCopy.trim() ? "bg-black text-white hover:bg-gray-800" : "bg-gray-200 text-gray-400 pointer-events-none")}>
            <Send size={14} />
          </button>
        </form>
      )}

      {/* 랭킹 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={14} className="text-gray-400" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">실시간 랭킹</p>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {sorted.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-bold text-gray-300">첫 번째 카피를 제출해보세요!</p>
            </div>
          ) : sorted.map((copy, idx) => (
            <div key={copy.id} className={cn("p-4 rounded-xl border transition-all",
              idx === 0 ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100 hover:bg-gray-50")}>
              {idx === 0 && (
                <span className="text-[10px] font-black text-[#00BE00] bg-[#00BE00]/10 px-2 py-0.5 rounded mb-2 inline-block">Current 1st</span>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5",
                    idx === 0 ? "bg-black text-white" : "bg-gray-100 text-gray-500")}>{idx + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800 leading-snug">"{copy.content}"</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">{copy.author}</p>
                  </div>
                </div>
                {/* 추천/비추천 */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onVote(copy.id, 1)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black text-gray-400 hover:text-[#00BE00] hover:bg-[#00BE00]/10 transition-all">
                    <ThumbsUp size={12} /> {copy.upvotes}
                  </button>
                  <button onClick={() => onVote(copy.id, -1)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                    <ThumbsDown size={12} /> {copy.downvotes}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── 커뮤니티 게시글 상세 ─────────────────────────────────
function PostDetail({ post, onBack, onUpdatePost }: { post: Post; onBack: () => void; onUpdatePost: (p: Post) => void }) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [localPost, setLocalPost] = useState(post);

  const sync = (p: Post) => { setLocalPost(p); onUpdatePost(p); };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const comment: Comment = { id: Math.random().toString(36).substr(2, 9), postId: post.id, author: '나', avatar: 'ME', content: newComment, likes: 0, createdAt: Date.now(), replies: [] };
    sync({ ...localPost, comments: [...localPost.comments, comment] });
    setNewComment('');
  };

  const handleReply = (commentId: string) => {
    if (!replyContent.trim()) return;
    const reply: Reply = { id: Math.random().toString(36).substr(2, 9), commentId, author: '나', avatar: 'ME', content: replyContent, likes: 0, createdAt: Date.now() };
    sync({ ...localPost, comments: localPost.comments.map(c => c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c) });
    setReplyTo(null); setReplyContent('');
  };

  const likeComment = (commentId: string) => {
    sync({ ...localPost, comments: localPost.comments.map(c => c.id === commentId ? { ...c, likes: c.likes + 1 } : c) });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors mb-8">
        <ArrowLeft size={16} /> 목록으로
      </button>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {localPost.isPinned && <span className="text-xs font-black px-3 py-1 rounded-full bg-black text-white">공지</span>}
          <span className="text-xs font-black px-3 py-1 rounded-full bg-gray-100 text-gray-500">{localPost.category}</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-6 leading-tight">{localPost.title}</h1>
        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar name={localPost.avatar} size={9} />
            <div><p className="text-sm font-black">{localPost.author}</p><p className="text-xs text-gray-400">{timeAgo(localPost.createdAt)}</p></div>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
            <span className="flex items-center gap-1"><Eye size={12} /> {localPost.views.toLocaleString()}</span>
            <span className="flex items-center gap-1"><ThumbsUp size={12} /> {localPost.likes}</span>
          </div>
        </div>
      </div>
      <div className="mb-12 space-y-1">
        {localPost.content.split('\n').map((line, i) => (
          <p key={i} className={cn("text-[15px] leading-relaxed text-gray-700", line === '' ? 'h-3' : '')}>{line}</p>
        ))}
      </div>
      <div className="border-t border-gray-100 pt-10">
        <h3 className="text-lg font-black mb-8">댓글 {localPost.comments.length}</h3>
        <form onSubmit={handleComment} className="flex gap-3 mb-10">
          <Avatar name="ME" size={9} />
          <div className="flex-1 relative">
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="댓글을 입력하세요." rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all" />
            <button type="submit" disabled={!newComment.trim()}
              className="absolute bottom-3 right-3 px-4 py-1.5 bg-black text-white text-xs font-black rounded-xl disabled:opacity-30 disabled:pointer-events-none hover:bg-gray-800 transition-colors">등록</button>
          </div>
        </form>
        <div className="space-y-8">
          {localPost.comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <Avatar name={comment.avatar} size={9} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-black">{comment.author}</span>
                  <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-[14px] text-gray-700 leading-relaxed mb-3">{comment.content}</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => likeComment(comment.id)} className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-black transition-colors">
                    <ThumbsUp size={12} /> {comment.likes}
                  </button>
                  <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-xs font-bold text-gray-400 hover:text-black transition-colors">답글</button>
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
                {comment.replies.length > 0 && (
                  <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-100">
                    {comment.replies.map(reply => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar name={reply.avatar} size={7} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black">{reply.author}</span>
                            <span className="text-xs text-gray-400">{timeAgo(reply.createdAt)}</span>
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

// ─── Main App ─────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'brief' | 'community'>('home');
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [copies, setCopies] = useState<CopyEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('cc_copies') || ''); } catch { return INITIAL_COPIES; }
  });
  const [newCopy, setNewCopy] = useState('');
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [writeForm, setWriteForm] = useState({ title: '', content: '', category: '자유 게시판' });
  const [briefFilter, setBriefFilter] = useState<'전체' | '진행중' | '종료'>('전체');

  useEffect(() => { localStorage.setItem('cc_copies', JSON.stringify(copies)); }, [copies]);

  const homeCopies = useMemo(() =>
    [...copies].filter(c => c.briefId === selectedBrief?.id)
      .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)),
    [copies, selectedBrief]);

  const filteredPosts = useMemo(() => posts.filter(p => {
    const matchCat = activeCategory === '전체' || p.category === activeCategory;
    const matchSearch = !searchQuery || p.title.includes(searchQuery) || p.author.includes(searchQuery);
    return matchCat && matchSearch;
  }).sort((a, b) => { if (a.isPinned && !b.isPinned) return -1; if (!a.isPinned && b.isPinned) return 1; return b.createdAt - a.createdAt; }), [posts, activeCategory, searchQuery]);

  const filteredBriefs = useMemo(() =>
    briefFilter === '전체' ? BRIEFS : BRIEFS.filter(b => b.status === briefFilter),
    [briefFilter]);

  const handleVote = (id: string, delta: number) => {
    setCopies(prev => prev.map(c => c.id === id
      ? { ...c, upvotes: delta > 0 ? c.upvotes + 1 : c.upvotes, downvotes: delta < 0 ? c.downvotes + 1 : c.downvotes }
      : c));
  };

  const handleSubmitCopy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCopy.trim() || !selectedBrief) return;
    setCopies(prev => [{ id: Math.random().toString(36).substr(2, 9), briefId: selectedBrief.id, author: '나', content: newCopy, upvotes: 0, downvotes: 0, createdAt: Date.now() }, ...prev]);
    setNewCopy('');
  };

  const handleWritePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeForm.title.trim() || !writeForm.content.trim()) return;
    const post: Post = { id: Math.random().toString(36).substr(2, 9), category: writeForm.category, title: writeForm.title, content: writeForm.content, author: '나', avatar: 'ME', views: 0, likes: 0, createdAt: Date.now(), comments: [] };
    setPosts(prev => [post, ...prev]);
    setWriteForm({ title: '', content: '', category: '자유 게시판' });
    setShowWriteModal(false);
  };

  const openPost = (post: Post) => {
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, views: p.views + 1 } : p));
    setSelectedPost({ ...post, views: post.views + 1 });
  };

  const handleUpdatePost = (updated: Post) => {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedPost(updated);
  };

  const selectBrief = (brief: Brief) => {
    setSelectedBrief(brief);
    setNewCopy('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1a1a1a]">

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <button onClick={() => { setActiveTab('home'); setSelectedBrief(null); setSelectedPost(null); }} className="flex items-center">
              <img src="/logo.png" alt="CatchCopy" className="h-8 w-auto object-contain" />
            </button>
            <nav className="hidden md:flex items-center gap-1">
              {[{ id: 'brief', label: '브리프' }, { id: 'community', label: '커뮤니티' }].map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setSelectedPost(null); }}
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

        {/* ════ HOME ════ */}
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
                {[{ label: '진행중인 브리프', value: '12개', icon: <Zap size={16} /> }, { label: '이번 달 참여자', value: '3,842명', icon: <Users size={16} /> }, { label: '지급된 총 상금', value: '₩ 48,000,000', icon: <Star size={16} /> }].map((s, i) => (
                  <div key={i} className="flex items-center gap-4 px-8">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500">{s.icon}</div>
                    <div><p className="text-xl font-black">{s.value}</p><p className="text-xs font-bold text-gray-400">{s.label}</p></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="max-w-7xl mx-auto px-6 py-14">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black tracking-tight">참여 가능한 브리프</h3>
                    <button onClick={() => setActiveTab('brief')} className="text-sm font-bold text-gray-400 hover:text-black flex items-center gap-1 transition-colors">전체보기 <ChevronRight size={14} /></button>
                  </div>
                  {BRIEFS.filter(b => b.status === '진행중').map(brief => (
                    <motion.div key={brief.id} whileHover={{ x: 4 }} onClick={() => selectBrief(brief)}
                      className={cn("p-6 rounded-2xl border cursor-pointer transition-all",
                        selectedBrief?.id === brief.id ? "bg-white border-black shadow-lg" : "bg-gray-50 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-md")}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-black text-[#00BE00] bg-[#00BE00]/10 px-2.5 py-1 rounded-full">진행중</span>
                            <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><Clock size={10} /> {brief.deadline}</span>
                          </div>
                          <h4 className="text-base font-black mb-1 leading-snug">{brief.title}</h4>
                          <p className="text-xs font-bold text-gray-400 flex items-center gap-1"><Building2 size={11} /> {brief.companyName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black">{brief.reward}</p>
                          <p className="text-xs font-bold text-gray-400">{brief.participants}명 참여</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="lg:col-span-5">
                  <AnimatePresence mode="wait">
                    {selectedBrief ? (
                      <BriefPanel key={selectedBrief.id} brief={selectedBrief} copies={homeCopies}
                        onSubmit={handleSubmitCopy} onVote={handleVote}
                        newCopy={newCopy} setNewCopy={setNewCopy} />
                    ) : (
                      <div className="border-2 border-dashed border-gray-200 rounded-2xl h-80 flex flex-col items-center justify-center text-gray-300 sticky top-20">
                        <Plus size={28} className="mb-3" /><p className="text-sm font-bold">브리프를 선택하세요</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ════ BRIEF ════ */}
        {activeTab === 'brief' && (
          <div className="max-w-7xl mx-auto px-6 py-14">
            {selectedBrief ? (
              // 브리프 상세
              <div>
                <button onClick={() => setSelectedBrief(null)} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors mb-10">
                  <ArrowLeft size={16} /> 브리프 목록으로
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-7">
                    <FolderCard item={selectedBrief} onClick={() => {}} />
                  </div>
                  <div className="lg:col-span-5">
                    <BriefPanel brief={selectedBrief} copies={copies}
                      onSubmit={handleSubmitCopy} onVote={handleVote}
                      newCopy={newCopy} setNewCopy={setNewCopy} />
                  </div>
                </div>
              </div>
            ) : (
              // 브리프 목록
              <div>
                <div className="mb-10">
                  <h2 className="text-4xl font-black tracking-tighter mb-2">브리프 아카이브</h2>
                  <p className="text-gray-400 font-bold">진행 중이거나 최근 종료된 카피 공모전 목록입니다.</p>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-xl w-fit mb-8 gap-1">
                  {(['전체', '진행중', '종료'] as const).map(f => (
                    <button key={f} onClick={() => setBriefFilter(f)}
                      className={cn("px-5 py-2 rounded-lg text-sm font-black transition-all",
                        briefFilter === f ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-black")}>
                      {f}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredBriefs.map(brief => (
                    <FolderCard key={brief.id} item={brief} onClick={() => selectBrief(brief)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ COMMUNITY ════ */}
        {activeTab === 'community' && (
          selectedPost ? (
            <PostDetail post={selectedPost} onBack={() => setSelectedPost(null)} onUpdatePost={handleUpdatePost} />
          ) : (
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
                  <div className="space-y-3">
                    {filteredPosts.length === 0 ? (
                      <div className="text-center py-20 text-gray-300"><MessageSquare size={32} className="mx-auto mb-3" /><p className="text-sm font-bold">게시글이 없습니다.</p></div>
                    ) : filteredPosts.map(post => (
                      <motion.div key={post.id} whileHover={{ x: 3 }} onClick={() => openPost(post)}
                        className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-md cursor-pointer transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2.5">
                              {post.isPinned && <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-black text-white">공지</span>}
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{post.category}</span>
                            </div>
                            <h4 className="text-base font-black mb-2 leading-snug">{post.title}</h4>
                            <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
                              <span>{post.author}</span>
                              <span>{timeAgo(post.createdAt)}</span>
                              <span className="flex items-center gap-1"><Eye size={10} /> {post.views.toLocaleString()}</span>
                              <span className="flex items-center gap-1"><MessageSquare size={10} /> {post.comments.length}</span>
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
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* Write Modal */}
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

      {/* Footer */}
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
