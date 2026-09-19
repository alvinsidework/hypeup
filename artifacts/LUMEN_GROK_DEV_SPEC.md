# LUMEN — Instagram 인플루언서 댓글 자동화 데스크

> **이 파일은 VS Code에서 Grok(또는 Cursor)이 코드를 짤 때 쓰는 단일 소스 지시서다.**
> 프로젝트 루트에 `AGENTS.md` 로 복사해 두고, 채팅 첫 메시지에 아래 문장을 붙여라.

```
LUMEN_GROK_DEV_SPEC.md (또는 AGENTS.md)를 처음부터 끝까지 읽고 절대 규칙을 따른 뒤,
Phase 0부터 순서대로 구현해. 질문은 진짜 막히기 전에만.
가짜 Instagram 로그인으로 Phase 1을 건너뛰지 마.
UI는 지시서 12장의 디자인 시스템을 그대로 적용해.
```

문서 버전: 1.0  
제품명: **Lumen** (루멘)  
한 줄: 내 Instagram 프로페셔널 계정으로 로그인해, 내 게시물 댓글을 읽고, 키워드에 맞춰 공개 대댓글과 DM을 보내는 운영 데스크.

---

## 0. 에이전트 역할과 절대 규칙

너는 시니어 풀스택으로 Lumen을 **실제로 동작하는 제품**으로 만든다.  
와이어프레임, 더미 로그인, “나중에 API 붙이면 됨” 상태는 실패다.

### 절대 규칙

1. **공식 Instagram API만 사용.** 비밀번호 입력, 세션 쿠키 탈취, 브라우저 매크로, 비공식 스크래핑, 자동 팔로우/좋아요/무작위 댓글은 금지. Meta 정책 위반이고 계정 정지 대상이다.
2. **핵심은 개발자 본인의 Instagram 로그인.** Business Login for Instagram (OAuth). 앱이 비밀번호를 받으면 안 된다. access token은 서버에만 저장한다.
3. **개인 계정은 API 대상이 아니다.** Business 또는 Creator(프로페셔널) 계정만 연결한다. 개인 계정이면 연결 화면에서 전환 안내를 보여준다.
4. **토큰·App Secret은 브라우저에 노출 금지.** `INSTAGRAM_APP_SECRET`, 암호화 키, access token은 서버 전용. `NEXT_PUBLIC_` 으로 내보내지 않는다.
5. **데모 모드 허용 조건:** `INSTAGRAM_APP_ID` 가 없을 때만. 화면 상단에 영구 배너 `DEMO — Instagram 미연결`. 데모는 UI 작업용이고, env가 채워지면 데모 경로를 닫고 실제 OAuth만 연다.
6. **스택을 바꾸지 마라.** 이 문서의 스택·폴더·API 계약을 따른다.
7. **한국어 UI.** 코드 식별자·파일명·주석은 영어. 사용자에게 보이는 카피는 한국어.
8. **한 페이즈를 끝낸 뒤 다음 페이즈.** Phase 1(실제 로그인)이 되기 전에 자동화 엔진을 크게 만들지 마라. 대신 로그인 성공 후 프로필이 보이면 그때 미디어/댓글로 확장한다.
9. 구현 중 Meta 문서와 충돌하면 **Meta 공식 문서가 이긴다.** host는 Instagram Login 경로에서 항상 `graph.instagram.com`.
10. 커밋 단위는 페이즈. 한 파일에 앱 전체를 몰아넣지 마라.

### 하지 말 것

- Facebook Page 필수인 옛 Graph API 경로를 기본으로 쓰지 마라. **Instagram Login** 이 기본이다. (페이지 연결 없이 인스타 계정만으로 동작)
- `instagram_basic` 같은 Facebook Login 권한명을 Instagram Login에 섞지 마라.
- 댓글을 폴링으로만 구현하지 마라. 운영 경로는 webhook. 폴링은 수동 새로고침/백필 전용.
- 토큰을 localStorage / sessionStorage / 로그 / 클라이언트 번들에 넣지 마라.

---

## 1. 제품

Lumen은 Manychat의 Instagram 댓글 자동화에서 **크리에이터 본인이 쓰는 운영 데스크**만 남긴 제품이다.

### 되는 일

| 기능 | 설명 |
| --- | --- |
| Instagram으로 연결 | 내 프로페셔널 계정 OAuth. 비밀번호 없음. |
| 게시물/릴스 목록 | 내 미디어, 썸네일, 캡션, 댓글 수 |
| 댓글 인박스 | 게시물별·전체 댓글, 답글 스레드 |
| 수동 대댓글 | 선택한 댓글에 공개 답글 |
| 숨김 / 삭제 | 스팸·욕설 모더레이션 |
| 자동화 룰 | 키워드 매칭 → 공개 대댓글 및/또는 DM |
| 댓글 → DM | Private Reply. 댓글 단 사람에게 1회 DM |
| 실시간 | webhook `comments` |
| 로그 | 발송 성공/실패, 매칭된 룰, API 에러 |
| 토큰 유지 | 60일 토큰을 만료 전 갱신 |

