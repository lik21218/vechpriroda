const config = {
    imageCount: 15,
    visibleSlidesRight: 8, // было 12 - слишком тяжело для хрома
    visibleSlidesLeft: 2,
    offsetStep: 13,
    rotationStep: -5.5,
    scaleStep: 0.06,
    brightnessStep: 0.12,
    minBrightness: 0.35,
    wheelSensitivity: 0.004,
    touchSensitivity: 0.008,
    maxWheelDelta: 100,
    smoothing: 0.11,
    snapDelay: 180,
    swapThreshold: 0.5,
};
const slideCount = config.visibleSlidesLeft + config.visibleSlidesRight + 2;
const slider = document.querySelector(".slider");
const slidesContainer = document.querySelector(".slides");
for (let i = 0; i < slideCount; i++) {
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.innerHTML = `<div class="slide-img"><img alt="" loading="eager" decoding="async" /></div>`;
    slidesContainer.appendChild(slide);
}
const slides = document.querySelectorAll(".slide");
let currentPosition = 0;
let targetPosition = 0;
let scrollDirection = 1;
const wrapOffset = gsap.utils.wrap(
    -(config.visibleSlidesLeft + 1),
    slideCount - (config.visibleSlidesLeft + 1)
);
const wrapImageIndex = gsap.utils.wrap(0, config.imageCount);
function updateSlideImage(slide, position) {
    const imageIndex = wrapImageIndex(Math.round(position));
    if (slide.dataset.image === String(imageIndex)) return;
    slide.dataset.image = imageIndex;
    // работает на GitHub Pages без папки images
    slide.querySelector("img").src = `./images/${imageIndex + 1}.jpg`;
}
function getSlideZIndex(offset) {
    const travelOffset = offset * scrollDirection;
    if (travelOffset >= 0) return Math.round(1000 - travelOffset * 10);
    if (travelOffset > -config.swapThreshold) return 1001;
    return Math.round(500 + travelOffset * 10);
}
function getSlideOpacity(offset) {
    const opacity = offset < 0 ? config.visibleSlidesLeft + 1 + offset : config.visibleSlidesRight + 1 - offset;
    return gsap.utils.clamp(0, 1, opacity);
}
function renderSlides() {
    slides.forEach((slide, index) => {
        const offset = wrapOffset(index - currentPosition);
        const distance = Math.abs(offset);
        // УБРАЛИ blur - главная причина лагов в Chrome/Safari
        const brightness = Math.max(config.minBrightness, 1 - distance * config.brightnessStep);
        updateSlideImage(slide, currentPosition + offset);
        gsap.set(slide, {
            xPercent: offset * config.offsetStep,
            rotation: offset * config.rotationStep,
            scale: 1 - distance * config.scaleStep,
            filter: `brightness(${brightness})`,
            opacity: getSlideOpacity(offset),
            zIndex: getSlideZIndex(offset),
            force3D: true,
        });
    });
}
renderSlides();
let snapTimeout;
function snapToSlide() {
    const outgoingPosition = scrollDirection > 0 ? Math.floor(targetPosition) : Math.ceil(targetPosition);
    const distanceMoved = Math.abs(targetPosition - outgoingPosition);
    targetPosition = distanceMoved < config.swapThreshold ? outgoingPosition : outgoingPosition + scrollDirection;
}
function moveSlider(amount) {
    if (amount === 0) return;
    scrollDirection = Math.sign(amount);
    targetPosition += amount;
    clearTimeout(snapTimeout);
    snapTimeout = setTimeout(snapToSlide, config.snapDelay);
}
// ФИКС ДЛЯ ХРОМА/САФАРИ - нормализация wheel
slider.addEventListener("wheel", (event) => {
    event.preventDefault();
    let deltaY = event.deltaY;
    // Firefox отдает deltaMode 1 (lines)
    if (event.deltaMode === 1) deltaY *= 20;
    // на трекпаде mac delta очень маленькая, на мышке с колесом - огромная
    const delta = gsap.utils.clamp(-config.maxWheelDelta, config.maxWheelDelta, deltaY);
    moveSlider(delta * config.wheelSensitivity);
}, {passive: false});
let lastTouchY = 0;
let isDragging = false;
slider.addEventListener("touchstart", (event) => {
    lastTouchY = event.touches[0].clientY;
    isDragging = true;
}, {passive: true});
slider.addEventListener("touchmove", (event) => {
    if (!isDragging) return;
    event.preventDefault();
    const touchY = event.touches[0].clientY;
    moveSlider((lastTouchY - touchY) * config.touchSensitivity);
    lastTouchY = touchY;
}, {passive: false});
slider.addEventListener("touchend", () => { isDragging = false; }, {passive: true});
// Поддержка мыши (drag)
let lastMouseY = 0;
slider.addEventListener("mousedown", (e) => {
    isDragging = true;
    lastMouseY = e.clientY;
});
window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    moveSlider((lastMouseY - e.clientY) * 0.012);
    lastMouseY = e.clientY;
});
window.addEventListener("mouseup", () => { isDragging = false; });
// Плавный тикер
gsap.ticker.add(() => {
    if (currentPosition === targetPosition) return;
    currentPosition += (targetPosition - currentPosition) * config.smoothing;
    if (Math.abs(targetPosition - currentPosition) < 0.001) {
        currentPosition = targetPosition;
    }
    renderSlides();
});