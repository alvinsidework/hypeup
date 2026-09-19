import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal-layout";
import { legal } from "@/lib/hypeup/legal";

export const Route = createFileRoute("/data-deletion")({
  component: DataDeletionPage,
});

function DataDeletionPage() {
  return (
    <LegalLayout title="데이터 삭제 요청">
      <p>
        Instagram 앱 설정에서 Hypeup 권한을 제거했거나, 보관 중인 데이터의 삭제를 원할 때 아래를
        따릅니다. Meta 앱 대시보드의 Data Deletion Request URL로 이 페이지를 등록할 수 있습니다.
      </p>
      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">1. 서비스에서 바로 해제</h2>
        <p>
          Hypeup에 로그인한 뒤 설정 → 연결 해제를 누르면 저장된 Instagram 액세스 토큰을 삭제합니다.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">2. 이메일 요청</h2>
        <p>
          계정 전체 삭제가 필요하면 Instagram 사용자 이름과 요청 내용을{" "}
          <a className="text-fg underline" href={`mailto:${legal.email}`}>
            {legal.email}
          </a>
          로 보내 주세요. 본인 확인 후 보관 중인 프로필, 미디어 캐시, 댓글, 규칙, 로그를 삭제합니다.
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-[15px] font-medium text-fg">3. Instagram에서 권한 철회</h2>
        <p>
          Instagram 설정 → 앱 및 웹사이트에서 앱 접근을 제거하면 더 이상 해당 계정 API를 호출할 수
          없습니다.
        </p>
      </section>
    </LegalLayout>
  );
}
