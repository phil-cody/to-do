import React from "react";
import Icon from "./Icon.jsx";
import useDialog, { isBackdropClick } from "../hooks/useDialog.js";
export default function Modal({ title, onClose, children }) {
  const ref = useDialog();
  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (isBackdropClick(event)) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button aria-label="Close dialog" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SidebarDrawer({ open, onClose, children }) {
  const ref = useDialog(open, { lockScroll: true });
  return (
    <dialog
      className="sidebar-drawer"
      id="project-sidebar"
      aria-label="Project navigation"
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (isBackdropClick(event)) onClose();
      }}
    >
      <button
        className="drawer-close"
        aria-label="Close project menu"
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
      {children}
    </dialog>
  );
}
