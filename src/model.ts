import {
    PROGRESS_PROPS,
    MEDIA_INFO,
    REPEAT_STATE,
} from './const';
import arrayBufferToBase64 from './utils/misc';



interface Zone {
    members: Record<string, string>;
    state: string;
    roomName: string;
}

export default class MediaPlayerObject {
    hass: any;
    config: any;
    entity: any;
    entityId: any;
    state: any;
    attr: any;
    idle: any;
    active: boolean;
    group: any;
    platform: any;
    zones: Record<string, any> = {};
    speakerNames: any = {}

    constructor(hass, config, entity) {
        this.hass = hass || {};
        this.config = config || {};
        this.entity = entity || {};
        this.entityId = entity && entity.entity_id || this.config.entity;
        this.state = entity.state;
        this.attr = entity.attributes;
        this.idle = false;
        this.active = this.isActive;

        for (const entity of this.config.entities) {
            const stateObj = this.hass.states[entity];
            if (!(entity in this.zones)) {
                this.zones[entity] = {
                    members: {},
                    state: "",
                    roomName: "",
                };
                this.speakerNames[entity] = stateObj ? stateObj.attributes.friendly_name : '';
            }

            if (!this.isUnavailable) {
                this.zones[entity].state = stateObj.state;
                this.zones[entity].roomName = stateObj.attributes.friendly_name as string;
                if (stateObj &&  stateObj.attributes.sonos_group && stateObj.attributes.sonos_group.length > 1 && stateObj.attributes.sonos_group[0] == entity) {
                    for (const member of stateObj.attributes.sonos_group) {
                        if (member != entity) {
                            const state = this.hass.states[member];
                            if (member) {
                                this.zones[entity].members[member] = state.attributes.friendly_name ?? '';
                            }
                        }
                    }
                } else if (stateObj.attributes.sonos_group && stateObj.attributes.sonos_group.length > 1) {
                    delete this.zones[entity];
                }
            }
        }
    }

    get id() {
        return this.entity.entity_id;
    }

    get icon() {
        return this.attr.icon;
    }

    get isPaused() {
        return this.state === 'paused';
    }

    get isPlaying() {
        return this.state === 'playing';
    }

    get isIdle() {
        return this.state === 'idle';
    }

    get isStandby() {
        return this.state === 'standby';
    }

    get isUnavailable() {
        return this.state === 'unavailable';
    }

    get isOff() {
        return this.state === 'off';
    }

    get isActive() {
        return (!this.isOff
            && !this.isUnavailable
            && !this.idle) || false;
    }

    get shuffle() {
        return this.attr.shuffle || false;
    }

    get repeat() {
        return this.attr.repeat || REPEAT_STATE.OFF;
    }

    get content() {
        return this.attr.media_content_type || 'none';
    }

    get mediaDuration() {
        return this.attr.media_duration || 0;
    }

    get updatedAt() {
        return this.attr.media_position_updated_at || 0;
    }

    get position() {
        return this.attr.media_position || 0;
    }

    get name() {
        return this.attr.friendly_name || '';
    }

    get groupCount() {
        return this.group.length;
    }

    get isGrouped() {
        return this.group.length > 1;
    }

    get master() {
        return this.entityId
    }

    get isMaster() {
        return this.master === this.entityId;
    }

    get sources() {
        return this.attr.source_list || [];
    }

    get source() {
        return this.attr.source || '';
    }

    get soundModes() {
        return this.attr.sound_mode_list || [];
    }

    get soundMode() {
        return this.attr.sound_mode || '';
    }

    get muted() {
        return this.attr.is_volume_muted || false;
    }

    get vol() {
        return this.attr.volume_level || 0;
    }

    get picture() {
        return this.attr.entity_picture_local || this.attr.entity_picture;
    }

    get hasArtwork() {
        return (this.picture
            && this.config.artwork !== 'none'
            && this.active
            && !this.idle);
    }

    get mediaInfo() {
        return MEDIA_INFO.map(item => ({
            text: this.attr[item.attr],
            prefix: '',
            ...item,
        })).filter(item => item.text);
    }

    get hasProgress() {
        return !this.idle && PROGRESS_PROPS.every(prop => prop in this.attr);
    }

    get supportsPrev() {
        return (this.attr.supported_features | 16) // eslint-disable-line no-bitwise
            === this.attr.supported_features;
    }

    get supportsNext() {
        return (this.attr.supported_features | 32) // eslint-disable-line no-bitwise
            === this.attr.supported_features;
    }

    get progress() {
        if (this.isPlaying) {
            return this.position + (Date.now() - new Date(this.updatedAt).getTime()) / 1000.0;
        } else {
            return this.position;
        }
    }

    get trackIdle() {
        return (
            this.active
            && !this.isPlaying
            && this.updatedAt
            && this.config.idle_view
            && this.config.idle_view.after
        );
    }

    checkIdleAfter(time) {
        const diff = (Date.now() - new Date(this.updatedAt).getTime()) / 1000;
        this.idle = diff > time * 60;
        this.active = this.isActive;
        return this.idle;
    }

    get supportsShuffle() {
        return !(typeof this.attr.shuffle === 'undefined');
    }

