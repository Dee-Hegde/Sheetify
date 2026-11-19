import { useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
// import ExcelToJsonConverter from "./components/ExcelToJson";
import Sidebar from "./components/Sidebar.jsx";
import "./assets/styles/main.scss";
import ExcelToJson from "./pages/excelToJson/index.jsx";
import JSONToExcel from "./pages/jsonToExcel/index.jsx";
import JSONFormatter from "./pages/jsonFormatter/index.jsx";
import JsonComparator from "./pages/jsonComparator/index.jsx";
import Home from "./pages/Home/Home.jsx";

function App() {
  const [theme, setTheme] = useState("dark");
  const { pathname } = useLocation();
  const pages = [
    // { path: "/exceltojson", element: <ExcelToJsonConverter /> },
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
