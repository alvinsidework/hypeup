# Lens 작업 지시서

이 파일은 Codex 등 다른 에이전트가 지금 작업을 이어받을 때 읽는 기준이다. 사용자에게는 한국어로 답한다. 비밀번호, 토큰, DB 접속 문자열, Instagram 앱 시크릿, webhook verify token은 출력하거나 커밋하지 않는다.

## 제품

보이는 이름은 Lens다. 코드와 배포는 기존 Hypeup 하나다. 두 번째 제품을 만들지 않는다.

- 저장소: `https://github.com/alvinsidework/hypeup.git`, 브랜치 `main`
- 라이브: `https://hypeupinsta.vercel.app` (Vercel 프로젝트 `hypeupinsta`)
- `https://hypeup.vercel.app` 는 다른 Next.js 사이트다. 이 앱이 아니다.
- 로컬 미리보기는 포트 8080, `npm run dev`
- 회사 표기: 올인더밸류
- 랜딩 제목 “인스타그램 댓글과 DM, 광고 관리까지 자동화하기” / 연결 제목 “내 인스타그램으로 대시보드 연결”
- 내부 폴더 `src/lib/hypeup`, DB 테이블 `hypeup_*`, 타입 `HypeupUser` 는 이름을 바꾸지 않는다.
- `/Volumes/PortableSSD/Dev/lens` 는 Capacitor 안드로이드 셸이다. 이 깃 저장소가 아니다. `appId` 는 `dev.lens.app`, `server.url` 은 위 라이브 주소. 셸 저장소는 사용자가 시키기 전에는 커밋하지 않는다.
- 워크스페이스 `Agents.md` 의 `/workspace` 샌드박스 절차는 이 맥 작업에 적용하지 않는다.

## 배포

`main` 푸시는 philia3의 `hypeup` 과 `hypeupinsta` 를 같이 배포한다. 로컬 Vercel CLI 팀은 `alvintracers-projects` 라서 그 배포가 안 보인다. 확인은 GitHub 커밋 상태 `Vercel – hypeupinsta` 다. SHA는 40자를 쓴다.

푸시 계정은 `alvinsidework` 다. 토큰을 출력하지 말고, `gh auth token -u alvinsidework` 로 구한 값을 credential helper에만 넣는다. force push 하지 않는다.

커밋하지 말 것: `.env.local`, `Lens_Dev_Spec_v2.md`.

사용자가 “배포해줘”라고 하면 현재 트리를 프로덕션에 올린다. 인스타그램 로그인과 웹훅은 라이브에서만 의미가 있으므로, 그 동작이 라이브에서 깨져 있으면 고친 뒤 `main`에 올린다.

## 데이터베이스

프로덕션은 Supabase 프로젝트 `pddyogjfpizrfxkmpmdw` (도쿄)다. 앱은 IPv4 풀러 `aws-1-ap-northeast-1.pooler.supabase.com:6543` 를 쓴다. 직접 호스트 `db.pddyogjfpizrfxkmpmdw.supabase.co` 는 이 환경에서 쓰지 않는다. 접속 문자열은 `.env.local` 의 `DATABASE_URL` 에만 있다.

마이그레이션은 `migrations/*.sql` 이고 `scripts/migrate.mjs` 가 배포 빌드에서 한 번씩 적용한다. `migrations/auth/` 는 자동 적용되지 않는다. 크리에이터는 Instagram 세션을 쓴다. 브랜드는 별도 Supabase Auth 세션으로 식별한다.

## 브랜드 대시보드

- 기존 문의는 같은 이메일이 인증되면 해당 브랜드에 연결된다. 계약 정보와 서명의 복사본은 브랜드가 제안하거나 수락한 시점에 저장하고, 합의 후 두 당사자에게 표시한다. 계약 정보 수정은 이후 건에만 적용된다.

### 브랜드 이메일 인증 코드

