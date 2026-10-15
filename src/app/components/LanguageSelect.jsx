import React from "react";
import { getLanguage, t } from "../i18n.js";
export default function LanguageSelect({ disabled, onChange }) {
  return (
    <label className="select-field">
      {t("Language")}
      <select
        aria-label={t("Language")}
        value={getLanguage()}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="en">{t("English")}</option>
        <option value="ru">{t("Russian")}</option>
      </select>
    </label>
  );
}
