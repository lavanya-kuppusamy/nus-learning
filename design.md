# Snip — Design Language

Borrowed from the visual language of lovable.dev (look & feel only).  
Dark, minimal, generously spaced. A warm coral/pink gradient glow anchors the hero.  
The URL form reads as a chat-style input, not a traditional web form.

---

## 1. Color Tokens

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0a0a0f` | Page background (near-black) |
| `--surface` | `#13131a` | Card / primary surface |
| `--surface-2` | `#1c1c27` | Inset surface (input track, hover) |
| `--text` | `#f0f0f5` | Body / heading text |
| `--muted` | `#8888a4` | Placeholders, captions, table meta |
| `--border` | `rgba(255,255,255,0.08)` | Subtle dividers & card outlines |
| `--accent-1` | `#ff6b6b` | Coral — primary accent, links |
| `--accent-2` | `#e040fb` | Violet-pink — gradient end |
| `--accent-3` | `#ff9f43` | Warm orange — optional third stop |
| `--error` | `#ff6b6b` | Validation error (reuses accent-1) |

### Accent Gradient
```
linear-gradient(135deg, #ff6b6b 0%, #e040fb 100%)
```
Used on: primary button background, h1 text fill.

### Hero Glow
```
radial-gradient(ellipse 80% 60% at 50% 0%,
  rgba(255,107,107,0.18) 0%,
  rgba(224,64,251,0.10) 40%,
  transparent 70%)
```
Applied as a full-bleed `::before` pseudo-element behind the hero area.

---

## 2. Typography

### Font Stack
```
'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif
```
Load via Google Fonts: `Inter` weights 400, 500, 600, 700.

### Type Scale

| Token | Value | Usage |
|---|---|---|
| `--text-hero` | `clamp(2rem, 5vw, 3rem)` | Page H1 |
| `--text-lg` | `1.125rem` | Card headings (H2) |
| `--text-base` | `1rem` | Body, input text |
| `--text-sm` | `0.875rem` | Button labels, result text |
| `--text-xs` | `0.75rem` | Table column headers |

Hero H1: weight 700, letter-spacing −0.03em, gradient text fill.  
Tagline / subline: `--muted`, weight 400, `--text-base`.  
Table headers: `--text-xs`, weight 500, uppercase, letter-spacing 0.05em.

---

## 3. Spacing Scale

| Token | rem | px |
|---|---|---|
| `--space-1` | 0.25rem | 4px |
| `--space-2` | 0.5rem | 8px |
| `--space-3` | 0.75rem | 12px |
| `--space-4` | 1rem | 16px |
| `--space-6` | 1.5rem | 24px |
| `--space-8` | 2rem | 32px |
| `--space-12` | 3rem | 48px |
| `--space-16` | 4rem | 64px |

Container: `max-width 720px`, centered, `padding-top --space-16`.  
Between sections: `margin-bottom --space-4`.  
Hero margin-bottom before form: `--space-12`.

---

## 4. Border Radii

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `8px` | Small chips, inline badges |
| `--radius-md` | `14px` | Result notice, inner elements |
| `--radius-lg` | `20px` | Cards (`.card`) |
| `--radius-pill` | `9999px` | Chat input track + button |

---

## 5. Borders, Shadows & Glow

```css
/* Card outline */
--shadow-card: 0 1px 1px rgba(0,0,0,0.4),
               0 0 0 1px rgba(255,255,255,0.06);

/* Focused input container */
--glow-input:  0 0 0 3px rgba(255,107,107,0.20);

/* Primary button ambient glow */
--glow-btn:    0 2px 16px rgba(255,107,107,0.35);
```

Card border: `1px solid --border`.  
Error state: `border-color: rgba(220,53,69,0.5)` on the pill track.

---

## 6. Element Mapping — Snip onto the System

| Snip element | Design role | Key properties |
|---|---|---|
| `<header>` h1 + tagline | **Hero** | Centered, `--text-hero`, gradient text, hero glow behind |
| `.card:first` — `.input-row` | **Chat-style hero input** | Pill track (`--radius-pill`), inset bg `--surface-2`, gradient button |
| `.hint.error` | **Validation notice** | `--error` color, sits below pill track |
| `.result` | **Success notice** | Tinted coral bg, `--radius-md`, coral border |
| `.card:last` — `<table>` | **Data card** | `--surface`, `--radius-lg`, `--shadow-card` |

---

## 7. Interaction States

- **Input focus**: `.input-row` gets `box-shadow: --glow-input` and `border-color: rgba(255,107,107,0.35)`
- **Button hover**: `opacity 0.88`, amplified `box-shadow` (0 4px 24px coral)
- **Button disabled**: `opacity 0.4`, no shadow
- **Table row hover**: `background: rgba(255,255,255,0.02)`
- **Links**: `--accent-1`, no underline at rest, underline on hover

---

*Paste this file into any future styling prompt to restore the full design context.*
