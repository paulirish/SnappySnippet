export interface CleanHtmlOptions {
  removeAttrs?: string[];
  allowedAttributes?: Record<string, boolean | string[]> | string[] | null | false;
  format?: boolean;
}

export const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, boolean | string[]> = {
  id: true,
  'data-snappy-id': true,
  placeholder: ['input', 'textarea'],
  disabled: ['input', 'textarea', 'select', 'option', 'button'],
  value: ['input', 'button'],
  readonly: ['input', 'textarea', 'option'],
  label: ['option'],
  selected: ['option'],
  checked: ['input'],
  src: ['img', 'iframe', 'script', 'input'],
  href: ['a', 'area', 'link'],
  action: ['form'],
  alt: ['img'],
  type: ['input', 'button', 'script', 'style', 'link'],
};

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

interface AbstractNode {
  nodeType: number;
  tagName?: string;
  attributes?: {name: string; value: string}[];
  childNodes: AbstractNode[];
  nodeValue?: string;
  removeAttribute(name: string): void;
}

function parseHtmlFallback(htmlString: string): AbstractNode {
  const root: AbstractNode = {
    nodeType: 1,
    tagName: 'BODY',
    attributes: [],
    childNodes: [],
    removeAttribute() {},
  };

  const stack: AbstractNode[] = [root];
  const tagRegex = /<!--([\s\S]*?)-->|<(\/)?([a-zA-Z0-9:-]+)((?:\s+[^=>\s]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/)?>|([^<]+)/g;
  const attrRegex = /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(htmlString)) !== null) {
    const [_fullMatch, commentText, isClosing, tagNameRaw, attrsRaw, isSelfClosing, textContent] = match;

    if (commentText !== undefined) {
      const current = stack[stack.length - 1];
      current.childNodes.push({
        nodeType: 8,
        nodeValue: commentText,
        childNodes: [],
        removeAttribute() {},
      });
    } else if (textContent !== undefined) {
      if (textContent.length > 0) {
        const current = stack[stack.length - 1];
        current.childNodes.push({
          nodeType: 3,
          nodeValue: textContent,
          childNodes: [],
          removeAttribute() {},
        });
      }
    } else if (tagNameRaw !== undefined) {
      const tagName = tagNameRaw.toUpperCase();
      if (isClosing) {
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].tagName === tagName) {
            stack.splice(i);
            break;
          }
        }
      } else {
        const attributes: {name: string; value: string}[] = [];
        if (attrsRaw) {
          let attrMatch: RegExpExecArray | null;
          while ((attrMatch = attrRegex.exec(attrsRaw)) !== null) {
            const attrName = attrMatch[1];
            const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
            attributes.push({name: attrName, value: attrValue});
          }
        }

        const newNode: AbstractNode = {
          nodeType: 1,
          tagName,
          attributes,
          childNodes: [],
          removeAttribute(attrName: string) {
            const index = attributes.findIndex(a => a.name.toLowerCase() === attrName.toLowerCase());
            if (index !== -1) {
              attributes.splice(index, 1);
            }
          },
        };

        const current = stack[stack.length - 1];
        current.childNodes.push(newNode);

        const isVoid = VOID_ELEMENTS.has(tagName.toLowerCase()) || isSelfClosing === '/';
        if (!isVoid) {
          stack.push(newNode);
        }
      }
    }
  }

  return root;
}

