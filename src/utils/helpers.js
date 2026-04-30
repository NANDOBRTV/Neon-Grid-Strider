const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;
const DEFAULT_POSITION = Object.freeze({ x: 400, y: 300 });

function generateRandomColor() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`;
}

function sanitizeUsername(input, socketId) {
  if (typeof input !== 'string') {
    return `Runner_${socketId.slice(0, 4)}`;
  }
  const cleaned = input.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return `Runner_${socketId.slice(0, 4)}`;
  }
  return cleaned.slice(0, 24);
}

function sanitizeColor(input) {
  if (typeof input !== 'string') {
    return generateRandomColor();
  }
  const normalized = input.trim();
  return HEX_COLOR_REGEX.test(normalized) ? normalized : generateRandomColor();
}

function sanitizePosition(position) {
  if (!position || typeof position !== 'object') {
    return { ...DEFAULT_POSITION };
  }
  const x = Number(position.x);
  const y = Number(position.y);
  return {
    x: Number.isFinite(x) ? x : DEFAULT_POSITION.x,
    y: Number.isFinite(y) ? y : DEFAULT_POSITION.y,
  };
}

module.exports = {
  sanitizeUsername,
  sanitizeColor,
  sanitizePosition,
  DEFAULT_POSITION
};
