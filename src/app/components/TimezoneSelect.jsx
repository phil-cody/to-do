import { getLanguage, t } from "../i18n.js";
import React, { useId, useMemo } from "react";

const cities = {
  UTC: "Всемирное время",
  "Europe/Kaliningrad": "Калининград",
  "Europe/Moscow": "Москва",
  "Europe/Samara": "Самара",
  "Asia/Yekaterinburg": "Екатеринбург",
  "Asia/Omsk": "Омск",
  "Asia/Novosibirsk": "Новосибирск",
  "Asia/Krasnoyarsk": "Красноярск",
  "Asia/Irkutsk": "Иркутск",
  "Asia/Yakutsk": "Якутск",
  "Asia/Vladivostok": "Владивосток",
  "Asia/Magadan": "Магадан",
  "Asia/Kamchatka": "Камчатка",
  "Europe/Minsk": "Минск",
  "Europe/Kyiv": "Киев",
  "Europe/London": "Лондон",
  "Europe/Berlin": "Берлин",
  "Europe/Paris": "Париж",
  "Europe/Istanbul": "Стамбул",
  "Asia/Tbilisi": "Тбилиси",
  "Asia/Yerevan": "Ереван",
  "Asia/Almaty": "Алматы",
  "Asia/Tashkent": "Ташкент",
  "Asia/Dubai": "Дубай",
  "Asia/Kolkata": "Дели",
  "Asia/Kathmandu": "Катманду",
  "Asia/Bangkok": "Бангкок",
  "Asia/Ho_Chi_Minh": "Хошимин, Вьетнам",
  "Asia/Singapore": "Сингапур",
  "Asia/Shanghai": "Пекин, Шанхай",
  "Asia/Tokyo": "Токио",
  "Asia/Seoul": "Сеул",
  "Australia/Sydney": "Сидней",
  "Pacific/Auckland": "Окленд",
  "America/New_York": "Нью-Йорк",
  "America/Chicago": "Чикаго",
  "America/Denver": "Денвер",
  "America/Los_Angeles": "Лос-Анджелес",
  "America/Sao_Paulo": "Сан-Паулу",
  "Africa/Cairo": "Каир",
  "Africa/Johannesburg": "Йоханнесбург",
};

const aliases = {
  "Europe/Kiev": "Europe/Kyiv",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
};
const canonical = (zone) => aliases[zone] || zone;

function label(zone, now) {
  const offset = new Intl.DateTimeFormat("en", {
    timeZone: zone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName").value;
  const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const utc = match
    ? `UTC${match[1]}${match[2].padStart(2, "0")}:${match[3] || "00"}`
    : "UTC+00:00";
  const city =
    (cities[canonical(zone)] && t(cities[canonical(zone)])) ||
    (getLanguage() === "ru"
      ? new Intl.DateTimeFormat("ru", { timeZone: zone, timeZoneName: "long" })
          .formatToParts(now)
          .find((part) => part.type === "timeZoneName").value
      : zone.replaceAll("_", " ").split("/").reverse().join(" · "));
  return `${city} (${utc})`;
}

export default function TimezoneSelect({ value, onChange, disabled }) {
  const hintId = useId();
  const groups = useMemo(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const seen = new Set();
    const suggested = [value, local, ...Object.keys(cities)].filter((zone) => {
      const key = canonical(zone);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const all = Intl.supportedValuesOf?.("timeZone") || [];
    const now = new Date();
    return {
      suggested: suggested.map((zone) => ({
        zone,
        label:
          label(zone, now) +
          (canonical(zone) === canonical(local) ? t(" — on this device") : ""),
      })),
      other: all
        .filter((zone) => !seen.has(canonical(zone)))
        .map((zone) => ({ zone, label: label(zone, now) }))
        .sort((a, b) => a.label.localeCompare(b.label, getLanguage())),
    };
  }, [value, getLanguage()]);
  return (
    <label className="select-field">
      {t("Time zone")}
      <select
        aria-label={t("Time zone")}
        aria-describedby={hintId}
        required
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <optgroup label={t("Your choice and popular cities")}>
          {groups.suggested.map(({ zone, label }) => (
            <option key={zone} value={zone}>
              {label}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("Other cities and regions")}>
          {groups.other.map(({ zone, label }) => (
            <option key={zone} value={zone}>
              {label}
            </option>
          ))}
        </optgroup>
      </select>
      <small id={hintId}>
        {t(
          "Delivery uses the selected city's local time. Daylight saving time is applied automatically.",
        )}
      </small>
    </label>
  );
}
