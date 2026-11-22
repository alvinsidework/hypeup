import { graphGet } from "./client";
import { isGraphFieldError } from "./errors";
import type { GraphList, IgMedia } from "./types";

export async function listMyMedia(token: string, after?: string): Promise<GraphList<IgMedia>> {
  const basicFields = "id,caption,media_type,media_url,permalink,timestamp";
  const fieldsWithComments = `${basicFields},thumbnail_url,comments_count`;
  const search: Record<string, string> = {
    fields: `${fieldsWithComments},like_count`,
    limit: "25",
  };
  if (after) search.after = after;
  try {
    return await graphGet<GraphList<IgMedia>>(token, "/me/media", search);
  } catch (error) {
    if (!isGraphFieldError(error)) throw error;
  }
  try {
    return await graphGet<GraphList<IgMedia>>(token, "/me/media", { ...search, fields: fieldsWithComments });
  } catch (error) {
    if (!isGraphFieldError(error)) throw error;
    return graphGet<GraphList<IgMedia>>(token, "/me/media", { ...search, fields: basicFields });
  }
}
