import { format } from "date-fns";

export const renderTodayDate = () => {

  function updateDate() {
    const date = document.querySelector(".date");
    const now = new Date();
    date.replaceChildren();

    const day = document.createElement("span");
    day.classList.add("date__day");
    day.textContent = format(now, "EEEE, MMM d");

    const time = document.createElement("span");
    time.classList.add("date__time");
    time.textContent = format(now, "h:mm a");

    date.append(day, time);
  }

  setInterval(updateDate, 1000);

  updateDate();
};