1. Supabase **Authentication → Sign In / Providers** 에서 **Email**, **Confirm Email**, **Allow new users to sign up** 을 켠다. Lens는 최초 코드 요청에서 `shouldCreateUser: true` 로 가입을 허용한다. Email 공급자의 **Email OTP length** 를 Lens 입력 규격인 `6` 으로 설정한다. 코드 유효 시간은 **Email OTP expiration** 에서 관리한다. [Supabase 인증 설정](https://supabase.com/docs/guides/auth/general-configuration) · [OTP 설정](https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp)
2. Supabase **Email Templates** 에서 **Magic Link** 와 **Confirm signup** 두 항목에 같은 내용을 저장한다. 제목은 `[Lens] 브랜드 로그인 코드` 로 넣고 본문에는 HTML 원본 전체를 붙여 넣는다. 기존 인증 계정은 Magic Link 템플릿, 최초 가입과 미인증 계정은 Confirm signup 템플릿으로 발송된다. 두 본문에서 `{{ .Token }}` 을 사용하고 `{{ .ConfirmationURL }}` 과 `{{ .TokenHash }}` 는 제거한다. [인증 코드 HTML 원본](./supabase-brand-otp-email.html) · [템플릿 설정](https://supabase.com/dashboard/project/_/auth/templates) · [최초 가입 발송 분기](https://github.com/supabase/auth/blob/master/internal/api/magic_link.go#L71-L158)
3. 일반 브랜드 주소에 발송하려면 커스텀 SMTP를 설정한다. Supabase 기본 발송은 프로젝트 팀 주소에 한정된다. Lens 운영 환경에서 `SUPABASE_URL` 과 `SUPABASE_ANON_KEY` 를 사용한다. `BRAND_AUTH_EMAIL_ENABLED=false` 를 설정하면 브랜드 로그인을 끌 수 있다. [SMTP 설정](https://supabase.com/dashboard/project/_/auth/smtp) · [SMTP 안내](https://supabase.com/docs/guides/auth/auth-smtp)
4. 최초 가입 주소와 기존 인증 주소 각각으로 코드를 받아 Lens에서 요청한 화면에 입력해 가입과 로그인을 확인한다. 이메일 코드 로그인은 Lens에서 `verifyOtp` 로 완료된다. [코드 확인 흐름](https://supabase.com/docs/guides/auth/auth-email-passwordless#signing-in-with-email-otp)

## Meta 앱

앱은 하나다.

- Facebook App ID `1446001024053890`, 표시 이름 `hypeup`
- Instagram App ID `1076634118483518`, 표시 이름 `hypeup-IG`
- OAuth `client_id` 는 Instagram App ID다. Facebook App ID를 authorize URL에 넣지 않는다.
- 스코프: `instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_manage_messages`
- 인가 URL: `https://www.instagram.com/oauth/authorize/#weblink`, `enable_fb_login=0`. 경로 끝 슬래시와 `#weblink` 는 인스타그램 앱 전환을 피하기 위한 것으로, Lens 콜백 주소에는 추가하지 않는다.
- 짧은 토큰: POST `https://api.instagram.com/oauth/access_token`
- 긴 토큰: GET `https://graph.instagram.com/access_token?grant_type=ig_exchange_token`. POST는 지원되지 않아 `Object with ID 'access_token'` 오류가 난다. 그 문장에 permissions가 있어도 테스터 미등록으로 보여주지 않는다. 거절되면 1시간 토큰으로 `/me` 를 계속한다.
- 앱 그래프 버전은 `IG_GRAPH_VERSION=v21.0` 이다. 대시보드 호출 예시는 v26일 수 있다. 버전 때문에 위 POST 오류가 난 것은 아니다.
- Standard Access다. 인스타그램 테스터로 초대를 수락한 프로페셔널 계정만 API가 된다. 개인 계정은 안 된다.
- 인스타그램 앱과 웹사이트의 활성 탭은 OAuth 허용 기록이다. 테스터 수락은 맨 오른쪽 테스터 초대 탭뿐이다. `https://www.instagram.com/accounts/manage_access/#weblink` 의 `#weblink` 는 Instagram이 iOS 유니버설 링크에서 제외한 값이다.
- 역할 확인 시점: Alvin Han 관리자, `text.presso` 와 `taewooet` 는 인스타그램 테스터, `navi_gate_` 는 Pending이었다.

## 폰 로그인

인스타그램 앱 안에 다른 앱의 OAuth 화면은 없다. Lens 웹뷰에서 아이디와 비밀번호를 치면 로그인이 실패한다.

앱의 연결 버튼은 시스템 브라우저를 연다. `client=app` 쿠키 후 콜백이 `dev.lens.app://auth` 으로 돌아오고 `/api/auth/instagram/handoff` 가 세션을 연다. 웹 변경만이면 APK를 다시 만들지 않는다. 커스텀 스킴이나 네이티브 플러그인을 바꾸면 `/Volumes/PortableSSD/Dev/lens` 에서 디버그 APK를 다시 만든다. 사용자가 시키지 않으면 잠금화면 위로 앱을 켜지 않는다. 기기는 Galaxy S23 `R3CW30R1L1M`.

## 자동화, 팔로워에게만

키워드 룰은 공개 대댓글과 DM을 보낸다. 룰의 `followers_only` 가 꺼져 있으면 댓글 즉시 둘 다 보낸다.

인스타그램은 댓글만으로는 팔로우 여부를 알려주지 않는다. 댓글 `from.id` 에는 `is_user_follow_business` 필드가 없다. 그 필드는 상대가 메시지를 보낸 뒤의 메시지용 IGSID에서만 온다. 댓글 ID와 메시지 IGSID는 다르다. 이 제한은 매니챗도 같다. 매니챗의 팔로워 조건은 첫 DM 다음, 버튼이나 답장 뒤에 검사한다.

`followers_only` 가 켜져 있을 때:

1. 이 계정이 그 사용자 이름을 `hypeup_known_follower` 에 기억하고 있으면, 저장된 메시지 IGSID로 다시 확인한다. 아직 팔로워이거나 확인이 실패하면 버튼 없이 공개 대댓글과 원래 DM을 바로 보낸다. 팔로우를 끊은 것이 확인되면 기억을 지우고 2번으로 간다.
2. 처음 보는 사람이면 본문을 보내지 않는다. 댓글당 하나뿐인 private reply로 짧은 글과 퀵리플라이 버튼 `안내 받기` 를 보낸다. payload는 `hypeup_follow:<gate id>` 다. 게이트는 `hypeup_follow_gate`.
3. 버튼을 누르면 `messages` 웹훅의 `message.quick_reply.payload` 로 온다. 그때 `is_user_follow_business` 를 본다. 팔로워면 공개 대댓글과 룰 DM을 보내고 사용자 이름과 IGSID를 기억한다. 아니면 “아직 팔로우가 확인되지 않습니다”와 같은 버튼을 다시 보낸다. 이 재안내는 6시간에 한 번이다.
4. 버튼을 못 누르고 글을 쳐도, 사용자 이름이 맞거나 대기 중인 게이트가 하나뿐이면 같은 확인을 한다.

퀵리플라이는 인스타그램 데스크톱에서 안 보일 수 있다. 기준은 휴대폰이다. 버튼 템플릿을 먼저 보냈다가 실패하면 private reply 기회가 사라질 수 있으니, 실패했다고 바로 다른 형식을 다시 보내지 않는다.

메시지 웹훅이 구독돼 있어야 버튼이 서버에 도착한다. `subscribed_apps` 필드는 `comments,live_comments,messages` 다. 버튼이 안 먹으면 설정에서 다시 구독한다. Meta 앱 웹훅에도 messages가 있어야 한다.

## 이어서 볼 때

- 라이브 동작의 기준은 `main` 최신 커밋이다. `git log -1` 로 확인한다. 이 파일과 같은 커밋이 안내 받기 버튼과 기억된 팔로워의 기준이다.
- 테스트: `npx tsc --noEmit`, `node --experimental-strip-types --test src/lib/instagram/follow-parse.test.ts src/lib/instagram/webhooks.test.ts src/lib/instagram/engine.test.ts`
- 전체 `npm test` 에는 이 작업과 무관한 기존 실패가 있다. 그 실패를 이 기능의 회귀로 보지 않는다.
- 로그인된 자동화 화면은 인스타그램 세션이 있어야 눌러볼 수 있다.
- 테스터가 아닌 계정, 또는 `/me` 가 계속 거절되는 경우를 액세스 검증 때문이라고 단정하지 않는다. 새 오류 문장이 그 말을 할 때만 그렇게 적는다.
- 브랜드 화면에는 소송, 내용증명, 고소라는 말을 쓰지 않는다. 정산 문구는 “지급했다고 표시”와 “Lens가 입금을 확인한 것은 아닙니다”를 유지한다.
