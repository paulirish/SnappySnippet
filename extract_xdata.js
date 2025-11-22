(function () {
  "use strict";

  const element = document.createElement('div');
  const { style } = element;
  const computedStyle = getComputedStyle(element);
  const cssProperties = new Set();
  const cssShorthands = new Map();
  const cssShorthandsForLonghand = new Map();
  const cssLonghands = new Set();
  const cssAliases = new Map();
  const initialValues = new Map();
  for (let obj = style; obj; obj = Reflect.getPrototypeOf(obj)) {
    for (let name of Object.getOwnPropertyNames(obj)) {
      const property = name.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
      if (CSS.supports(property, "initial")) {
        cssProperties.add(property);
      }
    }
  }
  for (let property of cssProperties) {
    style.cssText = "";
    style.setProperty(property, "initial");
    if (style.length > 1) {
      cssShorthands.set(property, [...style]);
      for (let longhand of style) {
        if (cssShorthandsForLonghand.has(longhand)) {
          cssShorthandsForLonghand.get(longhand).add(property);
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
  const data = {
    cssProperties,
    cssShorthands,
    cssShorthandsForLonghand,
    cssLonghands,
    cssAliases,
    initialValues
  };
  
  console.log(JSON.stringify(data, (_key, value) => ((value instanceof Set || value instanceof Map) ? Array.from(value) : value), 2));
})();
