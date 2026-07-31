import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";

import { getRouteTitle } from "./route-title";

export function RouteDocument() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = getRouteTitle(pathname);
  }, [pathname]);

  return <Outlet />;
}
