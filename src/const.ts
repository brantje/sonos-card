const PROGRESS_PROPS = ['media_duration', 'media_position', 'media_position_updated_at'];
const MEDIA_INFO = [
    { attr: 'media_title' },
    { attr: 'media_artist' },
    { attr: 'media_series_title' },
    { attr: 'media_season', prefix: 'S' },
    { attr: 'media_episode', prefix: 'E' },
    { attr: 'app_name' },
];
const REPEAT_STATE = {
    OFF: 'off',
    ALL: 'all',
    ONE: 'one',
};

const ICON = {
    DEFAULT: 'mdi:cast',
    DROPDOWN: 'mdi:chevron-down',
    GROUP: 'mdi:speaker-multiple',
    MENU: 'mdi:menu-down',
    MUTE: {
        true: 'mdi:volume-off',
        false: 'mdi:volume-high',
    },
    NEXT: 'mdi:skip-next',
    PLAY: {
        true: 'mdi:pause',
        false: 'mdi:play',
    },
    POWER: 'mdi:power',
    PREV: 'mdi:skip-previous',
    SEND: 'mdi:send',
    SHUFFLE: 'mdi:shuffle',
    REPEAT: {
        [REPEAT_STATE.OFF]: 'mdi:repeat-off',
        [REPEAT_STATE.ONE]: 'mdi:repeat-once',
        [REPEAT_STATE.ALL]: 'mdi:repeat',
    },
    STOP: {
        true: 'mdi:stop',
        false: 'mdi:play',
    },
    VOL_DOWN: 'mdi:volume-minus',
    VOL_UP: 'mdi:volume-plus',
    FAST_FORWARD: 'mdi:fast-forward',
    REWIND: 'mdi:rewind',
};
const CARD_VERSION = '0.0.5';
export {
    CARD_VERSION,
    PROGRESS_PROPS,
    MEDIA_INFO,
    REPEAT_STATE,
    ICON
}
