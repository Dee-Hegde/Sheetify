import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import ExcelToJsonConverter from "./components/ExcelToJson";
import Sidebar from "./components/Sidebar.jsx";
import JSONToExcel from "./components/JsonToExcel/index.jsx";
import JSONFormatter from "./components/JSONFormatter/index.jsx";
import "./assets/styles/main.scss";

function App() {
  const [theme, setTheme] = useState("dark");
  const pages = [
    { path: "/exceltojson", element: <ExcelToJsonConverter /> },
    { path: "/jsontoexcel", element: <JSONToExcel /> },
    { path: "/jsonformatter", element: <JSONFormatter /> },
  ];
  return (
    <div className={`app-container theme-${theme}`}>
      <Sidebar
        theme={theme}
        setTheme={setTheme}
      />
      <div className="page-container">
        {
          <Routes>
            {pages?.map((page, index) => (
              <Route
                key={index}
                path={page?.path}
                element={page?.element}
              />
            ))}
          </Routes>
        }
      </div>
    </div>
  );
}

export default App;
