export class URLResolver {
  static resolveUrl(url: string, baseURI: string): string {
    const trimmed = url.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return url;
    }
    if (
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('file://') ||
      trimmed.startsWith('//')
    ) {
      return url;
    }
    try {
      return new URL(trimmed, baseURI).href;
    } catch {
      return url;
    }
  }

  static resolve(propertyValue: string, baseURI: string): string {
    if (!propertyValue || !propertyValue.includes('url(')) {
      return propertyValue;
    }
    return propertyValue.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g, (match, quote, url) => {
      const resolved = URLResolver.resolveUrl(url, baseURI);
      const outputQuote = quote || "'";
      return `url(${outputQuote}${resolved}${outputQuote})`;
    });
  }

  static resolveElementAttributes(element: Element, _originalElement?: Element | null): void {
    const baseURI = element.ownerDocument?.baseURI ?? (typeof location !== 'undefined' ? location.href : '');

    const tagName = element.tagName.toUpperCase();
    switch (tagName) {
      case 'A':
      case 'AREA':
      case 'LINK':
      case 'BASE': {
        const href = element.getAttribute('href');
        if (href && !href.startsWith('#') && baseURI) {
          element.setAttribute('href', URLResolver.resolveUrl(href, baseURI));
        }
        break;
      }
      case 'IMG':
      case 'IFRAME':
      case 'INPUT':
      case 'FRAME':
      case 'SCRIPT': {
        const src = element.getAttribute('src');
        if (src && baseURI) {
          element.setAttribute('src', URLResolver.resolveUrl(src, baseURI));
        }
        break;
      }
      case 'FORM': {
        const action = element.getAttribute('action');
        if (action && baseURI) {
          element.setAttribute('action', URLResolver.resolveUrl(action, baseURI));
        }
        break;
      }
    }
  }
}
