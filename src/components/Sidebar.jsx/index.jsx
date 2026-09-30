import React from "react";
import "./sidebar.scss";
import { NavLink } from "react-router-dom";
import logo from "../../assets/images/logo.svg";

const Sidebar = ({ theme, setTheme }) => {
  const sidebarLinks = [
    { text: "Excel to JSON", path: "/exceltojson" },
    { text: "JSON to Excel", path: "/jsontoexcel" },
    { text: "JSON Formatter", path: "/jsonformatter" },
  ];
  return (
    <div className="sidebar-container">
      <div className="titlebar">
        <h1>
          <img
            src={logo}
            alt="Logo"
          />
        </h1>
      </div>
      <nav
        className="sidebar-link-container"
        aria-label="Main navigation"
      >
        {sidebarLinks?.map((link, index) => (
          <NavLink
            key={index}
            to={link.path}
          >
            {link.text}
          </NavLink>
        ))}
      </nav>
      <div
        className="sidebar-theme-switcher"
        aria-label="Page color theme"
      >
        <button
          type="button"
          className={theme === "light" ? "active" : ""}
          aria-pressed={theme === "light"}
          onClick={() => setTheme("light")}
        >
          <span aria-hidden="true">☼</span> Light
        </button>
        <button
          type="button"
          className={theme === "dark" ? "active" : ""}
          aria-pressed={theme === "dark"}
          onClick={() => setTheme("dark")}
        >
          <span aria-hidden="true">☾</span> Dark
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
