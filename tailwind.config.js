/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {

      // ── Colors ──────────────────────────────────────────────
      colors: {

        // Primary — Orange (Power Path: buttons, active nav, progress)
        primary: {
          DEFAULT:   '#a14000',
          container: '#f36710',
          on:        '#ffffff',
          'on-container': '#4e1b00',
          inverse:   '#ffb694',
          fixed:     '#ffdbcc',
          'fixed-dim': '#ffb694',
          'on-fixed': '#351000',
          'on-fixed-variant': '#7b2f00',
          tint:      '#FEF3EA',
        },

        // Secondary — Sky Blue (discovery, links, info badges)
        secondary: {
          DEFAULT:   '#00658c',
          container: '#2cbcfd',
          on:        '#ffffff',
          'on-container': '#004966',
          fixed:     '#c5e7ff',
          'fixed-dim': '#80cfff',
          'on-fixed': '#001e2d',
          'on-fixed-variant': '#004c6a',
          tint:      '#E0F6FE',
        },

        // Tertiary — Red (likes, hearts, critical alerts)
        tertiary: {
          DEFAULT:   '#c00012',
          container: '#ff584d',
          on:        '#ffffff',
          'on-container': '#5f0004',
          fixed:     '#ffdad6',
          'fixed-dim': '#ffb4ab',
          'on-fixed': '#410002',
          'on-fixed-variant': '#93000b',
        },

        // Error
        error: {
          DEFAULT:   '#ba1a1a',
          on:        '#ffffff',
          container: '#ffdad6',
          'on-container': '#93000a',
        },

        // Surface & Neutral layers
        surface: {
          DEFAULT:      '#fbf9f8',
          dim:          '#dbdad9',
          bright:       '#fbf9f8',
          tint:         '#a14000',
          variant:      '#e4e2e2',
          lowest:       '#ffffff',
          low:          '#f5f3f3',
          container:    '#efeded',
          high:         '#e9e8e7',
          highest:      '#e4e2e2',
        },

        // On-surface text colors
        'on-surface':         '#1b1c1c',
        'on-surface-variant': '#594137',
        'inverse-surface':    '#303030',
        'inverse-on-surface': '#f2f0f0',

        // Outline / border
        outline: {
          DEFAULT: '#8d7165',
          variant: '#e1bfb1',
        },

        // Background
        background: '#fbf9f8',
        'on-background': '#1b1c1c',

        // Semantic shorthands used in components
        'page-bg':      '#F5F5F5',
        'card-bg':      '#FFFFFF',
        'heading-text': '#1A1A1A',
        'border-subtle':'#D9D9D9',
        'orange-tint':  '#FEF3EA',
        'blue-tint':    '#E0F6FE',
      },

      // ── Typography ───────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },

      fontSize: {
        // body
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-md': ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        // headline
        'headline-sm':     ['18px', { lineHeight: '24px',  fontWeight: '600' }],
        'headline-md':     ['20px', { lineHeight: '28px',  fontWeight: '600', letterSpacing: '-0.01em' }],
        'headline-lg':     ['22px', { lineHeight: '32px',  fontWeight: '600', letterSpacing: '-0.01em' }],
        'headline-mobile': ['20px', { lineHeight: '28px',  fontWeight: '600' }],
        // label
        'label-sm': ['12px', { lineHeight: '14px', fontWeight: '600', letterSpacing: '0.03em' }],
        'label-md': ['14px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.02em' }],
      },

      // ── Border Radius ────────────────────────────────────────
      borderRadius: {
        sm:      '0.25rem',   // 4px  — small accents
        DEFAULT: '0.5rem',    // 8px  — inputs, small buttons
        md:      '0.75rem',   // 12px — cards, large containers
        lg:      '1rem',      // 16px — buttons, larger elements
        xl:      '1.5rem',    // 24px — modals, bottom sheets
        full:    '9999px',    // pill — chips, badges
      },

      // ── Spacing (4px base unit) ──────────────────────────────
      spacing: {
        xs:  '4px',
        sm:  '8px',
        md:  '16px',
        lg:  '24px',
        xl:  '32px',
        xxl: '48px',
        gutter:          '20px',
        'margin-mobile': '16px',
        'margin-desktop':'40px',
      },

      // ── Max Width ────────────────────────────────────────────
      maxWidth: {
        container: '1280px',
      },

      // ── Box Shadow (elevation system) ────────────────────────
      boxShadow: {
        card:    '0 4px 12px rgba(0, 0, 0, 0.05)',   // resting card
        'card-hover': '0 8px 20px rgba(0, 0, 0, 0.09)', // on hover
        btn:     '0 2px 8px rgba(161, 64, 0, 0.25)', // primary button
        'btn-hover': '0 4px 12px rgba(161, 64, 0, 0.35)',
      },
    },
  },
  plugins: [],
}