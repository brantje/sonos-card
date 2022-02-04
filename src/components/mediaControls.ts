import { LitElement, html, css } from 'lit';
import { classMap } from 'lit-html/directives/class-map';
import { customElement, property, state } from "lit/decorators";

import { ICON, REPEAT_STATE } from '../const';
//import sharedStyle from '../sharedStyle';

class SonosPlayerMediaControls extends LitElement {
    @property({ attribute: false }) progress: any;
    @property({ attribute: false }) player: any;
    @property({ attribute: false }) showVolume = false;
    config: any;
    break: any;


    get showShuffle() {
        return !this.config.player.hide.shuffle && this.player.supportsShuffle;
    }

    get showRepeat() {
        return !this.config.player.hide.repeat && this.player.supportsRepeat;
    }

    get maxVol() {
        return this.config.player.max_volume || 100;
    }

    get minVol() {
        return this.config.player.min_volume || 0;
    }

    get vol() {
        return Math.round(this.player.vol * 100);
    }

    get jumpAmount() {
        return this.config.player.jump_amount || 10;
    }
    protected shouldUpdate(): boolean {
        return true;
    }
    render() {
        const { hide } = this.config.player;
        return html`
    ${!hide.volume ? this.renderVolControls(this.player.muted) : html``}
    ${this.renderShuffleButton()}
    ${this.renderRepeatButton()}
    ${!hide.controls ? html`
    <div class='flex sonos-media-controls__media' ?flow=${this.config.player.flow || this.break}>
        ${!hide.prev && this.player.supportsPrev ? html`
        <ha-icon-button @click=${e => this.player.prev(e)}
            .icon=${ICON.PREV}>
            <ha-icon .icon=${ICON.PREV}></ha-icon>
        </ha-icon-button>` : ''}
        ${this.renderJumpBackwardButton()}
        ${this.renderPlayButtons()}
        ${this.renderJumpForwardButton()}
        ${!hide.next && this.player.supportsNext ? html`
        <ha-icon-button @click=${e => this.player.next(e)}
            .icon=${ICON.NEXT}>
            <ha-icon .icon=${ICON.NEXT}></ha-icon>
        </ha-icon-button>` : ''}
    </div>
    ` : html``}
    `;
    }

    renderShuffleButton() {
        return this.showShuffle ? html`
    <div class='flex sonos-media-controls__shuffle'>
        <ha-icon-button class='shuffle-button' @click=${e => this.player.toggleShuffle(e)}
            .icon=${ICON.SHUFFLE}
            ?color=${this.player.shuffle}>
            <ha-icon .icon=${ICON.SHUFFLE}></ha-icon>
        </ha-icon-button>
    </div>
    ` : html``;
    }

    renderRepeatButton() {
        if (!this.showRepeat) return html``;

        const colored = [REPEAT_STATE.ONE, REPEAT_STATE.ALL].includes(this.player.repeat);
        return html`
    <div class='flex sonos-media-controls__repeat'>
        <ha-icon-button class='repeat-button' @click=${e => this.player.toggleRepeat(e)}
            .icon=${ICON.REPEAT[this.player.repeat]}
            ?color=${colored}>
            <ha-icon .icon=${ICON.REPEAT[this.player.repeat]}></ha-icon>
        </ha-icon-button>
    </div>
    `;
    }

    renderVolControls(muted) {
        const volumeControls = this.config.player.volume_stateless
            ? this.renderVolButtons(muted)
            : this.renderVolSlider(muted);


        const showVolumeLevel = !this.config.player.hide.volume_level;
        return html`
        <div class=${classMap({ '--buttons' : this.config.player.volume_stateless, 'sonos-media-controls__volume' : true, flex:
                true,
        })}>
            ${volumeControls}
            ${this.player.attr.sonos_group.length > 1 ? html`
            <ha-icon-button @click=${() => this.showVolume = !this.showVolume }>
                <ha-icon .icon=${ICON.DROPDOWN}></ha-icon>
            </ha-icon-button>` : ''}
            ${showVolumeLevel ? this.renderVolLevel() : ''}

        </div> ${this.renderGroupVolume()}`;
    }

