import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import React, { useEffect } from "react";

import { Header } from "../../components/Header";
import config from "../../config/index.json";
import useTheme from "../../hooks/useTheme";

const Documentation = (props) => {
  const location = useLocation();
  const theme = useTheme();
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-color-mode",
      theme != "light" ? "dark" : "light"
    );
  }, [theme.theme]);
  const mainContainerStyles = {
    backgroundColor: theme.body[theme.theme],
    color: theme.theme === "light" ? "#000" : "#fff",
  };

  if (location.pathname === props?.redirect[0]) {
    return <Navigate to={props?.redirect[1]} />;
  }
  return (
    <div
      style={mainContainerStyles}
      className="flex flex-col  flex-1 w-screen h-screen "
    >
      <Header />
      <div className="flex max-w-7xl mx-auto w-full mt-2 overflow-hidden">
        <div className="w-52 overflow-auto">
          <div className="h-5"></div>
          <div>
            <RenderRoutes routes={config.routes} />
          </div>
        </div>
        <div className="overflow-auto flex-1 flex overflow-auto my-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const RenderRoutes = ({ routes, path }) => {
  const location = useLocation();
  return routes.map((route) => {
    const returnElement = {
      path: route.key,
      name: route.name,
    };

    if (route.children) {
      return (
        <>
          <div className="text-lg pt-2">
            <a>{returnElement.name}</a>
          </div>
          <RenderRoutes path={returnElement.path} routes={route.children} />
        </>
      );
    }

    const isActive = location.pathname.includes(returnElement.path);
    const style = { opacity: isActive && 100 };
    return (
      <div className="p-2 text-sm opacity-60 hover:opacity-100" style={style}>
        <Link to={`${path}/${returnElement.path}`}>{returnElement.name}</Link>
      </div>
    );
  });
};
export default Documentation;
