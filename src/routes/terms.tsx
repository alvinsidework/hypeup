import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal-layout";
import { legal } from "@/lib/hypeup/legal";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="이용약관">
      <p>
        이 약관은 {legal.company}이 제공하는 Hypeup 서비스의 이용 조건을 정합니다. 시행일: 2026년 9월
        19일.
      </p>
      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">1. 서비스</h2>
        <p>
          Hypeup은 Instagram 프로페셔널 계정 운영자가 댓글을 읽고, 키워드 규칙에 따라 공개 대댓글과
          메시지(DM)를 보내도록 돕는 운영 데스크입니다. 개인 계정은 지원하지 않습니다.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">2. 계정</h2>
        <p>
          이용자는 Instagram 공식 로그인으로 본인이 관리하는 프로페셔널 계정만 연결해야 합니다.
          비밀번호는 회사에 제공되지 않습니다.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">3. Instagram 정책</h2>
        <p>
          자동 답글·메시지는 Instagram 플랫폼 정책과 API 제한을 따릅니다. 스팸, 무단 연락, 허위 표시는
          금지됩니다. Instagram이 API를 변경하거나 제한하면 기능이 달라지거나 중단될 수 있습니다.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">4. 책임</h2>
        <p>
          서비스는 있는 그대로 제공됩니다. Instagram 장애, 권한 미부여, 앱 모드 제한으로 댓글 목록이
          비거나 발송이 실패할 수 있습니다. 회사는 이용자가 보낸 메시지 내용에 대해 책임지지 않습니다.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">5. 문의</h2>
        <p>
          {legal.email} · {legal.phoneDisplay}
        </p>
      </section>
    </LegalLayout>
  );
}
