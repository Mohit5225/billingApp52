import { useCallback, useRef } from "react";

interface LongPressOptions {
  isPreventDefault?: boolean;
  delay?: number;
}

export function useLongPress(
  onLongPress: () => void,
  onClick: (e: React.MouseEvent | React.TouchEvent) => void,
  { isPreventDefault = true, delay = 500 }: LongPressOptions = {}
) {
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const target = useRef<EventTarget>();

  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      // Prevent default to avoid selection/context menu on some devices if required
      // But actually preventing default on touch start breaks scrolling.
      // We will only call preventDefault if it's explicitly needed and usually not on touchstart.
      
      // We don't want to prevent default on touchstart as it breaks scrolling.
      // event.persist() is no longer needed in React 17+, but just in case
      if ("persist" in event && typeof event.persist === "function") {
          event.persist();
      }
      
      const eventTarget = event.target;
      target.current = eventTarget;

      timeout.current = setTimeout(() => {
        onLongPress();
        target.current = undefined;
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (event: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = undefined;
        if (shouldTriggerClick && target.current === event.target) {
            onClick(event);
        }
      } else {
        // If timeout is missing, it means the long press already fired.
        // In that case, we might want to prevent the normal click from firing.
        if (isPreventDefault && event.cancelable) {
            event.preventDefault();
        }
      }
      target.current = undefined;
    },
    [onClick, isPreventDefault]
  );

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    onTouchMove: (e: React.TouchEvent) => clear(e, false),
    onClick: (e: React.MouseEvent) => {
       // Only trigger click if the long press hasn't consumed it.
       // Actually, we are calling onClick manually inside clear() when appropriate.
       // But native onClick might still fire. Let's let the parent handle the "onClick" via our clear function,
       // and we intercept the native onClick to prevent it if long press was triggered.
       if (!timeout.current && isPreventDefault) {
           e.preventDefault();
       }
    }
  };
}
