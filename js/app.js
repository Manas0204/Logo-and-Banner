/**
 * MAIN APPLICATION MODULE
 * 
 * Orchestrates the entire application:
 * - Initializes all modules and components
 * - Coordinates data flow between modules
 * - Handles high-level user interactions
 * - Manages application state and lifecycle
 */

import { LogoProcessor } from './logoProcessor.js';
import { BannerGenerator } from './bannerGenerator.js';
import { UIController } from './uiController.js';
import { $, showMessage, downloadFile } from './utils.js';

class App {
    constructor() {
        // Application configuration - shared across all modules
        this.config = {
            // Smart defaults that work for most users
            template: 'gradient',       // Gradient looks more professional
            w: 1200,                   // Facebook-friendly default
            h: 630,
            bg: '#ffffff',
            grad: '#2563eb',

            text: '',
            tpos: 'bottom',
            tcol: '#ffffff',           // White text on gradients
            fs: 36,                    // Larger, more readable

            logoPos: 'center',
            logoSizePct: 25,           // Smaller default - less overwhelming

            // Simplified processing - FIXED THRESHOLD at 0.7 for better logo results
            mode: 'create',
            threshold: 0.7,            // Fixed at 0.7 (Sharp) - works better for most logos
            preserveColor: true,
            logoColor: '#ffffff'       // White logo by default
        };

        // Initialize all modules
        this.logoProcessor = new LogoProcessor();
        this.bannerGenerator = new BannerGenerator();
        this.ui = new UIController(this.config);
        
        // Application state
        this.uploadedBannerDataURL = null; // Stores uploaded banner background

        // Start the application
        this.init();
    }

    /**
     * Initialize the application
     * Sets up UI and binds main event handlers
     */
    init() {
        this.ui.initialize();
        this.bindMainEvents();
        
        // Store app instance globally for preset functions
        window.logoApp = this;
    }

    /**
     * Bind main application event handlers
     * These handle major actions that coordinate between modules
     */
    bindMainEvents() {
        // File upload handlers
        this.setupLogoUpload();
        this.setupBannerUpload();

        // Logo processing action buttons
        $('#btnConvertBitmap').addEventListener('click', () => this.convertToBitmap());
        $('#btnVectorize').addEventListener('click', () => this.vectorizeLogo());
        $('#btnDownloadSVGLogo').addEventListener('click', () => this.downloadSVG());
        
        // Banner generation and navigation
        $('#btnPreview').addEventListener('click', () => this.generatePreview());
        $('#toStep2').addEventListener('click', () => this.ui.setStep(2));
        $('#toStep3').addEventListener('click', () => {
            const dataURL = this.bannerGenerator.getDataURL();
            if (dataURL) {
                this.ui.showFinalBanner(dataURL);
                this.ui.setStep(3);
            }
        });
        
        // Download and utility buttons
        $('#dlPNG').addEventListener('click', () => this.downloadPNG());
        $('#restart').addEventListener('click', () => location.reload());
    }

    /**
     * Set up logo file upload with drag & drop support
     * Handles both click-to-browse and drag-and-drop functionality
     */
    setupLogoUpload() {
        const logoDrop = $('#logoDrop');
        const logoInput = $('#logoInput');

        // Click to browse
        logoDrop.addEventListener('click', () => logoInput.click());
        
        // Drag & drop visual feedback
        logoDrop.addEventListener('dragover', e => {
            e.preventDefault(); // Allow drop
            logoDrop.style.background = '#e2e8f0'; // Highlight on hover
        });
        
        logoDrop.addEventListener('dragleave', () => {
            logoDrop.style.background = '#f1f5f9'; // Reset background
        });
        
        // Handle dropped files
        logoDrop.addEventListener('drop', e => {
            e.preventDefault();
            this.handleLogoFile(e.dataTransfer.files[0]);
            logoDrop.style.background = '#f1f5f9'; // Reset background
        });
        
        // Handle file input changes
        logoInput.addEventListener('change', e => {
            if (e.target.files[0]) this.handleLogoFile(e.target.files[0]);
        });
    }

    /**
     * Set up banner file upload for "upload existing banner" mode
     * Simpler than logo upload - only handles file input
     */
    setupBannerUpload() {
        const bannerDrop = $('#bannerDrop');
        const bannerInput = $('#bannerInput');

        bannerDrop.addEventListener('click', () => bannerInput.click());
        bannerInput.addEventListener('change', e => {
            if (e.target.files[0]) this.handleBannerFile(e.target.files[0]);
        });
    }

    /**
     * Process uploaded logo file
     * Coordinates between logo processor and UI controller
     * @param {File} file - Logo image file from user
     */
    async handleLogoFile(file) {
        try {
            // Load and process logo through LogoProcessor
            const dataURL = await this.logoProcessor.loadLogo(file);
            
            // Extract dominant color for automatic color selection
            try {
                const dominantColor = await this.logoProcessor.extractDominantColor(dataURL);
                
                // Update configuration and UI with extracted color
                this.config.logoColor = dominantColor;
                this.updateColor(dominantColor);
            } catch (error) {
                console.warn('Color extraction failed, using default');
            }

            // Update UI to show logo tools and preview
            $('#logoTools').style.display = 'block';
            this.ui.renderLogoPreview(this.logoProcessor);
            this.ui.updateStatus('#bitmapStatus', 'Ready for bitmap conversion');
            $('#btnVectorize').disabled = true; // Require bitmap conversion first

        } catch (error) {
            // Show user-friendly error message
            showMessage('#logoResult', `❌ ${error.message}`, false);
        }
    }

    /**
     * Process uploaded banner file for background
     * @param {File} file - Banner image file from user
     */
    handleBannerFile(file) {
        // Validate file type
        if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
            showMessage('#bannerUploadInfo', '❌ Please upload PNG/JPG.', false);
            return;
        }

