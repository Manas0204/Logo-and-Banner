/**
 * LOGO PROCESSOR MODULE
 * 
 * Handles all logo processing operations:
 * - Loading and resizing logos
 * - Color extraction from images
 * - Bitmap conversion with threshold
 * - SVG vector generation with hole preservation
 */

import { clampImageToMax } from './utils.js';

export class LogoProcessor {
    constructor() {
        // Store different stages of logo processing
        this.originalDataURL = null;    // Original uploaded image
        this.processedDataURL = null;   // Processed (resized) image
        this.bitmapDataURL = null;      // Black & white bitmap version
        this.vectorSVGContent = null;   // Final SVG vector content
    }

    /**
     * Load and process a logo file
     * @param {File} file - Logo image file from user
     * @returns {Promise<string>} - Data URL of processed logo
     * @throws {Error} - If file type is not supported
     */
    async loadLogo(file) {
        // Validate file type - only PNG/JPG allowed
        if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
            throw new Error('Please upload PNG/JPG format only');
        }

        return new Promise((resolve, reject) => {
            const fr = new FileReader();
            
            fr.onload = () => {
                const img = new Image();
                
                img.onload = () => {
                    // Resize image if too large (max 800px)
                    const dataURL = clampImageToMax(img, 800);
                    
                    // Store all processing stages
                    this.originalDataURL = dataURL;
                    this.processedDataURL = dataURL;
                    this.bitmapDataURL = null;      // Reset bitmap
                    this.vectorSVGContent = null;   // Reset vector
                    
                    resolve(dataURL);
                };
                
                img.onerror = reject;
                img.src = fr.result;
            };
            
            fr.onerror = reject;
            fr.readAsDataURL(file);
        });
    }

    /**
     * Extract the dominant color from an image
     * Analyzes pixel data to find the most common non-white color
     * @param {string} dataURL - Image data URL to analyze
     * @returns {Promise<string>} - Hex color code of dominant color
     */
    async extractDominantColor(dataURL) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                // Create canvas to analyze image pixels
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // Get pixel data from entire image
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const colorCount = {};

                // Sample every 16th pixel for performance (still accurate)
                for (let i = 0; i < data.length; i += 16) {
                    const alpha = data[i + 3];
                    
                    // Skip transparent pixels
                    if (alpha < 128) continue;

                    // Round colors to nearest 10 to group similar colors
                    const r = Math.round(data[i] / 10) * 10;
                    const g = Math.round(data[i + 1] / 10) * 10;
                    const b = Math.round(data[i + 2] / 10) * 10;
                    const key = `${r},${g},${b}`;

                    // Count occurrences of each color
                    colorCount[key] = (colorCount[key] || 0) + 1;
                }

                // Find the most common color (excluding near-white)
                let dominantColor = '#1d4ed8'; // Default blue
                let maxCount = 0;

                for (const [color, count] of Object.entries(colorCount)) {
                    const [r, g, b] = color.split(',').map(n => parseInt(n));
                    
                    // Skip near-white colors (likely background)
                    if (r > 240 && g > 240 && b > 240) continue;

                    if (count > maxCount) {
                        maxCount = count;
                        // Convert RGB to hex
                        dominantColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    }
                }

                resolve(dominantColor);
            };
            
            img.src = dataURL;
        });
    }

    /**
     * Convert processed logo to black & white bitmap
     * This creates the mask needed for hole-preserving vectorization
     * @param {number} threshold - Luminance threshold (0.1-1.0) for black/white conversion
     * @returns {Promise<string>} - Data URL of bitmap image
     * @throws {Error} - If no processed logo is available
     */
    async convertToBitmap(threshold = 0.5) {
        if (!this.processedDataURL) {
            throw new Error('No processed logo available');
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                // Create canvas for bitmap processing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;

                // Disable smoothing for sharp bitmap conversion
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0);

                // Get pixel data for processing
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Convert each pixel to pure black or white
                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i + 3];
                    
                    // Very transparent pixels = background (white)
                    if (alpha < 64) {
                        data[i] = 255;     // R = white
                        data[i + 1] = 255; // G = white
                        data[i + 2] = 255; // B = white
                        data[i + 3] = 255; // A = opaque
                        continue;
                    }

                    // Calculate luminance using standard formula
                    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    const isBlack = luminance < (threshold * 255);

                    if (isBlack) {
                        // Dark pixels become pure black
                        data[i] = 0;       // R = black
                        data[i + 1] = 0;   // G = black
                        data[i + 2] = 0;   // B = black
                    } else {
                        // Light pixels become pure white
                        data[i] = 255;     // R = white
                        data[i + 1] = 255; // G = white
                        data[i + 2] = 255; // B = white
                    }
                    data[i + 3] = 255;     // A = opaque
                }

                // Apply processed pixel data back to canvas
                ctx.putImageData(imageData, 0, 0);
                
                // Store and return bitmap
                this.bitmapDataURL = canvas.toDataURL('image/png');
                resolve(this.bitmapDataURL);
            };
            
            img.onerror = reject;
            img.src = this.processedDataURL;
        });
    }

    /**
     * Create SVG vector with hole preservation using bitmap mask
     * This is the core innovation - using the bitmap as an SVG mask preserves holes perfectly
     * @param {string} color - Fill color for the vector
     * @param {number} w - Width of the vector
     * @param {number} h - Height of the vector
     * @returns {string} - Complete SVG content as string
     */
    async createVectorWithHoles(color, w, h) {
        if (!this.bitmapDataURL) {
            throw new Error('No bitmap available');
        }

        // Generate SVG with embedded bitmap mask
        // The key innovation: invert the mask so black areas (logo) show through
        this.vectorSVGContent = `
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${w} ${h}" width="100%" height="100%">
  <defs>
    <!-- Invert black/white so logo areas stay visible -->
    <filter id="invertMask">
      <feColorMatrix type="matrix"
        values="-1 0 0 0 1
                 0 -1 0 0 1
                 0 0 -1 0 1
                 0 0  0 1 0"/>
    </filter>
    <!-- Use bitmap as mask with inversion -->
    <mask id="logoMask">
      <image href="${this.bitmapDataURL}"
             width="${w}" height="${h}"
             style="filter:url(#invertMask)"/>
    </mask>
  </defs>
  <!-- Colored rectangle with mask applied -->
  <rect width="100%" height="100%"
        fill="${color}"
        mask="url(#logoMask)"/>
</svg>`;

        return this.vectorSVGContent;
    }

    /**
     * Complete vectorization process
     * Combines bitmap dimensions detection with vector generation
     * @param {string} color - Desired fill color for vector
     * @returns {Promise<string>} - Complete SVG content
     * @throws {Error} - If bitmap conversion hasn't been done first
     */
    async vectorize(color) {
        if (!this.bitmapDataURL) {
            throw new Error('Convert to bitmap first');
        }

        return new Promise((resolve, reject) => {
            // Load bitmap to get dimensions
            const img = new Image();
            
            img.onload = async () => {
                try {
                    // Create vector using bitmap dimensions
                    const svg = await this.createVectorWithHoles(color, img.width, img.height);
                    resolve(svg);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = reject;
            img.src = this.bitmapDataURL;
        });
    }
}
