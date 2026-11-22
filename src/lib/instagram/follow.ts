import { graphGet } from "./client";
import { InstagramApiError } from "./errors";
import { interpretFollowResponse, type FollowStatus } from "./follow-parse";

export async function lookupFollower(
  token: string,
  igsid: string,
): Promise<{ status: FollowStatus; username: string | null }> {
  try {
    const body = await graphGet<unknown>(token, `/${igsid}`, {
      fields: "username,is_user_follow_business",
    });
    return interpretFollowResponse(body);
  } catch (error) {
    if (error instanceof InstagramApiError) {
      return { status: "unknown", username: null };
    }
    throw error;
  }
}
