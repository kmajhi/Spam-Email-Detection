import "../App.css";
import "./Contributors.css";

// To add a photo later: import the image at the top of this file
// (e.g. `import sujonPhoto from "../assets/sujon.jpg";`) and set it as
// that person's `photo` field below. Until then, initials are shown.
const CONTRIBUTORS = [
  { name: "MD. Sujon Mahamud", id: "223400039", role: "", photo: null },
  { name: "Sohanur Rahman Shuvo", id: "223400057", role: "", photo: null },
  { name: "Eshrat Jahan", id: "223400046", role: "", photo: null },
  { name: "Ananya Saha", id: "223400056", role: "", photo: null },
];

function initials(name) {
  const words = name
    .replace(/\./g, "")
    .split(" ")
    .filter((w) => w && !/^md$/i.test(w));
  const first = words[0]?.[0] ?? "";
  const last = words[words.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase();
}

export default function Contributors() {
  return (
    <div className="page">
      <header className="header">
        <div className="header__badge">AI Lab Project</div>
        <h1>Contributors</h1>
        <p className="header__desc">The team behind this project.</p>
      </header>

      <main className="contributors-grid">
        {CONTRIBUTORS.map((c) => (
          <div className="contributor-card" key={c.id}>
            {c.photo ? (
              <img src={c.photo} alt="" className="contributor-card__photo" />
            ) : (
              <div className="contributor-card__avatar" aria-hidden="true">
                {initials(c.name)}
              </div>
            )}
            <h3>{c.name}</h3>
            <p>ID: {c.id}</p>
            {c.role && <span className="contributor-card__role">{c.role}</span>}
          </div>
        ))}
      </main>
    </div>
  );
}
