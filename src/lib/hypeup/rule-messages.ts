import { copy } from "./copy";
import type { RuleItem } from "./types";

export const DM_TEXT_LIMIT = 1000;
export const FOLLOW_BUTTON_LABEL_LIMIT = 20;

const textEncoder = new TextEncoder();

export function dmTextBytes(text: string): number {
  return textEncoder.encode(text).length;
}

export function getFollowerMessages(
  rule: Pick<
    RuleItem,
    "followOpeningMessage" | "followReminderMessage" | "followButtonLabel"
  >,
) {
  const buttonLabel = rule.followButtonLabel?.trim() || copy.followerButton;
  return {
    buttonLabel,
    openingMessage:
      rule.followOpeningMessage?.trim() ||
      copy.followerAsk.replace(copy.followerButton, () => buttonLabel),
    reminderMessage:
      rule.followReminderMessage?.trim() ||
      copy.followerRemind.replace(copy.followerButton, () => buttonLabel),
  };
}
