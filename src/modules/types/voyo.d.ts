export interface IVODList {
  type: string;
  categories: Category[];
  browseAll: string;
  headline: Headline;
  sections: Section[];
  liveTvs: any;
}

interface Category {
  category: Category2;
  isActive: boolean;
}

interface Category2 {
  id: string;
  name: string;
  type: string;
}

interface Headline {
  id: string;
  layout: string;
  content: Content;
  heroImage: string;
  mainTitle: string;
  season: any;
  playButton: PlayButton;
  stream: Stream;
  mainIsFavorite: boolean;
}

interface Content {
  genres: Genre[];
  languages: string[];
  subtitles: string[];
  properties: any;
  description: string;
  isFavorite: boolean;
  parentShowId: string;
  parentShowTitle: string;
  origTitle: string;
  teaserText1: string;
  webUrl: any;
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: string;
  labels: any;
  distributionMethod: string;
  geoRestriction: GeoRestriction;
  ageRestriction: any;
  typeLabel: string;
}

interface Genre {
  id: number;
  title: string;
}

interface GeoRestriction {
  rule: string;
  countries: string[];
}

interface PlayButton {
  action: string;
  title: string;
  disabled: boolean;
}

interface Stream {
  streamingType: string;
  isLive: boolean;
  length: number;
  liveStartAt: string;
  liveEndAt: string;
  liveStartAtFormatted: string;
}

interface Section {
  id: string;
  name: string;
  type: string;
  template: string;
  content?: Content2[];
  watching: any;
  rented: any;
  live?: Live[];
  contentFilters?: ContentFilters;
  coming_soon: any;
}

interface Content2 {
  id: string;
  content: Content3;
  recommendation: any;
  teaserText1?: string;
  teaserText2?: string;
}

interface Content3 {
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel?: string;
  labels?: Label[];
  distributionMethod: string;
  geoRestriction?: GeoRestriction;
  ageRestriction: any;
  typeLabel: any;
}

interface Label {
  type: string;
  text: string;
  style: Style;
}

interface Style {
  backgroundColor: string;
  fontColor: string;
  borderColor: any;
  position: any;
}

interface Live {
  id: string;
  name: string;
  logo: string;
  logoTransparent: string;
  currentlyPlaying: CurrentlyPlaying;
  nextShow?: NextShow;
}

interface CurrentlyPlaying {
  timeslot: Timeslot;
  stream: Stream2;
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel?: string;
  labels?: any[];
  distributionMethod: string;
  geoRestriction?: GeoRestriction;
  ageRestriction: any;
  typeLabel: any;
}

interface Timeslot {
  startAt: string;
  endAt: string;
}

interface Stream2 {
  streamingType: string;
  isLive: boolean;
  length: number;
  liveStartAt: string;
  liveEndAt: string;
  liveStartAtFormatted: string;
}

interface NextShow {
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: string;
  labels: any[];
  distributionMethod: string;
  geoRestriction?: GeoRestriction;
  ageRestriction: any;
  typeLabel: any;
}

interface ContentFilters {
  categories: string;
  excluded_categories: number;
  genres: string;
  excluded_genres: number;
}

export interface IVODListFilter {
  resetFilters: any[];
  title: string;
  countPerPage: number;
  items: Item[];
  availableListingModifiers: AvailableListingModifier[];
  totalCount: number;
}

interface Item {
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: any;
  labels?: Label[];
  distributionMethod: string;
  geoRestriction?: GeoRestriction;
  ageRestriction: any;
  typeLabel: any;
}

interface Style {
  backgroundColor: string;
  fontColor: string;
  borderColor: any;
  position: any;
}

interface AvailableListingModifier {
  name: string;
  type: string;
  label: string;
  options: Option[];
  active: boolean;
}

interface Option {
  label: string;
  value: string;
  selected: boolean;
}

