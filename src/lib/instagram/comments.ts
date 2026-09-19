import { graphDelete, graphGet, graphPost } from "./client";
import type { GraphList, IgComment } from "./types";

export async function listMediaComments(token: string, mediaId: string): Promise<GraphList<IgComment>> {
  try {
    return await graphGet<GraphList<IgComment>>(token, `/${mediaId}/comments`, {
      fields: "id,text,username,timestamp,replies{id,text,username,timestamp}",
    });
  } catch {
    return graphGet<GraphList<IgComment>>(token, `/${mediaId}/comments`, {
      fields: "id,text,timestamp",
    });
  }
}

export async function replyToComment(token: string, commentId: string, message: string): Promise<{ id: string }> {
  try {
    return await graphPost<{ id: string }>(token, `/${commentId}/replies`, { message });
  } catch {
    return graphPost<{ id: string }>(token, `/${commentId}/replies`, undefined, { message });
  }
}

export async function hideComment(token: string, commentId: string, hidden: boolean): Promise<unknown> {
  return graphPost(token, `/${commentId}`, undefined, { hide: hidden ? "true" : "false" });
}

export async function deleteComment(token: string, commentId: string): Promise<unknown> {
  return graphDelete(token, `/${commentId}`);
}
