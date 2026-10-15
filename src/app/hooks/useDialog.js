import { useEffect, useRef } from "react";
export default function useDialog(open = true, { lockScroll = false } = {}) {
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current,
      previous = document.body.style.overflow;
    dialog.showModal();
    if (lockScroll) document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      if (lockScroll) document.body.style.overflow = previous;
    };
  }, [open, lockScroll]);
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