    renderVolSlider(muted, member = null) {
        const vol = member ? this.player.hass.states[member].attributes.volume_level : this.player.vol
        return html`
    ${this.renderMuteButton(muted, member)}
    <ha-slider @change=${e => this.handleVolumeChange(e, member)} @click=${e => e.stopPropagation()}
        ?disabled=${muted}
        min=${this.minVol} max=${this.maxVol}
        value=${vol * 100}
        step=${this.config.player.volume_step || 1}
        dir=${'ltr'}
        ignore-bar-touch pin>
    </ha-slider>
    `;
    }

    renderVolButtons(muted, member = null) {
        return html`
    ${this.renderMuteButton(muted, member)}
    <ha-icon-button @click=${e => this.player.volumeDown(e, member)}
        .icon=${ICON.VOL_DOWN}>
        <ha-icon .icon=${ICON.VOL_DOWN}></ha-icon>
    </ha-icon-button>
    <ha-icon-button @click=${e => this.player.volumeUp(e, member)}
        .icon=${ICON.VOL_UP}>
        <ha-icon .icon=${ICON.VOL_UP}></ha-icon>
    </ha-icon-button>
    `;
    }

    renderGroupVolume() {
        const volumeTemplate: Array<any> = [];
        if (this.player.attr.sonos_group.length > 1) {
            for (const member of this.player.attr.sonos_group) {
                const memberStateObj = this.player.hass.states[member];
                if (memberStateObj) {
                    const volume = 100 * memberStateObj.attributes.volume_level;
                    const volumeStr = Math.round(volume).toString();

                    const volumeControls = this.config.player.volume_stateless ? this.renderVolButtons(memberStateObj.attributes.is_volume_muted, member) : this.renderVolSlider(memberStateObj.attributes.is_volume_muted, member);

                    volumeTemplate.push(html`
                        <div class="group_row">
                            <div class="group_name">${this.player.speakerNames[member]}</div>

                        <div>
                            ${volumeControls}
                        </div>
                        <div>
                            ${volumeStr}%
                        </div>
                        </div>
                    `)
                }
            }
        }
        return html`<ha-card class="volume-group ${classMap({ show: this.showVolume }) }">${volumeTemplate}</ha-card>`;
    }

    renderVolLevel() {
        return html`
    <span class="sonos-media-controls__volume__level">${this.vol}%</span>
    `;
    }

    renderMuteButton(muted, member) {
        if (this.config.player.hide.mute) return;
        switch (this.config.player.replace_mute) {
            case 'play':
            case 'play_pause':
                return html`
        <ha-icon-button @click=${e => this.player.playPause(e)}
            .icon=${ICON.PLAY[this.player.isPlaying]}>
            <ha-icon .icon=${ICON.PLAY[this.player.isPlaying]}></ha-icon>
        </ha-icon-button>
        `;
            case 'stop':
                return html`
        <ha-icon-button @click=${e => this.player.stop(e)}
            .icon=${ICON.STOP.true}>
            <ha-icon .icon=${ICON.STOP.true}></ha-icon>
        </ha-icon-button>
        `;
            case 'play_stop':
                return html`
        <ha-icon-button @click=${e => this.player.playStop(e)}
            .icon=${ICON.STOP[this.player.isPlaying]}>
            <ha-icon .icon=${ICON.STOP[this.player.isPlaying]}></ha-icon>
        </ha-icon-button>
        `;
            case 'next':
                return html`
        <ha-icon-button @click=${e => this.player.next(e)}
            .icon=${ICON.NEXT}>
            <ha-icon .icon=${ICON.NEXT}></ha-icon>
        </ha-icon-button>
        `;
            default:
                if (!this.player.supportsMute) return;
                return html`
        <ha-icon-button @click=${e => this.player.toggleMute(e, member)}
            .icon=${ICON.MUTE[muted]}>
            <ha-icon .icon=${ICON.MUTE[muted]}></ha-icon>
        </ha-icon-button>
        `;
        }
    }

