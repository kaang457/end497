import React, { createContext, useState, useContext } from "react";
import { AppTheme } from "../constants/theme";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true); // Varsayılan olarak Dark Mode başlar

  const toggleTheme = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  // Aktif temaya göre renk paletini seç
  const colors = isDarkMode ? AppTheme.colors.dark : AppTheme.colors.light;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
