"use client"
import React from "react"
import { motion } from "framer-motion"

export interface AuroraBackgroundProps {
  /** Extra wrapper classes */
  className?: string
  /** Content to render on top of the background */
  children?: React.ReactNode
  /** Number of “star” points */
  starCount?: number
  /** Two CSS-variable backed colors for the radial overlays */
  gradientColors?: [string, string]
  /** Pulse animation duration in seconds */
  pulseDuration?: number
  /** ARIA label for the animated background */
  ariaLabel?: string
  /** Inline style overrides */
  style?: React.CSSProperties
}

const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  className = "",
  children,
  starCount = 50,
  gradientColors = [
    "var(--aurora-color1, rgba(168,85,247,0.18))",
    "var(--aurora-color2, rgba(79,70,229,0.18))",
  ],
  pulseDuration = 10,
  ariaLabel = "Animated aurora background",
  style = {},
}) => {
  const [colorA, colorB] = gradientColors
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Background layers (hidden from screen readers) */}
      <div 
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
        }}
      >
        {/* Pulsing radial gradients */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.65,
            backgroundImage: `
              radial-gradient(circle, ${colorA} 0%, transparent 80%),
              radial-gradient(circle, ${colorB} 0%, transparent 80%)
            `,
            backgroundSize: "100% 100%",
            animation: `pulse ${pulseDuration}s infinite`,
          }}
        />

        {/* Blurred color blobs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            mixBlendMode: "screen",
          }}
        >
          {/* Purple Blob */}
          <motion.div
            animate={{
              x: [-40, 40, -40],
              y: [-15, 15, -15],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              top: "-20%",
              left: "-20%",
              width: "55vw",
              height: "55vh",
              backgroundColor: "rgba(147, 51, 234, 0.45)", // purple-600
              borderRadius: "50%",
              filter: "blur(90px)",
            }}
          />

          {/* Fuchsia Blob */}
          <motion.div
            animate={{
              x: [40, -40, 40],
              y: [15, -15, 15],
              scale: [1, 1.25, 1],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              bottom: "-20%",
              right: "-20%",
              width: "55vw",
              height: "55vh",
              backgroundColor: "rgba(217, 70, 239, 0.45)", // fuchsia-600
              borderRadius: "50%",
              filter: "blur(90px)",
            }}
          />

          {/* Indigo Blob */}
          <motion.div
            animate={{
              x: [15, -15, 15],
              y: [-25, 25, -25],
              rotate: [0, 360],
            }}
            transition={{
              duration: 35,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              position: "absolute",
              top: "25%",
              left: "25%",
              width: "35vw",
              height: "35vh",
              backgroundColor: "rgba(67, 56, 202, 0.35)", // indigo-700
              borderRadius: "50%",
              filter: "blur(90px)",
            }}
          />
        </motion.div>

        {/* Twinkling stars */}
        {mounted && Array.from({ length: starCount }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: `${Math.random() * 100}vw`,
              y: `${Math.random() * 100}vh`,
              opacity: 0,
            }}
            animate={{
              opacity: [0, Math.random() * 0.95, 0],
            }}
            transition={{
              duration: Math.random() * 4 + 2,
              repeat: Infinity,
              delay: Math.random() * 6,
            }}
            style={{
              position: "absolute",
              width: "2px",
              height: "2px",
              backgroundColor: "#ffffff",
              borderRadius: "50%",
              boxShadow: "0 0 4px rgba(255, 255, 255, 0.8)",
            }}
          />
        ))}
      </div>

      {/* Foreground content */}
      <div 
        style={{
          position: "relative",
          zIndex: 10,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default AuroraBackground
