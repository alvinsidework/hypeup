import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal-layout";
import { legal } from "@/lib/hypeup/legal";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="개인정보처리방침">
      <p>
        {legal.company}(이하 “회사”)는 Hypeup 서비스(이하 “서비스”)를 제공하면서 이용자의
        개인정보를 보호하기 위해 이 방침을 공개합니다. 시행일: 2026년 9월 19일.
      </p>

      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">1. 처리 주체</h2>
        <p>
          상호 {legal.company} · 대표 {legal.ceo} · 사업자등록번호 {legal.bizNo}
          <br />
          주소 {legal.address}
          <br />
          이메일 {legal.email} · 전화 {legal.phoneDisplay}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">2. 수집하는 정보</h2>
        <p>회사는 Instagram 비밀번호를 받지 않습니다. 공식 Business Login으로만 연결합니다.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Instagram 프로페셔널 계정 식별자, 사용자 이름, 이름, 계정 유형, 프로필 사진 URL, 팔로워·미디어 수</li>
          <li>Instagram이 발급한 액세스 토큰(서버에서 암호화하여 저장)</li>
          <li>연결한 계정의 게시물 메타데이터(캡션, 미디어 유형, 썸네일 URL, 퍼머링크, 좋아요·댓글 수)</li>
          <li>댓글 내용, 댓글 작성자 식별자·사용자 이름, 숨김·답글 여부</li>
          <li>이용자가 만든 자동화 규칙과 발송·오류 로그</li>
          <li>세션 유지를 위한 HttpOnly 쿠키</li>
          <li>
            사용 신청 시 인스타그램 계정명, 이메일 주소, 이용 동의 여부. 이 내용은 서비스 데이터베이스에
            저장하지 않고 운영자 이메일로만 전달합니다.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">3. 이용 목적</h2>
        <p>
          수집한 정보는 이용자가 연결한 본인 Instagram 계정의 댓글을 읽고, 이용자가 설정한 규칙에 따라
          공개 대댓글·DM·숨김을 수행하며, 연결 상태와 처리 기록을 보여 주기 위해서만 사용합니다.
          광고, 판매, 프로필 분석, 제3자 마케팅에 쓰지 않습니다. 사용 신청 정보는 테스터 등록과 회신에만
          사용합니다.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">4. 보관과 파기</h2>
        <p>
          액세스 토큰은 AES-256-GCM으로 암호화하여 보관합니다. 이용자가 서비스에서 연결을 해제하거나
          삭제를 요청하면 토큰을 제거하고, 요청에 따라 계정과 관련 데이터를 삭제합니다. Instagram 쪽
          권한은 Instagram 설정에서도 철회할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">5. 제3자 제공과 처리 위탁</h2>
        <p>
          회사는 이용자 데이터를 판매하지 않습니다. 서비스 제공을 위해 Instagram/Meta Graph API,
          호스팅(Vercel), 데이터베이스(설정된 경우 Neon/Postgres)를 사용할 수 있습니다. 사용 신청 메일은
          메일 전달 서비스(Resend API 키가 있으면 Resend, 없으면 FormSubmit)를 통해 운영자 이메일로
          보냅니다. FormSubmit을 쓰는 경우 제출 내용이 그 서비스에 최대 30일 보관될 수 있습니다. 이들
          처리자는 각 약관에 따라 데이터를 처리합니다.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">6. 이용자 권리</h2>
        <p>
          이용자는 서비스 설정에서 연결을 해제할 수 있고, {legal.email} 로 열람·정정·삭제·처리 정지를
          요청할 수 있습니다. 데이터 삭제 안내는{" "}
          <a className="text-fg underline" href="/data-deletion">
            데이터 삭제 요청
          </a>
          페이지를 따릅니다.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">7. 고지</h2>
        <p>
          방침을 바꾸면 이 페이지에 게시합니다. 문의: {legal.email} / {legal.phoneDisplay}
        </p>
      </section>
    </LegalLayout>
  );
}
