/**
 * ConferMeet Theme Toggle System
 * Handles dark/light mode switching across all pages
 */

(function () {
    'use strict';

    const THEME_KEY = 'confermeet-theme';
    const DARK_THEME = 'dark';
    const LIGHT_THEME = 'light';

    // Get stored theme or default to system preference
    function getStoredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) return stored;

        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return DARK_THEME;
        }
        return LIGHT_THEME;
    }

    // Apply theme to document
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.classList.remove('dark-mode', 'light-mode');
        document.body.classList.add(theme === DARK_THEME ? 'dark-mode' : 'light-mode');

        // Update toggle button icons
        updateToggleIcons(theme);

        // Store preference
        localStorage.setItem(THEME_KEY, theme);
    }

    // Update all toggle button icons
    function updateToggleIcons(theme) {
        const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
        toggleBtns.forEach(btn => {
            const sunIcon = btn.querySelector('.sun-icon');
            const moonIcon = btn.querySelector('.moon-icon');

            if (theme === DARK_THEME) {
                if (sunIcon) sunIcon.style.display = 'block';
                if (moonIcon) moonIcon.style.display = 'none';
            } else {
                if (sunIcon) sunIcon.style.display = 'none';
                if (moonIcon) moonIcon.style.display = 'block';
            }
        });
    }

    // Toggle between themes
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || LIGHT_THEME;
        const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
        applyTheme(newTheme);
    }

    // Initialize theme on page load
    function initTheme() {
        const theme = getStoredTheme();
        applyTheme(theme);

        // Add click handlers to all toggle buttons
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            btn.addEventListener('click', toggleTheme);
        });

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (!localStorage.getItem(THEME_KEY)) {
                    applyTheme(e.matches ? DARK_THEME : LIGHT_THEME);
                }
            });
        }
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    // Expose functions globally
    window.ConferMeetTheme = {
        toggle: toggleTheme,
        setDark: () => applyTheme(DARK_THEME),
        setLight: () => applyTheme(LIGHT_THEME),
        getTheme: () => document.documentElement.getAttribute('data-theme') || LIGHT_THEME
    };
})();
