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
// (window as any).customCards.push({
//   type: "sonos-card",
//   name: "Sonos Card",
//   description: "A card to select sonos devices",
// });


(window as any).customCards.push({
  type: "sonos-player-select-card",
  name: "Sonos Select Card",
  description: "A card to select active sonos device",
});


(window as any).customCards.push({
  type: "sonos-player-card",
  name: "Sonos Player Card",
  description: "A card to control sonos devices",
});


(window as any).customCards.push({
  type: "sonos-room-card",
  name: "Sonos room Card",
  description: "A card to join sonos devices",
});


(window as any).customCards.push({
  type: "sonos-favorites-card",
  name: "Sonos room Card",
  description: "A card that list your sonos favorites",
});

@customElement("sonos-card")
export class SonosCard2 extends LitElement {
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


export class SonosCard extends LitElement {
  @property({ attribute: false }) public activePlayer = '';
  @state() public config!: SonosCardConfig;
  @property({ attribute: false }) public hass!: HomeAssistant;

  public getActivePlayer() : string {
    return localStorage.getItem('sonos-active-player') ?? '';
  }

  public setActivePlayer(value: string | null) : void {
    if (value) {
      localStorage.setItem('sonos-active-player', value);
      this.activePlayer = value;
    }
  }

  // public static async getConfigElement(): Promise<LovelaceCardEditor> {
  //   return document.createElement("sonos-card-editor");
  // }

