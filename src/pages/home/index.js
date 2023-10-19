import React, { useEffect } from "react";

import { Header } from "../../components/Header";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { useLoaderData } from "react-router-dom";
import useTheme from "../../hooks/useTheme";

const Home = () => {
  const data = useLoaderData();
  const theme = useTheme();
  const mainContainerStyles = {
    backgroundColor: theme.body[theme.theme],
    color: theme.theme === "light" ? "#000" : "#fff",
  };

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-color-mode",
      theme != "light" ? "dark" : "light"
    );
  }, [theme.theme]);
  return (
    <div
      style={mainContainerStyles}
      className="flex flex-col  flex-1 w-screen h-screen "
    >
      <Header />
      <div className="max-w-5xl mx-auto w-full mt-2 overflow-hidden mt-[10%]">
        <MarkdownPreview
          source={data}
          style={{ background: "transparent" }}
          className={"mix-blend-difference"}
        />
      </div>
    </div>
  );
};

export default Home;