### 안 하는 일 (v1 범위 밖)

- 게시물 예약 발행, 스토리 작성
- 다른 사람 계정 대행 멀티테넌트 SaaS (App Review Advanced Access 이후)
- 자동 팔로우, 자동 좋아요, 콜드 DM
- Facebook 페이지 인사이트, 광고 관리
- 라이브 방송 전용 고빈도 댓글 봇 (구독은 하되 v1 UX 핵심 아님)

---

## 2. 기술 스택 (잠금)

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | **Next.js 15 App Router** + TypeScript `strict` |
| UI | Tailwind CSS v4 + **shadcn/ui** (new-york) + lucide-react |
| 모션 | framer-motion. `prefers-reduced-motion` 준수 |
| 서버 상태 | TanStack Query |
| 검증 | zod |
| DB | PostgreSQL + Prisma |
| 세션 | httpOnly JWT (`jose`). 서버에서만 검증 |
| 토큰 암호 | AES-256-GCM, `APP_ENCRYPTION_KEY` |
| 배포 | Vercel (webhook은 공개 HTTPS 필수) |
| 로컬 webhook | Cloudflare Tunnel 또는 ngrok |

패키지 매니저: pnpm 또는 npm. 하나를 고르고 섞지 마라.

Node 20+.

---

## 3. 개발자가 코드 전에 할 일 (사람 작업)

에이전트는 이 섹션을 README와 `/connect` 온보딩에 그대로 옮겨 적는다.  
코드가 대신 클릭해줄 수 없는 부분이다.

### 3.1 Instagram 계정

1. 연결할 계정을 **프로페셔널**로 전환 (설정 → 계정 유형 → 비즈니스 또는 크리에이터).
2. 2FA 켜 두는 것을 권장.

### 3.2 Meta 앱

1. [Meta for Developers](https://developers.facebook.com/) 로그인.
2. 앱 만들기 → 유형 **Business**.
3. 제품 추가: **Instagram** → **API setup with Instagram business login**.
4. 여기서 보이는 **Instagram App ID** 와 **Instagram App Secret** 을 복사한다.
   - 주의: Facebook App ID와 **다를 수 있다.** OAuth `client_id` 는 **Instagram App ID**.
5. **OAuth redirect URIs** 에 정확히 등록:
   - `http://localhost:3000/api/auth/instagram/callback` (로컬)
   - `https://<your-domain>/api/auth/instagram/callback` (배포)
   - trailing slash 포함 여부가 대시보드와 **한 글자도 같아야** 한다.
6. 권한(스코프) 사용 설정:
   - `instagram_business_basic`
   - `instagram_business_manage_comments`
   - `instagram_business_manage_messages`
   - (발행은 v1에서 안 써도 스코프에 넣어도 됨) `instagram_business_content_publish`
7. **Roles** 에 본인 Instagram 프로페셔널 계정을 테스터/개발자로 추가. Standard Access에서는 역할 있는 계정만 로그인된다.
8. Webhooks:
   - Callback URL: `https://<public-https>/api/webhooks/instagram`
   - Verify token: `.env` 의 `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` 과 동일 문자열
   - 구독 필드: `comments`, `live_comments`, `messages`
9. 로컬에서 webhook을 받으려면 터널로 공개 HTTPS를 연 뒤 그 URL을 Callback에 넣는다.

### 3.3 App Review

- **자기 계정/테스터만** 쓰면 Standard Access로 개발 가능.
- 불특정 크리에이터에게 배포하려면 Advanced Access + App Review + 비즈니스 인증이 필요하다. v1은 **본인 계정**이 목표.

---

## 4. 환경 변수

`.env.example` 을 만들고 `.env` 는 git에 넣지 않는다. `.env.local` 사용.

```bash
# App
APP_URL=http://localhost:3000
APP_ENCRYPTION_KEY=                # openssl rand -hex 32
AUTH_SECRET=                       # openssl rand -hex 32

# Instagram (Instagram Login — NOT Facebook App ID)
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/instagram/callback
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=
IG_GRAPH_VERSION=v21.0

# Database
DATABASE_URL=postgresql://USER:PASS@localhost:5432/lumen
```

- `INSTAGRAM_APP_ID`가 비면 앱은 데모 모드.
- 클라이언트에 노출 가능한 값은 `APP_URL` 정도. 시크릿은 서버 전용 모듈에서만 읽는다 (`src/lib/env.ts`, `server-only` import).

---

## 5. 아키텍처

```
브라우저
  └─ App Router 페이지 (서버 컴포넌트 + 클라이언트 인터랙션)
       └─ Cookie 세션 (userId)  ──►  Route Handlers / Server Actions
                                        ├─ Instagram Graph 클라이언트
                                        ├─ Prisma (User, Media cache, Comment, Rule, Log)
                                        └─ 자동화 엔진

Instagram
  ├─ OAuth (instagram.com/oauth/authorize)
  ├─ Graph (graph.instagram.com)
  └─ Webhooks POST /api/webhooks/instagram
```

### 요청 원칙

- 브라우저가 Graph API를 **직접 호출하지 않는다.**
- 서버가 유저의 암호화된 토큰을 풀어 `Authorization: Bearer` 로 호출한다.
- Instagram 에러는 로그에 남기고, 유저에게는 한국어 메시지로 변환한다.
- Graph 호출은 타임아웃 12s, 429면 로그 + 재시도 1회(백오프).

### 호스트 잠금

```
OAuth authorize:     https://www.instagram.com/oauth/authorize
Code → short token:  https://api.instagram.com/oauth/access_token
Short → long token:  https://graph.instagram.com/access_token
Refresh:             https://graph.instagram.com/refresh_access_token
Graph 나머지:        https://graph.instagram.com/{IG_GRAPH_VERSION}/...
```

`graph.facebook.com` 을 Instagram Login 토큰과 섞지 마라.

---

## 6. 데이터 모델 (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                   String    @id @default(cuid())
  igUserId             String    @unique
  username             String
  name                 String?
  accountType          String?
  profilePictureUrl    String?
  followersCount       Int?
  mediaCount           Int?
  tokenCipher          String    // AES-256-GCM payload
  tokenExpiresAt       DateTime
  grantedScopes        String[]
  webhookSubscribedAt  DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  media                Media[]
  comments             Comment[]
  rules                Rule[]
  logs                 EventLog[]
}

