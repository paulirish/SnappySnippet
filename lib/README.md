# SnappySnippet Get Styles

This is a small JavaScript library to get the computed CSS styles of a DOM element and its descendants, excluding the default browser styles.

## Purpose

When you use `window.getComputedStyle(element)`, you get all the CSS properties for that element, including the ones that are set by the browser's default stylesheet. This library filters out those default styles, so you only get the styles that are explicitly set on the element or its ancestors.

This is useful for tools that need to extract the "important" styles of an element, for example, for creating snippets of HTML and CSS.

## How it works

The library works by:

1.  Recursively traversing the DOM tree starting from the provided element.
2.  For each element, it gets the computed styles.
3.  It then creates a temporary iframe with an element of the same tag name.
4.  It compares the computed styles of the original element with the styles of the temporary element in the iframe.
5.  Only the styles that are different are kept.
6.  The library also handles pseudo-elements like `::before` and `::after`.

## How to use

Include the `get-styles.js` script in your HTML file. Then you can use the `getNonDefaultComputedStyles` function.

```html
<script src="get-styles.js"></script>
<script>
  const element = document.getElementById('my-element');
  const styles = getNonDefaultComputedStyles(element);
  console.log(styles);
</script>
```

The output will be a JavaScript object representing the DOM tree with the non-default styles.
