/**
 * BANNER GENERATOR MODULE
 * 
 * Handles banner composition and rendering:
 * - Background generation (solid, gradient, pattern)
 * - Text rendering with positioning
 * - Logo placement with scaling and positioning
 * - Canvas composition and export
 */

export class BannerGenerator {
    constructor() {
        this.canvas = null; // Store the final banner canvas
    }

    /**
     * Generate a complete banner with background, text, and logo
     * @param {Object} config - Banner configuration object
     * @param {string} vectorSVG - SVG content for the logo
     * @param {string|null} uploadedBannerDataURL - Optional uploaded banner background
     * @returns {Promise<HTMLCanvasElement>} - Canvas containing the final banner
     */
    async generateBanner(config, vectorSVG, uploadedBannerDataURL = null) {
        // Create canvas with specified dimensions
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = config.w;
        canvas.height = config.h;

        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Step 1: Draw background (template or uploaded image)
        await this.drawBackground(ctx, config, uploadedBannerDataURL);

        // Step 2: Add text if specified
        if (config.text) {
            this.drawText(ctx, config);
        }

        // Step 3: Add logo
        await this.drawLogo(ctx, config, vectorSVG);

        // Store and return final canvas
        this.canvas = canvas;
        return canvas;
    }

    /**
     * Draw the banner background
     * Either uses an uploaded image or generates a template background
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} config - Banner configuration
     * @param {string|null} uploadedBannerDataURL - Optional uploaded background
     */
    async drawBackground(ctx, config, uploadedBannerDataURL) {
        if (config.mode === 'upload' && uploadedBannerDataURL) {
            // Use uploaded banner as background
            const bannerImg = await this.loadImage(uploadedBannerDataURL);
            // Scale to fit canvas dimensions exactly
            ctx.drawImage(bannerImg, 0, 0, config.w, config.h);
        } else {
            // Generate template background
            this.drawTemplateBackground(ctx, config);
        }
    }

    /**
     * Draw template-generated backgrounds (solid, gradient, or pattern)
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} config - Banner configuration
     */
    drawTemplateBackground(ctx, config) {
        if (config.template === 'solid') {
            // Simple solid color background
            ctx.fillStyle = config.bg;
            ctx.fillRect(0, 0, config.w, config.h);
            
        } else if (config.template === 'gradient') {
            // Linear gradient from one corner to opposite
            const gradient = ctx.createLinearGradient(0, 0, config.w, config.h);
            gradient.addColorStop(0, config.bg);    // Start color
            gradient.addColorStop(1, config.grad);  // End color
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, config.w, config.h);
            
        } else { // pattern
            // Checkerboard pattern background
            ctx.fillStyle = config.bg;
            ctx.fillRect(0, 0, config.w, config.h); // Base color
            
            // Add semi-transparent pattern squares
            ctx.save();
            ctx.globalAlpha = 0.2; // Make pattern subtle
            ctx.fillStyle = config.grad;
            
            // Draw 20x20 squares in checkerboard pattern
            for (let x = 0; x < config.w; x += 40) {
                for (let y = 0; y < config.h; y += 40) {
                    // Only draw squares where coordinates sum to even
                    if (((x + y) / 40) % 2 === 0) {
                        ctx.fillRect(x, y, 20, 20);
                    }
                }
            }
            ctx.restore(); // Restore original alpha
        }
    }

    /**
     * Draw text on the banner
     * Positions text at top or bottom center based on configuration
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} config - Banner configuration
     */
    drawText(ctx, config) {
        // Set text styling
        ctx.fillStyle = config.tcol;                              // Text color
        ctx.font = `bold ${config.fs}px Arial, sans-serif`;      // Bold font with size
        ctx.textAlign = 'center';                                // Center horizontally
        ctx.textBaseline = 'alphabetic';                         // Standard baseline
        
        // Calculate vertical position based on preference
        const y = config.tpos === 'top' 
            ? config.fs + 16          // Top: font size + padding
            : config.h - 16;          // Bottom: height - padding
        
        // Draw text centered horizontally
        ctx.fillText(config.text, config.w / 2, y);
    }

    /**
     * Draw the logo on the banner
     * Converts SVG to image, calculates size and position, then draws
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} config - Banner configuration
     * @param {string} vectorSVG - SVG content to render
     */
    async drawLogo(ctx, config, vectorSVG) {
        // Convert SVG string to blob URL for image loading
        const svgBlob = new Blob([vectorSVG], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);

        try {
            // Load SVG as image
            const img = await this.loadImage(url);
            
            // Calculate size and position based on configuration
            const { x, y, width, height } = this.calculateLogoPosition(config, img);
            
            // Draw logo at calculated position and size
            ctx.drawImage(img, x, y, width, height);
        } finally {
            // Always clean up the temporary URL
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Calculate logo size and position based on configuration
     * Maintains aspect ratio while scaling to specified percentage
     * @param {Object} config - Banner configuration
     * @param {HTMLImageElement} img - Logo image element
     * @returns {Object} - Object with x, y, width, height properties
     */
    calculateLogoPosition(config, img) {
        // Calculate maximum dimensions based on percentage
        const scale = config.logoSizePct / 100;
        const maxW = config.w * scale;
        const maxH = config.h * scale;
        const aspectRatio = img.width / img.height;

        // Scale logo to fit within max dimensions while preserving aspect ratio
        let logoWidth, logoHeight;
        if (maxW / aspectRatio <= maxH) {
            // Width is the limiting factor
            logoWidth = maxW;
            logoHeight = maxW / aspectRatio;
        } else {
            // Height is the limiting factor
            logoHeight = maxH;
            logoWidth = maxH * aspectRatio;
        }

        // Calculate position based on placement preference
        const pad = 20; // Padding from edges
        let x, y;

        switch (config.logoPos) {
            // Top row positions
            case 'left-top': 
                x = pad; 
                y = pad; 
                break;
            case 'top-middle': 
                x = (config.w - logoWidth) / 2; 
                y = pad; 
                break;
            case 'right-top': 
                x = config.w - logoWidth - pad; 
                y = pad; 
                break;
            
            // Middle row positions
            case 'left-middle': 
                x = pad; 
                y = (config.h - logoHeight) / 2; 
                break;
            case 'center': 
                x = (config.w - logoWidth) / 2; 
                y = (config.h - logoHeight) / 2; 
                break;
            case 'right-middle': 
                x = config.w - logoWidth - pad; 
                y = (config.h - logoHeight) / 2; 
                break;
            
            // Bottom row positions
            case 'left-bottom': 
                x = pad; 
                y = config.h - logoHeight - pad; 
                break;
            case 'bottom-middle': 
                x = (config.w - logoWidth) / 2; 
                y = config.h - logoHeight - pad; 
                break;
            case 'right-bottom': 
                x = config.w - logoWidth - pad; 
                y = config.h - logoHeight - pad; 
                break;
        }

        return { x, y, width: logoWidth, height: logoHeight };
    }

    /**
     * Load an image from a URL
     * @param {string} src - Image source URL
     * @returns {Promise<HTMLImageElement>} - Loaded image element
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * Get the final banner as a data URL
     * @returns {string|null} - Data URL of the banner canvas, or null if no canvas
     */
    getDataURL() {
        return this.canvas ? this.canvas.toDataURL('image/png') : null;
    }
}
