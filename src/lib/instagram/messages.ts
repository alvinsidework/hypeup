import { graphPost } from "./client";

export async function sendDirectMessage(
  token: string,
  igUserId: string,
  recipientId: string,
  text: string,
): Promise<unknown> {
  return graphPost(token, `/${igUserId}/messages`, {
    recipient: { id: recipientId },
    message: { text },
  });
}

export async function sendPrivateReply(
  token: string,
  igUserId: string,
  commentId: string,
  text: string,
): Promise<unknown> {
  return graphPost(token, `/${igUserId}/messages`, {
    recipient: { comment_id: commentId },
    message: { text },
  });
}

export async function subscribeApps(token: string, igUserId: string): Promise<{ success?: boolean }> {
  return graphPost<{ success?: boolean }>(
    token,
    `/${igUserId}/subscribed_apps`,
    undefined,
    { subscribed_fields: "comments,live_comments,messages" },
  );
}