        // Load file and update configuration
        const fr = new FileReader();
        fr.onload = () => {
            const img = new Image();
            img.onload = () => {
                // Store banner and update dimensions to match
                this.uploadedBannerDataURL = fr.result;
                this.config.w = img.width;
                this.config.h = img.height;
                
                // Update UI input fields
                $('#w').value = img.width;
                $('#h').value = img.height;
                
                // Show success message
                showMessage('#bannerUploadInfo', `✅ Banner loaded: ${img.width}×${img.height}px`, true);
            };
            img.src = fr.result;
        };
        fr.readAsDataURL(file);
    }

    /**
     * Convert processed logo to bitmap
     * First step in the vectorization process - now uses FIXED threshold 0.7
     */
    async convertToBitmap() {
        if (!this.logoProcessor.processedDataURL) return;

        // Show loading state
        this.ui.updateStatus('#bitmapStatus', 'Converting to bitmap...', true);

        try {
            // Perform bitmap conversion using FIXED threshold 0.7 (works better for most logos)
            await this.logoProcessor.convertToBitmap(this.config.threshold);
            
            // Update UI on success
            this.ui.updateStatus('#bitmapStatus', '✅ Bitmap ready');
            $('#btnVectorize').disabled = false; // Enable next step
            this.ui.renderLogoPreview(this.logoProcessor);
            
        } catch (error) {
            console.error('Bitmap conversion failed:', error);
            this.ui.updateStatus('#bitmapStatus', '❌ Bitmap failed');
            showMessage('#logoResult', '❌ Bitmap conversion failed', false);
        }
    }

    /**
     * Create vector SVG from bitmap
     * Final step in logo processing - creates hole-preserving vector
     */
    async vectorizeLogo() {
        if (!this.logoProcessor.bitmapDataURL) {
            showMessage('#logoResult', '❌ Please convert to bitmap first.', false);
            return;
        }

        // Show loading state
        this.ui.updateStatus('#bitmapStatus', 'Creating vector with holes...', true);

        try {
            // Determine color: custom color or black for original colors
            const color = this.config.preserveColor ? this.config.logoColor : '#000000';
            
            // Perform vectorization
            await this.logoProcessor.vectorize(color);
            
            // Update UI on success
            this.ui.updateStatus('#bitmapStatus', '✅ Vector created!');
            this.ui.renderLogoPreview(this.logoProcessor);
            
        } catch (error) {
            console.error('Vectorization failed:', error);
            this.ui.updateStatus('#bitmapStatus', '❌ Vector failed');
            showMessage('#logoResult', '❌ Vector creation failed', false);
        }
    }

    /**
     * Download the generated SVG logo
     * Allows user to save just the vector logo
     */
    downloadSVG() {
        if (!this.logoProcessor.vectorSVGContent) return;
        
        downloadFile(
            this.logoProcessor.vectorSVGContent, 
            'fixed-vector-logo-with-holes.svg', 
            'image/svg+xml'
        );
    }

    /**
     * Generate banner preview
     * Combines background, text, and logo into final banner
     */
    async generatePreview() {
        if (!this.logoProcessor.vectorSVGContent) {
            showMessage('#preview', '❌ Please create vector first.', false);
            return;
        }

        try {
            const canvas = await this.bannerGenerator.generateBanner(
                this.config,
                this.logoProcessor.vectorSVGContent,
                this.uploadedBannerDataURL
            );

            const dataURL = canvas.toDataURL('image/png');
            this.ui.showPreview(dataURL);

            // Also prepare final step
            this.ui.showFinalBanner(dataURL);

        } catch (error) {
            console.error('Preview generation failed:', error);
            showMessage('#preview', '❌ Preview generation failed', false);
        }
    }

    /**
     * Download final banner as PNG
     * Saves the composed banner to user's device
     */
    downloadPNG() {
        const dataURL = this.bannerGenerator.getDataURL();
        if (!dataURL) return;
        
        // Create download link and trigger download
        const link = document.createElement('a');
        link.download = 'fixed-banner-with-holes.png';
        link.href = dataURL;
        link.click();
    }

    /**
     * Update color across all color controls - ENHANCED with hex input support
     * Used by quick color buttons and color picker
     * @param {string} color - Hex color code
     */
    updateColor(color) {
        this.config.logoColor = color;
        $('#logoColor').value = color;
        
        // Update hex input if it exists
        const hexInput = $('#hexInput');
        if (hexInput) {
            hexInput.value = color;
        }
        
        // Update color preview if it exists
        const preview = $('#colorPreview');
        if (preview) {
            preview.style.backgroundColor = color;
        }
    }

    /**
     * Apply preset banner configurations
     * @param {string} type - Preset type: 'social', 'business', or 'web'
     */
    applyPreset(type) {
        const presets = {
            social: { 
                w: 1200, h: 630, 
                template: 'gradient', 
                bg: '#667eea', grad: '#764ba2', 
                logoPos: 'left-middle',
                tcol: '#ffffff'
            },
            business: { 
                w: 800, h: 400, 
                template: 'solid', 
                bg: '#ffffff', 
                logoPos: 'center', 
                tcol: '#000000'
            },
            web: { 
                w: 728, h: 90, 
                template: 'gradient', 
                bg: '#ff7e5f', grad: '#feb47b', 
                logoPos: 'left-middle',
                tcol: '#ffffff'
            }
        };

        if (presets[type]) {
            Object.assign(this.config, presets[type]);
            this.ui.updateInputsFromConfig();
        }
    }
}

/**
 * APPLICATION ENTRY POINT
 * Initialize the app when DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    new App(); // Start the application
});
