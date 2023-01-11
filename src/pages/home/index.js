import React from "react";
import useTheme from "../../hooks/useTheme";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { useLoaderData } from "react-router-dom";
import { Header } from "../../components/Header";
const Home = () => {
  const data = useLoaderData();
  const theme = useTheme();
  const mainContainerStyles = {
    backgroundColor: theme.body[theme.theme],
    color: theme.theme === "light" ? "#000" : "#fff",
  };
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
