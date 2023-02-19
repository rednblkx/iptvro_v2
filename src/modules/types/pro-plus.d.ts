export interface LiveStreamResponse {
  url: string;
  streamProfiles: StreamProfile[];
  alternativeAudioProfiles: AlternativeAudioProfile[];
  videoType: string;
  watchedTime: number;
  content: Content;
  ads: Ads;
  drm: Drm;
  subtitles: string[];
  properties: Property[];
  playlist: string[];
  tracking: Tracking;
  allowCasting: boolean;
  timeshiftMode: string;
  autoPlayControl: AutoPlayControl;
  autoPlayNext: string;
  nextVideoMode: string;
  productPlacement: ProductPlacement;
  isLive: boolean;
  length: number;
}

interface StreamProfile {
  name: string;
  resolutionWidth: number;
  resolutionHeight: number;
  drm: unknown;
}

interface AlternativeAudioProfile {
  name: string;
  languageCode: string;
  url: string;
}

interface Content {
  genres: unknown[];
  languages: unknown;
  subtitles: unknown;
  properties: unknown;
  description: string;
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: string;
  labels: unknown[];
  distributionMethod: string;
  geoRestriction: unknown;
  ageRestriction: number;
  isFavorite: boolean;
}

interface Ads {
  playlist: Playlist;
}

interface Playlist {
  type: string;
  data: string;
}

interface Drm {
  type: string;
  keySystem: string;
  licenseUrl: string;
  licenseRequestHeaders: LicenseRequestHeader[];
  certificateUrl: string;
}

interface LicenseRequestHeader {
  name: string;
  value: string;
}

interface Property {
  name: string;
  value: string;
}

interface Tracking {
  productId: string;
  product: string;
}

interface AutoPlayControl {
  skipIntroMode: string;
  skipIntroOfferPosition: unknown;
  skipIntroOfferDuration: number;
  nextVideoAutoplayMode: string;
  nextVideoOfferPosition: NextVideoOfferPosition;
  nextVideoOfferDuration: number;
  skipNextVideoOfferWhenLengthIsLessThan: number;
  stopAutoplayWhenOnWifiAfter: number;
  stopAutoplayWhenOnMobileDataAfter: number;
}

interface NextVideoOfferPosition {
  type: string;
  value: number;
}

interface ProductPlacement {
  isEnabled: boolean;
  startShowDelay: number;
  midrollShowDelay: number;
  endShowOffset: number;
  displayTime: number;
  minShowInterval: number;
  location: string;
}

interface User {
  id: string;
  username: string;
  currentUserLocationCountry?: string;
  data?: Record<string, unknown>;
}

interface Credentials {
  accessToken: string;
}

export interface LoginResponse {
  user: User;
  credentials: Credentials;
}

export interface ChannelsList {
  type: string;
  categories: unknown;
  browseAll: string;
  headline: unknown;
  sections: unknown;
  liveTvs: LiveTv[];
}

interface LiveTv {
  id: string;
  name: string;
  logo: string;
  logoTransparent: string;
  currentlyPlaying: CurrentlyPlaying;
  nextShow: NextShow;
}

interface CurrentlyPlaying {
  timeslot: Timeslot;
  stream: Stream;
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: string;
  labels: unknown[];
  distributionMethod: string;
  geoRestriction?: GeoRestriction;
  ageRestriction: number;
  isFavorite: boolean;
}

interface Timeslot {
  startAt: string;
  endAt: string;
}

interface Stream {
  isLive: boolean;
  length: number;
}

interface GeoRestriction {
  rule: string;
  countries: string[];
}

interface NextShow {
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: string;
  labels: unknown[];
  distributionMethod: string;
  geoRestriction?: GeoRestriction;
  ageRestriction: number;
  isFavorite: boolean;
}

export interface VODList {
  type: string;
  categories: unknown;
  browseAll: unknown;
  headline: Headline;
  sections: Section[];
  liveTvs: unknown;
}

interface Headline {
  id: string;
  content: Content;
}

interface Section {
  id: string;
  name: string;
  type: string;
  content: Content2[];
  watching: unknown;
  rented: unknown;
  live: unknown;
}

interface Content2 {
  id: string;
  content: Content3;
}

interface Content3 {
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: string;
  labels: unknown[];
  distributionMethod: string;
  geoRestriction?: GeoRestriction;
  ageRestriction: number;
  isFavorite: boolean;
}

export interface IVODEpisodes {
  tvshow: Tvshow;
  productionInfo: unknown;
  headline: Headline;
  seasons: unknown;
  sections: Section[];
  alike: unknown;
  rentedInfo: unknown;
}

interface Tvshow {
  genres: unknown[];
  languages: unknown;
  subtitles: unknown;
  properties: unknown;
  description: string;
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: string;
  labels: unknown[];
  distributionMethod: string;
  geoRestriction: unknown;
  ageRestriction: number;
  isFavorite: boolean;
}

interface Headline {
  content: Content;
  stream: Stream;
  productionInfo: ProductionInfo;
}

interface Stream {
  isLive: boolean;
  length: number;
}

interface ProductionInfo {
  originCountries: unknown[];
  directors: unknown[];
  writers: unknown[];
  cast: unknown[];
}

interface Section {
  id: string;
  name: string;
  pages: number;
  content: Content2[];
}

interface Content2 {
  stream: Stream2;
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: string;
  labels: unknown[];
  distributionMethod: string;
  geoRestriction: unknown;
  ageRestriction: number;
  isFavorite: boolean;
}

interface Stream2 {
  isLive: boolean;
  length: number;
}

export interface IEpisode {
  url: string;
  streamProfiles: StreamProfile[];
  alternativeAudioProfiles: unknown[];
  videoType: string;
  watchedTime: number;
  content: Content;
  ads: Ads;
  drm: Drm;
  subtitles: unknown[];
  properties: Property[];
  playlist: unknown[];
  tracking: Tracking;
  allowCasting: boolean;
  timeshiftMode: string;
  autoPlayControl: AutoPlayControl;
  autoPlayNext: AutoPlayNext;
  nextVideoMode: string;
  productPlacement: ProductPlacement;
  isLive: boolean;
  length: number;
}

interface Ads {
  playlist: Playlist;
}

interface Playlist {
  type: string;
  data: string;
}

interface Property {
  name: string;
  value: string;
}

interface Tracking {
  productId: string;
  product: string;
}

interface NextVideoOfferPosition {
  type: string;
  value: number;
}

interface AutoPlayNext {
  genres: unknown[];
  languages: unknown;
  subtitles: unknown;
  properties: unknown;
  description: string;
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: string;
  labels: unknown[];
  distributionMethod: string;
  geoRestriction: unknown;
  ageRestriction: number;
  isFavorite: boolean;
}

interface ProductPlacement {
  isEnabled: boolean;
  startShowDelay: number;
  midrollShowDelay: number;
  endShowOffset: number;
  displayTime: number;
  minShowInterval: number;
  location: string;
}
