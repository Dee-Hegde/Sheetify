import { Route, Routes } from "react-router-dom";
import ExcelToJsonConverter from "./components/ExcelToJson";
import Sidebar from "./components/Sidebar.jsx";
import "./App.css";
import JSONToExcel from "./components/JsonToExcel/index.jsx";

function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="page-container">
        {
          <Routes>
            <Route
              path="/"
              element={<ExcelToJsonConverter />}
            />
            <Route
              path="/jsontoexcel"
              element={<JSONToExcel />}
            />
          </Routes>
        }
      </div>
    </div>
  );
}

export default App;
