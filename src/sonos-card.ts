/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LitElement,
  html,
  TemplateResult,
  css,
  PropertyValues,
  CSSResultGroup,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
} from "custom-card-helpers"; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers
import arrayBufferToBase64 from "./utils/misc";

import "./editor";

import MediaPlayerObject from './model';

import type { SonosCardConfig } from "./types";
//import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from "./const";
import { localize } from "./localize/localize";


import './components/progress';
import './components/mediaControls';
/* eslint no-console: 0 */
console.info(
  `%c  SONOS-CARD \n%c  ${localize("common.version")} ${CARD_VERSION}    `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

// This puts your card into the UI card picker d ialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "sonos-card",
  name: "Sonos Card",
  description: "A card to select sonos devices",
});

(window as any).customCards.push({
  type: "sonos-player-card",
  name: "Sonos Card",
  description: "A card to control sonos devices",
});

let activePlayer = 'media_player.sonos_office';

// TODO Name your custom element
@customElement("sonos-card")
export class SonosCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement("sonos-card-editor");
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  // TODO Add any properities that should cause your element to re-render here
  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: SonosCardConfig;
  @property({ attribute: false }) private active = "";
  @property({ attribute: false }) private thumbnail = "";
  private cardHelpers;
  @property({ attribute: false }) private showVolumeEQ = false;
  // https://lit.dev/docs/components/properties/#accessors-custom
  public async setConfig(config: SonosCardConfig): Promise<void> {
    // TODO Check for required fields and that they are of the proper format
    if (!config.entities || config.entities.length < 1) {
      console.error(localize("common.invalid_configuration"));
    }

    this.config = {
      name: "Sonos",
      ...config,
    };

    this.cardHelpers = await (window as any).loadCardHelpers();
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(): boolean {
    if (!this.config) {
      return false;
    }

    return true;
  }

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (!this.config.entities || this.config.entities.length < 1) {
      return this._showWarning(localize("common.invalid_configuration"));
    }


    const header = 'header'
    return html``;
  }

  public pause(entity): void {
    this.hass.callService("media_player", "media_pause", {
      entity_id: entity,
    });
  }

  public previous(entity): void {
    this.hass.callService("media_player", "media_previous_track", {
      entity_id: entity,
    });
  }

  public play(entity): void {
    this.hass.callService("media_player", "media_play", {
      entity_id: entity,
    });
  }

  public next(entity): void {
    this.hass.callService("media_player", "media_next_track", {
      entity_id: entity,
    });
  }

  public volumeDown(entity, members): void {
    this.hass.callService("media_player", "volume_down", {
      entity_id: entity,
    });

    for (const member in members) {
      this.hass.callService("media_player", "volume_down", {
        entity_id: member,
      });
    }
  }

  public volumeUp(entity, members): void {
    this.hass.callService("media_player", "volume_up", {
      entity_id: entity,
    });

    for (const member in members) {
      this.hass.callService("media_player", "volume_up", {
        entity_id: member,
      });
    }
  }

  public volumeSet(entity, members, volume): void {
    const volumeFloat = volume / 100;

    this.hass.callService("media_player", "volume_set", {
      entity_id: entity,
      volume_level: volumeFloat,
    });

    for (const member in members) {
      this.hass.callService("media_player", "volume_set", {
        entity_id: member,
        volume_level: volumeFloat,
      });
    }
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      //handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html`
      <hui-warning>${warning}</hui-warning>
    `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement("hui-error-card");
    errorCard.setConfig({
      type: "error",
      error,
      origConfig: this.config,
    });

    return html`
      ${errorCard}
    `;
  }

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    return css`

    `;
  }
}

@customElement('sonos-player-card')
export class SonosPlayerCard extends LitElement {

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: SonosCardConfig;
  @property({ attribute: false }) private player;

  @property({ attribute: false }) private thumbnail;
  active: any;
  picture: string;
  prevThumbnail: string;


  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement("sonos-card-editor");
  }

  public async setConfig(config: SonosCardConfig): Promise<void> {
    if (!config.entities || config.entities.length < 1) {
      console.error(localize("common.invalid_configuration"));
    }

    this.config = {
      name: "Sonos",
      player: {
        hide: {
            repeat: false,
            shuffle: false,
            volume: false,
            controls: false,
            prev: false,
            next: false,
            play_pause: false,
            play_stop: true,
            volume_level: false,
            showRepeat: true,
            mute: false,
            jump: true,

        },
        replace_mute: false,
        volume_stateless: true // true for buttons
      },
      ...config,

    };

    //this.cardHelpers = await (window as any).loadCardHelpers();
  }

  protected shouldUpdate(): boolean {
    if (!this.config) {
      return false;
    }
    return true;
  }


  protected render(): TemplateResult | void {
    const state = this.hass.states[activePlayer];
    this.player = new MediaPlayerObject(this.hass, this.config, state);

    const volume = 50;
    const volumeStr = volume.toString();
    this.computeArtwork();

    return html`
    <ha-card>
      <div class="player-body">
        <div class="cover" style="background-image: ${ this.thumbnail };"></div>
        <nav>
          <div class="left">


          </div>
          <div class="right">
            <ha-icon-button>
              <ha-icon .icon=${"mdi:tune-vertical"}></ha-icon>
            </ha-icon-button>
          </div>
        </nav>
        <div class="player-ui">
          ${ this.renderMediaInfo() }



          <div class="controls">
            ${this.player && this.player.active ? html`
                <sonos-media-controls
                  .player=${this.player}
                  .config=${this.config}
                  .break=${false}>
                </sonos-media-controls>
            ` : ''}
          </div>
          <div class="player-footer">
            ${this.player && this.player.active && this.player.hasProgress ? html`
                <sp-progress
                  .player=${this.player}
                  .showTime=${true}
                  .showRemainingTime=${true}>
                </sp-progress>
              ` : ''}
          </div>
        </div>

    </ha-card>
    `;
  }

  async computeArtwork() {
    const { picture, hasArtwork } = this.player;
    if (hasArtwork && picture !== this.picture) {
      this.picture = picture;
      const artwork = await this.player.fetchArtwork();
      if (this.thumbnail) {
        this.prevThumbnail = this.thumbnail;
      }
      this.thumbnail = artwork || `url(${picture})`;
    }
  }

  renderMediaInfo() {
    const items = this.player.mediaInfo;

    return html`
      <div class='now-playing'>
        ${items.map(i => html`<span class=${`attr_${i.attr}`}>${i.prefix + i.text}</span>`)}
      </div>`;
  }


  static get styles(): CSSResultGroup {
    return css`
      .player-body {
        overflow: hidden;
        box-shadow: 0px 2px 10px rgba(0, 0, 0, 0.6);
        position: relative;
        width: 100%;
        background-size: contain;
        background-repeat: no-repeat;
      }
      .player-body .cover {
        position: absolute;
        z-index: 1;
        width: 100%;
        height: 250px;
        background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4));
        background-position: center bottom;
        background-size: cover;
      }
      .player-body nav {
        margin-top: 5px;
        position: relative;
        z-index: 3;
        min-height: 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0px 15px;
      }
      .player-body nav .right {
        display: flex;
      }

      .player-body nav .right .rs-buttons ha-icon {
        opacity: 0.8;
      }

      .player-body nav .right ha-icon {
        cursor: pointer;
        color: white;
      }

      .player-body .player-ui {
        position: relative;
        z-index: 3;
        padding-top: 30px;
        padding-bottom: 30px;
        background: linear-gradient(to top, rgba(0,0,0,0.9) 25%, transparent 100%);
      }
      .player-body .player-ui .now-playing {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        padding-left: 25px;
        color: #fff;
      }

      .player-body .player-ui .controls {
        display: flex;
        justify-content: space-between;
        padding: 5px;
      }
      sonos-media-controls{
        flex-wrap: wrap;
        color: #fff;
      }
      .player-footer{
        position: relative;
        top: 30px;
      }

      @media screen and (max-width: 360px){
        .player-body .player-ui .controls{
          flex-direction: column;
        }
        .player-body .player-ui .controls .control{
          display: flex;
          justify-content: space-around;
          margin-top: 10px;
        }
        .player-body .player-ui .controls .control ha-icon {
          scale: 2; // how to get bigger icons?
        }
      }
    `;
  }
}