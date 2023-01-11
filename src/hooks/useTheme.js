import React, { createContext, useContext, useState } from "react";
import config from "../config/index.json";
export const Context = createContext();
export const ThemeProvider = ({ children, ...props }) => {
  const [value, setValue] = useState(props.value);
  console.log({ value });
  return (
    <Context.Provider
      value={{
        value,
        toggleTheme: () =>
          value === "light" ? setValue("dark") : setValue("light"),
      }}
    >
      {children}
    </Context.Provider>
  );
};

const useTheme = () => {
  const { value, toggleTheme } = useContext(Context);
  const theme = { ...config.app.theme, theme: value, toggleTheme };
  return theme;
};

export default useTheme;
