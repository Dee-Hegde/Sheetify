import React from "react";
import "./sidebar.css";
import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.svg";

const Sidebar = () => {
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
      <div className="sidebar-link-container">
        {sidebarLinks?.map((link, index) => (
          <Link key={index} to={link.path}>
            {link.text}
          </Link>
        ))}   
      </div>
    </div>
  );
};

export default Sidebar;
