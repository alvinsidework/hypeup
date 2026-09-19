import { DEMO_IG_USER_ID, DEMO_USER_ID } from "./env.server";
import {
  addLog,
  findUserById,
  listMedia,
  saveRule,
  upsertComment,
  upsertMedia,
  upsertUser,
} from "./repo";

const DEMO_MEDIA = [
  {
    id: "demo-media-1",
    caption: "오트밀 세라믹 보울. 예약 오픈은 스토리로 안내합니다.",
    mediaType: "IMAGE",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    likeCount: 412,
    commentsCount: 3,
    tint: "#c4b49a",
  },
  {
    id: "demo-media-2",
    caption: "봄 원단 스와치 — 문의는 댓글로.",
    mediaType: "CAROUSEL_ALBUM",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(),
    likeCount: 288,
    commentsCount: 2,
    tint: "#8c7b6a",
  },
  {
    id: "demo-media-3",
    caption: "작업실 아침. 라이브는 내일 8시.",
    mediaType: "REELS",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    likeCount: 931,
    commentsCount: 2,
    tint: "#5d564e",
  },
  {
    id: "demo-media-4",
    caption: "한정 에디션 패키지 디테일.",
    mediaType: "IMAGE",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    likeCount: 157,
    commentsCount: 1,
    tint: "#d8cfc3",
  },
] as const;

export function demoThumb(tint: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><rect width="640" height="640" fill="${tint}"/><rect x="48" y="48" width="544" height="544" fill="none" stroke="#f4f1ea" stroke-opacity="0.18"/><text x="56" y="584" fill="#f4f1ea" font-family="Georgia, serif" font-size="28" font-style="italic">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function ensureDemoData(): Promise<void> {
  const existing = await findUserById(DEMO_USER_ID);
  await upsertUser({
    id: DEMO_USER_ID,
    igUserId: DEMO_IG_USER_ID,
    username: "studio.hana",
    name: "하나 스튜디오",
    accountType: "MEDIA_CREATOR",
    profilePictureUrl: demoThumb("#d4c4b0", "H"),
    followersCount: 12840,
    mediaCount: 4,
    tokenCipher: null,
    tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 40).toISOString(),
    grantedScopes: [
      "instagram_business_basic",
      "instagram_business_manage_comments",
      "instagram_business_manage_messages",
    ],
  });

  const media = await listMedia(DEMO_USER_ID);
  if (media.length > 0 && existing) return;

  for (const item of DEMO_MEDIA) {
    await upsertMedia(DEMO_USER_ID, {
      id: item.id,
      caption: item.caption,
      mediaType: item.mediaType,
      mediaUrl: demoThumb(item.tint, ""),
      thumbnailUrl: demoThumb(item.tint, ""),
      permalink: "https://www.instagram.com/",
      timestamp: item.timestamp,
      likeCount: item.likeCount,
      commentsCount: item.commentsCount,
    });
  }

  const comments = [
    {
      id: "demo-c-1",
      mediaId: "demo-media-1",
      igFromUsername: "mina.home",
      text: "가격 알려주세요",
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    },
    {
      id: "demo-c-2",
      mediaId: "demo-media-1",
      igFromUsername: "seoul.table",
      text: "사이즈가 어떻게 되나요?",
      timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    },
    {
      id: "demo-c-3",
      mediaId: "demo-media-1",
      parentId: "demo-c-1",
      igFromUsername: "studio.hana",
      igFromId: DEMO_IG_USER_ID,
      text: "디엠으로 안내드릴게요.",
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      repliedPublic: true,
    },
    {
      id: "demo-c-4",
      mediaId: "demo-media-2",
      igFromUsername: "cloth.archive",
      text: "링크 주세요 샘플 보고 싶어요",
      timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    },
    {
      id: "demo-c-5",
      mediaId: "demo-media-3",
      igFromUsername: "spamshop_88",
      text: "무료 팔로워 드립니다 프로필 확인",
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      hidden: true,
    },
    {
      id: "demo-c-6",
      mediaId: "demo-media-3",
      igFromUsername: "june.makes",
      text: "라이브 몇 시인가요?",
      timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
    },
    {
      id: "demo-c-7",
      mediaId: "demo-media-4",
      igFromUsername: "atelier.k",
      text: "협업 가능할까요?",
      timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    },
  ] as const;

  for (const comment of comments) {
    await upsertComment(DEMO_USER_ID, {
      id: comment.id,
      mediaId: comment.mediaId,
      parentId: "parentId" in comment ? comment.parentId ?? null : null,
      igFromId: "igFromId" in comment ? comment.igFromId ?? `ig-${comment.igFromUsername}` : `ig-${comment.igFromUsername}`,
      igFromUsername: comment.igFromUsername,
      text: comment.text,
      timestamp: comment.timestamp,
      hidden: "hidden" in comment ? Boolean(comment.hidden) : false,
      repliedPublic: "repliedPublic" in comment ? Boolean(comment.repliedPublic) : false,
      repliedPrivate: false,
    });
  }

  await saveRule(DEMO_USER_ID, {
    name: "가격 문의",
    enabled: true,
    scope: "ALL",
    mediaId: null,
    matchMode: "CONTAINS",
    keywords: ["가격", "얼마"],
    excludeKeywords: ["팔로워"],
    publicReplies: ["가격은 디엠으로 보내드렸어요.", "견적 안내 드렸습니다. 디엠 확인해주세요."],
    dmMessage: "안녕하세요, 하나 스튜디오입니다. 보울 가격은 48,000원이고 예약 링크는 https://hypeup.example/bowl 입니다.",
    hideComment: false,
    sortOrder: 0,
  });
  await saveRule(DEMO_USER_ID, {
    name: "링크 요청",
    enabled: true,
    scope: "ALL",
    mediaId: null,
    matchMode: "CONTAINS",
    keywords: ["링크", "주소"],
    excludeKeywords: [],
    publicReplies: ["링크 디엠으로 보내드렸어요."],
    dmMessage: "요청하신 링크입니다: https://hypeup.example/swatch",
    hideComment: false,
    sortOrder: 1,
  });
  await saveRule(DEMO_USER_ID, {
    name: "스팸 숨김",
    enabled: true,
    scope: "ALL",
    mediaId: null,
    matchMode: "CONTAINS",
    keywords: ["팔로워", "홍보", "클릭"],
    excludeKeywords: [],
    publicReplies: [],
    dmMessage: null,
    hideComment: true,
    sortOrder: 2,
  });

  await addLog({
    userId: DEMO_USER_ID,
    type: "AUTH",
    success: true,
    message: "데모 세션이 시작되었습니다.",
  });
  await addLog({
    userId: DEMO_USER_ID,
    type: "MATCH",
    success: true,
    commentId: "demo-c-1",
    mediaId: "demo-media-1",
    message: "가격 문의 룰이 매칭되었습니다.",
  });
}
