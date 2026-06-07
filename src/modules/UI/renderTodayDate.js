import { format } from "date-fns";

export const renderTodayDate = () => {

  function updateDate() {
    const date = document.querySelector(".date");
    date.textContent = format(new Date(), "dd MMMM yyyy | eeee h:mm bbb");
  }

  setInterval(updateDate, 1000)

  updateDate();
};
