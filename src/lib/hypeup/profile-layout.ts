export const PROFILE_LAYOUTS = ["sns", "magazine"] as const;
export type ProfileLayout = (typeof PROFILE_LAYOUTS)[number];
export const DEFAULT_PROFILE_LAYOUT: ProfileLayout = "magazine";
