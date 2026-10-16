import { useEffect, useRef } from "react";
let scrollLocks = 0;
let previousOverflow;

export default function useDialog(open = true) {
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    dialog.showModal();
    if (scrollLocks++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      dialog.close();
      if (--scrollLocks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  return ref;
}
export function isBackdropClick(event) {
  if (event.target !== event.currentTarget) return false;
  const bounds = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  );
}
