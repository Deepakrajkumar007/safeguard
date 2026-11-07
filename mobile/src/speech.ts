import { setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";

let audioReady = false;

/** Let read-aloud play even when the iPhone's ring/silent switch is on silent. */
async function prepareAudio() {
  if (audioReady) return;
  audioReady = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    /* if this fails, speech still works when the phone isn't on silent */
  }
}

/** Read text aloud with the iPhone's built-in voice, slightly slower for clarity. */
export async function speak(text: string, onDone?: () => void) {
  await prepareAudio();
  await Speech.stop();
  Speech.speak(text, {
    language: "en-US",
    rate: 0.9,
    onDone,
    onStopped: onDone,
    onError: () => onDone?.(),
  });
}

export function stopSpeaking() {
  void Speech.stop();
}
