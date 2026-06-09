// src/components/ParticleCanvas.jsx
import { useEffect, useRef } from "react";

export default function ParticleCanvas({ theme }) {
  const canvasRef = useRef(null);
  const animRef = useRef(0);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    
    const particleCount = window.innerWidth < 768 ? 25 : 60;
    
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5, speedX: (Math.random() - 0.5) * 0.8,
      speedY: (Math.random() - 0.5) * 0.8, opacity: Math.random() * 0.5 + 0.2,
    }));

    const animate = () => {
      const color = theme === "dark" ? "#00d4ff" : "#0066cc";
      const bg = theme === "dark" ? "rgba(14,14,26,0.08)" : "rgba(255,255,255,0.05)";
      ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach((p) => {
        p.x += p.speedX; p.y += p.speedY;
        if (p.x > canvas.width) p.x = 0; if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0; if (p.y < 0) p.y = canvas.height;
        ctx.globalAlpha = p.opacity; ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });

      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const dx = particlesRef.current[i].x - particlesRef.current[j].x;
          const dy = particlesRef.current[i].y - particlesRef.current[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.globalAlpha = (1 - dist / 120) * 0.25;
            ctx.strokeStyle = color; ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y); 
            ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y);
            ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [theme]);

  return <canvas ref={canvasRef} className="bg-canvas" />;
}
