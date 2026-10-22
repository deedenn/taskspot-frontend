import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { buildAnalyticsUrl, trackYandexPageView } from "./yandexMetrika.js";

export function YandexMetrikaRouteTracker() {
  const location = useLocation();
  const { pathname, search } = location;
  const previousUrlRef = useRef("");
  const previousLocationRef = useRef("");

  useEffect(() => {
    const locationKey = `${pathname}${search}`;
    if (previousLocationRef.current === locationKey) return;

    const currentUrl = buildAnalyticsUrl({ pathname, search });
    trackYandexPageView(currentUrl, {
      referer: previousUrlRef.current || document.referrer
    });
    previousUrlRef.current = currentUrl;
    previousLocationRef.current = locationKey;
  }, [pathname, search]);

  return null;
}
