import { useEffect, useState } from "react";
import { today } from "../model.js";
export default function useDay() {
  const [day, setDay] = useState(today);
  useEffect(() => {
    const timer = setInterval(() => setDay(today()), 1000);
    return () => clearInterval(timer);
  }, []);
  return day;
}
