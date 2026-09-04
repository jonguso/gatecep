# PC-030M14B — Coach G Voice Conversation

This package extends Floating Coach G with push-to-talk questions and spoken answers while preserving the existing authenticated REAL-context and read-only contracts.

## Included behavior

- Tap the microphone to record and tap stop to submit.
- Recording automatically stops after 45 seconds.
- The backend transcribes the recording in memory and does not retain raw audio.
- The transcript remains visible and editable in the existing question field.
- The transcript uses the existing `/coach/ask` service for contextual guidance.
- Coach G reads answers aloud, with replay, stop and spoken-reply toggle controls.
- Typed questions remain available.
- Practice routes remain excluded from Floating Coach G.

## Install

Extract this ZIP from the GateCEP repository root, then install the SDK-compatible Expo modules:

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m14b-coach-g-voice.zip

cd mobile
npx expo install expo-audio expo-speech
bash scripts/verify-pc030m14b-coach-g-voice.sh

cd ../backend
bash scripts/verify-pc030m14b-coach-g-voice.sh
```

Set these backend-only variables in `backend/.env` and Railway Variables:

```env
OPENAI_API_KEY=YOUR_REAL_OPENAI_API_KEY
COACH_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

Never use an `EXPO_PUBLIC_` prefix for the transcription key. Restart the backend after adding the variables, then start Expo:

```bash
cd ~/gatecep/mobile
npx expo start --clear --lan
```
