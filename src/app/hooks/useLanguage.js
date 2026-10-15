import { useEffect, useSyncExternalStore } from "react";
import { getLanguage, setLanguage, subscribeLanguage } from "../i18n.js";
export default function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage);
  useEffect(() => {
    setLanguage(language);
  }, [language]);
  return language;
}
