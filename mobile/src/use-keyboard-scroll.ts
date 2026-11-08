import { useCallback, useEffect, useRef } from "react";
import {
  Keyboard,
  TextInput,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type TextInputInstance,
} from "react-native";

const GAP = 24; // space between the text box and the top of the keyboard

/**
 * Keeps the text box you're typing in visible: when the keyboard opens (or changes size), if it covers the
 * focused box, the screen scrolls just enough to show the box above it.
 * Use on a ScrollView with `ref={scrollRef}`, `onScroll={onScroll}`, `scrollEventThrottle={16}`, and
 * `automaticallyAdjustKeyboardInsets` (so there's room to scroll). `inputRef` is for focusing a box from code.
 */
export function useKeyboardScroll() {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const inputRef = useRef<TextInputInstance>(null);
  const offset = useRef(0);

  useEffect(() => {
    const reveal = (e: KeyboardEvent) => {
      const input = TextInput.State.currentlyFocusedInput();
      if (!input) return;
      input.measureInWindow((_x, y, _w, h) => {
        const overlap = y + h + GAP - e.endCoordinates.screenY;
        if (overlap > 0) scrollRef.current?.scrollTo({ y: offset.current + overlap, animated: true });
      });
    };
    const subs = [Keyboard.addListener("keyboardDidShow", reveal), Keyboard.addListener("keyboardDidChangeFrame", reveal)];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);

  return { scrollRef, inputRef, onScroll };
}
