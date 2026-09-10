'use strict';

export class URLResolver {
  static resolve(propertyValue: string, baseURI: string): string {
    return propertyValue.replace(/url\([\'"]?(.*?)["']?\)/g, (match, url) => {
      try {
        if (!url.startsWith('data:') && !url.startsWith('http')) {
          const resolvedUrl = new URL(url, baseURI).href;
          return `url('${resolvedUrl}')`;
        }
      } catch (e) {
        console.error('Error resolving URL:', url, e);
      }
      return match;
    });
  }
}
