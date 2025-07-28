// Shared color palette for background effects
// Gradient from cool blues (low values) to warm oranges (high values)

export const colorPalette = [
  [30, 144, 255],   // Deep blue (low values)
  [0, 191, 255],    // Deep sky blue
  [7, 201, 240],    // Light blue
  [0, 255, 127],    // Spring green
  [154, 205, 50],   // Yellow green
  [255, 215, 0],    // Gold
  [255, 140, 0],    // Dark orange
  [255, 69, 0],     // Red orange (high values)
];

export interface ColorPaletteConfig {
  /** The maximum value for normalization (default: 1.0) */
  maxValue?: number;
  /** Percentage of range to stay in blue (default: 0.8) */
  blueRange?: number;
  /** Whether to reverse the color mapping (default: false) */
  reverse?: boolean;
}

/**
 * Interpolates between two colors based on a factor t (0-1)
 */
function interpolateColors(color1: number[], color2: number[], t: number): number[] {
  return [
    color1[0] + (color2[0] - color1[0]) * t,
    color1[1] + (color2[1] - color1[1]) * t,
    color1[2] + (color2[2] - color1[2]) * t,
  ];
}

/**
 * Gets a color from the palette based on a normalized value (0-1)
 * Uses the same logic as VectorField: 80% blue range, then rapid transition
 */
export function getColorFromPalette(value: number, config: ColorPaletteConfig = {}): number[] {
  const {
    maxValue = 1.0,
    blueRange = 0.8,
    reverse = false
  } = config;

  // Normalize value to 0-1 range
  let normalizedValue = Math.min(value / maxValue, 1);
  
  // Reverse if requested
  if (reverse) {
    normalizedValue = 1 - normalizedValue;
  }
  
  // Shift color scale - stay blue for specified range, then rapid transition
  let adjustedValue: number;
  if (normalizedValue < blueRange) {
    // Stay in blue range (first 3 colors) for specified percentage
    const blueColorCount = 3;
    const bluePaletteRange = blueColorCount / colorPalette.length;
    adjustedValue = (normalizedValue / blueRange) * bluePaletteRange;
  } else {
    // Rapid transition through remaining colors
    const remaining = (normalizedValue - blueRange) / (1 - blueRange);
    const blueColorCount = 3;
    const bluePaletteRange = blueColorCount / colorPalette.length;
    adjustedValue = bluePaletteRange + remaining * (1 - bluePaletteRange);
  }
  
  // Map to color palette index
  const paletteIndex = adjustedValue * (colorPalette.length - 1);
  const lowerIndex = Math.floor(paletteIndex);
  const upperIndex = Math.min(lowerIndex + 1, colorPalette.length - 1);
  const t = paletteIndex - lowerIndex;
  
  // Interpolate between two colors
  const lowerColor = colorPalette[lowerIndex];
  const upperColor = colorPalette[upperIndex];
  
  return interpolateColors(lowerColor, upperColor, t);
}

/**
 * Gets a color with alpha transparency
 */
export function getColorWithAlpha(value: number, alpha: number, config: ColorPaletteConfig = {}): number[] {
  const color = getColorFromPalette(value, config);
  return [...color, alpha];
}

/**
 * Gets a color based on speed (magnitude of velocity vector)
 */
export function getSpeedColor(velocityX: number, velocityY: number, maxSpeed: number, config: ColorPaletteConfig = {}): number[] {
  const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
  return getColorFromPalette(speed, { ...config, maxValue: maxSpeed });
}

/**
 * Gets a color based on magnitude of any vector
 */
export function getMagnitudeColor(vectorX: number, vectorY: number, maxMagnitude: number, config: ColorPaletteConfig = {}): number[] {
  const magnitude = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
  return getColorFromPalette(magnitude, { ...config, maxValue: maxMagnitude });
} 