function cleanAbstractNode(
  node: AbstractNode,
  removeAttrs: string[],
  allowedAttrs: Record<string, boolean | string[]> | string[] | null
): void {
  if (node.nodeType === 1 && node.attributes) {
    const tagName = (node.tagName || '').toLowerCase();
    const attrsToRemove: string[] = [];

    for (const attr of node.attributes) {
      const attrName = attr.name.toLowerCase();
      let keep = true;

      if (removeAttrs.includes(attrName)) {
        keep = false;
      } else if (allowedAttrs) {
        if (Array.isArray(allowedAttrs)) {
          keep = allowedAttrs.includes(attrName);
        } else if (typeof allowedAttrs === 'object') {
          const rule = allowedAttrs[attrName];
          if (rule === true) {
            keep = true;
          } else if (Array.isArray(rule)) {
            keep = rule.includes(tagName);
          } else if (rule === undefined) {
            keep = false;
          }
        }
      }

      if (!keep) {
        attrsToRemove.push(attr.name);
      }
    }

    for (const attrName of attrsToRemove) {
      node.removeAttribute(attrName);
    }
  }

  for (const child of node.childNodes) {
    cleanAbstractNode(child, removeAttrs, allowedAttrs);
  }
}

function formatAbstractNode(node: AbstractNode, level = 0): string {
  const indent = '  '.repeat(level);
  let result = '';

  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      const text = (child.nodeValue || '').trim();
      if (text.length > 0) {
        result += `${indent}${text}\n`;
      }
    } else if (child.nodeType === 1) {
      const tagName = (child.tagName || '').toLowerCase();
      let attrsStr = '';
      if (child.attributes) {
        for (const attr of child.attributes) {
          attrsStr += ` ${attr.name}="${attr.value}"`;
        }
      }

      const isVoid = VOID_ELEMENTS.has(tagName);
      const hasChildren = child.childNodes.length > 0;

      if (isVoid) {
        result += `${indent}<${tagName}${attrsStr}>\n`;
      } else if (!hasChildren) {
        result += `${indent}<${tagName}${attrsStr}></${tagName}>\n`;
      } else if (child.childNodes.length === 1 && child.childNodes[0].nodeType === 3) {
        const text = (child.childNodes[0].nodeValue || '').trim();
        result += `${indent}<${tagName}${attrsStr}>${text}</${tagName}>\n`;
      } else {
        result += `${indent}<${tagName}${attrsStr}>\n`;
        result += formatAbstractNode(child, level + 1);
        result += `${indent}</${tagName}>\n`;
      }
    } else if (child.nodeType === 8) {
      result += `${indent}<!--${child.nodeValue}-->\n`;
    }
  }

  return result;
}

function domNodeToAbstract(node: Node): AbstractNode {
  const element = node as Element;
  const attributes: {name: string; value: string}[] = [];

  if (node.nodeType === 1 && element.attributes) {
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes.push({name: attr.name, value: attr.value});
    }
  }

  const childNodes: AbstractNode[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    childNodes.push(domNodeToAbstract(node.childNodes[i]));
  }

  return {
    nodeType: node.nodeType,
    tagName: (element.tagName || '').toUpperCase(),
    attributes,
    childNodes,
    nodeValue: node.nodeValue ?? undefined,
    removeAttribute(name: string) {
      const index = attributes.findIndex(a => a.name.toLowerCase() === name.toLowerCase());
      if (index !== -1) {
        attributes.splice(index, 1);
      }
      if (typeof element.removeAttribute === 'function') {
        element.removeAttribute(name);
      }
    },
  };
}

export function cleanHtml(htmlString: string, options: CleanHtmlOptions = {}): string {
  if (!htmlString) {
    return '';
  }

  const removeAttrs = options.removeAttrs ?? ['class'];
  const allowedAttrs = options.allowedAttributes === null || options.allowedAttributes === false
    ? null
    : (options.allowedAttributes ?? DEFAULT_ALLOWED_ATTRIBUTES);
  const format = options.format !== false;

  let root: AbstractNode;
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${htmlString}</body>`, 'text/html');
    root = domNodeToAbstract(doc.body);
  } else if (typeof document !== 'undefined') {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = htmlString;
    root = domNodeToAbstract(doc.body);
  } else {
    root = parseHtmlFallback(htmlString);
  }

  cleanAbstractNode(root, removeAttrs, allowedAttrs);

  if (!format) {
    return formatAbstractNode(root, 0).replace(/\n\s*/g, '').trim();
  }

  return formatAbstractNode(root, 0).trim();
}
