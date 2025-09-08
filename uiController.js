/**
 * UI CONTROLLER MODULE
 * 
 * Manages all user interface interactions and updates:
 * - Event binding and handling
 * - Form control synchronization
 * - Step navigation management
 * - UI state updates and previews
 */

import { $, $$, showMessage, validateHexColor } from './utils.js';

export class UIController {
    constructor(config) {
        this.config = config;   // Reference to shared configuration
        this.step = 1;          // Current step number
        this.initializePositionGrid();
        this.bindEvents();
    }

    /**
     * Initialize the 3x3 logo position selection grid
     * Creates buttons for all 9 possible logo positions
     */
    initializePositionGrid() {
        // Define position values and labels for the 3x3 grid
        const posNames = [
            ['left-top', 'Left Top'], ['top-middle', 'Top Middle'], ['right-top', 'Right Top'],
            ['left-middle', 'Left Middle'], ['center', 'Center'], ['right-middle', 'Right Middle'],
            ['left-bottom', 'Left Bottom'], ['bottom-middle', 'Bottom Middle'], ['right-bottom', 'Right Bottom']
        ];
        
        // Generate HTML for position buttons (center is active by default)
        $('#posGrid').innerHTML = posNames.map(([v, l]) =>
            `<button class="btn-pos${v === 'center' ? ' active' : ''}" data-pos="${v}">${l}</button>`
        ).join('');
    }

    /**
     * Bind all event listeners for UI controls
     * Organizes events by functionality for maintainability
     */
    bindEvents() {
        this.bindStepNavigation();
        this.bindColorControls();
        this.bindSliderControls();
        this.bindBannerControls();
        this.bindModeControls();
        this.bindPositionControls();
        this.bindTemplateControls();
    }

    /**
     * Bind step navigation events
     * Allows clicking on step headers to navigate (if step is available)
     */
    bindStepNavigation() {
        $$('.step').forEach(el => {
            el.addEventListener('click', () => {
                const n = +el.dataset.step;
                if (this.canNavigateToStep(n)) {
                    this.setStep(n);
                }
            });
        });
    }

    /**
     * Bind color control events
     * Handles color picker, hex input, and color toggle
     */
    bindColorControls() {
        // Color picker updates config directly
        $('#logoColor').addEventListener('input', (e) => {
            this.config.logoColor = e.target.value;
        });
        
        // Hex input with live validation (if it exists)
        const hexInput = $('#hexInput');
        if (hexInput) {
            hexInput.addEventListener('input', (e) => this.handleHexInput(e));
            hexInput.addEventListener('blur', (e) => this.validateHexInput(e));
        }
        
        // Toggle custom color controls (if it exists)
        const preserveColor = $('#preserveColor');
        if (preserveColor) {
            preserveColor.addEventListener('change', (e) => this.toggleColorControls(e.target.checked));
        }
    }

    /**
     * Bind slider control events
     * Handles threshold, font size, and logo size sliders
     */
    bindSliderControls() {
        // Bitmap threshold slider
        $('#threshold').addEventListener('input', (e) => {
            this.config.threshold = +e.target.value;
            const labels = {
                '0.3': 'Light',
                '0.4': 'Soft',
                '0.5': 'Normal',
                '0.6': 'Strong',
                '0.7': 'Sharp'
            };
            $('#thresholdVal').textContent = labels[e.target.value] || 'Normal';
        });

        // Font size slider with live preview
        $('#fs').addEventListener('input', (e) => {
            this.config.fs = +e.target.value;
            $('#fsVal').textContent = this.config.fs + 'px';
        });

        // Logo size slider with live preview
        $('#ls').addEventListener('input', (e) => {
            this.config.logoSizePct = +e.target.value;
            $('#lsVal').textContent = this.config.logoSizePct + '%';
        });
    }

    /**
     * Bind banner configuration controls
     * Handles dimensions, colors, and text settings
     */
    bindBannerControls() {
        // Banner dimensions
        $('#w').addEventListener('input', (e) => this.config.w = +e.target.value);
        $('#h').addEventListener('input', (e) => this.config.h = +e.target.value);
        
        // Background colors
        $('#bg').addEventListener('input', (e) => this.config.bg = e.target.value);
        $('#grad').addEventListener('input', (e) => this.config.grad = e.target.value);
        
        // Text settings
        $('#txt').addEventListener('input', (e) => this.config.text = e.target.value);
        $('#tcol').addEventListener('input', (e) => this.config.tcol = e.target.value);

        // Text position radio buttons
        $$('input[name="tpos"]').forEach(r => {
            r.addEventListener('change', () => {
                this.config.tpos = $('input[name="tpos"]:checked').value;
            });
        });
    }

