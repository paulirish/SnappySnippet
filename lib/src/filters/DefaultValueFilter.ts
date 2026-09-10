export interface StyleRule {
  id: string | string[];
  tagName?: string;
  node: Record<string, string> | null;
  before?: Record<string, string> | null;
  after?: Record<string, string> | null;
}

function isCSSStyleDeclaration(
  style: CSSStyleDeclaration | Record<string, string>
): style is CSSStyleDeclaration {
  return typeof (style as CSSStyleDeclaration).getPropertyValue === 'function';
}

export class DefaultValueFilter {
  iframe: HTMLIFrameElement | null = null;
  private doc: Document | null = null;

  constructor(docOrElement?: Document | Element | null) {
    if (docOrElement) {
      if ('ownerDocument' in docOrElement && docOrElement.ownerDocument) {
        this.doc = docOrElement.ownerDocument;
      } else if ('createElement' in docOrElement) {
        this.doc = docOrElement as Document;
      }
    } else if (typeof document !== 'undefined') {
      this.doc = document;
    }

    this.ensureIframe();
  }

  private ensureIframe(): HTMLIFrameElement | null {
    if (this.iframe) {
      return this.iframe;
    }

    if (!this.doc?.createElement) {
      return null;
    }

    try {
      this.iframe = this.doc.createElement('iframe');
      this.iframe.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        overflow: hidden;
        pointer-events: none;
        visibility: hidden;
        border: 0;
      `;

      const targetParent = this.doc.body ?? this.doc.documentElement;
      if (targetParent) {
        targetParent.appendChild(this.iframe);
      }

      const iframeBody = this.iframe.contentWindow?.document?.body;
      if (iframeBody) {
        if (this.doc?.body) {
          const bodyStyle = this.doc.defaultView?.getComputedStyle(this.doc.body);
          if (bodyStyle) {
            iframeBody.style.margin = bodyStyle.margin;
            iframeBody.style.padding = bodyStyle.padding;
          }
        }
        iframeBody.style.border = '0';
        iframeBody.style.background = 'none';
        iframeBody.style.color = 'initial';
        iframeBody.style.font = 'initial';
      }
    } catch {
      this.iframe = null;
    }

    return this.iframe;
  }

  removeDefaultValues(
    style: CSSStyleDeclaration | Record<string, string> | null,
    tagName: string,
    pseudoElement: string | null = null
  ): Record<string, string> {
    if (!style) {
      return {};
    }

    const output: Record<string, string> = {};
    const activeIframe = this.ensureIframe();
    const iframeDoc = activeIframe?.contentWindow?.document;
    const iframeWin = activeIframe?.contentWindow;

    if (!iframeDoc?.body || !iframeWin) {
      if (isCSSStyleDeclaration(style)) {
        for (let i = 0; i < style.length; i++) {
          const prop = style[i];
          output[prop] = style.getPropertyValue(prop);
        }
      } else {
        Object.assign(output, style);
      }
      return output;
    }

    let mountTarget: HTMLElement;
    let clone: HTMLElement;
    const upperTag = (tagName || 'div').toUpperCase();

    if (upperTag === 'A') {
      clone = iframeDoc.createElement('a');
      clone.setAttribute('href', '#');
      mountTarget = clone;
    } else if (upperTag === 'LI') {
      mountTarget = iframeDoc.createElement('ul');
      clone = iframeDoc.createElement('li');
      mountTarget.appendChild(clone);
    } else {
      clone = iframeDoc.createElement(tagName || 'div');
      mountTarget = clone;
    }

    iframeDoc.body.appendChild(mountTarget);

    try {
      const cloneStyle = pseudoElement
        ? iframeWin.getComputedStyle(clone, pseudoElement)
        : iframeWin.getComputedStyle(clone);

      const getComputedProp = (styleDecl: CSSStyleDeclaration, property: string): string => {
        const val = styleDecl.getPropertyValue(property);
        if (val) return val;
        const camel = property.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const camelVal = Reflect.get(styleDecl, camel);
        if (camelVal && typeof camelVal === 'string') return camelVal;
        const propVal = Reflect.get(styleDecl, property);
        return typeof propVal === 'string' ? propVal : '';
      };

      if (isCSSStyleDeclaration(style)) {
        for (let i = 0; i < style.length; i++) {
          const prop = style[i];
          const val = style.getPropertyValue(prop);
          const defaultVal = getComputedProp(cloneStyle, prop);
          if (val && val !== defaultVal) {
            output[prop] = val;
          }
        }
      } else {
        for (const prop of Object.keys(style)) {
          const val = style[prop];
          const defaultVal = getComputedProp(cloneStyle, prop);
          if (val && val !== defaultVal) {
            output[prop] = val;
          }
        }
      }
    } finally {
      if (mountTarget.parentNode) {
        mountTarget.parentNode.removeChild(mountTarget);
      }
    }

    return output;
  }

  process(styles: StyleRule[]): StyleRule[] {
    const output: StyleRule[] = [];

    for (const rule of styles) {
      const tagName = rule.tagName || 'div';
      const nodeStyles = rule.node ? this.removeDefaultValues(rule.node, tagName, null) : null;
      const beforeStyles = rule.before ? this.removeDefaultValues(rule.before, tagName, ':before') : null;
      const afterStyles = rule.after ? this.removeDefaultValues(rule.after, tagName, ':after') : null;

      output.push({
        id: rule.id,
        tagName: rule.tagName,
        node: nodeStyles,
        before: beforeStyles,
        after: afterStyles,
      });
    }

    return output;
  }

  cleanup(): void {
    if (this.iframe) {
      if (this.iframe.parentNode) {
        this.iframe.parentNode.removeChild(this.iframe);
      }
      this.iframe = null;
    }
  }
}