export interface IVODEpisodes {
  tvshow: Tvshow;
  productionInfo: ProductionInfo;
  headline: Headline;
  seasons: Season[];
  sections: Section[];
  alike: Alike[];
  trailers: any;
  subPages: SubPage[];
  rentedInfo: any;
  downloadInfo: DownloadInfo;
  defaultSorting: string;
}

interface Tvshow {
  genres: Genre[];
  languages: any;
  subtitles: string[];
  properties: any;
  description: string;
  isFavorite: boolean;
  parentShowId: string;
  parentShowTitle: string;
  origTitle: string;
  teaserText1: string;
  webUrl: string;
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: any;
  labels: Label[];
  distributionMethod: string;
  geoRestriction: GeoRestriction;
  ageRestriction: number;
  typeLabel: any;
}

interface Genre {
  id: number;
  title: string;
}

interface GeoRestriction {
  rule: string;
  countries: string[];
}

interface ProductionInfo {
  originCountries: any[];
  directors: any[];
  cast: any[];
}

interface Headline {
  content: Content;
  stream: Stream;
  productionInfo: ProductionInfo2;
  previewStream: any;
  playButton: PlayButton;
  trailerButton: any;
}

interface Genre2 {
  id: number;
  title: string;
}

interface GeoRestriction2 {
  rule: string;
  countries: string[];
}

interface Stream {
  subtitles: Subtitle[];
  alternativeAudioProfiles: AlternativeAudioProfile[];
  subtitlesControl: SubtitlesControl;
  streamingType: string;
  isLive: boolean;
  length: number;
  liveStartAt: string;
  liveEndAt: string;
  liveStartAtFormatted: string;
}

interface Subtitle {
  languageName: string;
  languageCode: string;
  url: string;
  selected: boolean;
}

interface AlternativeAudioProfile {
  name: string;
  languageCode: string;
  languageName: string;
  url: string;
  isDefault: boolean;
}

interface SubtitlesControl {
  showSubtitles: boolean;
}

interface ProductionInfo2 {
  originCountries: any[];
  directors: any[];
  cast: any[];
}

interface PlayButton {
  buttonText: string;
  description: string;
  descriptionSecondary: string;
  progress: number;
  progressFormatted: any;
  id: string;
  type: string;
}

interface Season {
  id: string;
  name: string;
  isDefault: boolean;
}

interface Section2 {
  id: string;
  name: string;
  content: Content2[];
}

interface Content2 {
  stream: Stream2;
  watchedTime: number;
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel: string;
  labels: any;
  distributionMethod: string;
  geoRestriction: GeoRestriction3;
  ageRestriction: any;
  typeLabel: any;
}

interface Stream2 {
  streamingType: string;
  isLive: boolean;
  length: number;
  liveStartAt: string;
  liveEndAt: string;
  liveStartAtFormatted: string;
}

interface GeoRestriction3 {
  rule: string;
  countries: string[];
}

interface Alike {
  genres: Genre3[];
  languages: any;
  subtitles: any;
  properties: any;
  description: string;
  isFavorite: boolean;
  parentShowId: any;
  parentShowTitle: any;
  origTitle: string;
  teaserText1: string;
  webUrl: any;
  id: string;
  type: string;
  title: string;
  image: string;
  releaseDateLabel?: string;
  labels?: Label2[];
  distributionMethod: string;
  geoRestriction?: GeoRestriction4;
  ageRestriction?: number;
  typeLabel: any;
}

interface Genre3 {
  id: number;
  title: string;
}

interface Label2 {
  type: string;
  text: string;
  style: Style;
}

interface Style {
  backgroundColor: string;
  fontColor: string;
  borderColor: any;
  position: any;
}

interface GeoRestriction4 {
  rule: string;
  countries: string[];
}

interface SubPage {
  id: string;
  name: string;
  type: string;
  selected: boolean;
}

interface DownloadInfo {
  isDownloadable: boolean;
  downloadableInterval: number;
  offlinePlaybackDuration: any;
}
