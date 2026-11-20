import { useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import "./assets/styles/main.scss";
import ExcelToJson from "./pages/excelPages/excelToJson/index.jsx";
import JSONToExcel from "./pages/excelPages/jsonToExcel/index.jsx";
import JSONFormatter from "./pages/JSONPages/jsonFormatter/index.jsx";
import JsonComparator from "./pages/JSONPages/jsonComparator/index.jsx";
import Home from "./pages/Home/Home.jsx";

function App() {
  const [theme, setTheme] = useState("dark");
  const { pathname } = useLocation();
  const pages = [
    {
      path: "/exceltojson",
      element: <ExcelToJson title="Excel to JSON Converter" />,
    },
    {
      path: "/jsontoexcel",
      element: <JSONToExcel title="JSON to Excel Converter" />,
    },
    {
      path: "/jsonformatter",
      element: <JSONFormatter title="JSON Formatter" />,
    },
    {
      path: "/jsoncomparator",
      element: <JsonComparator title="JSON Comparator" />,
    },
  ];

  if (pathname === "/") return <Home />;

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
