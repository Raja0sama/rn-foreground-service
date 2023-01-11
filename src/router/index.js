import React from "react";
import { createBrowserRouter, useLoaderData } from "react-router-dom";
import Home from "../pages/home";
import Documentation from "../pages/documentation";
import config from "../config/index.json";
import MarkdownPreview from "@uiw/react-markdown-preview";

const Element = (props) => {
  const data = useLoaderData();
  return (
    <div className={"flex-1 flex my-10"}>
      <MarkdownPreview
        source={data}
        style={{ background: "transparent" }}
        className={"mix-blend-difference"}
      />
    </div>
  );
};

const Components = {
  DOCUMENTATION: Documentation,
  DOCUMENTATION_CONTAINER: Element,
};
const generate_routes = (routes) => {
  return routes.map((route) => {
    const Component = Components[route.layout];
    const returnElement = {
      path: route.key,
      element: <Component redirect={[route.key, route?.redirect]} />,
    };

    if (route.children) {
      console.log({ d: route.redirect });
      returnElement.children = generate_routes(route.children);
    }
    if (route.content) {
      returnElement.loader = ({ request }) =>
        fetch(route.content, {
          signal: request.signal,
        });
    }
    return returnElement;
  });
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    loader: ({ request }) =>
      fetch(config.app.landingContent, {
        signal: request.signal,
      }),
  },
  ...generate_routes(config.routes),
]);
