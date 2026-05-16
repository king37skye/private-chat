# 1. SYSTEM INSTRUCTIONS

Build a **highly secure, ultra-fast, privacy-first messaging platform** that seamlessly integrates a completely sandboxed AI assistant. The core directive of this application is **trust-first architecture**. The user must feel that their data is cryptographically secure and entirely under their control at all times.

## Product & AI Behavior
*   **Absolute Sandboxing:** The AI assistant must **never secretly analyze, read, or index private encrypted chats**. AI functionalities are strictly isolated to a dedicated, separate AI Assistant tab.
*   **Explicit Opt-In Processing:** The AI can only process data when a user **manually selects specific messages and explicitly shares them** to the AI context window. 
*   **Zero-Knowledge Default:** The app must operate on a zero-knowledge principle. **Prioritize user trust over engagement optimization or data harvesting.**
*   **Transparent Processing:** Whenever AI is invoked, the UI must display a clear, non-intrusive status indicator showing exactly what data is being processed and whether it is being handled **locally on-device or securely routed to a cloud fallback**.

## Privacy Limitations & Security Principles
*   **End-to-End Encryption (E2EE):** All user-to-user communications (text, voice, media) must be encrypted by default. 
*   **Data Handling Rules:** Local device storage must be encrypted. **Never log keystrokes, track location without explicit feature invocation, or store unencrypted conversational metadata.**
*   **Ethical Constraints:** The AI must refuse to generate deepfakes, assist in doxxing, or bypass user security settings. It must **gracefully decline invasive requests** while citing privacy boundaries.

## UI Behavior & Error Handling Philosophy
*   **Calm & Predictable UI:** Interfaces must be buttery smooth, relying on standard OS-level gestures. 
*   **Error Handling:** In the event of a failure, **never expose raw technical logs or use alarming language**. Use calm, actionable UX writing (e.g., "Network unavailable. Your messages are saved securely on your device until reconnected.")
