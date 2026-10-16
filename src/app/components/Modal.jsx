import { t } from "../i18n.js";
import React from "react";
import Icon from "./Icon.jsx";
import useDialog, { isBackdropClick } from "../hooks/useDialog.js";
export default function Modal({ title, onClose, children, busy = false }) {
  const ref = useDialog();
  return (
    <dialog
      className="workspace-modal"
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
        {busy && (
          <span className="modal-save-status" role="status">
            {t("Saving…")}
          </span>
        )}
        <button
          disabled={busy}
          aria-label={t("Close dialog")}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-scroll">{children}</div>
    </dialog>
  );
}
export function SidebarDrawer({ open, onClose, children, busy = false }) {
  const ref = useDialog(open);
  return (
    <dialog
      className="sidebar-drawer"
      id="project-sidebar"
      aria-label={t("Project navigation")}
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (!busy && isBackdropClick(event)) onClose();
      }}
    >
      <button
        className="drawer-close"
        disabled={busy}
        aria-label={t("Close project menu")}
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
      {busy && (
        <p className="save-feedback" role="status">
          {t("Saving…")}
        </p>
      )}
      {children}
    </dialog>
  );
}
