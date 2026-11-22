export const PORTFOLIO_METRICS = ["views", "comments", "likes"] as const;
export type PortfolioMetric = (typeof PORTFOLIO_METRICS)[number];

export const PORTFOLIO_METRIC_LABEL: Record<PortfolioMetric, string> = {
  views: "조회수",
  comments: "댓글수",
  likes: "좋아요수",
};
