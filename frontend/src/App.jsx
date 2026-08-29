import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Detector from "./pages/Detector";
import HowItsBuilt, { SECTION_IDS } from "./pages/HowItsBuilt";

function isHowItsBuiltHash(hash) {
  return hash === "how-its-built" || SECTION_IDS.includes(hash) || hash.startsWith("ref-");
}

function routeFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return isHowItsBuiltHash(hash) ? "how-its-built" : "detector";
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.replace(/^#\/?/, "");
      setRoute(isHowItsBuiltHash(hash) ? "how-its-built" : "detector");
      // Only reset scroll on an actual page change -- a section/reference
      // hash within How It's Built is handled by that page's own scrolling.
      if (hash === "" || hash === "how-its-built") {
        window.scrollTo({ top: 0 });
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <>
      <Navbar route={route} />
      {route === "how-its-built" ? <HowItsBuilt /> : <Detector />}
    </>
  );
}
