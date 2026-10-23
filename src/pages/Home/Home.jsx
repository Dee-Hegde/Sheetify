import { useState } from "react";
import { Link } from "react-router-dom";
import "./Home.scss";

const iconShapes = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7z" />,
  check: <path d="m5 12 5 5L20 6" />,
  code: <path d="M8 5 3 12l5 7m8-14 5 7-5 7m-3-16-2 18" />,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8m-8 4h8" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  moon: <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />,
  phone: <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></>,
  sheet: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  swap: <path d="M7 4v14m-4-4 4 4 4-4m6 6V6m-4 4 4-4 4 4" />,
  upload: <path d="M12 16V4m-5 5 5-5 5 5M4 20h16" />,
};

const features = [
  {
    icon: "bolt",
    title: "Instant conversion",
    text: "Results appear as you type or drop a file. No waiting, no queue, no sign-up.",
  },
  {
    icon: "lock",
    title: "Private by design",
    text: "Conversion runs in your browser, so your spreadsheets stay on your device.",
  },
  {
    icon: "upload",
    title: "Drag and drop",
    text: "Drop a CSV or Excel file anywhere on the page, or tap to browse on your phone.",
  },
  {
    icon: "sheet",
    title: "Live spreadsheet preview",
    text: "See rows, columns, and sheet tabs before you export, so nothing surprises you.",
  },
  {
    icon: "code",
    title: "Clean, validated JSON",
    text: "Format, minify, and spot syntax errors with line and column details.",
  },
  {
    icon: "phone",
    title: "Light, dark, and mobile",
    text: "A layout that adapts from desktop to phone, in light or dark mode.",
  },
];

const steps = [
  ["Drop in your data", "Upload a CSV or Excel file, or paste JSON. Multi-sheet workbooks get a sheet picker."],
  ["Preview and tweak", "Check the spreadsheet grid, choose your indent, and fix any highlighted JSON errors."],
  ["Copy or download", "Copy the JSON in one click, or download a ready-to-open Excel file."],
];

const tools = [
  {
    icon: "sheet",
    title: "Excel to JSON",
    text: "Turn any sheet into an array of objects.",
    href: "/exceltojson",
    details: ["XLSX, XLS, and CSV", "Pick the sheet to convert", "Copy or download JSON"],
  },
  {
    icon: "code",
    title: "JSON to Excel",
    text: "Paste JSON, check the grid, export a workbook.",
    href: "/jsontoexcel",
    details: ["Arrays of objects or rows", "Live spreadsheet preview", "Download an XLSX file"],
  },
  {
    icon: "file",
    title: "JSON Formatter",
    text: "Make messy JSON readable, or compact.",
    href: "/jsonformatter",
    details: ["Validate with line details", "Format or minify in one click", "Upload a file or paste text"],
  },
];

const questions = [
  ["Is my data uploaded anywhere?", "Conversion runs in your browser, so your files stay on your device."],
  ["Which file types can I convert?", "Excel (.xlsx, .xls) and CSV files can be converted to JSON. JSON can be exported to .xlsx."],
  ["What if my workbook has several sheets?", "Choose a sheet from the selector and the preview and JSON update straight away."],
  ["Can I use it on my phone?", "Yes. The layout adapts to phones and tablets, with touch-friendly controls."],
  ["How are nested objects handled in Excel?", "Nested objects and arrays are written into the cell as JSON text, so no data is lost."],
];

function Icon({ name, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconShapes[name]}
    </svg>
  );
}

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem("sheetify-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function AppLink({ href, children, className, ...props }) {
  return <Link className={className} to={href} {...props}>{children}</Link>;
}

