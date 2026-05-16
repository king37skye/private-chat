# 3. VISUAL DESIGN GUIDELINES

The entire visual framework must strictly adhere to an **Apple-style UI aesthetic**, leveraging spatial design principles, glassmorphism, and deep contrast.

## UI Philosophy & Aesthetic
*   **Cyber-Minimal Dark Mode:** The app defaults to a deep OLED-friendly dark mode. Elements should feel cinematic, lightweight, and premium.
*   **Glassmorphism:** Use Apple-style translucent blur materials (`UIBlurEffectStyleSystemChromeMaterialDark`) for navigation bars, tab bars, and AI context menus. **Background content must softly bleed through overlays** to create a sense of depth and hierarchy.
*   **Typography:** Exclusively use Apple's **San Francisco (SF Pro)** font family. Use `SF Pro Display` for primary headers and `SF Pro Text` for chat bubbles. Emphasize tracking and line-height for optimal readability.
*   **Iconography:** Rely heavily on **SF Symbols** with consistent weight (`Regular` or `Medium`) to maintain native OS familiarity.

## Animation & Motion Design
*   **Motion Rules:** Animations must be physics-based (spring animations). **Avoid linear transitions**. Interactions must feel tactile and instantly responsive (Telegram-level speed).

## Color Psychology & Palette
*   **Primary Background:** True Black (`#000000`) for OLED power saving and stark contrast.
*   **Secondary Backgrounds:** Elevated surfaces use dark charcoal (`#1C1C1E`) or glass materials.
*   **Primary Accent (Brand Action):** Electric Indigo (`#5E5CE6`) for primary buttons and user messages.
*   **AI Interface Accent:** Cyan-Blue Gradient (`#32ADE6` to `#007AFF`) applied to AI chat bubbles and processing indicators to distinguish AI from human elements.
*   **Error/Warning Colors:** Apple Red (`#FF3B30`) for destructive actions (e.g., "Delete Chat", "Wipe Data").
*   **Success Colors:** Apple Green (`#34C759`) for encryption verification badges.