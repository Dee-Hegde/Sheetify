import React from "react";
import "./sidebar.css";
import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="sidebar-container">
      <div className="titlebar">
        <h1>Sheetify</h1>
      </div>
      <div className="sidebar-link-container">
        <Link to="/">Excel to JSON</Link>
        <Link to="/jsontoexcel">JSON to Excel</Link>
      </div>
    </div>
  );
};

export default Sidebar;
