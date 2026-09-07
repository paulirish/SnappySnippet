export function getCssMetadata(win = globalThis) {
	if (!win || !win.document) {
		return { cssProperties: new Set(), cssShorthands: new Map() };
	}
	try {
		const element = win.document.createElement('div');
		const { style } = element;
		const cssProperties = new Set();
		const cssShorthands = new Map();

		for (let obj = style; obj; obj = Reflect.getPrototypeOf(obj)) {
			for (let name of Object.getOwnPropertyNames(obj)) {
				const property = name.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
				if (win.CSS && win.CSS.supports && win.CSS.supports(property, "initial")) {
					cssProperties.add(property);
				}
			}
		}
		for (let property of cssProperties) {
			style.cssText = "";
			style.setProperty(property, "initial");
			if (style.length > 1) {
				cssShorthands.set(property, [...style]);
			}
		}
		return { cssProperties, cssShorthands };
	} catch (e) {
		return { cssProperties: new Set(), cssShorthands: new Map() };
	}
}

export const DEFAULT_SHORTHANDS = {
	"animation": ["animation-name", "animation-duration", "animation-timing-function", "animation-delay", "animation-iteration-count", "animation-direction", "animation-fill-mode", "animation-play-state"],
	"background": ["background-image", "background-position", "background-position-x", "background-position-y", "background-size", "background-repeat", "background-repeat-x", "background-repeat-y", "background-attachment", "background-origin", "background-clip", "background-color"],
	"border": [
		"border-left", "border-right", "border-bottom", "border-top",
		"border-color", "border-style", "border-width",
		"border-top-color", "border-top-style", "border-top-width",
		"border-right-color", "border-right-style", "border-right-width",
		"border-bottom-color", "border-bottom-style", "border-bottom-width",
		"border-left-color", "border-left-style", "border-left-width"
	],
	"border-bottom": ["border-color", "border-style", "border-width", "border-bottom-width", "border-bottom-style", "border-bottom-color"],
	"border-left": ["border-color", "border-style", "border-width", "border-left-width", "border-left-style", "border-left-color"],
	"border-radius": ["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"],
	"border-right": ["border-color", "border-style", "border-width", "border-right-width", "border-right-style", "border-right-color"],
	"border-top": ["border-color", "border-style", "border-width", "border-top-width", "border-top-style", "border-top-color"],
	"flex": ["flex-grow", "flex-shrink", "flex-basis"],
	"flex-flow": ["flex-direction", "flex-wrap"],
	"font": ["font-family", "font-size", "font-style", "font-variant", "font-weight", "line-height"],
	"grid-area": ["grid-row-start", "grid-column-start", "grid-row-end", "grid-column-end"],
	"grid-column": ["grid-column-start", "grid-column-end"],
	"grid-row": ["grid-row-start", "grid-row-end"],
	"list-style": ["list-style-type", "list-style-position", "list-style-image"],
	"margin": ["margin-top", "margin-right", "margin-bottom", "margin-left"],
	"marker": ["marker-start", "marker-mid", "marker-end"],
	"outline": ["outline-color", "outline-style", "outline-width"],
	"overflow": ["overflow-x", "overflow-y"],
	"padding": ["padding-top", "padding-right", "padding-bottom", "padding-left"],
	"text-decoration": ["text-decoration-line", "text-decoration-style", "text-decoration-color"],
	"transition": ["transition-property", "transition-duration", "transition-timing-function", "transition-delay"]
};
