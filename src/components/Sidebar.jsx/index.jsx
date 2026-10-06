import React from "react";
import "./sidebar.scss";
import { NavLink } from "react-router-dom";
import logo from "../../assets/images/logo.svg";
import { appIcons } from "../../assets/images/Icons/appIcons";

const Sidebar = ({ theme, setTheme }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const mobileSidebarRef = React.useRef(null);
  const handleSidebar = () => {
    setIsSidebarOpen((isOpen) => !isOpen);
  };

  const sidebarLinks = [
    { text: "Excel to JSON", path: "/exceltojson" },
    { text: "JSON to Excel", path: "/jsontoexcel" },
    { text: "JSON Formatter", path: "/jsonformatter" },
  ];
  return (
    <>
      <div className="sidebar-container">
        <div className="titlebar">
          <img
            src={logo}
            alt="Logo"
          />
        </div>
        <div
          className="sidebar-link-container"
          aria-label="Main navigation"
        >
          {sidebarLinks?.map((link, index) => (
            <NavLink
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
              key={index}
              to={link.path}
            >
              {link.text}
            </NavLink>
          ))}
        </div>
        <div
          className="sidebar-theme-switcher"
          aria-label="Page color theme"
        >
          <div className="notice-container">
            <h5>Runs in your browser</h5>
            <p>Your files are never uploaded to a server.</p>
          </div>
          <div className="theme-switch-container">
            <button
              type="button"
              className={theme === "light" ? "active" : ""}
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
            >
              {appIcons.light && <appIcons.light className="theme-icon" />}
              Light
            </button>
            <button
              type="button"
              className={theme === "dark" ? "active" : ""}
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
            >
              {appIcons.dark && <appIcons.dark className="theme-icon" />}
              Dark
            </button>
          </div>
        </div>
      </div>
      <div className="sidebar-mobile-container">
        <div className="titlebar">
          <img
            src={logo}
            alt="Logo"
          />
          <div
            className="menu-icon-container"
            onClick={handleSidebar}
          >
            {appIcons.menu && <appIcons.menu className="sidebar-link-icon" />}
          </div>
          <div
            onClick={handleSidebar}
            className={`menu-screen-wrapper${isSidebarOpen ? " open" : ""}`}
          >
            <div
              className="menu-screen"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="logo-container">
                <img
                  src={logo}
                  alt="Logo"
                />
                <div className="close-icon-container">
                  {appIcons.close && (
                    <appIcons.close
                      className="close-icon"
                      onClick={() => setIsSidebarOpen(false)}
                    />
                  )}
                </div>
              </div>
              <div className="menu-link-wrapper">
                <div className="sidebar-link-container">
                  {sidebarLinks?.map((link, index) => (
                    <NavLink
                      className={({ isActive }) =>
                        `sidebar-link${isActive ? " active" : ""}`
                      }
                      key={index}
                      to={link.path}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      {link.text}
                    </NavLink>
                  ))}
                </div>
                <div
                  className="sidebar-theme-switcher"
                  aria-label="Page color theme"
                >
                  <div className="notice-container">
                    <h5>Runs in your browser</h5>
                    <p>Your files are never uploaded to a server.</p>
                  </div>
                  <div className="theme-switch-container">
                    <button
                      type="button"
                      className={theme === "light" ? "active" : ""}
                      aria-pressed={theme === "light"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTheme("light");
                      }}
                    >
                      {appIcons.light && (
                        <appIcons.light className="theme-icon" />
                      )}
                      Light
                    </button>
                    <button
                      type="button"
                      className={theme === "dark" ? "active" : ""}
                      aria-pressed={theme === "dark"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTheme("dark");
                      }}
                    >
                      {appIcons.dark && (
                        <appIcons.dark className="theme-icon" />
                      )}
                      Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
