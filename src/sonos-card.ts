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

import type { SonosCardConfig } from "./types";
//import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from "./const";
import { localize } from "./localize/localize";

/* eslint no-console: 0 */
console.info(
  `%c  SONOS-CARD \n%c  ${localize("common.version")} ${CARD_VERSION}    `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "sonos-card",
  name: "Sonos Card",
  description: "A card to control sonos devices",
});


// TODO Name your custom element
@customElement("sonos-card")
export class BoilerplateCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement("sonos-card-editor");
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  public static getStubConfiggetStubConfig(): any {
    return { type: "gauge", entity: "" };
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

    if (this.config.show_error) {
      return this._showError(localize("common.show_error"));
    }

    const speakerNames: Record<string, string> = {};



    interface Zone {
      members: Record<string, string>;
      state: string;
      roomName: string;
    }

    //type  ZoneMap = Record<string, Set<Zone>>;
    const zones: Record<string, Zone> = {};
    const favorites: Array<string> = [];

    for (const entity of this.config.entities) {
      const stateObj = this.hass.states[entity];
      //Get favorites list


      if (!(entity in zones)) {
        zones[entity] = {
          members: {},
          state: "",
          roomName: "",
        };
        speakerNames[entity] = stateObj.attributes.friendly_name ?? '';
      }

      zones[entity].state = stateObj.state;
      zones[entity].roomName = stateObj.attributes.friendly_name as string;
      if (stateObj.attributes.sonos_group.length > 1 && stateObj.attributes.sonos_group[0] == entity) {
        for (const member of stateObj.attributes.sonos_group) {
          if (member != entity) {
            const state = this.hass.states[member];
            if (member) {
              zones[entity].members[member] = state.attributes.friendly_name ?? '';
            }
          }
        }
        if (stateObj.state == "playing" && this.active == "") {
          this.active = entity;
        }
      } else if (stateObj.attributes.sonos_group.length > 1) {
        delete zones[entity];
      } else {
        if (stateObj.state == "playing" && this.active == "") {
          this.active = entity;
        }
      }
    }
    if (!this.active && this.config.entities?.length > 0) {
      this.active = this.config.entities[0];
    }

    if (this.active) {
      const stateObj = this.hass.states[this.active];
      for (const favorite of stateObj.attributes.source_list) {
        favorites.push(favorite);
      }
    }
    this.computeArtwork();

    const groupTemplates: Array<TemplateResult> = [];
    let playerTemplate = html``;
    const favoriteTemplates: Array<TemplateResult> = [];
    const memberTemplates: Array<TemplateResult> = [];
    for (const key in zones) {
      const stateObj = this.hass.states[key];
      groupTemplates.push(html`
        <div class="group" data-id="${key}">
          <div class="wrap ${this.active == key ? "active" : ""}">
            <ul class="speakers">
                ${stateObj.attributes.sonos_group.map((speaker) => {
                  return html`<li>${speakerNames[speaker]}</li>`;
                })}
            </ul>
            <div class="play">
              <div class="content">
                <span class="current_track">${
                  stateObj.attributes.media_artist
                } - ${stateObj.attributes.media_title}</span>
              </div>
              <div class="player ${
                stateObj.state == "playing" ? "active" : ""
              }">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
              </div>
            </div>
          </div>
        </div>
      `);
    }
    if (this.active != "" && this.cardHelpers) {
       const activeStateObj = this.hass.states[this.active];

      //const el = this.cardHelpers.createCardElement({type: "custom:mini-media-player", entity: "media_player.sonos_office"});
      const volumeTemplate : Array<TemplateResult> = [];
      if (activeStateObj.attributes.sonos_group.length > 1) {
        for (const member of activeStateObj.attributes.sonos_group) {
          const memberStateObj = this.hass.states[member];
          if (memberStateObj) {
            const volume = 100 * memberStateObj.attributes.volume_level;
            const volumeStr = volume.toString();
            volumeTemplate.push(html`<div class="group_row"><div class="group_name">${speakerNames[member]}</div><div><input type="range" .value="${volumeStr}" @change=${(e) => this.volumeSet(member, [], e.target.value)} min="0" max="100" id="volumeRange" class="volume-slider" style="background: linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${volume}%, rgb(211, 211, 211) ${volume}%, rgb(211, 211, 211) 100%);"></div></div>`)
          }
        }
      }

      const volume = 100 * activeStateObj.attributes.volume_level;
      const volumeStr = volume.toString();
      //<input type="range" .value="${volumeStr}" @change=${(e) => this.volumeSet(this.active, zones[this.active].members, e.target.value)} min="0" max="100" id="volumeRange" class="volume-slider" style="background: linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${volume}%, rgb(211, 211, 211) ${volume}%, rgb(211, 211, 211) 100%);">

      playerTemplate = html`
      <div class="player_container">
        <div class="player_body">
            <div class="body_cover" style="background-image: url(${this.thumbnail}); background-size: cover;">
            </div>
            <div class="body_info">

            </div>
        </div>
        <div class="player_footer">
            <div class="player__info">
                <span class="info_song">${
                  activeStateObj.attributes.media_title
                }</span> -
                <span class="info_artist">${
                  activeStateObj.attributes.media_artist
                }</span>
            </div>
            <div class="player_controls">
              <div class="player_sound_control">
                <ul class="list--footer">
                    <li>
                      <ha-icon @click="${() => this.volumeDown(this.active, zones[this.active].members)}" .icon=${"mdi:volume-minus"}></ha-icon>
                      <input type="range" .value="${volumeStr}" @change=${(e) => this.volumeSet(this.active, zones[this.active].members, e.target.value)} min="0" max="100" id="volumeRange" class="volume-slider" style="background: linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${volume}%, rgb(211, 211, 211) ${volume}%, rgb(211, 211, 211) 100%);">
                      <ha-icon @click="${() => this.volumeUp(this.active, zones[this.active].members)}" .icon=${"mdi:volume-plus"}></ha-icon>
                      ${activeStateObj.attributes.sonos_group.length > 1 ? html`<ha-icon @click="${() => this.showVolumeEQ = !this.showVolumeEQ}" .icon=${"mdi:menu-down"}></ha-icon>` : html``}
                    </li>
                </ul>
              </div>
              <div class="player__control">
                  <a>
                    ${
                      activeStateObj.state == "playing" ? html`<ha-icon @click="${() => this.previous(this.active)}" .icon=${"mdi:skip-previous"}></ha-icon>` : html``
                    }
                  </a>
                  <a>
                    ${
                      activeStateObj.state != "playing" ? html`<ha-icon @click="${() => this.play(this.active)}" .icon=${"mdi:play"}></ha-icon>` : html`<ha-icon @click="${() => this.pause(this.active)}" .icon=${"mdi:pause"}></ha-icon>`
                    }
                  </a>
                  <a>
                    ${
                      activeStateObj.state == "playing" ? html`<ha-icon @click="${() => this.next(this.active)}" .icon=${"mdi:skip-next"}></ha-icon>` : html``
                    }
                  </a>
              </div>
              <div class="volume_eq  ${this.showVolumeEQ ? 'show' : '' }" style="margin-top: 30px;">
                    ${volumeTemplate}
              </div>
            </div>
            <div class="player__progress">

            </div>
        </div>
      </div>
    `;

      for (const member in zones[this.active].members) {
        memberTemplates.push(html`
          <li>
            <div class="member unjoin-member" data-member="${member}">
              <span>${
                zones[this.active].members[member]
              } </span><ha-icon .icon=${"mdi:minus"}></ha-icon></i>
            </div>
          </li>
        `);
      }
      for (const key in zones) {
        if (key != this.active) {
          memberTemplates.push(html`
          <li>
            <div class="member join-member" data-member="${key}">
              <span>${
                zones[key].roomName
              } </span><ha-icon .icon=${"mdi:plus"}></ha-icon></i>
            </div>
          </li>
        `);
        }
      }

      for (const favorite of favorites) {
        favoriteTemplates.push(html`
          <li>
            <div class="favorite" data-favorite="${favorite}"><span>${favorite}</span> <ha-icon .icon=${"mdi:play"}></ha-icon></div>
          </li>
        `);
      }
    }

    return html`
    <div class="center">
      <div class="groups">
        ${groupTemplates}
      </div>

      <div class="players">
        ${playerTemplate}
      </div>

      <div class="sidebar">
        <div class="title">Rooms</div>
        <ul class="members">
          ${memberTemplates}
        </ul>
        <div class="title">Favorites</div>
        <ul class="favorites">
          ${favoriteTemplates}
        </ul>
      </div>
    </div>
`;
  }


  async computeArtwork(): Promise<string | void> {
    if (!this.hass.states[this.active]) return;
    const { picture, hasArtwork } = this.hass.states[this.active].attributes;
    const artwork = await this.fetchArtwork();
    this.thumbnail = artwork || picture;
  }

  async fetchArtwork(): Promise<string | boolean> {
    const picture = this.hass.states[this.active];
    //    const url = picture.attributes.entity_picture_local ? this.hass.hassUrl(picture) : picture;
    const url = picture.attributes.entity_picture
      ? picture.attributes.entity_picture
      : "";
    try {
      const res = await fetch(new Request(url));
      const buffer = await res.arrayBuffer();
      const image64 = arrayBufferToBase64(buffer);
      const imageType = res.headers.get("Content-Type") || "image/jpeg";
      return `data:${imageType};base64,${image64}`;
    } catch (error) {
      return false;
    }
  }

  public updated() {
    //Set active player
    this.shadowRoot
      ?.querySelectorAll(".group:not(.processed)")
      .forEach((group) => {
        group.classList.add("processed");
        group.addEventListener("click", () => {
          if (group instanceof HTMLElement) {
            this.active = group.dataset.id as string;
          }
        });
      });
    //Set favorite as Source
    this.shadowRoot
      ?.querySelectorAll(".favorite:not(.processed)")
      .forEach((favorite) => {
        favorite.classList.add("processed");
        favorite.addEventListener("click", () => {
          if (favorite instanceof HTMLElement) {
            this.hass.callService("media_player", "select_source", {
              source: favorite.dataset.favorite,
              entity_id: this.active
            });
          }
        });
      });
    //Join player
    this.shadowRoot
      ?.querySelectorAll(".join-member:not(.processed)")
      .forEach((member) => {
        member.classList.add("processed");
        member.addEventListener("click", () => {
          if (member instanceof HTMLElement) {
            this.hass.callService("sonos", "join", {
              master: this.active,
              entity_id: member.dataset.member,
            });
          }
        });
      });
    //Unjoin player
    this.shadowRoot?.querySelectorAll(".unjoin-member:not(.processed)").forEach((member) => {
      if (member instanceof HTMLElement) {
        member.classList.add("processed");
        member.addEventListener("click", () => {
          this.hass.callService("sonos", "unjoin", {
            entity_id: member.dataset.member,
          });
        });
      }
    });
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
      .center {
        margin:2rem auto;
        justify-content: center;
        padding: 0 20px 0 20px;
        display: flex;
        flex-direction: row;
      }
      .center > * {
        flex: 1;
        flex-basis: 100%;
      }

      /**
      SONOS GROUPS
      */
      .groups {
        margin: 0 20px 0 0;
        padding: 0;
        max-width: 250px;
        width: 100%;
      }
      .groups > .group {
        padding:0;
        margin:0;
        cursor: pointer;
      }
      .group .wrap {
        border-radius:4px;
        margin:15px 0;
        padding:15px;
        background-color: var(--card-background-color);
        position: relative;
      }
      .group .wrap.active:before{
        content: " ";
        background-color: var(--primary-color);
        height: 100%;
        border-radius:4px;
        width: 3px;
        position: absolute;
        top: 1px;
        display: block;
        left: 0px;
        border-bottom-left-radius: 4px;
        border-top-left-radius: 4px;
      }
      .group .wrap.active {
        box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.19), 0 6px 6px -10px rgba(0, 0, 0, 0.23);
      }
      .group:first-child .wrap {
        margin-top:0;
      }
      .group ul.speakers {
        list-style:none;
        margin:0;
        padding:0;
      }
      .group ul.speakers li {
        display:block;
        font-size:13px;
        margin:5px 0 0 0 ;
        color: var(--primary-text-color);
      }
      .group ul.speakers li:first-child {
        margin:0;
      }
      .group .play {
        display:flex;
        flex-direction:row;
        margin-top:10px;
      }
      .group .play .content {
        flex:1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .group .play .content .source {
        display:block;
        color:#CCC;
        font-size:10px;
      }
      .group .play .content .current_track {
        display:block;
        color:#CCC;
        font-size:11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .group .play .player {
        width:12px;
        position:relative;
      }
      .group .play .player .bar {
        background: #666;
        bottom: 1px;
        height: 3px;
        position: absolute;
        width: 3px;
        animation: sound 0ms -800ms linear infinite alternate;
        display:none;
      }
      .group .play .player.active .bar{
        display:block;
      }
      .group .play .player .bar:nth-child(1) {
        left: 1px;
        animation-duration: 574ms;
      }
      .group .play .player .bar:nth-child(2) {
        left: 5px;
        animation-duration: 533ms;
      }
      .group .play .player .bar:nth-child(3) {
        left: 9px;
        animation-duration: 507ms;
      }

      /**
      PLAYER
      */
      .player_container {
        margin:0;
        background: var(--card-background-color);
        border-radius: 0.25rem;
        box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.19), 0 6px 6px -10px rgba(0, 0, 0, 0.23);
        position: relative;
        min-width: 375px;
      }
      .player_body {
        min-height: 200px;
        position: relative;
      }
      .body_cover{
        background-size: cover;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        background-repeat: no-repeat;
        background-position: center;
      }
      .player_footer {
        padding-right: 2rem;
        padding-left: 2rem;
        padding-top: 2rem;
        padding-bottom: 0.5rem;
        display: flex;
        flex-direction: column;
        background: linear-gradient(to top, rgba(0,0,0,0.9) 25%, transparent 100%);
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
      }

      .info_song {
        margin-bottom: .5rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .info_artist {

        font-weight: 300;
        color: var(--primary-text-color);
      }

      .info_artist {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .info_song {
        font-size: 1.15rem;
        font-weight: 400;
        color: var(--primary-text-color);
      }

      .player_controls {
        display: flex;
      }
      .player_controls .player_sound_control, .player_controls .player__control {
        flex: 50;
      }
      .player_controls .player__control {
        text-align: right;
      }

      .player_controls a {
        opacity: .5;
        cursor: pointer;
      }
      .player_controls a:focus, .player_controls a:hover {
        opacity: .9;
      }
      .player_sound_control ul {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        margin: 0;
        padding: 0;
        list-style-type: none;
      }


      .player_sound_control ul {
        justify-content: space-between;
      }
      .player_sound_control ul li {
        cursor: pointer;
      }
      .player_sound_control ul li:last-child {
        flex:1;
        display:flex;
        flex-direction: row;
        //margin-left:15px;
      }
      .player_sound_control ul li:last-child input {
        flex:1;
      }
      .player_sound_control ul li:last-child ha-icon {
        margin:0 5px;
        color: #888;
        font-size:16px;
      }

      .volume-slider {
        -webkit-appearance: none;
        height: 5px;
        border-radius: 5px;
        background: #d3d3d3;
        outline: none;
        opacity: 0.7;
        -webkit-transition: .2s;
        transition: opacity .2s;
        margin: 10px 5px 0 5px;
      }
      .volume_eq{
        position: absolute;
        left: 0;
        width: 100%;
        background-color: var(--card-background-color);
        display: none;
        flex-direction: column;
        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
      }
      .volume_eq .group_row {
        width: 100%;
        display: flex;

      }
      .volume_eq .group_row .group_name{
        flex: 0 0 65px;
      }
      .volume_eq .group_row > div {
        padding: 15px;
        width: 100%;
      }

      .volume_eq .group_row:not(:last-child) > div {
        border-bottom: 1px solid var(--divider-color);
      }

      .volume_eq.show{
        display: flex;
      }

      /**
      SIDEBAR
      */
      .sidebar {
        margin:0 0 0 20px;
        padding:0;
        max-width:25rem;
        width:100%;
      }
      .sidebar .title {
        display:block;
        color: #FFF;
      }
      ul.members {
        list-style:none;
        padding:0;
        margin:0;
      }
      ul.members > li {
        padding:0;
        margin:0;
      }
      ul.members > li .member {
        border-radius:4px;
        margin:15px 0;
        padding:15px;
        background-color: var(--card-background-color);
        box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.19), 0 6px 6px -10px rgba(0, 0, 0, 0.23);
        display:flex;
        flex-direction:row;
      }
      ul.members > li .member span {
        flex:1;
        align-self:center;
        font-size:12px;
        color: var(--primary-text-color);
      }
      ul.members > li .member ha-icon {
        align-self:center;
        font-size:10px;
        color: #888;
        cursor: pointer;
      }
      ul.members > li .member:hover ha-icon {
        color: var(--primary-color);
      }

      ul.favorites {
        list-style:none;
        padding:0;
        margin:0 0 30px 0;
      }
      ul.favorites > li {
        padding:0;
        margin:0;
      }
      ul.favorites > li .favorite {
        border-radius:4px;
        margin:15px 0;
        padding:15px;
        background-color: var(--card-background-color);
        box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.19), 0 6px 6px -10px rgba(0, 0, 0, 0.23);
        display:flex;
        flex-direction:row;
      }
      ul.favorites > li .favorite span {
        flex:1;
        align-self:center;
        font-size:12px;
        color: var(--primary-text-color);
      }
      ul.favorites > li .favorite ha-icon {
        align-self:center;
        font-size:10px;
        cursor: pointer;
        color: var(--primary-text-color);
      }
      ul.favorites > li .favorite:hover ha-icon {
        color: var(--primary-color);
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


      @media screen and (max-width: 992px){
        .center {
          flex-direction: column;
        }
        .groups, .players, .sidebar, .player__container {
          max-width: 100%;
        }
        .player__container, .player__body {
          width: 100%;
          min-width: unset;
        }
        .sidebar, .groups {
          margin:0 0 0 0;
        }
      }

    `;
  }
}
