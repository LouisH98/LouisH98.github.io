# Shared Color Palette Utility

This utility provides a consistent color palette and interpolation functions for all background effects.

## Features

- **Consistent Color Scheme**: 8-color gradient from cool blues to warm oranges
- **Flexible Configuration**: Customizable max values, blue range, and reverse mapping
- **Speed-based Colors**: Specialized functions for velocity-based coloring
- **Magnitude-based Colors**: Functions for vector magnitude coloring
- **Alpha Support**: Built-in transparency support

## Color Palette

The palette transitions from:
1. Deep blue (low values)
2. Deep sky blue
3. Light blue
4. Spring green
5. Yellow green
6. Gold
7. Dark orange
8. Red orange (high values)

## Usage Examples

### Basic Color Mapping
```typescript
import { getColorFromPalette } from '@/lib/colorPalette';

// Get color for a value (0-1 range)
const color = getColorFromPalette(0.5); // Returns [r, g, b]

// With custom max value
const color = getColorFromPalette(speed, { maxValue: 10 });
```

### Speed-based Colors (for Boids, FlowField)
```typescript
import { getSpeedColor } from '@/lib/colorPalette';

// Get color based on velocity
const color = getSpeedColor(velocityX, velocityY, maxSpeed);
```

### Magnitude-based Colors (for VectorField)
```typescript
import { getMagnitudeColor } from '@/lib/colorPalette';

// Get color based on vector magnitude
const color = getMagnitudeColor(vectorX, vectorY, maxMagnitude);
```

### With Alpha Transparency
```typescript
import { getColorWithAlpha } from '@/lib/colorPalette';

// Get color with alpha channel
const color = getColorWithAlpha(value, 0.8); // Returns [r, g, b, a]
```

### Custom Configuration
```typescript
const color = getColorFromPalette(value, {
  maxValue: 100,        // Custom max value for normalization
  blueRange: 0.6,       // Stay in blue for 60% of range
  reverse: false        // Reverse color mapping
});
```

## Background Effects Using This Palette

- **Boids**: Speed-based coloring for flocking behavior
- **VectorField**: Magnitude-based coloring for vector strength
- **FlowField**: Speed-based coloring for particle trails
- **RippleField**: Magnitude-based coloring for wave intensity

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxValue` | number | 1.0 | Maximum value for normalization |
| `blueRange` | number | 0.8 | Percentage of range to stay in blue |
| `reverse` | boolean | false | Reverse the color mapping |

## Implementation Details

The color interpolation uses a non-linear mapping where:
- 80% of the range stays in blue tones (first 3 colors)
- 20% of the range rapidly transitions through remaining colors
- Smooth interpolation between adjacent colors in the palette 