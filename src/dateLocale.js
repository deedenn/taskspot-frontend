import dayjs from "dayjs";
import "dayjs/locale/ru";
import updateLocale from "dayjs/plugin/updateLocale";
dayjs.extend(updateLocale);
dayjs.updateLocale("ru", { weekStart: 1 });
dayjs.locale("ru");
