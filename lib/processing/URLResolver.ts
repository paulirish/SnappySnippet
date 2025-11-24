
"use strict";

export class URLResolver {
  static resolve(value: string, baseURI: string): string {
    const urlRegex = /url\((?!['"]?(?:data:|https|http):)['"]?([^'")]+)['"]?\)/g;
    return value.replace(urlRegex, (match, url) => {
      try {
        const absoluteURL = new URL(url, baseURI).href;
        return `url('${absoluteURL}')`;
      } catch (e) {
        // Ignore invalid URLs
        return match;
      }
    });
  }
}
