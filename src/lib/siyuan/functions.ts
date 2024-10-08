export const isTouchDevice = () => {
    return ("ontouchstart" in window) && navigator.maxTouchPoints > 1;
};
