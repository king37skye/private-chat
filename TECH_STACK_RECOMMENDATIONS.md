# 5. TECH STACK RECOMMENDATIONS

**Phase 1: Initial Launch & MVP**
*   **Frontend Framework:** **Flutter** (Dart). Chosen for unified cross-platform logic, enabling 120fps animations and rapid UI iterations tailored to the Apple aesthetic.
*   **Backend & Infrastructure:** **Firebase** (Google Cloud). Utilize Firebase Auth (Anonymous & Phone authentication), Cloud Firestore (strictly for routing encrypted ciphertexts, never plaintext), and Firebase Cloud Messaging (FCM) for push notifications with encrypted payloads.
*   **Local Database:** **SQLite** wrapped in SQLCipher for AES-256 encrypted local storage.
*   **AI Infrastructure:** Local processing via TensorFlow Lite / MediaPipe for Flutter. Cloud fallback routed via Firebase Cloud Functions calling secure OpenAI/Anthropic enterprise endpoints (zero data retention policy).

**Phase 2: Scalable Enterprise Transition**
*   **Backend:** Migrate from Firebase to a **Go (Golang)** or **Rust** microservices backend for extreme concurrency and Telegram-level websocket performance.
*   **Database:** PostgreSQL (with TimescaleDB for message routing) and Redis for high-speed ephemeral caching.
*   **WebRTC:** Implement custom embedded TURN/STUN servers for decentralized, peer-to-peer calling capabilities.