"use client";
import { useEffect, useState } from "react";

// Add window type definition for Google Translate
declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: any;
  }
}

export default function GoogleTranslate() {
  const [hasScript, setHasScript] = useState(false);

  useEffect(() => {
    // Prevent adding the script multiple times
    if (document.getElementById("google-translate-script")) {
      setHasScript(true);
      return;
    }

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          // Only requesting the 4 languages specified
          includedLanguages: "en,hi,mr,gu",
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    setHasScript(true);
  }, []);

  const changeLanguage = (lang: string) => {
    const select = document.querySelector(".goog-te-combo") as HTMLSelectElement;
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event("change"));
    }
  };

  // Hide the widget completely but keep it in the DOM so the API works
  return (
    <div style={{ position: "fixed", bottom: 20, left: 20, zIndex: 9999, display: "flex", alignItems: "center", gap: 8 }}>
      <select 
        onChange={(e) => changeLanguage(e.target.value)}
        style={{
          background: "rgba(10, 10, 26, 0.8)",
          color: "#fff",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          padding: "8px 12px",
          borderRadius: "8px",
          fontSize: "14px",
          backdropFilter: "blur(10px)",
          cursor: "pointer",
          outline: "none"
        }}
        defaultValue="en"
      >
        <option value="en">English</option>
        <option value="hi">हिंदी (Hindi)</option>
        <option value="mr">मराठी (Marathi)</option>
        <option value="gu">ગુજરાતી (Gujarati)</option>
      </select>

      {/* Hidden Google Translate Default UI */}
      <div id="google_translate_element" style={{ display: "none" }}></div>
    </div>
  );
}
