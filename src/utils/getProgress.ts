export default (duration: number) => {
    const seconds = Math.abs(parseInt((duration % 60).toString(), 10));
    const minutes = Math.abs(parseInt(((duration / 60) % 60).toString(), 10));
    const hours = Math.abs(parseInt(((duration / (60 * 60)) % 24).toString(), 10));

    const hoursString = (hours < 10) ? `0${hours.toString()}` : hours.toString();
    const minutesString = (minutes < 10) ? `0${minutes.toString()}` : minutes.toString();
    const secondsString = (seconds < 10) ? `0${seconds}` : seconds.toString();

    return `${hoursString !== '00' ? `${hoursString}:` : ''}${minutesString}:${secondsString}`;
};
