(function () {
    'use strict';

    const THEME_KEY = 'confermeet-theme';
    const DARK_THEME = 'dark';
    const LIGHT_THEME = 'light';

    function getStoredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) return stored;

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return DARK_THEME;
        }
        return LIGHT_THEME;
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.classList.remove('dark-mode', 'light-mode');
        document.body.classList.add(theme === DARK_THEME ? 'dark-mode' : 'light-mode');

        updateToggleIcons(theme);

        localStorage.setItem(THEME_KEY, theme);
    }

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

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || LIGHT_THEME;
        const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
        applyTheme(newTheme);
    }

    function initTheme() {
        const theme = getStoredTheme();
        applyTheme(theme);

        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            btn.addEventListener('click', toggleTheme);
        });

        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (!localStorage.getItem(THEME_KEY)) {
                    applyTheme(e.matches ? DARK_THEME : LIGHT_THEME);
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    window.ConferMeetTheme = {
        toggle: toggleTheme,
        setDark: () => applyTheme(DARK_THEME),
        setLight: () => applyTheme(LIGHT_THEME),
        getTheme: () => document.documentElement.getAttribute('data-theme') || LIGHT_THEME
    };
})();
