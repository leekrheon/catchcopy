-- =====================================================
-- CatchCopy Supabase 설정 SQL
-- Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.
-- =====================================================

-- 1. 테이블 생성
-- ─────────────────────────────────────────────────────

CREATE TABLE briefs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  title        text NOT NULL,
  problem      text NOT NULL,
  target       text NOT NULL,
  campaign_info text NOT NULL,
  reward       text NOT NULL,
  deadline     text NOT NULL,
  participants integer NOT NULL DEFAULT 0,
  status       text NOT NULL CHECK (status IN ('진행중', '종료')),
  category     text NOT NULL,
  bg_color     text NOT NULL DEFAULT 'bg-gray-50',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE copies (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id  uuid NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  author    text NOT NULL DEFAULT '익명',
  content   text NOT NULL,
  upvotes   integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category   text NOT NULL,
  title      text NOT NULL,
  content    text NOT NULL,
  author     text NOT NULL DEFAULT '익명',
  avatar     text NOT NULL DEFAULT 'AN',
  views      integer NOT NULL DEFAULT 0,
  likes      integer NOT NULL DEFAULT 0,
  is_pinned  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author     text NOT NULL DEFAULT '익명',
  avatar     text NOT NULL DEFAULT 'AN',
  content    text NOT NULL,
  likes      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  author     text NOT NULL DEFAULT '익명',
  avatar     text NOT NULL DEFAULT 'AN',
  content    text NOT NULL,
  likes      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- 2. Realtime 활성화
-- ─────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE briefs;
ALTER PUBLICATION supabase_realtime ADD TABLE copies;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE replies;


-- 3. RLS (Row Level Security) — 읽기는 누구나, 쓰기는 누구나 (로그인 없는 MVP)
-- ─────────────────────────────────────────────────────
ALTER TABLE briefs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE copies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies  ENABLE ROW LEVEL SECURITY;

-- 모든 테이블에 anon(비로그인) 전체 허용 정책
CREATE POLICY "public_read_briefs"   ON briefs   FOR SELECT USING (true);
CREATE POLICY "public_insert_briefs" ON briefs   FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_briefs" ON briefs   FOR UPDATE USING (true);

CREATE POLICY "public_read_copies"   ON copies   FOR SELECT USING (true);
CREATE POLICY "public_insert_copies" ON copies   FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_copies" ON copies   FOR UPDATE USING (true);

CREATE POLICY "public_read_posts"    ON posts    FOR SELECT USING (true);
CREATE POLICY "public_insert_posts"  ON posts    FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_posts"  ON posts    FOR UPDATE USING (true);

CREATE POLICY "public_read_comments" ON comments FOR SELECT USING (true);
CREATE POLICY "public_insert_comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_comments" ON comments FOR UPDATE USING (true);

CREATE POLICY "public_read_replies"  ON replies  FOR SELECT USING (true);
CREATE POLICY "public_insert_replies" ON replies FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_replies" ON replies FOR UPDATE USING (true);


-- 4. 초기 데이터 (하드코딩 대체 seed)
-- ─────────────────────────────────────────────────────

INSERT INTO briefs (company_name, title, problem, target, campaign_info, reward, deadline, participants, status, category, bg_color) VALUES
('카페인 (Cafe-In)',
 'MZ세대를 위한 새로운 디카페인 커피 브랜드 런칭',
 '기존 디카페인 커피는 "맛이 없다"는 편견이 강해 젊은 층의 유입이 적음.',
 '커피를 좋아하지만 카페인 민감도가 높은 2030 직장인 및 대학생',
 '맛과 향을 모두 잡은 스위스 워터 프로세스 공법 강조',
 '₩ 1,000,000', '3일 후 마감', 248, '진행중', 'F&B', 'bg-amber-50'),

('그린웨이브 (GreenWave)',
 '친환경 세탁 서비스 "에코워시" 캠페인',
 '편리함 위주의 세탁 서비스 시장에서 "환경 보호"라는 가치가 비용 부담으로 느껴지는 문제.',
 '지속 가능한 소비를 지향하고 가치 소비를 즐기는 1인 가구',
 '미세 플라스틱 저감 세탁망 및 생분해 세제 사용 어필',
 '₩ 500,000', '7일 후 마감', 134, '진행중', '라이프스타일', 'bg-green-50'),

('핀트 (Fint)',
 '신규 핀테크 서비스 메인 카피 공모',
 '금융 앱이 딱딱하고 어렵다는 인식을 깨고 싶음.',
 '재테크에 관심 있는 2030 초보 투자자',
 '쉽고 친근한 투자 경험을 강조, 앱의 UI/UX 연계',
 '₩ 2,500,000', '14일 후 마감', 512, '진행중', '핀테크', 'bg-blue-50'),

('카페인 (Cafe-In)',
 '더 맑은 카페인, 세상을 깨우는 향',
 '프리미엄 커피 시장에서 차별화된 브랜드 아이덴티티 확립 필요.',
 '고품질 커피를 추구하는 30~40대 직장인',
 '원두 산지 강조, 핸드드립 공정 어필',
 '₩ 1,000,000', '종료', 1428, '종료', 'F&B', 'bg-orange-50'),

('에코워시',
 '에코워시: 지구를 닦는 스마트 세탁',
 '친환경 세탁 서비스의 가격 부담 이미지 탈피.',
 '환경에 관심 있는 2030 1인 가구',
 '생분해 세제, 미세플라스틱 저감 어필',
 '₩ 500,000', '종료', 842, '종료', '라이프스타일', 'bg-emerald-50'),

('핀테크 스타트업',
 '신규 핀테크 서비스 네이밍',
 '복잡한 금융을 쉽게 접근하게 하는 서비스명 필요.',
 '20~30대 초보 투자자',
 '직관적이고 친근한 이름 선호',
 '₩ 2,500,000', '종료', 3102, '종료', '핀테크', 'bg-indigo-50'),

('MZ패션',
 'MZ세대 취향 저격 패키징 슬로건',
 '패키징이 구매 결정에 미치는 영향 강화 필요.',
 '트렌드에 민감한 18~28세',
 '감각적이고 공유하고 싶은 카피 원함',
 '₩ 700,000', '종료', 612, '종료', '패션', 'bg-pink-50'),

('그린클로스',
 '친환경 소재 의류 캠페인 카피',
 '친환경 패션의 가격 저항 극복.',
 '가치 소비를 추구하는 2030',
 '지속가능성과 스타일 두 마리 토끼 강조',
 '₩ 1,200,000', '종료', 921, '종료', '패션', 'bg-teal-50');


-- copies seed (brief id는 위에서 생성된 uuid를 참조, 순서대로 첫 3개 브리프)
-- 아래는 참조용 예시 — 실제 brief uuid는 삽입 후 확인 필요
-- 대신 subquery로 처리합니다

INSERT INTO copies (brief_id, author, content, upvotes, downvotes, created_at)
SELECT id, '카피왕', '밤의 카페인은 덜어내고, 아침의 햇살만 남겼습니다.', 42, 3, now() - interval '1 hour'
FROM briefs WHERE title LIKE 'MZ세대를 위한%' LIMIT 1;

INSERT INTO copies (brief_id, author, content, upvotes, downvotes, created_at)
SELECT id, '문장가', '맛은 그대로, 불안은 없이.', 38, 5, now() - interval '2 hours'
FROM briefs WHERE title LIKE 'MZ세대를 위한%' LIMIT 1;

INSERT INTO copies (brief_id, author, content, upvotes, downvotes, created_at)
SELECT id, 'wordsmiths', '당신의 밤을 지켜주는 커피.', 21, 8, now() - interval '3 hours'
FROM briefs WHERE title LIKE 'MZ세대를 위한%' LIMIT 1;

INSERT INTO copies (brief_id, author, content, upvotes, downvotes, created_at)
SELECT id, 'EcoWriter', '세탁기 한 번에, 지구 한 번 더.', 55, 2, now() - interval '1 hour'
FROM briefs WHERE title LIKE '친환경 세탁%' LIMIT 1;

INSERT INTO copies (brief_id, author, content, upvotes, downvotes, created_at)
SELECT id, '그린펜', '깨끗한 옷, 깨끗한 지구.', 31, 4, now() - interval '2 hours'
FROM briefs WHERE title LIKE '친환경 세탁%' LIMIT 1;

INSERT INTO copies (brief_id, author, content, upvotes, downvotes, created_at)
SELECT id, 'FinWriter', '투자, 어렵지 않아요. 핀트가 있으니까요.', 67, 6, now() - interval '1 hour'
FROM briefs WHERE title LIKE '신규 핀테크%' LIMIT 1;


-- posts seed
INSERT INTO posts (category, title, content, author, avatar, views, likes, is_pinned, created_at) VALUES
('팁&노하우',
 '현직 카피라이터가 알려주는 아이디어 발상법 10가지',
 '좋은 카피는 제품이 아닌 사람에서 시작됩니다.

1. 타깃의 하루를 상상하라
제품을 쓰는 사람의 아침부터 밤까지를 떠올려보세요.

2. 제품의 기능이 아닌 변화를 써라
"방수 기능"이 아니라 "비 오는 날도 걱정 없는 하루"가 더 강합니다.

3. 말하지 말고 보여줘라
"혁신적인 제품입니다"는 약하고, "처음 써본 날, 두 번 다시 전 제품 쓰고 싶지 않았습니다"는 강합니다.

4. 숫자를 구체적으로
"많은 사람"보다 "127만 명"이 더 믿음직합니다.

5. 소비자의 말을 빌려라
가장 강한 카피는 소비자가 실제로 하는 말에서 나옵니다. 리뷰를 읽으세요.',
 'CopyMaster', 'CM', 1240, 82, true, now() - interval '2 days'),

('자유 게시판',
 '첫 수주 성공했습니다! 캐치카피 덕분에 인생이 바뀌네요.',
 '안녕하세요! 오늘 처음으로 브랜드 카피 수주에 성공했습니다.

디카페인 커피 브리프에서 제 카피가 1등을 해서 상금 100만원을 받게 됐어요.

사실 카피라이팅에는 완전 초보였는데, 이 플랫폼에서 여러 브리프에 도전하면서 실력이 많이 늘었습니다.

앞으로도 열심히 참여할게요! 다들 도전해보세요 :)',
 'Beginner_Win', 'BW', 3100, 420, false, now() - interval '1 day'),

