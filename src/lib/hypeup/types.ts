export type MatchMode = "ANY" | "CONTAINS" | "EXACT" | "REGEX";
export type RuleScope = "ALL" | "MEDIA";
export type LogType =
  | "AUTH"
  | "WEBHOOK"
  | "MATCH"
  | "PUBLIC_REPLY"
  | "PRIVATE_REPLY"
  | "HIDE"
  | "DELETE"
  | "ERROR";

export type HypeupUser = {
  id: string;
  igUserId: string;
  username: string;
  name: string | null;
  accountType: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
  tokenExpiresAt: string | null;
  grantedScopes: string[];
  webhookSubscribedAt: string | null;
  hasToken: boolean;
  isDemo: boolean;
};

export type MediaItem = {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  likeCount: number | null;
  commentsCount: number | null;
};

export type CommentItem = {
  id: string;
  mediaId: string;
  parentId: string | null;
  igFromId: string | null;
  igFromUsername: string | null;
  text: string;
  timestamp: string | null;
  hidden: boolean;
  repliedPublic: boolean;
  repliedPrivate: boolean;
  automationProcessedAt: string | null;
  media?: Pick<MediaItem, "id" | "caption" | "thumbnailUrl" | "mediaType"> | null;
};

export type RuleItem = {
  id: string;
  name: string;
  enabled: boolean;
  scope: RuleScope;
  mediaId: string | null;
  matchMode: MatchMode;
  keywords: string[];
  excludeKeywords: string[];
  publicReplies: string[];
  dmMessage: string | null;
  hideComment: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type EventLogItem = {
  id: string;
  type: string;
  success: boolean;
  commentId: string | null;
  mediaId: string | null;
  ruleId: string | null;
  message: string;
  createdAt: string;
};

export type OverviewStats = {
  commentsToday: number;
  publicRepliesToday: number;
  dmsToday: number;
  activeRules: number;
};

export type Bootstrap = {
  demoMode: boolean;
  user: HypeupUser | null;
};
