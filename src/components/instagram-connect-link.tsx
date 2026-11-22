import type { ReactNode } from "react";
import { isLensApp, openInstagramLogin } from "@/lib/hypeup/native-auth";

export function InstagramConnectLink({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <a
      href="/api/auth/instagram"
      className={className}
      onClick={(event) => {
        if (!isLensApp()) return;
        event.preventDefault();
        void openInstagramLogin();
      }}
    >
      {children}
    </a>
  );
}