('크리에이터 토크',
 '브랜딩에서 가장 중요한 건 로고가 아니라 한 줄의 메시지입니다.',
 '요즘 스타트업들을 보면 로고에는 수백만원을 쓰면서 슬로건에는 아무 신경도 안 쓰는 경우가 많습니다.

하지만 애플의 "Think Different", 나이키의 "Just Do It"처럼 강력한 한 줄은 로고보다 오래 기억됩니다.',
 'BrandGuru', 'BG', 2500, 142, false, now() - interval '3 days'),

('질문&답변',
 '에코워시 브리프 참여하신 분 계신가요? 타겟 설정이 어렵네요.',
 '에코워시 브리프 도전 중인데 타겟 설정을 어떻게 해야 할지 모르겠어요.',
 'Creative_Lee', 'CL', 428, 5, false, now() - interval '12 hours');


-- comments seed
INSERT INTO comments (post_id, author, avatar, content, likes, created_at)
SELECT id, 'Creative_Lee', 'CL', '5번이 진짜 핵심인 것 같아요!', 12, now() - interval '1 hour'
FROM posts WHERE title LIKE '현직 카피라이터%' LIMIT 1;

INSERT INTO comments (post_id, author, avatar, content, likes, created_at)
SELECT id, 'NamingKing', 'NK', '축하드려요!! 포기하지 않으면 다 됩니다!', 34, now() - interval '1 hour'
FROM posts WHERE title LIKE '첫 수주%' LIMIT 1;

INSERT INTO comments (post_id, author, avatar, content, likes, created_at)
SELECT id, 'CopyMaster', 'CM', '"환경을 생각하는 나"라는 정체성에 초점을 맞춰보세요.', 18, now() - interval '1 hour'
FROM posts WHERE title LIKE '에코워시 브리프%' LIMIT 1;


-- replies seed
INSERT INTO replies (comment_id, author, avatar, content, likes, created_at)
SELECT id, 'CopyMaster', 'CM', '맞아요! 실제로 아마존 리뷰에서 헤드라인 뽑는 카피라이터들도 많습니다 ㅎㅎ', 8, now() - interval '30 minutes'
FROM comments WHERE content LIKE '5번이%' LIMIT 1;
