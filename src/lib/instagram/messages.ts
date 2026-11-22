import { graphPost } from "./client";

export type QuickReplyButton = {
  title: string;
  payload: string;
};

function messageBody(text: string, quickReply?: QuickReplyButton) {
  if (!quickReply) return { text };
  return {
    text,
    quick_replies: [
      {
        content_type: "text",
        title: quickReply.title.slice(0, 20),
        payload: quickReply.payload.slice(0, 1000),
      },
    ],
  };
}

export async function sendDirectMessage(
  token: string,
  igUserId: string,
  recipientId: string,
  text: string,
  quickReply?: QuickReplyButton,
): Promise<unknown> {
  return graphPost(token, `/${igUserId}/messages`, {
    recipient: { id: recipientId },
    message: messageBody(text, quickReply),
  });
}

export async function sendPrivateReply(
  token: string,
  igUserId: string,
  commentId: string,
  text: string,
  quickReply?: QuickReplyButton,
): Promise<unknown> {
  return graphPost(token, `/${igUserId}/messages`, {
    recipient: { comment_id: commentId },
    message: messageBody(text, quickReply),
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
