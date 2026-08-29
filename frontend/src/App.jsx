import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Detector from "./pages/Detector";
import HowItsBuilt, { SECTION_IDS } from "./pages/HowItsBuilt";
import Contributors from "./pages/Contributors";

function isHowItsBuiltHash(hash) {
  return hash === "how-its-built" || SECTION_IDS.includes(hash) || hash.startsWith("ref-");
}

function routeFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (isHowItsBuiltHash(hash)) return "how-its-built";
  if (hash === "contributors") return "contributors";
  return "detector";
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.replace(/^#\/?/, "");
      setRoute(routeFromHash());
      // Only reset scroll on an actual page change -- a section/reference
      // hash within How It's Built is handled by that page's own scrolling.
      if (hash === "" || hash === "how-its-built" || hash === "contributors") {
        window.scrollTo({ top: 0 });
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <>
      <Navbar route={route} />
      {route === "how-its-built" && <HowItsBuilt />}
      {route === "contributors" && <Contributors />}
      {route === "detector" && <Detector />}
    </>
  );
}
