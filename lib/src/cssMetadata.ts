export interface CssMetadata {
  cssProperties: Set<string>;
  cssShorthands: Map<string, string[]>;
  cssShorthandsForLonghand: Map<string, Set<string>>;
  cssLonghands: Set<string>;
  cssAliases: Map<string, string>;
  initialValues: Map<string, string>;
}

export const DEFAULT_SHORTHANDS: Record<string, string[]> = {
  animation: [
    'animation-name',
    'animation-duration',
    'animation-timing-function',
    'animation-delay',
    'animation-iteration-count',
    'animation-direction',
    'animation-fill-mode',
    'animation-play-state',
  ],
  background: [
    'background-image',
    'background-position',
    'background-position-x',
    'background-position-y',
    'background-size',
    'background-repeat',
    'background-repeat-x',
    'background-repeat-y',
    'background-attachment',
    'background-origin',
    'background-clip',
    'background-color',
  ],
  border: [
    'border-left',
    'border-right',
    'border-bottom',
    'border-top',
    'border-color',
    'border-style',
    'border-width',
    'border-top-color',
    'border-top-style',
    'border-top-width',
    'border-right-color',
    'border-right-style',
    'border-right-width',
    'border-bottom-color',
    'border-bottom-style',
    'border-bottom-width',
    'border-left-color',
    'border-left-style',
    'border-left-width',
  ],
  'border-bottom': [
    'border-bottom-width',
    'border-bottom-style',
    'border-bottom-color',
  ],
  'border-left': [
    'border-left-width',
    'border-left-style',
    'border-left-color',
  ],
  'border-radius': [
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius',
  ],
  'border-right': [
    'border-right-width',
    'border-right-style',
    'border-right-color',
  ],
  'border-top': [
    'border-top-width',
    'border-top-style',
    'border-top-color',
  ],
  flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
  'flex-flow': ['flex-direction', 'flex-wrap'],
  font: ['font-family', 'font-size', 'font-style', 'font-variant', 'font-weight', 'line-height'],
  'grid-area': ['grid-row-start', 'grid-column-start', 'grid-row-end', 'grid-column-end'],
  'grid-column': ['grid-column-start', 'grid-column-end'],
  'grid-row': ['grid-row-start', 'grid-row-end'],
  'list-style': ['list-style-type', 'list-style-position', 'list-style-image'],
  margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  marker: ['marker-start', 'marker-mid', 'marker-end'],
  outline: ['outline-color', 'outline-style', 'outline-width'],
  overflow: ['overflow-x', 'overflow-y'],
  padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  'text-decoration': ['text-decoration-line', 'text-decoration-style', 'text-decoration-color'],
  transition: ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'],
};

function createFallbackMetadata(): CssMetadata {
  const cssProperties = new Set<string>();
  const cssShorthands = new Map<string, string[]>();
  const cssShorthandsForLonghand = new Map<string, Set<string>>();
  const cssLonghands = new Set<string>();
  const cssAliases = new Map<string, string>();
  const initialValues = new Map<string, string>();

  for (const [shorthand, longhands] of Object.entries(DEFAULT_SHORTHANDS)) {
    cssProperties.add(shorthand);
    cssShorthands.set(shorthand, [...longhands]);
    for (const longhand of longhands) {
      cssProperties.add(longhand);
      cssLonghands.add(longhand);
      const existing = cssShorthandsForLonghand.get(longhand);
      if (existing) {
        existing.add(shorthand);
      } else {
        cssShorthandsForLonghand.set(longhand, new Set([shorthand]));
      }
    }
  }

  return {
    cssProperties,
    cssShorthands,
    cssShorthandsForLonghand,
    cssLonghands,
    cssAliases,
    initialValues,
  };
}

export function generateCSSPropertiesData(targetWindow?: Window | null): CssMetadata {
  const win = targetWindow ?? (typeof window !== 'undefined' ? window : null);
  if (!win?.document?.createElement) {
    return createFallbackMetadata();
  }

  try {
    const element = win.document.createElement('div');
    const {style} = element;
    if (!style) {
      return createFallbackMetadata();
    }

    const cssProperties = new Set<string>();
    const cssShorthands = new Map<string, string[]>();
    const cssShorthandsForLonghand = new Map<string, Set<string>>();
    const cssLonghands = new Set<string>();
    const cssAliases = new Map<string, string>();
    const initialValues = new Map<string, string>();

    const cssNamespace = (win as Window & {CSS?: typeof CSS}).CSS ?? (typeof CSS !== 'undefined' ? CSS : null);

    for (let obj: CSSStyleDeclaration | null = style; obj; obj = Reflect.getPrototypeOf(obj) as CSSStyleDeclaration | null) {
      for (const name of Object.getOwnPropertyNames(obj)) {
        const property = name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`);
        if (cssNamespace?.supports?.(property, 'initial')) {
          cssProperties.add(property);
        }
      }
    }

    for (const property of Array.from(cssProperties)) {
      style.cssText = '';
      style.setProperty(property, 'initial');

      if (style.length > 1) {
        const longhands = Array.from(style);
        cssShorthands.set(property, longhands);

        for (const longhand of longhands) {
          const shorthands = cssShorthandsForLonghand.get(longhand);
          if (shorthands) {
            shorthands.add(property);
          } else {
            cssShorthandsForLonghand.set(longhand, new Set([property]));
          }
        }
      } else if (style.length === 1) {
        if (property === style[0]) {
          cssLonghands.add(property);
        } else {
          cssAliases.set(property, style[0]);
        }
      }
    }

    for (const [shorthand, longhands] of Object.entries(DEFAULT_SHORTHANDS)) {
      if (!cssShorthands.has(shorthand)) {
        cssShorthands.set(shorthand, [...longhands]);
        for (const longhand of longhands) {
          const shorthands = cssShorthandsForLonghand.get(longhand);
          if (shorthands) {
            shorthands.add(shorthand);
          } else {
            cssShorthandsForLonghand.set(longhand, new Set([shorthand]));
          }
        }
      }
    }

    return {
      cssProperties,
      cssShorthands,
      cssShorthandsForLonghand,
      cssLonghands,
      cssAliases,
      initialValues,
    };
  } catch {
    return createFallbackMetadata();
  }
}

export function getCssMetadata(win?: Window | null): {
  cssProperties: Set<string>;
  cssShorthands: Map<string, string[]>;
} {
  const data = generateCSSPropertiesData(win);
  return {
    cssProperties: data.cssProperties,
    cssShorthands: data.cssShorthands,
  };
}
