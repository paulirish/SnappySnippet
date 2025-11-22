# Plan for Extracting Computed Style Calculation into a Standalone Library

This document outlines the plan to extract the computed style calculation logic from the SnappySnippet Chrome extension into a standalone JavaScript library.

## Goal

The goal is to create a library that takes a DOM node as input and returns an object containing its non-default computed styles. This will allow the core logic of SnappySnippet to be used in other projects and environments.

## Core Concepts

The library will be based on the following core concepts from the existing SnappySnippet codebase:

*   **Computed Style Calculation:** Using `window.getComputedStyle` to get the computed styles of a DOM element.
*   **Default Value Filtering:** Using an iframe to create a clean environment for determining the browser's default styles for an element. This is the "iframe approach" from `DefaultValueFilter.js`.
*   **CSS Properties Metadata:**  The library will need a comprehensive set of CSS property data, including shorthands, longhands, aliases, and initial values. This is currently gathered in `panel.js` and stored in the `xdata` object.

## Library API

The library will expose a single main function:

```javascript
function getNonDefaultComputedStyles(element) {
  // ... implementation ...
}
```

*   **`element`:** A DOM element.
*   **Returns:** An object containing the non-default computed styles for the element and its descendants. The exact structure of this object is to be determined, but it will likely be a tree structure that mirrors the DOM subtree.

## Implementation Plan

### 1. Create the Library Boilerplate

*   Create a basic HTML file for testing and development.
*   Create the main JavaScript file for the library.

### 2. Port the Default Value Filter

*   Copy the `DefaultValueFilter.js` code into the new library.
*   Adapt the code to work in a standalone context (i.e., not as a Chrome extension).
*   The iframe creation and management logic will be the core of this part.

### 3. Port the Snapshooter Logic

*   Copy the relevant parts of `Snapshooter.js` into the new library.
*   The key functions to port are `dumpCSS` and `styleDeclarationToSimpleObject`.
*   The DOM traversal logic will also be needed to process the input element and its descendants.

### 4. CSS Properties Data

*   The CSS properties data currently gathered in `panel.js` needs to be available to the library. There are two options for this:
    1.  **Pre-compute the data:** Run the code from `panel.js` in a browser and save the `xdata` object to a JSON file. This JSON file can then be included with the library. This is the most likely approach.
    2.  **Dynamically generate the data:** Include the necessary code in the library to generate the data at runtime. This would make the library larger and might have performance implications.

### 5. Integrate the Pieces

*   The main `getNonDefaultComputedStyles` function will orchestrate the process:
    1.  It will take a DOM element as input.
    2.  It will traverse the element and its descendants.
    3.  For each element, it will call the ported `Snapshooter` logic to get the computed styles.
    4.  It will then use the ported `DefaultValueFilter` logic to filter out the default values.
    5.  Finally, it will assemble and return the resulting object of non-default styles.

### 6. Testing

*   Create a comprehensive set of tests to ensure the library is working correctly.
*   The tests should cover a variety of HTML structures and CSS properties.
*   The tests should also cover edge cases and browser inconsistencies.


## Proposed Output Format

A nested, tree-like object that mirrors the DOM structure of the input element.

### Benefits

1.  **Intuitive:** It preserves the parent-child relationships from the DOM, making it easy to reason about.
2.  **Self-Contained:** The entire result for the subtree is in a single object, perfect for recursion or traversal.
3.  **Serializable:** It can be easily converted to a JSON string if needed.

### Example

```json
{
  "tagName": "DIV",
  "attributes": {
    "class": "container"
  },
  "styles": {
    "border": "1px solid rgb(0, 0, 0)",
    "color": "rgb(255, 0, 0)"
  },
  "pseudo": {
    ":before": {
      "content": "''--''",
      "color": "rgb(0, 0, 255)"
    }
  },
  "children": [
    {
      "tagName": "P",
      "attributes": {},
      "styles": {
        "font-size": "16px"
      },
      "pseudo": {},
      "children": []
    }
  ]
}
```


This plan provides a high-level overview of the work required to extract the computed style calculation logic into a standalone library. The next step is to start implementing the plan, beginning with the library boilerplate and porting the `DefaultValueFilter`.