export default function Home() {
  const [theme, setTheme] = useState(getInitialTheme);

  function toggleTheme() {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem("sheetify-theme", nextTheme);
      } catch {
        // The page still works when browser storage is unavailable.
      }
      return nextTheme;
    });
  }

  return (
    <div className={`home-page theme-${theme}`}>
      <div className="home-width">
        <header className="home-header">
          <AppLink className="home-logo" href="/" aria-label="Sheetify home">
            <span className="logo-mark"><Icon name="code" /></span>
            <span>Sheetify<span className="logo-period"></span></span>
          </AppLink>
          <nav className="home-nav" aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#tools">Tools</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="header-actions">
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <AppLink className="button button-primary header-cta" href="/exceltojson">Open app</AppLink>
          </div>
        </header>

        <main>
          <section className="home-hero">
            <div className="hero-copy">
              <div className="privacy-label"><Icon name="check" />Runs in your browser</div>
              <h1>Excel to JSON, JSON to Excel. <span>Done in seconds.</span></h1>
              <p className="hero-lead">Stop copy-pasting between spreadsheets and code. Drop in a file, preview it, and get clean JSON or a ready-to-use Excel file. Right in your browser.</p>
              <div className="hero-actions">
                <AppLink className="button button-primary" href="/exceltojson">Open the app <Icon name="arrow" /></AppLink>
                <AppLink className="button button-secondary" href="/jsonformatter">Try JSON Formatter</AppLink>
              </div>
              <div className="hero-facts">
                {["XLSX, XLS, and CSV", "Drag and drop", "Light and dark mode"].map((fact) => (
                  <span key={fact}><Icon name="check" />{fact}</span>
                ))}
              </div>
            </div>

            <div className="conversion-demo" aria-label="Example of a spreadsheet converted to JSON">
              <div className="demo-window spreadsheet-window">
                <div className="window-heading"><span className="window-dots"><i /><i /><i /></span>team.xlsx<span className="window-meta">Sheet1</span></div>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>#</th><th>id</th><th>name</th><th>team</th><th>city</th></tr></thead>
                    <tbody>
                      <tr><td>2</td><td>1</td><td>Asha Rao</td><td>Design</td><td>Mysore</td></tr>
                      <tr><td>3</td><td>2</td><td>Vikram Shah</td><td>Engineering</td><td>Bengaluru</td></tr>
                      <tr><td>4</td><td>3</td><td>Meera Iyer</td><td>Product</td><td>Chennai</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="conversion-arrow"><Icon name="swap" /></div>
              <div className="demo-window json-window">
                <div className="window-heading"><span className="window-dots"><i /><i /><i /></span>team.json<span className="window-meta">JSON</span></div>
                <pre><code><span className="json-punc">[</span>{"\n"}  <span className="json-punc">{"{"}</span> <span className="json-key">"id"</span><span className="json-punc">:</span> <span className="json-number">1</span><span className="json-punc">,</span> <span className="json-key">"name"</span><span className="json-punc">:</span> <span className="json-string">"Asha Rao"</span><span className="json-punc">,</span>{"\n"}    <span className="json-key">"team"</span><span className="json-punc">:</span> <span className="json-string">"Design"</span><span className="json-punc">,</span> <span className="json-key">"active"</span><span className="json-punc">:</span> <span className="json-bool">true</span> <span className="json-punc">{"}"}</span><span className="json-punc">,</span>{"\n"}  <span className="json-punc">{"{"}</span> <span className="json-key">"id"</span><span className="json-punc">:</span> <span className="json-number">2</span><span className="json-punc">,</span> <span className="json-key">"name"</span><span className="json-punc">:</span> <span className="json-string">"Vikram Shah"</span> <span className="json-punc">{"}"}</span>{"\n"}<span className="json-punc">]</span></code></pre>
              </div>
            </div>
          </section>

          <div className="format-list" aria-label="Supported formats">
            <span>Works with</span>
            {[".xlsx", ".xls", ".csv", ".json"].map((format) => <span className="format-chip" key={format}>{format}</span>)}
          </div>

          <section className="home-section" id="features">
            <p className="eyebrow">Features</p>
            <h2>Everything you need to move data between sheets and code</h2>
            <p className="section-intro">Small, fast tools that do one job well.</p>
            <div className="feature-grid">
              {features.map((feature) => (
                <article className="feature-item" key={feature.title}>
                  <span className="feature-icon"><Icon name={feature.icon} /></span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="home-section" id="how">
            <p className="eyebrow">How it works</p>
            <h2>From file to result in three steps</h2>
            <div className="steps-grid">
              {steps.map(([title, text], index) => (
                <article className="step-item" key={title}>
                  <span className="step-number">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="home-section" id="tools">
            <p className="eyebrow">The tools</p>
            <h2>Three tools, one clean workspace</h2>
            <p className="section-intro">Jump straight into the one you need. They share the same simple interface.</p>
            <div className="tool-grid">
              {tools.map((tool) => (
                <AppLink className="tool-item" href={tool.href} key={tool.title}>
                  <span className="feature-icon"><Icon name={tool.icon} /></span>
                  <h3>{tool.title}</h3>
                  <p>{tool.text}</p>
                  <ul>{tool.details.map((detail) => <li key={detail}><Icon name="check" />{detail}</li>)}</ul>
                  <span className="tool-link">Open tool <Icon name="arrow" /></span>
                </AppLink>
              ))}
            </div>
          </section>

          <section className="home-section faq-section" id="faq">
            <p className="eyebrow">FAQ</p>
            <h2>Questions, answered</h2>
            <div className="faq-list">
              {questions.map(([question, answer]) => (
                <details className="faq-item" key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="closing-band">
            <h2>Ready to convert your first file?</h2>
            <p>Open Sheetify and turn a spreadsheet into JSON, or JSON into a spreadsheet, in a few seconds.</p>
            <div className="hero-actions">
              <AppLink className="button button-primary" href="/exceltojson">Open the app <Icon name="arrow" /></AppLink>
              <a className="button button-on-dark" href="#tools">Explore the tools</a>
            </div>
          </section>
        </main>

        <footer className="home-footer">
          <span>(c) 2026 Sheetify. All rights reserved.</span>
          <nav aria-label="Footer">
            <AppLink href="/exceltojson">Excel to JSON</AppLink>
            <AppLink href="/jsontoexcel">JSON to Excel</AppLink>
            <AppLink href="/jsonformatter">JSON Formatter</AppLink>
          </nav>
        </footer>
      </div>
    </div>
  );
}