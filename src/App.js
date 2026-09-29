import { Route, Routes } from "react-router-dom";
import ExcelToJsonConverter from "./components/ExcelToJson";
import Sidebar from "./components/Sidebar.jsx";
import "./App.css";
import JSONToExcel from "./components/JsonToExcel/index.jsx";
import JSONFormatter from "./components/JSONFormatter/index.jsx";

function App() {
  const pages = [
    { path: "/exceltojson", element: <ExcelToJsonConverter /> },
    { path: "/jsontoexcel", element: <JSONToExcel /> },
    { path: "/jsonformatter", element: <JSONFormatter /> }
  ];
  return (
    <div className="app-container">
      <Sidebar />
      <div className="page-container">
        {
          <Routes>
           {pages?.map((page, index) => (
              <Route key={index} path={page?.path} element={page?.element} />
            ))}
          </Routes>
        }
      </div>
    </div>
  );
}

export default App;
