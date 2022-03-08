import { ActionConfig, LovelaceCard, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'sonos-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}

interface RoomConfig {
  player_entity: string,
  treble_entity: string,
  bass_entity: string,
  touch_controls: string,
  status_light: string
}

// TODO Add your configuration elements here for type-checking
export interface SonosCardConfig extends LovelaceCardConfig {
  type: string;
  name?: string;
  entities: Array<string>;
  rooms: Array<RoomConfig>
}
