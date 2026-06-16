"use client";

import { useState, useEffect } from "react";
import { Warp } from "@paper-design/shaders-react";

export default function BackgroundPaths() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // 1. Initial theme detection
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    setTheme(isLight ? "light" : "dark");

    // 2. Observe changes to the 'data-theme' attribute dynamically
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          const currentTheme = document.documentElement.getAttribute("data-theme");
          setTheme(currentTheme === "light" ? "light" : "dark");
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  // Saturated, rich, vibrant colors for both modes so they stand out stunningly!
  const darkColors = [
    "hsl(203, 100%, 62%)", // Vivid Blue
    "hsl(255, 100%, 72%)", // Glowing Indigo
    "hsl(158, 99%, 59%)",  // Electric Mint
    "hsl(264, 100%, 61%)", // Deep Violet
  ];

  const lightColors = [
    "hsl(215, 100%, 60%)", // Vibrant Apple Blue
    "hsl(335, 100%, 65%)", // Vibrant Hot Pink
    "hsl(165, 95%, 55%)",  // Vibrant Teal Green
    "hsl(270, 95%, 63%)",  // Rich Purple
  ];

  return (
    <div 
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <Warp
        style={{ 
          width: "100%", 
          height: "100%", 
          opacity: theme === "light" ? 0.75 : 0.85, // Much higher opacity to be fully visible and rich!
          transition: "all 0.5s ease",
        }}
        proportion={0.45}
        softness={0.9} // Slightly reduced softness for clearer boundaries
        distortion={0.3} // Slightly more distortion for a more dramatic liquid look
        swirl={0.8}
        swirlIterations={10}
        shape="checks"
        shapeScale={0.12}
        scale={1.0}
        rotation={0}
        speed={theme === "light" ? 0.6 : 0.8} // Dynamic, fluid, and lively speed
        colors={theme === "light" ? lightColors : darkColors}
      />

      {/* Soft overlay vignette with light opacity to preserve maximum brightness of the background shader */}
      <div 
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          pointerEvents: "none",
          transition: "background 0.5s ease",
          background: theme === "light"
            ? "radial-gradient(circle at center, transparent 30%, rgba(242, 242, 247, 0.15) 100%)"
            : "radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.35) 100%)",
        }}
      />
    </div>
  );
}