  public async setConfig(config: SonosCardConfig): Promise<void> {
    if (!config.entities || config.entities.length < 1) {
      console.error(localize("common.invalid_configuration"));
    }

    let a = this.getActivePlayer();
    if (!a && config) {
      a = config.entities[0];
    }
    this.setActivePlayer(a);

    this.config = {
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
}

@customElement('sonos-room-card')
export class SonosRoomCard extends SonosCard {
  @property({ attribute: false }) masterPlayer: MediaPlayerObject;
  render(): TemplateResult | void {
    this.checkActivePlayer();
    const activeState = this.hass.states[this.activePlayer];
    this.masterPlayer = new MediaPlayerObject(this.hass, this.config, activeState);

    const memberTemplates: Array<TemplateResult> = [];
    if (this.activePlayer) {
      for (const member in this.masterPlayer.zones[this.activePlayer].members) {
        memberTemplates.push(html`
        <ha-card class="member unjoin-member" data-member="${member}">
          <span>${this.masterPlayer.zones[this.activePlayer].members[member]} </span>
          <ha-icon .icon=${"mdi:minus"}></ha-icon>
        </ha-card>
      `);
      }
    }
    for (const key in this.masterPlayer.zones) {
      if (key != this.activePlayer) {
        memberTemplates.push(html`
        <ha-card class="member join-member" data-member="${key}">
            <span>${ this.masterPlayer.zones[key].roomName }</span>
            <ha-icon .icon=${"mdi:plus"}></ha-icon>
        </ha-card>
      `);
      }
    }
    return html`<h2>${this.config.name}</h2>
    ${memberTemplates}`;
  }


  public updated() : void {
    this.shadowRoot
      ?.querySelectorAll(".join-member:not(.processed)")
      .forEach((member) => {
        member.classList.add("processed");
        member.addEventListener("click", () => {
          if (member instanceof HTMLElement) {
            this.masterPlayer.joinPlayer(member.dataset.member);
          }
        });
      });
    //Unjoin player
    this.shadowRoot?.querySelectorAll(".unjoin-member:not(.processed)").forEach((member) => {
      if (member instanceof HTMLElement) {
        member.classList.add("processed");
        member.addEventListener("click", () => {
          this.masterPlayer.unjoinPlayer(member.dataset.member);
        });
      }
    });
  }
  checkActivePlayer() {
    this.activePlayer = this.getActivePlayer();
    setTimeout(() => {
      this.checkActivePlayer()
    }, 250);
  }

  static get styles() : CSSResultGroup {
    return css`
      ha-card {
        cursor: pointer;
        display: flex;
        flex-direction: row;
        align-items: center;
        text-align: center;
        padding: 4% 0px;
        font-size: 1.2rem;
        margin-bottom: 10px;
        box-sizing: border-box;
        justify-content: center;
        position: relative;
      }
      .member span {
        flex:1;
        align-self:center;
        color: var(--primary-text-color);
      }
      .member ha-icon {
        align-self:center;
        font-size:10px;
        color: #888;
        cursor: pointer;
      }
      .member:hover ha-icon {
        color: var(--primary-color);
      }
    `
  }
}



@customElement('sonos-favorites-card')
export class SonosFavoritesCard extends SonosCard {
  @property({ attribute: false }) masterPlayer: MediaPlayerObject;
  render(): TemplateResult | void {
    const activeState = this.hass.states[this.activePlayer];
    this.masterPlayer = new MediaPlayerObject(this.hass, this.config, activeState);

    const favoriteTemplates: Array<TemplateResult> = [];
    this.checkActivePlayer();

    for (const favorite of this.masterPlayer.sources) {
        favoriteTemplates.push(html`<ha-card class="favorite" data-favorite="${favorite}"><span>${favorite}</span> <ha-icon .icon=${"mdi:play"}></ha-icon></ha-card>`);
    }
    return html`${ this.config.name ? html`<h2>${this.config.name}</h2>` : '' }
    ${favoriteTemplates}`;
  }

  public updated() : void {
    this.shadowRoot
    ?.querySelectorAll(".favorite:not(.processed)")
    .forEach((favorite) => {
      favorite.classList.add("processed");
      favorite.addEventListener("click", (e) => {
        if (favorite instanceof HTMLElement) {
          this.masterPlayer.setSource(e, favorite.dataset.favorite)
        }
      });
    });
  }

  checkActivePlayer() {
    this.activePlayer = this.getActivePlayer();
    setTimeout(() => {
      this.checkActivePlayer()
    }, 250);
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        cursor: pointer;
        display: flex;
        flex-direction: row;
        align-items: center;
        text-align: center;
        padding: 4% 0px;
        font-size: 1.2rem;
        margin-bottom: 10px;
        box-sizing: border-box;
        justify-content: center;
        position: relative;
      }
      .favorite span {
        flex:1;
        align-self:center;
        color: var(--primary-text-color);
      }
      .favorite ha-icon {
        align-self:center;
        font-size:10px;
        cursor: pointer;
        color: var(--primary-text-color);
      }
      .favorite:hover ha-icon {
        color: var(--primary-color);
      }

    `
  }
}


@customElement('sonos-player-select-card')
export class SonosPlayerSelectCard extends SonosCard {
  //@property({ attribute: false }) activePlayer;
  protected render(): TemplateResult | void {
    const activePLayer = this.activePlayer;
    const activeState = this.hass.states[this.activePlayer];
    const masterPlayer = new MediaPlayerObject(this.hass, this.config, activeState);
    const templates: Array<TemplateResult> = [];

    for (const key in masterPlayer.zones) {
      const p = masterPlayer.zones[key];
      const player = new MediaPlayerObject(this.hass, this.config, this.hass.states[key]);

      const card = html`<ha-card data-id="${key}" class="group ${activePLayer == key ? "active" : ""}">
          <ul class="speakers">
              ${player.attr.sonos_group.map((speaker) => {
                  return html`<li>${player.speakerNames[speaker]}</li>`;
               })}
          </ul>
          <div class="current-track">${ player.mediaInfo.map(i => html`<span class=${`attr_${i.attr}`}>${i.prefix + i.text}</span>`) }</div>
          <div class="player ${
                p.state == "playing" ? "active" : ""
              }">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
              </div>
        </ha-card>`
      templates.push(card)
    }
    return html`${ this.config.name ? html`<h2>${this.config.name}</h2>` : '' }${templates}`;
  }
  public updated() {
    //Set active player
    this.shadowRoot
      ?.querySelectorAll(".group:not(.processed)")
      .forEach((group) => {
        group.classList.add("processed");
        group.addEventListener("click", () => {
          if (group instanceof HTMLElement) {
            this.setActivePlayer(group.dataset.id as string);
          }
        });
      });
  }

  static get styles() : CSSResultGroup {
    return css`
      ha-card {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 4% 0px;
        font-size: 1.2rem;
        margin-bottom: 10px;
        box-sizing: border-box;
        justify-content: center;
        position: relative;
      }
      .group.active:before{
        content: " ";
        background-color: var(--primary-color);
        height: 100%;
        border-radius: var(--ha-card-border-radius);
        width: 3px;
        position: absolute;
        top: 1px;
        display: block;
        left: 0px;
        border-bottom-left-radius: 4px;
        border-top-left-radius: 4px;
      }
      .group .title{
        font-size: var(--paper-font-body1_-_font-size);
      }
      .group .current-track {
        display:block;
        color:#CCC;
        font-size:11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .group .current-track span:not(:first-child)::before{
        content: " - "
      }

      .group ul.speakers {
        list-style:none;
        margin:0;
        padding:0;
      }
      .group ul.speakers li {
        display:block;
        margin:5px 0 0 0 ;
        color: var(--primary-text-color);
        text-align: left;
      }
      .group ul.speakers li:first-child {
        margin:0;
      }
      .group .player {
        width:12px;
        position: absolute;
        right: 20px;
        top: 50px;
      }
      .group .player .bar {
        background: #666;
        bottom: 1px;
        height: 3px;
        position: absolute;
        width: 3px;
        animation: sound 0ms -800ms linear infinite alternate;
        display:none;
      }
      .group .player.active .bar{
        display:block;
      }
      .group .player .bar:nth-child(1) {
        left: 1px;
        animation-duration: 574ms;
      }
      .group .player .bar:nth-child(2) {
        left: 5px;
        animation-duration: 533ms;
      }
      .group .player .bar:nth-child(3) {
        left: 9px;
        animation-duration: 507ms;
      }

      @keyframes sound {
        0% {
          opacity: .35;
          height: 3px;
        }
        100% {
          opacity: 1;
          height: 20px;
        }
      }
    `
  }
}

@customElement('sonos-player-card')
export class SonosPlayerCard extends SonosCard {
  @property({ attribute: false }) private player;
  @property({ attribute: false }) private thumbnail;
  active: any;
  picture: string;
  prevThumbnail: string;
  @property({ attribute: false }) activePlayer;


  protected render(): TemplateResult | void {
    const state = this.hass.states[this.activePlayer];
    this.player = new MediaPlayerObject(this.hass, this.config, state);
    this.computeArtwork();
    this.checkActivePlayer();
    return html`
    <ha-card>
      <div class="player-body">
        <div class="cover" style="background-image: ${ this.thumbnail };"></div>
        <nav>
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

  checkActivePlayer() {
    this.activePlayer = this.getActivePlayer();
    setTimeout(() => {
      this.checkActivePlayer()
    }, 250);
  }

  async computeArtwork() {
    const { picture, hasArtwork } = this.player;
    if (hasArtwork && picture !== this.thumbnail) {
      this.picture = picture;
      const artwork = await this.player.fetchArtwork();
      if (this.thumbnail) {
        this.prevThumbnail = this.thumbnail;
      }
      this.thumbnail = artwork || `url(${picture})`;
    } else {
      this.thumbnail = '';
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
        overflow: visible;
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
        height: 100%;
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
        position: absolute;
        right: 0;
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
        position: relative;
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