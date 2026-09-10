# Side-by-Side Style Recreation Test Page

This document provides an overview of the `test-cards.html` page, which serves as a visual testbed for the `get-styles.js` library.

## Purpose

The primary goal of this test page is to visually confirm that the `get-styles.js` library can accurately capture the computed styles of a complex DOM element and its descendants and then re-apply those styles to a clone of that element. This provides a robust, real-world validation of the library's core functionality.

## How it Works

1.  **Original Elements**: The left side of the page displays a collection of seven uniquely styled "playing card" elements. These cards are styled using a combination of modern and complex CSS properties to create a rich visual appearance.

2.  **Iframe Display**: The right side of the page contains an `<iframe>`. This iframe is used to display a clean, isolated copy of one of the playing cards.

3.  **Style Extraction and Application**:
    *   When the "Next" or "Previous" buttons are clicked, the `getNonDefaultComputedStyles()` function from `get-styles.js` is called on the currently selected playing card from the left-hand container.
    *   This function traverses the card's DOM tree and returns an object containing all the non-default computed styles for the card and its children.
    *   The `outerHTML` of the original card is used to create a structural clone inside the iframe.
    *   A recursive JavaScript function then traverses the cloned element tree within the iframe and applies the captured styles directly to the `style` attribute of each corresponding element.

4.  **Verification**: By visually comparing the original card on the left with the recreated card in the iframe on the right, we can immediately verify that the style extraction and application process was successful. The cards should look identical.

This side-by-side comparison provides an effective and intuitive way to test the library's ability to handle a wide range of CSS features and ensure that the reconstructed element is a perfect stylistic replica of the original.
