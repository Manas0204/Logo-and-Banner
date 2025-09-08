/**
 * UTILITY FUNCTIONS
 * 
 * Common utility functions used throughout the application.
 * Includes DOM helpers, file operations, validation, and UI utilities.
 */

/**
 * Quick DOM selector - shorthand for document.querySelector
 * @param {string} selector - CSS selector string
 * @returns {Element|null} - First matching element or null
 */
export const $ = (selector) => document.querySelector(selector);

/**
 * Quick DOM selector for multiple elements - shorthand for document.querySelectorAll
 * @param {string} selector - CSS selector string  
 * @returns {Array<Element>} - Array of matching elements
 */
export const $$ = (selector) => Array.from(document.querySelectorAll(selector));

/**
 * Display a message in a specified container
 * @param {string} containerId - ID of the container element
 * @param {string} html - HTML content to display
 * @param {boolean} isSuccess - Whether this is a success (true) or error (false) message
 */
export function showMessage(containerId, html, isSuccess = true) {
    $(containerId).innerHTML = `<div class="msg ${isSuccess ? 'ok' : 'err'}">${html}</div>`;
}

/**
 * Resize an image to fit within maximum dimensions while maintaining aspect ratio
 * @param {HTMLImageElement} img - Image element to resize
 * @param {number} maxSide - Maximum width or height in pixels
 * @returns {string} - Data URL of the resized image
 */
export function clampImageToMax(img, maxSide = 800) {
    // Create canvas for image processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Get original dimensions
    let { width: w, height: h } = img;
    
    // Calculate scale factor if image exceeds maximum
    const m = Math.max(w, h);
    if (m > maxSide) {
        const s = maxSide / m;
        w = Math.round(w * s);
        h = Math.round(h * s);
    }
    
    // Set canvas size and render with high quality
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    
    // Return as data URL
    return canvas.toDataURL('image/png');
}

/**
 * Download a file to the user's device
 * @param {string|Blob} content - File content (string for text, Blob for binary)
 * @param {string} filename - Desired filename for download
 * @param {string} type - MIME type of the file
 */
export function downloadFile(content, filename, type = 'image/png') {
    // Create blob if content is text
    const blob = type === 'image/svg+xml' 
        ? new Blob([content], { type })
        : content;
    
    // Create temporary download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click(); // Trigger download
    
    // Clean up temporary URL
    URL.revokeObjectURL(url);
}

/**
 * Validate and normalize a hex color code
 * @param {string} hexValue - Hex color string (with or without #)
 * @returns {string|null} - Normalized hex color (#RRGGBB) or null if invalid
 */
export function validateHexColor(hexValue) {
    // Clean up input - remove # and whitespace
    const hex = hexValue.trim().replace('#', '');
    
    // Validate format: exactly 6 hex characters
    return /^[0-9A-Fa-f]{6}$/.test(hex) ? '#' + hex : null;
}