model Media {
  id            String    @id          // IG media id
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  caption       String?
  mediaType     String    // IMAGE | VIDEO | CAROUSEL_ALBUM | REELS
  mediaUrl      String?
  thumbnailUrl  String?
  permalink     String?
  timestamp     DateTime?
  likeCount     Int?
  commentsCount Int?
  comments      Comment[]
  updatedAt     DateTime  @updatedAt
}

model Comment {
  id            String    @id          // IG comment id
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  mediaId       String
  media         Media     @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  parentId      String?
  igFromId      String?
  igFromUsername String?
  text          String
  timestamp     DateTime?
  hidden        Boolean   @default(false)
  repliedPublic Boolean   @default(false)
  repliedPrivate Boolean  @default(false)
  createdAt     DateTime  @default(now())
}

model Rule {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  enabled         Boolean  @default(true)
  scope           String   // ALL | MEDIA
  mediaId         String?  // scope=MEDIA 일 때
  matchMode       String   // ANY | CONTAINS | EXACT | REGEX
  keywords        String[] // CONTAINS/EXACT
  excludeKeywords String[]
  publicReplies   String[] // 공개 대댓글 후보. 비면 공개 답글 안 함. 실행 시 랜덤 1개
  dmMessage       String?  // 비면 DM 안 함
  hideComment     Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model EventLog {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       String   // AUTH | WEBHOOK | MATCH | PUBLIC_REPLY | PRIVATE_REPLY | HIDE | ERROR
  success    Boolean
  commentId  String?
  mediaId    String?
  ruleId     String?
  message    String
  meta       Json?
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
}
```

토큰은 평문 컬럼 금지. `tokenCipher` 포맷: `iv.authTag.ciphertext` (hex 또는 base64, 한 방식으로 통일).

---

## 7. Instagram API 계약

공통 헤더: `Authorization: Bearer {longLivedToken}`  
버전: `process.env.IG_GRAPH_VERSION` (기본 `v21.0`)

### 7.1 로그인

**Authorize (브라우저 리다이렉트)**

```
GET https://www.instagram.com/oauth/authorize
  ?client_id={INSTAGRAM_APP_ID}
  &redirect_uri={INSTAGRAM_REDIRECT_URI}
  &response_type=code
  &scope=instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages
  &state={csrfNonce}
```

- `state` 를 httpOnly 쿠키에 넣고 콜백에서 비교. 불일치면 중단.
- 콜백 `code` 에 Instagram이 `#_` 를 붙이는 경우가 있다. **반드시 `code.replace(/#_$/, '')`**.

**Short-lived token**

```
POST https://api.instagram.com/oauth/access_token
  body (form): client_id, client_secret, grant_type=authorization_code,
               redirect_uri, code
```

응답 예 (형태가 `data[]` 래핑일 수 있음 — 둘 다 파싱):

```json
{
  "data": [
    {
      "access_token": "IGQ...",
      "user_id": "1020...",
      "permissions": "instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages"
    }
  ]
}
```

또는 `{ "access_token", "user_id" }`. 파서에서 둘 다 처리.

**Long-lived (60일)**

```
GET https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret={INSTAGRAM_APP_SECRET}
  &access_token={shortLived}
```

응답: `{ access_token, token_type, expires_in }` (`expires_in` ≈ 5184000초).

**Refresh (만료 전, 발급 후 24시간 이후)**

```
GET https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token={longLived}
```

만료된 토큰은 갱신 불가 → 재로그인.  
크론: 매일 1회, `tokenExpiresAt - now() < 10 days` 인 유저 refresh.  
Next.js에서는 `vercel.json` crons 또는 `/api/cron/refresh-tokens` + `CRON_SECRET`.

### 7.2 프로필 / 미디어 / 댓글

**Me**

```
GET /{ver}/me?fields=user_id,username,name,account_type,profile_picture_url,followers_count,media_count
```

`user_id` 가 IG 계정 id. 이후 경로의 `{ig-user-id}`.

**미디어 목록**

```
GET /{ver}/me/media
  ?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count
  &limit=25
```

페이지네이션: `paging.next` 또는 `after` 커서.

**댓글 목록**

```
GET /{ver}/{mediaId}/comments
  ?fields=id,text,username,timestamp,like_count,from,replies{id,text,username,timestamp,from}
```

**공개 대댓글**

```
POST /{ver}/{commentId}/replies
Content-Type: application/json
{ "message": "링크 DM으로 보내드렸어요." }
```

성공: `{ "id": "1787..." }`

**숨김 / 해제**

```
POST /{ver}/{commentId}?hide=true
POST /{ver}/{commentId}?hide=false
```

**삭제**

```
DELETE /{ver}/{commentId}
```

**게시물 댓글 on/off (설정에서 선택)**

```
POST /{ver}/{mediaId}?comment_enabled=false
```

### 7.3 Private Reply (댓글 → DM)

Manychat의 핵심과 동일. **공개 대댓글이 아니라 인박스 DM.**

```
POST /{ver}/{ig-user-id}/messages
Content-Type: application/json
{
  "recipient": { "comment_id": "{COMMENT_ID}" },
  "message": { "text": "자료 링크입니다: https://..." }
}
```

제약 (UI와 엔진에 하드코딩):

- 댓글당 **1통**. 두 번째 호출은 실패. `repliedPrivate` 플래그로 막는다.
- 댓글 생성 후 **7일** 안에만 가능.
- 대략 **시간당 750** / 프로페셔널 계정.
- Live 댓글은 방송 중에만.
- 실패 시 로그에 `error.code`, `error.error_subcode`, `error.message` 저장.

### 7.4 Webhook

**검증 (GET `/api/webhooks/instagram`)**

쿼리: `hub.mode`, `hub.verify_token`, `hub.challenge`  
`hub.mode === 'subscribe'` 이고 토큰이 env와 같으면 **body를 challenge 문자열 그대로**, status 200.

**수신 (POST)**

1. `X-Hub-Signature-256` 을 `INSTAGRAM_APP_SECRET` 으로 HMAC-SHA256 검증. 실패면 401.
2. 빠르게 200을 돌려주고 처리는 비동기(waitUntil / 큐 / 같은 요청에서 짧게).
3. Instagram Login 페이로드 예:

```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "<IG_USER_ID>",
      "time": 1710000000,
      "field": "comments",
      "value": {
        "id": "<COMMENT_ID>",
        "from": { "id": "<IGSID>", "username": "someone" },
        "text": "가격 알려주세요",
        "media": { "id": "<MEDIA_ID>", "media_product_type": "FEED" }
      }
    }
  ]
}
```

Facebook Login 형식(`entry[].changes[]`)도 들어오면 같이 파싱해라. 방어적으로 두 스키마를 지원.

4. `entry.id` 로 User를 찾는다. 없으면 무시.
5. 자기 계정 댓글(에코)은 스킵: `from.id === user.igUserId` 또는 username이 본인.
6. 이미 처리한 `comment.id` 면 스킵 (idempotent).
7. Comment upsert → 룰 매칭 → 액션.

**구독 (로그인 직후 서버에서)**

```
POST /{ver}/{ig-user-id}/subscribed_apps?subscribed_fields=comments,live_comments,messages
```

성공: `{ "success": true }`  
실패해도 로그인은 유지하고 설정 화면에 경고.

---

## 8. 세션 / 인증

- 로그인 성공 시 JWT 쿠키 `lumen_session`: `{ userId, igUserId }`, HS256, `httpOnly`, `secure` (prod), `sameSite=lax`, 수명 30일.
- 미들웨어: `/inbox`, `/posts`, `/automations`, `/logs`, `/settings` 는 세션 필수. 없으면 `/` 로.
- `/` 는 미연결이면 랜딩+연결 CTA, 연결되면 오버뷰로 리다이렉트해도 된다. 둘 중 하나를 일관되게.
- 로그아웃: 쿠키 삭제. Instagram 토큰 revoke는 v1에서 선택. DB User는 남기되 설정에서 “연결 해제” 시 `tokenCipher` 삭제.

서버 헬퍼:

```ts
getSession(): Promise<{ userId: string } | null>
requireUser(): Promise<User> // 없거나 토큰 만료면 throw → 로그인으로
getPlainToken(user: User): string // decrypt
```

---

## 9. 자동화 엔진

파일: `src/lib/instagram/engine.ts`

입력: `user`, `comment { id, text, mediaId, timestamp }`  
출력: 적용된 룰과 실행 결과.

### 매칭

1. `enabled` 룰만. 유저별로 `updatedAt desc`.
2. `scope=MEDIA` 면 `mediaId` 일치. `ALL` 은 모든 게시물.
3. `excludeKeywords` 중 하나라도 댓글에 포함되면 제외 (대소문자 무시, 한글 그대로).
4. `matchMode`
   - `ANY` — 모든 댓글
   - `CONTAINS` — keywords 중 하나라도 포함 (trim, case-insensitive)
   - `EXACT` — trim 후 완전 일치
   - `REGEX` — keywords[0] 를 `new RegExp(pattern, 'i')`. 생성 실패 룰은 스킵 + 로그
5. **한 댓글에 룰 하나.** 먼저 매칭된 룰만 실행 (우선순위 = 목록 위).

### 실행 순서

1. `hideComment` → hide API, `comment.hidden=true`
2. `publicReplies.length > 0` → 배열에서 랜덤 1개로 replies API, `repliedPublic=true`
3. `dmMessage` 존재 → private reply. 이미 `repliedPrivate` 이거나 7일 지났으면 스킵 로그
4. EventLog 기록

공개 답글과 DM을 둘 다 설정하는 것이 Manychat 기본 패턴이다. 둘 다 지원.

### 시뮬레이터 (필수 UX)

자동화 페이지에서 샘플 댓글 텍스트 + 게시물 선택 → **API 호출 없이** 어떤 룰이 매칭되는지, 어떤 대댓글/DM이 나가는지 미리보기. 엔진의 `match()` 를 순수함수로 분리해 서버/클라이언트 공유 가능하게.

---

## 10. 화면과 기능

반응형: 모바일 390px 우선, 데스크톱은 좌측 사이드바.

### 라우트

| 경로 | 내용 |
| --- | --- |
| `/` | 랜딩 또는 오버뷰 |
| `/connect` | 연결 설명 + `Instagram으로 계속` |
| `/posts` | 미디어 그리드 |
| `/posts/[id]` | 해당 게시물 댓글 스레드 |
| `/inbox` | 전체 댓글 인박스 |
| `/automations` | 룰 CRUD + 시뮬레이터 |
| `/logs` | 이벤트 로그 |
| `/settings` | 계정, 토큰 만료, webhook, 연결 해제 |
| `/api/auth/instagram` | OAuth 시작 |
| `/api/auth/instagram/callback` | OAuth 콜백 |
| `/api/auth/logout` | 로그아웃 |
| `/api/webhooks/instagram` | webhook |
| `/api/cron/refresh-tokens` | 토큰 갱신 |

### `/connect`

- 큰 헤드라인: “내 인스타그램으로 운영 데스크 연결”
- 본인 계정만, 비밀번호는 Instagram이 받는다는 문장
- 프로페셔널 계정 필요 안내
- 버튼: Instagram으로 계속 → `/api/auth/instagram`
- 데모 모드면 배너 + “데모 둘러보기” (시드 데이터)

### 오버뷰 `/`

- 프로필 칩 (아바타, @username, 팔로워)
- 숫자 4개: 오늘 댓글, 오늘 자동 답글, 오늘 DM, 활성 룰
- 최근 댓글 5개, 최근 로그 5개
- 토큰이 7일 내 만료면 경고 배너 + 재연결

### `/posts`

- 2열(모바일) / 4열(데스크톱) 그리드
- 썸네일, 댓글 수, 미디어 타입 뱃지, 캡션 1줄
- 클릭 → `/posts/[id]`
- 상단 “Instagram에서 새로고침” (Graph pull + upsert)

### `/posts/[id]`, `/inbox`

인박스 UX (둘 다 같은 코멘트 리스트 컴포넌트):

- 필터: 전체 / 미답글 / 숨김 / 키워드 검색
- 행: 아바타 이니셜, @username, 텍스트, 상대시간, 게시물 썸네일
- 선택하면 우측(데스크톱) 또는 시트(모바일): 스레드, 답글 입력, DM 보내기, 숨김, 삭제
- 답글 전송 중 버튼 로딩, 성공 토스트
- 빈 상태: “아직 댓글이 없습니다”

### `/automations`

- 룰 카드 리스트. 토글 enable.
- 생성/수정 시트:
  - 이름
  - 대상: 모든 게시물 / 특정 게시물 (피커)
  - 매칭: 모든 댓글 / 키워드 포함 / 완전 일치
  - 키워드 칩 입력 (Enter로 추가)
  - 제외 키워드
  - 공개 대댓글 1~5개 (줄마다 하나, 랜덤 발송)
  - DM 본문 (textarea, 선택)
  - 댓글 숨김 체크
- 시뮬레이터 패널: 샘플 텍스트 → 매칭 결과
- 빈 상태: “첫 자동화 만들기 — 예: ‘가격’ 댓글에 견적 DM”

### `/logs`

- 시간 역순. 타입 필터. 성공/실패 점.
- 무한 스크롤 또는 페이지 20개.

### `/settings`

- 연결된 계정, 스코프, 토큰 만료일
- webhook 구독 상태, “다시 구독”
- 연결 해제 (확인 다이얼로그)
- 데모 모드 안내 (env 비었을 때)

모든 화면: 로딩 스켈레톤, 에러 배너(재시도), 빈 상태. 스피너만 있는 흰 화면 금지.

---

## 11. UI 디자인 시스템

트렌디하되 **AI 슬롭 금지**. Linear × 사진 스튜디오 데스크. Instagram UI를 카피하지 마라.

### 토큰 (Tailwind v4 `@theme` 에 한 번만)

```css
@theme {
  --color-bg: #0b0b0c;
  --color-surface: #141416;
  --color-surface-2: #1c1c1f;
  --color-fg: #f4f1ea;
  --color-muted: #9a9590;
  --color-subtle: #6e6a66;
  --color-border: color-mix(in oklab, var(--color-fg) 12%, transparent);
  --color-accent: #d4c4b0;
  --color-accent-fg: #0b0b0c;
  --color-danger: #c45c4a;
  --color-ok: #7d9b7a;
  --font-display: "Fraunces", ui-serif, serif;
  --font-sans: "IBM Plex Sans KR", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
}
```

폰트: Google Fonts `Fraunces` (opsz, 헤드라인만) + `IBM Plex Sans KR`.

### 규칙

- 색은 위 팔레트만. 보라/네온/레인보우 그라데이션 금지.
- 배경 그라데이션 blob, 이모지 아이콘, Inter-only, 유리 몰핑 남용 금지.
- 아이콘은 lucide, 1.5px 스트로크, currentColor.
- 버튼 기본 `cursor: pointer`.
- 바깥 radius = 안쪽 radius + padding (concentric).
- 카드: `bg-surface`, hairline border, 그림자 거의 없음.
- Primary CTA: `bg-fg text-bg` (따뜻한 종이색 버튼). Accent는 포커스/하이라이트.
- 상태 색(ok/danger)은 뱃지·점·작은 텍스트만. 패널 전체를 칠하지 않음.
- 모바일 탭 타깃 ≥ 44px. 하단 고정 탭바 (Posts / Inbox / Auto / Logs / More).
- 데스크톱: 240px 좌측 레일, 로고 워드마크 **Lumen**, 본문 max 1200px.
- 숫자·시간은 `tabular-nums`.

### 모션

- hover/press 150–250ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`
- 페이지 전환: opacity + translateY(8px)
- 리스트 입장: stagger 40ms, 과하지 않게 첫 8개만
- 모달: scale 0.96 → 1, 닫을 때 더 짧게
- `transition: all` 금지. `prefers-reduced-motion: reduce` 이면 즉시/페이드만
- 레이아웃 애니메이션으로 전체 그리드를 흔들지 마라

### 카피 톤

짧고 운영 도구답게. “✨ AI가 대신 답해드려요” 같은 문장 금지.  
예: “연결”, “대댓글 보내기”, “DM 보내기”, “자동화 켜짐”, “토큰 8일 후 만료”.

### 로고

워드마크 `Lumen` (Fraunces italic). 마크는 작은 원 두 개(댓글 버블) SVG. Instagram 글리프 카피 금지.

---

## 12. 폴더 구조

```
src/
  app/
    layout.tsx
    page.tsx
    connect/page.tsx
    posts/page.tsx
    posts/[id]/page.tsx
    inbox/page.tsx
    automations/page.tsx
    logs/page.tsx
    settings/page.tsx
    api/auth/instagram/route.ts
    api/auth/instagram/callback/route.ts
    api/auth/logout/route.ts
    api/webhooks/instagram/route.ts
    api/cron/refresh-tokens/route.ts
  components/
    ui/                 # shadcn
    app-shell.tsx
    connect-button.tsx
    media-grid.tsx
    comment-list.tsx
    comment-thread.tsx
    rule-form.tsx
    rule-simulator.tsx
    log-table.tsx
    empty-state.tsx
  lib/
    env.ts              # server-only
    db.ts
    session.ts
    crypto.ts
    instagram/
      client.ts         # fetch wrapper
      oauth.ts
      comments.ts
      messages.ts
      media.ts
      webhooks.ts
      engine.ts
      types.ts
    copy.ts             # 한국어 문자열
  prisma/schema.prisma
```

`src/lib/instagram/client.ts` 가 모든 Graph 호출의 단일 진입점. 페이지에서 `fetch('https://graph.instagram.com...')` 직접 금지.

---

## 13. 구현 순서 (페이즈)

각 페이즈가 끝나야 다음으로. 에이전트는 페이즈 완료 조건을 스스로 체크한다.

### Phase 0 — 골격

- Next.js + Tailwind v4 + shadcn 초기화
- 디자인 토큰, 폰트, 셸(사이드바/탭바), 빈 페이지
- Prisma 스키마, migrate
- `.env.example`
- README: 섹션 3의 사람 작업 + 실행 방법
- **완료:** 홈이 디자인 시스템으로 렌더되고, 데모 배너 규칙이 있다

### Phase 1 — 실제 Instagram 로그인  ← 핵심. 건너뛰지 말 것

- `/api/auth/instagram` + callback
- state CSRF, code `#_` 스트립, short→long 교환, 암호화 저장, 세션 쿠키
- `GET /me` 로 프로필 저장
- `/connect` + 로그인된 셸 헤더에 @username
- 실패 화면: 권한 거부, 개인 계정, 테스터 아님, redirect mismatch
- **완료:** env를 채운 개발자가 **본인 프로페셔널 계정으로 로그인**하면 오버뷰에 아바타와 username이 실제 값으로 보인다. 목 유저로 대체하지 말 것.

### Phase 2 — 게시물 + 댓글 읽기

- media pull, 그리드, 상세
- comments pull, 인박스
- 수동 새로고침
- **완료:** 로그인한 계정의 실제 게시물·댓글이 보인다

### Phase 3 — 수동 액션

- 공개 대댓글, 숨김, 삭제, (선택) 수동 DM
- 토스트 + 로그
- **완료:** 대시보드에서 단 답글이 Instagram 앱에 실제로 달린다

### Phase 4 — 자동화 + webhook

- 룰 CRUD, 시뮬레이터
- webhook verify + signature + 엔진
- 로그인 후 `subscribed_apps`
- **완료:** 키워드 댓글을 폰에서 달면 대댓글이 자동으로 달린다 (터널 필요)

### Phase 5 — Private Reply + 운영

- DM 액션, 7일/1회 가드
- 토큰 refresh 크론
- 로그 필터, 설정, 연결 해제
- 모바일 레이아웃 점검
- **완료:** 키워드 댓글 → 공개 답글 + DM 동시, 로그에 기록

### Phase 6 — 품질

- 에러 한국어화 (OAuthException, 2534014 중복 DM, 권한 부족)
- 로딩/빈/에러 상태
- rate limit 메시지
- 접근성: 포커스 링, 라벨
- **완료:** 아래 DoD

---

## 14. 보안

- App Secret, 암호화 키, 토큰: 서버만. 로그에 토큰 출력 금지 (앞 6글자만).
- webhook 시그니처 검증 없이 본문 신뢰 금지.
- 모든 mutation은 세션의 userId 스코프. 클라이언트에서 userId / commentId만 보내고 남의 토큰으로 호출하지 못하게, 서버가 소유권 확인.
- XSS: 댓글 텍스트는 텍스트 노드로. `dangerouslySetInnerHTML` 금지.
- CSRF: OAuth state. 쿠키 `sameSite=lax`.
- Prisma 입력은 zod 파싱 후.
- 삭제/연결 해제는 AlertDialog 확인.

---

## 15. 에러 매핑 (한국어)

| 상황 | 카피 |
| --- | --- |
| 개인 계정 / 권한 부족 | 프로페셔널 계정만 연결할 수 있습니다. Instagram 설정에서 비즈니스 또는 크리에이터로 전환하세요. |
| 테스터 아님 | Meta 앱 역할에 이 계정을 테스터로 추가해야 합니다. |
| redirect URI | Instagram 앱의 OAuth redirect URI가 이 주소와 정확히 같아야 합니다. |
| 토큰 만료 | 연결이 만료되었습니다. 다시 연결하세요. |
| DM 중복 | 이 댓글에는 이미 DM을 보냈습니다. (댓글당 1통) |
| DM 7일 | 댓글 후 7일이 지나 DM을 보낼 수 없습니다. |
| 429 | Instagram 요청이 너무 많습니다. 잠시 후 다시 시도하세요. |
| webhook 미구독 | 실시간 자동화가 꺼져 있습니다. 설정에서 다시 구독하세요. |

Graph 에러 원문은 로그 `meta`에만.

---

## 16. 테스트

- `engine.match` 유닛 테스트: ANY / CONTAINS / EXACT / 제외 키워드 / 우선순위 / 자기 댓글 스킵
- OAuth 콜백: `#_` 스트립, state 불일치 거부
- webhook: 잘못된 시그니처 401, 정상 challenge 에코
- 가능하면 본인 계정으로 Phase 1–3 수동 스모크 (에이전트 README에 체크리스트)

---

## 17. Definition of Done

- [ ] 본인 Instagram 프로페셔널 계정으로 로그인된다
- [ ] 실제 게시물과 댓글이 인박스에 보인다
- [ ] 대시보드에서 보낸 공개 대댓글이 Instagram에 보인다
- [ ] 룰 저장 후, 키워드 댓글 webhook(또는 수동 “이 댓글에 룰 실행”)으로 대댓글/DM이 나간다
- [ ] 토큰이 서버에 암호화되어 있고 클라이언트 JS에 없다
- [ ] 390px / 1280px 레이아웃이 깨지지 않는다
- [ ] 데모 모드는 env 없을 때만, 배너가 있다
- [ ] README만 읽고 제3자가 Meta 앱 + env + 터널을 설정할 수 있다

---

## 18. VS Code에서 Grok에게 일을 주는 방법

1. 빈 폴더에서 이 파일을 `AGENTS.md` 로 저장.
2. 채팅:

```
AGENTS.md를 전부 읽고 Phase 0부터 구현해.
지금은 Phase 0만. 끝나면 완료 조건과 다음 명령을 짧게 알려줘.
```

3. Phase 0이 끝나면 사람이 Meta 앱을 만들고 `.env.local` 을 채운다.
4. 다음 채팅:

```
.env.local에 Instagram 키가 있다. Phase 1만 구현하고,
내가 로그인 버튼을 눌러 내 계정으로 연결할 수 있게 해.
목 로그인 넣지 마.
```

5. 이후 `Phase 2만`, `Phase 3만` 식으로 자른다. 한 번에 전부 시키지 않는 편이 품질이 높다.
6. 막히면 에러 JSON(토큰 가린 것)을 붙여 주고, 지시서 7장을 다시 읽게 한다.

### 페이즈별 짧은 프롬프트

- P0: `Phase 0 골격만. 디자인 토큰과 셸, Prisma, README.`
- P1: `Phase 1 실제 Instagram OAuth. 가짜 세션 금지.`
- P2: `Phase 2 내 미디어/댓글 pull. Graph는 lib/instagram/client.ts만.`
- P3: `Phase 3 수동 대댓글/숨김/삭제. 실제 API.`
- P4: `Phase 4 룰 + webhook + 엔진. 시뮬레이터 포함.`
- P5: `Phase 5 private reply 가드 + 토큰 refresh + 설정.`
- P6: `Phase 6 모바일, 에러 카피, 빈 상태, 접근성.`

---

## 19. 참고 공식 문서

구현 중 의심되면 코드를 추측하지 말고 아래를 연다.

- Instagram Login 개요: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
- Business Login: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
- Comment moderation: https://developers.facebook.com/docs/instagram-platform/comment-moderation
- Private replies: https://developers.facebook.com/docs/instagram-platform/private-replies
- Webhooks: https://developers.facebook.com/docs/instagram-platform/webhooks
- Token exchange: https://developers.facebook.com/docs/instagram-platform/reference/access_token
- Refresh: https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token

API 버전은 대시보드와 맞추고 `IG_GRAPH_VERSION` 한곳에서만 바꾼다.

---

## 20. 첫 커밋 메시지 가이드

- `chore: scaffold lumen shell and design tokens`
- `feat: instagram oauth login and encrypted token store`
- `feat: sync media and comments`
- `feat: manual comment reply hide delete`
- `feat: keyword automation engine and webhooks`
- `feat: private replies and token refresh`

끝. 이 문서에 없는 “멋진 기능”을 먼저 만들지 마라. 로그인 → 읽기 → 수동 답글 → 자동화가 제품이다.
