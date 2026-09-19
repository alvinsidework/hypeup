# Hypeup

내 Instagram 프로페셔널 계정으로 로그인해, 게시물 댓글을 읽고, 키워드에 맞춰 공개 대댓글과 DM을 보내는 운영 데스크입니다.

비밀번호는 받지 않습니다. 공식 Instagram Login(OAuth)만 사용합니다.

Instagram App ID가 없으면 데모 모드로 열립니다. 화면 상단에 `DEMO — Instagram 미연결` 배너가 고정됩니다.

## 직접 해야 하는 일

코드가 대신 클릭해줄 수 없는 부분입니다.

### 1. Instagram 계정

1. 연결할 계정을 **프로페셔널**로 전환합니다. 설정 → 계정 유형 → 비즈니스 또는 크리에이터.
2. 2단계 인증을 켜 두는 것을 권장합니다.

### 2. Meta 앱

1. [Meta for Developers](https://developers.facebook.com/)에 로그인합니다.
2. 앱 만들기 → 유형 **Business**.
3. 제품 추가: **Instagram** → **API setup with Instagram business login**.
4. 화면에 보이는 **Instagram App ID**와 **Instagram App Secret**을 복사합니다.
   - Facebook App ID와 다를 수 있습니다. OAuth `client_id`는 Instagram App ID입니다.
5. **OAuth redirect URIs**에 정확히 등록합니다. trailing slash 포함 여부까지 같아야 합니다.
   - 로컬: `http://localhost:8080/api/auth/instagram/callback`
   - 배포: `https://<your-domain>/api/auth/instagram/callback`
6. 권한:
   - `instagram_business_basic`
   - `instagram_business_manage_comments`
   - `instagram_business_manage_messages`
7. **Roles**에 본인 Instagram 프로페셔널 계정을 테스터/개발자로 추가합니다. Standard Access에서는 역할 있는 계정만 로그인됩니다.
8. Webhooks (자동화 실시간 수신용, 터널 필요):
   - Callback URL: `https://<public-https>/api/webhooks/instagram`
   - Verify token: `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`과 동일 문자열
   - 구독 필드: `comments`, `live_comments`, `messages`

### 3. 환경 변수

`.env.example`을 복사해 `.env.local`을 만듭니다. git에 넣지 마세요.

```bash
cp .env.example .env.local
openssl rand -hex 32   # APP_ENCRYPTION_KEY
openssl rand -hex 32   # AUTH_SECRET
```

`INSTAGRAM_APP_ID`가 비어 있으면 데모 모드입니다. 키가 채워지면 데모 경로는 닫히고 실제 OAuth만 열립니다.

### 4. App Review

자기 계정/테스터만 쓰면 Standard Access로 개발할 수 있습니다. 불특정 크리에이터에게 배포하려면 Advanced Access + App Review + 비즈니스 인증이 필요합니다. v1은 본인 계정이 목표입니다.

## 로컬에서 실행

```bash
npm install
npm run dev
```

미리보기는 `http://localhost:8080`입니다.

데모 둘러보기로 UI를 먼저 확인할 수 있습니다. 실제 게시물·댓글·대댓글은 Meta 키를 채운 뒤 Instagram으로 연결해야 합니다.

## 스택

TanStack Start, Tailwind v4, Postgres(또는 로컬 PGLite), JWT 세션, AES-256-GCM 토큰 암호. Graph 호출은 서버의 `src/lib/instagram/client.ts`만 사용합니다.