    get supportsRepeat() {
        return !(typeof this.attr.repeat === 'undefined');
    }

    get supportsMute() {
        return !(typeof this.attr.is_volume_muted === 'undefined');
    }

    get supportsVolumeSet() {
        return !(typeof this.attr.volume_level === 'undefined');
    }


    async fetchArtwork() {
        const url = this.attr.entity_picture_local ? this.hass.hassUrl(this.picture) : this.picture;

        try {
            const res = await fetch(new Request(url));
            const buffer = await res.arrayBuffer();
            const image64 = arrayBufferToBase64(buffer);
            const imageType = res.headers.get('Content-Type') || 'image/jpeg';
            return `url(data:${imageType};base64,${image64})`;
        } catch (error) {
            return false;
        }
    }

    getAttribute(attribute) {
        return this.attr[attribute] || '';
    }


    toggleMute(e, member) {
        if (member == null) {
            for (const entityId of this.attr.sonos_group) {
                this.callService(e, 'volume_mute', { is_volume_muted: !this.hass.states[entityId].attributes.is_volume_muted, entity_id: entityId }, 'media_player', true);
            }
        } else {
            this.callService(e, 'volume_mute', { is_volume_muted: !this.hass.states[member].attributes.is_volume_muted, entity_id: member }, 'media_player', true);
        }
    }

    toggleShuffle(e) {
        this.callService(e, 'shuffle_set', { shuffle: !this.shuffle });
    }

    toggleRepeat(e) {
        const states = Object.values(REPEAT_STATE);
        const { length } = states;
        const currentIndex = states.indexOf(this.repeat) - 1;
        const nextState = states[((currentIndex - 1 % length + length) % length)];
        this.callService(e, 'repeat_set', { repeat: nextState });
    }

    setSource(e, source) {
        this.callService(e, 'select_source', { source });
    }

    setMedia(e, opts) {
        this.callService(e, 'play_media', { ...opts });
    }

    playPause(e) {
        this.callService(e, 'media_play_pause');
    }

    playStop(e) {
        if (!this.isPlaying)
            this.callService(e, 'media_play');
        else
            this.callService(e, 'media_stop');
    }

    setSoundMode(e, name) {
        this.callService(e, 'select_sound_mode', { sound_mode: name });
    }

    next(e) {
        this.callService(e, 'media_next_track');
    }

    prev(e) {
        this.callService(e, 'media_previous_track');
    }

    stop(e) {
        this.callService(e, 'media_stop');
    }

    volumeUp(e, member) {
        if (!member) {
            for (const entityId of this.attr.sonos_group) {
                if (this.supportsVolumeSet && this.config.volume_step > 0) {
                    this.callService(e, 'volume_set', {
                        entity_id: entityId,
                        volume_level: Math.min(this.vol + this.config.volume_step / 100, 1),
                    });
                } else this.callService(e, 'volume_up', { entity_id: entityId }, 'media_player', true);
            }
        } else {
            this.callService(e, 'volume_up', { entity_id: member }, 'media_player', true);
        }
    }

    volumeDown(e, member) {
        if (!member) {
            for (const entityId of this.attr.sonos_group) {
                if (this.supportsVolumeSet && this.config.volume_step > 0) {
                    this.callService(e, 'volume_set', {
                        entity_id: entityId,
                        volume_level: Math.max(this.vol - this.config.volume_step / 100, 0),
                    });
                } else this.callService(e, 'volume_down', { entity_id: entityId }, 'media_player', true);
            }
        } else {
            this.callService(e, 'volume_down', { entity_id: member }, 'media_player', true);
        }
    }

    seek(e, pos) {
        this.callService(e, 'media_seek', { seek_position: pos });
    }

    jump(e, amount) {
        const newPosition = this.progress + amount;
        const clampedNewPosition = Math.min(
            Math.max(newPosition, 0), this.mediaDuration || newPosition,
        );
        this.callService(e, 'media_seek', { seek_position: clampedNewPosition });
    }

    joinPlayer(playerId) {
        this.hass.callService("sonos", "join", {
            master: this.entityId,
            entity_id: playerId,
        });
    }

    unjoinPlayer(playerId) {
        this.hass.callService("sonos", "unjoin", {
            entity_id: playerId,
        });
    }

    setVolume(e, vol, ent = null) {
        if (!ent) {
            for (const entityId of this.attr.sonos_group) {
                this.callService(e, 'volume_set', {
                    entity_id: entityId,
                    volume_level: vol,
                });
            }
        } else {
            this.callService(e, 'volume_set', {
                entity_id: ent,
                volume_level: vol,
            });
        }
    }

    toggleScript(e, id, data = {}) {
        this.callService(e, id.split('.').pop(), {
            ...data,
        }, 'script');
    }

    toggleService(e, id, data = {}) {
        e.stopPropagation();
        const [domain, service] = id.split('.');
        this.hass.callService(domain, service, {
            ...data,
        });
    }

    callService(e, service, inOptions = {}, domain = 'media_player', omit = false) {
        if (e) {
            e.stopPropagation();
        }

        this.hass.callService(domain, service, {
            ...(!omit && { entity_id: this.entityId }),
            ...inOptions,
        });
    }
}
