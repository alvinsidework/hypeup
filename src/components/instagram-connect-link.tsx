import type { ReactNode } from "react";
import { TESTER_ACCEPT_URL } from "@/lib/hypeup/instagram-tester";
import {
  isLensApp,
  openInstagramLogin,
  openInstagramTesterInvites,
} from "@/lib/hypeup/native-auth";

type InstagramLinkProps = {
  className: string;
  children: ReactNode;
};

export function InstagramConnectLink({
  className,
  children,
}: InstagramLinkProps) {
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

export function InstagramTesterInviteLink({
  className,
  children,
}: InstagramLinkProps) {
  return (
    <a
      href={TESTER_ACCEPT_URL}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        if (!isLensApp()) return;
        event.preventDefault();
        void openInstagramTesterInvites();
      }}
    >
      {children}
    </a>
  );
}
