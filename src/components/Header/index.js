import React from "react";
import config from "../../config/index.json";
import useTheme from "../../hooks/useTheme";
import { Link } from "react-router-dom";

export function Header() {
  const { toggleTheme, secondary } = useTheme();
  const headerStyle = {
    backgroundColor: secondary,
    color: "white",
  };
  return (
    <div style={headerStyle}>
      <div className="py-4 px-4 flex flex-row justify-between max-w-5xl m-auto">
        <Link to={"/"}>{config.app.name}</Link>
        <div>
          {config.app.headerMenu.map((e) =>
            e.url.includes("https") ? (
              <a className="px-2 opacity-60 hover:opacity-100" href={e.url}>
                {e.name}
              </a>
            ) : (
              <Link className="px-2 opacity-60 hover:opacity-100" to={e.url}>
                {e.name}
              </Link>
            )
          )}
          <span
            className="px-2 cursor-pointer opacity-60 hover:opacity-100"
            onClick={toggleTheme}
          >
            Theme Switch
          </span>
        </div>
      </div>
    </div>
  );
}
