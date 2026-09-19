export type GraphPaging = {
  cursors?: { after?: string; before?: string };
  next?: string;
};

export type GraphList<T> = {
  data: T[];
  paging?: GraphPaging;
};

export type IgProfile = {
  user_id?: string;
  id?: string;
  username: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
};

export type IgMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

export type IgFrom = {
  id?: string;
  username?: string;
};

export type IgComment = {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  like_count?: number;
  from?: IgFrom;
  replies?: GraphList<IgComment>;
};

export type ShortTokenResponse = {
  access_token: string;
  user_id: string | number;
  permissions?: string | string[];
};

export type LongTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};
