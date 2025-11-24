"use strict";

export class DefaultValueFilter {
  iframe: HTMLIFrameElement;
  element: Element;
  constructor(element: Element) {
    this.iframe = document.createElement("iframe");
    // visually-hidden styles.
    this.iframe.style.cssText = `
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;`;
    this.element = element;
    // Does it need to be attached?
    document.body.appendChild(this.iframe);
  }

  removeDefaultValues(
    style: CSSStyleDeclaration,
    tagName: string,
    pseudoElement: string | null,
  ): Record<string, string> {
    let property, avalue, bvalue, cloneStyle;
    const output: Record<string, string> = {};
    const clone = this.element.ownerDocument.createElement(tagName);

    if (tagName === "A") {
      //when <a> doesn't have href attribute, default browser styles for this element are different
      clone.setAttribute("href", "#");
    }

    if (!this.iframe.contentWindow) {
      return output;
    }
    this.iframe.contentWindow.document.body.appendChild(clone);

    if (pseudoElement) {
      if (!clone.ownerDocument.defaultView) {
        return output;
      }
      cloneStyle = clone.ownerDocument.defaultView.getComputedStyle(
        clone,
        pseudoElement,
      );
    } else {
      if (!clone.ownerDocument.defaultView) {
        return output;
      }
      cloneStyle = clone.ownerDocument.defaultView.getComputedStyle(clone);
    }

    for (property in style) {
      avalue = cloneStyle[property];
      bvalue = style[property];

      if (!style.hasOwnProperty(property) || avalue === bvalue) {
        continue;
      }

      output[property] = bvalue;
    }

    this.iframe.contentWindow.document.body.removeChild(clone);

    return output;
  }
}
