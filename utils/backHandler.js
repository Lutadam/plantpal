import { useEffect } from "react";
import { BackHandler } from "react-native";

// A lightweight stand-in for a navigation library's back stack. There is no
// navigation library in this app (screens are just conditionally rendered
// based on state in App.js), so hardware back has no natural place to go.
// Screens register a handler while they're the "front" thing showing (a
// modal, an edit form, a sub-screen); the most recently mounted one runs
// first, which lines up with visual nesting as long as inner screens mount
// after outer ones — which is how React renders them. A handler returns true
// once it has dealt with the press, or false to let the next one down (or
// finally App.js's tab-switch / exit fallback) take it.
const stack = [];

export function useBackHandler(handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    stack.push(handler);
    return () => {
      const index = stack.lastIndexOf(handler);
      if (index !== -1) stack.splice(index, 1);
    };
  }, [handler, enabled]);
}

function runRegisteredHandlers() {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]()) return true;
  }
  return false;
}

// Call once, at the app root. Returns the RN subscription to remove on unmount.
export function attachRootBackHandler(fallback) {
  return BackHandler.addEventListener("hardwareBackPress", () => {
    if (runRegisteredHandlers()) return true;
    return fallback();
  });
}