    renderPlayButtons() {
        const { hide } = this.config.player;
        return html`
    ${!hide.play_pause ? html`
    <ha-icon-button @click=${e => this.player.playPause(e)}
        .icon=${ICON.PLAY[this.player.isPlaying]}>
        <ha-icon .icon=${ICON.PLAY[this.player.isPlaying]}></ha-icon>
    </ha-icon-button>
    ` : html``}
    ${!hide.play_stop ? html`
    <ha-icon-button @click=${e => this.handleStop(e)}
        .icon=${hide.play_pause ? ICON.STOP[this.player.isPlaying] : ICON.STOP.true}>
        <ha-icon .icon=${hide.play_pause ? ICON.STOP[this.player.isPlaying] : ICON.STOP.true}></ha-icon>
    </ha-icon-button>
    ` : html``}
    `;
    }

    renderJumpForwardButton() {
        const hidden = this.config.player.hide.jump;
        if (hidden || !this.player.hasProgress) return html``;
        return html`
    <ha-icon-button @click=${e => this.player.jump(e, this.jumpAmount)}
        .icon=${ICON.FAST_FORWARD}>
        <ha-icon .icon=${ICON.FAST_FORWARD}></ha-icon>
    </ha-icon-button>
    `;
    }

    renderJumpBackwardButton() {
        const hidden = this.config.player.hide.jump;
        if (hidden || !this.player.hasProgress) return html``;
        return html`
    <ha-icon-button @click=${e => this.player.jump(e, -this.jumpAmount)}
        .icon=${ICON.REWIND}>
        <ha-icon .icon=${ICON.REWIND}></ha-icon>
    </ha-icon-button>
    `;
    }

    handleStop(e) {
        return this.config.player.hide.play_pause ? this.player.playStop(e) : this.player.stop(e);
    }

    handleVolumeChange(ev, member) {
        const vol = parseFloat(ev.target.value) / 100;
        this.player.setVolume(ev, vol, member);
    }

    static get styles() {
        return [
            //sharedStyle,
            css`
        :host {
          display: flex;
          width: 100%;
          justify-content: space-between;
          --sonos-unit: 40px;
        }
        .ellipsis {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .label {
            margin: 0 8px;
        }
        .volume-group{
            display: none;
            position: absolute;
            min-width: 300px;
            top: 40px;
            left: 0;
            z-index: 5;
        }
        .volume-group.show {
            display: inline-block;
        }
        .volume-group .group_row {
            width: 100%;
            display: flex;
            flex-basis: 0px;
            padding: 10px;
            align-items: center
        }
        .volume-group .group_row div {
            flex: 1 1 0px
        }
        .volume-group .group_row :nth-child(2) {
            flex: 3 3 0px
        }
        .volume-group .group_row input[type=range]{
            width: 90%;
        }
        ha-icon-button {
            /* width: var(--sonos-unit);
            height: var(--sonos-unit); */
            color: var(--mmp-text-color, var(--primary-text-color));
            transition: color .25s;
        }
        ha-icon-button[color] {
            color: var(--primary-color, var(--accent-color)) !important;
            opacity: 1 !important;
        }
        ha-icon-button[inactive] {
            opacity: .5;
        }
        ha-icon-button ha-icon {
            display: flex;
        }
        .flex {
          display: flex;
          flex: 1;
          justify-content: space-between;
        }
        ha-slider {
          max-width: none;
          min-width: 100px;
          width: 100%;
          --paper-slider-active-color: var(--primary-color);
          --paper-slider-knob-color: var(--primary-color);
        }
        ha-icon-button {
          min-width: var(--sonos-unit);
        }
        .sonos-media-controls__volume {
          flex: 100;
          /*max-height: var(--sonos-unit);*/
          align-items: center;
        }
        .sonos-media-controls__volume.--buttons {
          justify-content: left;
        }
        .sonos-media-controls__media {
          margin-right: 0;
          margin-left: auto;
          justify-content: inherit;
        }
        .sonos-media-controls__media[flow] {
          max-width: none;
          justify-content: space-between;
        }
        .sonos-media-controls__shuffle,
        .sonos-media-controls__repeat {
          flex: 3;
          flex-shrink: 200;
          justify-content: center;
          --mdc-icon-size: 20px;
        }
      `,
        ];
    }
}

customElements.define('sonos-media-controls', SonosPlayerMediaControls);
