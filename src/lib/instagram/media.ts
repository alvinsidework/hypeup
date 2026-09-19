import { graphGet } from "./client";
import type { GraphList, IgMedia } from "./types";

export async function listMyMedia(token: string, after?: string): Promise<GraphList<IgMedia>> {
  const search: Record<string, string> = {
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count",
    limit: "25",
  };
  if (after) search.after = after;
  try {
    return await graphGet<GraphList<IgMedia>>(token, "/me/media", search);
  } catch {
    return graphGet<GraphList<IgMedia>>(token, "/me/media", {
      fields: "id,caption,media_type,media_url,permalink,timestamp",
      limit: "25",
      ...(after ? { after } : {}),
    });
  }
}
