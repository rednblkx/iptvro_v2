export interface IVODList {
  data: Datum_VOD[];
  meta: Meta;
}

interface Datum_VOD {
  id: number;
  show_name: string;
  ivm_category: string;
  show_description: string;
  days_available: number;
  main_image: string;
  mobile_image: string;
  slug: string;
  geolocation_live: Geolocation;
  geolocation_catchup: Geolocation;
  free: Active;
  exclusive: number;
  active: Active;
  premium: Active;
  weight: number;
  last_video_date: Date;
  shape_color: string;
  shape_left: string;
  shape_right: string;
  shape_mobile: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  created_at: Date;
  updated_at: Date;
  trailer_guid: string;
  logo: null | string;
  hero_landscape: string;
  listing: string;
  thumbnail: string;
  widget_short: string;
  widget_tall: string;
}

declare enum Active {
  N = "N",
  Y = "Y",
}

interface Meta {
  pagination: Pagination;
}

interface Pagination {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
  links: Links;
}

interface Links {
  previous?: string;
  next?: string;
}

export type VOD_config = {
  authTokens: string[];
  year?: string;
  season?: string;
  month?: string;
  showfilters?: string;
};

export interface IChannels {
  data: DatumChannels[];
  meta: Meta;
}

interface DatumChannels {
  id: number;
  channel_name: string;
  logo: string;
  embed_live: null | string;
  ivm_publisher_id: number;
  ivm_channel_id: number;
  slug: string;
  exclusiv: Active;
  active: Active;
  free: Active;
  streamplay_secret: null | string;
  streamplay_asset: null | string;
  streamplay_client: null | string;
  order_id: number;
  stream_url: string;
  description: string;
  haslive: number;
  streamtype: Streamtype;
  encrypted_stream_url: null | string;
  encrypted_xml_url: null | string;
  geolocation: Geolocation;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  created_at: Date;
  updated_at: Date;
  logoV2: string;
}

declare enum Geolocation {
  Global = "Global",
  Ro = "RO",
}

declare enum Streamtype {
  M3U8 = "m3u8",
}

interface Meta {
  pagination: Pagination;
}

export interface IVODEpisodes {
  data: DatumEpisodes[];
  meta: Meta;
}

export interface DatumEpisodes {
  id: number;
  video_title: string;
  video_description: string;
  video_thumbnail: string;
  publish_date: Date;
  show_id: number;
  guid: string;
  video_length: string;
  video_embed: number;
  active: string;
  video_type: string;
  unpublish_date: string;
  wide: number;
  free: string;
  exclusive: number;
  trailer_guid: string;
  created_at: Date;
  updated_at: Date;
}

export interface IVODEpisodeStream {
  data: DataEpisode;
}

export interface DataEpisode {
  url: string;
  levels: Level[];
  drm: null;
}

export interface Level {
  file: string;
  bitrate: string;
  label: string;
  type: string;
}