    /**
     * Bind mode control events
     * Handles switching between create and upload modes
     */
    bindModeControls() {
        $('#modeCreate').addEventListener('click', () => this.setMode('create'));
        $('#modeUpload').addEventListener('click', () => this.setMode('upload'));
    }

    /**
     * Bind position control events
     * Handles logo position selection in the 3x3 grid
     */
    bindPositionControls() {
        $$('.btn-pos').forEach(b => {
            b.addEventListener('click', () => {
                // Update active state
                $$('.btn-pos').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                
                // Update configuration
                this.config.logoPos = b.dataset.pos;
            });
        });
    }

    /**
     * Bind template control events
     * Handles template selection and size presets
     */
    bindTemplateControls() {
        // Template type buttons
        $$('#tmplBtns .btn').forEach(b => {
            b.addEventListener('click', () => {
                this.config.template = b.dataset.tmpl;
                
                // Update active state
                $$('#tmplBtns .btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
            });
        });

        // Size preset buttons
        $$('[data-size]').forEach(b => {
            b.addEventListener('click', () => {
                // Parse dimensions from button data
                const [W, H] = b.dataset.size.split('x').map(n => +n);
                
                // Update configuration and UI
                this.config.w = W; 
                this.config.h = H;
                $('#w').value = W; 
                $('#h').value = H;
                
                // Update active state
                $$('[data-size]').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
            });
        });
    }

    /**
     * Navigate to a specific step and update UI
     * @param {number} n - Step number (1, 2, or 3)
     */
    setStep(n) {
        this.step = n;
        
        // Update step indicator states
        $$('.step').forEach((el, i) => {
            el.classList.remove('active', 'completed');
            if (i + 1 === n) {
                el.classList.add('active');        // Current step
            } else if (i + 1 < n) {
                el.classList.add('completed');     // Completed steps
            }
        });
        
        // Show only the active step content
        $$('.step-content').forEach(el => el.classList.remove('active'));
        $(`#step${n}`).classList.add('active');
    }

    /**
     * Check if user can navigate to a specific step
     * Prevents skipping required steps
     * @param {number} n - Step number to check
     * @returns {boolean} - Whether navigation is allowed
     */
    canNavigateToStep(n) {
        // Always allow going to current or previous steps
        if (n <= this.step) return true;
        
        // Allow step 2 if vector is created
        if (n === 2) return true; // Will be validated by button state
        
        // Allow step 3 if preview is generated
        if (n === 3) return true; // Will be validated by button state
        
        return false;
    }

    /**
     * Update color across all color controls
     * Synchronizes color picker, hex input, and preview
     * @param {string} color - Hex color code
     */
    updateColor(color) {
        this.config.logoColor = color;
        const hexInput = $('#hexInput');
        const colorPreview = $('#colorPreview');
        
        if (hexInput) hexInput.value = color;
        if (colorPreview) colorPreview.style.backgroundColor = color;
    }

    /**
     * Handle hex input field changes with live validation
     * Shows red border for invalid hex codes
     * @param {Event} e - Input event
     */
    handleHexInput(e) {
        const validColor = validateHexColor(e.target.value);
        if (validColor) {
            this.updateColor(validColor);
            e.target.style.borderColor = '#e5e7eb'; // Normal border
        } else {
            e.target.style.borderColor = '#ef4444'; // Red border for error
        }
    }

    /**
     * Validate hex input when user leaves the field
     * Resets to last valid color if input is invalid
     * @param {Event} e - Blur event
     */
    validateHexInput(e) {
        const validColor = validateHexColor(e.target.value);
        if (!validColor) {
            // Reset to current valid color
            e.target.value = this.config.logoColor;
            e.target.style.borderColor = '#e5e7eb';
        }
    }

    /**
     * Toggle color control visibility
     * Shows/hides color picker, hex input, and preview
     * @param {boolean} show - Whether to show color controls
     */
    toggleColorControls(show) {
        this.config.preserveColor = show;
        
        // Toggle visibility of all color-related controls
        [$('#logoColor'), $('#hexInput'), $('#colorPreview')].forEach(el => {
            if (el) el.style.display = show ? 'inline-block' : 'none';
        });
    }

    /**
     * Set banner creation mode (create vs upload)
     * @param {string} mode - 'create' or 'upload'
     */
    setMode(mode) {
        this.config.mode = mode;
        
        if (mode === 'create') {
            // Create new banner mode
            $('#modeCreate').classList.add('active');
            $('#modeUpload').classList.remove('active');
            $('#uploadWrap').style.display = 'none';
        } else {
            // Upload existing banner mode
            $('#modeUpload').classList.add('active');
            $('#modeCreate').classList.remove('active');
            $('#uploadWrap').style.display = 'block';
        }
    }

    /**
     * Render logo processing preview
     * Shows original, bitmap, and vector stages
     * @param {LogoProcessor} processor - Logo processor instance
     */
    renderLogoPreview(processor) {
        if (!processor.processedDataURL) return;

        // Generate preview HTML for each processing stage
        const previewImg = `<img class="trans-bg" style="max-width:200px; border-radius:10px" src="${processor.processedDataURL}" />`;
        
        const bitmapPreview = processor.bitmapDataURL ?
            `<img style="max-width:200px; border-radius:10px; filter:grayscale(1)" src="${processor.bitmapDataURL}" />` :
            '<div class="chip">Not converted yet</div>';
        
        const vectorPreview = processor.vectorSVGContent ?
            `<div style="max-width:200px; height:200px; border-radius:10px; border:1px solid #e5e7eb; overflow:hidden; display:flex; align-items:center; justify-content:center; background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%); background-size: 20px 20px;">${processor.vectorSVGContent}</div>` :
            '<div class="chip">Not vectorized yet</div>';

        // Update preview display
        $('#logoResult').innerHTML = `
            <div class="msg ok">✅ Logo loaded</div>
            <div class="inline" style="gap:16px; align-items:flex-start; flex-wrap:wrap">
                <div>
                    <div style="margin-bottom:8px; font-weight:600">Original:</div>
                    ${previewImg}
                </div>
                <div>
                    <div style="margin-bottom:8px; font-weight:600">Bitmap:</div>
                    ${bitmapPreview}
                </div>
                <div>
                    <div style="margin-bottom:8px; font-weight:600">Vector SVG:</div>
                    ${vectorPreview}
                </div>
            </div>
            ${processor.vectorSVGContent ? `<div class="code" style="margin-top:12px">${processor.vectorSVGContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
        `;

        // Update button states based on processing progress
        $('#btnDownloadSVGLogo').disabled = !processor.vectorSVGContent;
        $('#toStep2').disabled = !processor.vectorSVGContent;
    }

    /**
     * Update status display with optional loading animation
     * @param {string} statusId - ID of status element to update
     * @param {string} message - Status message to display
     * @param {boolean} isLoading - Whether to show loading spinner
     */
    updateStatus(statusId, message, isLoading = false) {
        const statusEl = $(statusId);
        if (isLoading) {
            statusEl.innerHTML = `<span class="loading">⟳</span> ${message}`;
        } else {
            statusEl.textContent = message;
        }
    }

    /**
     * Show banner preview and enable next step
     * @param {string} dataURL - Data URL of banner image
     */
    showPreview(dataURL) {
        $('#preview').innerHTML = `<img class="banner-preview" src="${dataURL}" />`;
        $('#toStep3').disabled = false;
    }

    /**
     * Show final banner in step 3
     * @param {string} dataURL - Data URL of banner image
     */
    showFinalBanner(dataURL) {
        $('#final').innerHTML = `<img class="banner-preview" src="${dataURL}" />`;
    }

    /**
     * Update UI inputs from configuration
     * Used when applying presets - THIS WAS THE MISSING METHOD!
     */
    updateInputsFromConfig() {
        $('#w').value = this.config.w;
        $('#h').value = this.config.h;
        $('#bg').value = this.config.bg;
        $('#grad').value = this.config.grad;
        $('#tcol').value = this.config.tcol;
        $('#txt').value = this.config.text;
        $('#fs').value = this.config.fs;
        $('#fsVal').textContent = this.config.fs + 'px';
        $('#ls').value = this.config.logoSizePct;
        $('#lsVal').textContent = this.config.logoSizePct + '%';
        
        // Update template buttons
        $$('#tmplBtns .btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tmpl === this.config.template);
        });
        
        // Update position buttons
        $$('.btn-pos').forEach(b => {
            b.classList.toggle('active', b.dataset.pos === this.config.logoPos);
        });
        
        // Update text position radio
        $$('input[name="tpos"]').forEach(r => {
            r.checked = r.value === this.config.tpos;
        });
    }

    /**
     * Initialize UI with default values
     * Sets up initial state for all controls
     */
    initialize() {
        // Set slider value displays with proper labels
        const labels = {
            '0.3': 'Light',
            '0.4': 'Soft',
            '0.5': 'Normal',
            '0.6': 'Strong',
            '0.7': 'Sharp'
        };
        $('#thresholdVal').textContent = labels[this.config.threshold] || 'Normal';
        $('#fsVal').textContent = this.config.fs + 'px';
        $('#lsVal').textContent = this.config.logoSizePct + '%';
        
        // Set initial color preview if element exists
        const colorPreview = $('#colorPreview');
        if (colorPreview) {
            colorPreview.style.backgroundColor = this.config.logoColor;
        }
    }
}
