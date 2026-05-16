# 4. PRODUCT ARCHITECTURE

## Messaging Layer
*   **Encryption Protocol:** Implementation of the Signal Protocol (Double Ratchet Algorithm) for perfect forward secrecy.
*   **Features:** Real-time text, Discord-style topic threading for groups, WebRTC for encrypted audio/video calls, and secure media sharing.
*   **Self-Destructing Data:** Ephemeral messaging with configurable TTL (Time to Live) stored strictly in volatile memory where possible.

## AI Layer
*   **Isolated Sandbox:** The AI operates in a separate architectural container. It cannot query the local SQLite messaging database.
*   **Local AI Processing:** Prioritize small, quantized SLMs (Small Language Models) running via CoreML/Metal on-device for basic summarization and drafting to ensure **absolute zero data transmission**.
*   **Cloud AI Fallback:** For complex queries, data is sent to a secure API only after explicit user confirmation. **Payloads must be stripped of PII (Personally Identifiable Information) before transmission.**

## Security Layer
*   **Authentication:** Hardware-backed biometric authentication (FaceID/TouchID) required to unlock the app.
*   **Anti-Surveillance Measures:** Implementation of `FLAG_SECURE` (Android) and `UIWindow.isHidden` (iOS) to block unauthorized screen recording and OS-level app switcher snapshots.
