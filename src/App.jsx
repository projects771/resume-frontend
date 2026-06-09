import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const LIMITS = { about: 300, education: 250, experience: 500, skills: 150 };
const SUGGESTIONS = {
  about: "💡 Start with headline (e.g., 'Senior Developer'), add 2-3 sentences on key achievements + value you bring",
  education: "💡 Include: School, Degree type, Year, GPA (if 3.5+), Relevant coursework or honors",
  experience: "💡 Format: Role at Company (dates). Use action verbs (Led, Built, Increased). Include metrics when possible",
  skills: "💡 Group by category: Languages, Tools, Frameworks, Soft Skills. List 12-15 most relevant to role",
};

function ParticleCanvas({ theme }) {
  const canvasRef = useRef(null);
  const animRef = useRef(0);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    
    particlesRef.current = Array.from({ length: 60 }, () => ({
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

export default function App() {
  const [page, setPage] = useState(() => localStorage.getItem("currentPage") || "landing");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [template, setTemplate] = useState(() => localStorage.getItem("template") || null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginTab, setLoginTab] = useState("signin");
  const [font, setFont] = useState(() => localStorage.getItem("selectedFont") || "Arial");
  const [photoSrc, setPhotoSrc] = useState(() => localStorage.getItem("photoData"));
  const [loggedInUser, setLoggedInUser] = useState(() => {
    const u = localStorage.getItem("loggedInUser"); return u ? JSON.parse(u) : null;
  });
  const [loginForm, setLoginForm] = useState({ name: "", email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem("resumeData");
    if (saved) { try { return JSON.parse(saved); } catch { } }
    return { name: "", phone: "", location: "", gmail: "", about: "", education: "", experience: "", skills: "" };
  });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [activeSuggest, setActiveSuggest] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [templateModalShown, setTemplateModalShown] = useState(() => sessionStorage.getItem("templateModalShown") === "true");

  useEffect(() => { document.body.style.fontFamily = font; }, [font]);
  useEffect(() => {
    if (theme === "dark") document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");
    localStorage.setItem("theme", theme);
  }, [theme]);
  
  useEffect(() => {
    localStorage.setItem("currentPage", page);
    if (page === "builder") {
      document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";
      if (!template && !templateModalShown) {
        setShowTemplateModal(true);
        setTemplateModalShown(true);
        sessionStorage.setItem("templateModalShown", "true");
      } else {
        setShowTemplateModal(false);
      }
    } else {
      document.body.style.overflow = ""; document.documentElement.style.overflow = "";
      window.scrollTo(0, 0);
      setShowTemplateModal(false);
      setShowAboutModal(false);
      setShowLoginModal(false);
    }
  }, [page, template, templateModalShown]);

  useEffect(() => { localStorage.setItem("resumeData", JSON.stringify(form)); }, [form]);

  const goToBuilder = () => setPage("builder");
  const goToLanding = () => { setPage("landing"); setShowAboutModal(false); setShowLoginModal(false); setShowSettings(false); };
  
  const saveState = useCallback((current, prev) => {
    setUndoStack([...prev, current].slice(-20)); setRedoStack([]);
  }, []);
  
  const updateField = (field, value) => {
    const limit = LIMITS[field];
    const capped = limit && value.length > limit ? value.slice(0, limit) : value;
    setForm((prev) => { saveState(prev, undoStack); return { ...prev, [field]: capped }; });
  };

  const undo = () => {
    if (undoStack.length > 0) {
      setRedoStack((r) => [...r, form]); setUndoStack((u) => u.slice(0, -1));
      setForm(undoStack[undoStack.length - 1]);
    }
  };
  const redo = () => {
    if (redoStack.length > 0) {
      setUndoStack((u) => [...u, form]); setRedoStack((r) => r.slice(0, -1));
      setForm(redoStack[redoStack.length - 1]);
    }
  };

  const clearAll = () => {
    if (confirm("⚠️ This will clear all your data. Are you sure?")) {
      const empty = { name: "", phone: "", location: "", gmail: "", about: "", education: "", experience: "", skills: "" };
      saveState(form, undoStack); setForm(empty); setPhotoSrc(null); localStorage.removeItem("photoData");
    }
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select a valid image file"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("File size must be less than 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const r = ev.target?.result; setPhotoSrc(r); localStorage.setItem("photoData", r);
    };
    reader.readAsDataURL(file);
  };
  const removePhoto = () => { setPhotoSrc(null); localStorage.removeItem("photoData"); };
  
  const downloadPDF = () => {
    const resumeElement = document.querySelector('#resumeArea .resume');
    if (!resumeElement) {
      alert("No resume content to download.");
      return;
    }
    
    const cloneResume = resumeElement.cloneNode(true);
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.top = '-9999px';
    printContainer.style.left = '-9999px';
    printContainer.style.width = '210mm';
    printContainer.style.background = 'white';
    printContainer.style.padding = '20px';
    printContainer.appendChild(cloneResume);
    document.body.appendChild(printContainer);
    
    const originalTitle = document.title;
    document.title = `${form.name || 'Resume'} - SyntaxCV`;
    
    if (typeof html2pdf !== 'undefined') {
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${form.name || 'Resume'}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, letterRendering: true, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(cloneResume).save().then(() => {
        document.body.removeChild(printContainer);
        document.title = originalTitle;
      }).catch(() => {
        fallbackPrint(cloneResume, printContainer, originalTitle);
      });
    } else {
      fallbackPrint(cloneResume, printContainer, originalTitle);
    }
  };

  const fallbackPrint = (cloneResume, printContainer, originalTitle) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${form.name || 'Resume'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; background: white; }
          .resume { max-width: 210mm; margin: 0 auto; background: white; padding: 30px 35px; color: #333; }
          .resume-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #eee; }
          .resume-name { font-size: 28px; font-weight: 900; color: #222; margin: 0 0 6px; }
          .header-contact { display: flex; gap: 16px; flex-wrap: wrap; }
          .contact-item { font-size: 13px; color: #666; }
          .resume-photo { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; margin-left: 20px; }
          .resume-section { margin-bottom: 20px; }
          .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0066cc; margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid #e0e0e0; }
          .section-content { font-size: 14px; line-height: 1.7; color: #444; white-space: pre-wrap; }
          .template-classic .resume-header { text-align: center; border-bottom: 3px double #333; flex-direction: column; align-items: center; }
          .template-classic .resume-name { font-size: 32px; text-transform: uppercase; letter-spacing: 2px; color: #000; }
          .template-modern .resume-header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .template-modern .resume-name { color: white; }
          @media print { body { padding: 0; margin: 0; } .resume { box-shadow: none; padding: 20px; } }
        </style>
      </head>
      <body>
        ${cloneResume.outerHTML}
      </body>
      </html>
    `);
    iframeDoc.close();
    
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        document.body.removeChild(printContainer);
        document.title = originalTitle;
      }, 500);
    }, 100);
  };

  const selectTemplate = (t) => { setTemplate(t); localStorage.setItem("template", t); setShowTemplateModal(false); };
  
  const totalWords = () => [form.about, form.education, form.experience, form.skills].reduce((s, t) => s + (t.trim() ? t.trim().split(/\s+/).length : 0), 0);
  const charPercent = (f) => { const l = LIMITS[f]; return l ? Math.round((form[f].length / l) * 100) : 100; };
  const charColor = (f) => { const p = charPercent(f); return p > 90 ? "#dc3545" : p > 75 ? "#ffc107" : "#28a745"; };

  const handleSignUp = () => {
    setLoginError("");
    if (!loginForm.name || !loginForm.email || !loginForm.password) { setLoginError("Please fill in all fields."); return; }
    if (loginForm.password.length < 6) { setLoginError("Password must be at least 6 characters."); return; }
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.find((u) => u.email === loginForm.email)) { setLoginError("An account with this email already exists."); return; }
    users.push({ name: loginForm.name, email: loginForm.email, password: loginForm.password });
    localStorage.setItem("users", JSON.stringify(users));
    const userObj = { name: loginForm.name, email: loginForm.email };
    localStorage.setItem("loggedInUser", JSON.stringify(userObj)); setLoggedInUser(userObj);
    setShowLoginModal(false); setLoginForm({ name: "", email: "", password: "" });
  };

  const handleSignIn = () => {
    setLoginError("");
    if (!loginForm.email || !loginForm.password) { setLoginError("Please enter email and password."); return; }
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u) => u.email === loginForm.email && u.password === loginForm.password);
    if (!user) { setLoginError("Invalid email or password."); return; }
    const userObj = { name: user.name, email: user.email };
    localStorage.setItem("loggedInUser", JSON.stringify(userObj)); setLoggedInUser(userObj);
    setShowLoginModal(false); setLoginForm({ name: "", email: "", password: "" });
  };

  const handleLogout = () => { localStorage.removeItem("loggedInUser"); setLoggedInUser(null); };

  const toggleTeamCard = (name) => {
    setExpandedCard(expandedCard === name ? null : name);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { setShowAboutModal(false); setShowLoginModal(false); setShowSettings(false); }
      if (page !== "builder") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") { e.preventDefault(); downloadPDF(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page, form, undoStack, redoStack]);

  return (
    <>
      <ParticleCanvas theme={theme} />
      {page === "landing" && (
        <nav className="top-nav">
          <button 
            className="nav-logo" 
            onClick={goToLanding} 
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <img src="/large_resume.png" alt="SyntaxCV Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
          </button>
          <div className="nav-actions">
            <button className="nav-btn nav-btn-ghost" onClick={() => { setShowAboutModal(true); setShowLoginModal(false); setExpandedCard(null); }}>👥 About Us</button>
            {loggedInUser ? (
              <div className="nav-user">
                <span className="nav-username">👤 {loggedInUser.name}</span>
                <button className="nav-btn nav-btn-outline" onClick={handleLogout}>Log Out</button>
              </div>
            ) : (
              <button className="nav-btn nav-btn-solid" onClick={() => { setShowLoginModal(true); setShowAboutModal(false); }}>🔐 Log In</button>
            )}
          </div>
        </nav>
      )}

      {page === "landing" && (
        <div className="landing-page">
          <div className="landing-container">
            <div className="landing-content">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                <img src="/large_resume.png" alt="SyntaxCV - Professional Resume Builder" style={{ maxWidth: '100%', height: 'auto', maxHeight: '150px' }} />
              </div>

             <div className="landing-features">
                {[
                  { icon: "✨", title: "Multiple Templates", desc: "Choose from 6 unique professional resume templates" },
                  { icon: "🎨", title: "Customize Themes", desc: "Light & Dark theme modes with real-time preview" },
                  { icon: "🤖", title: "ATS-Friendly Designs", desc: "Engineered to be easily read and parsed by Applicant Tracking Systems" },
                  { icon: "💾", title: "Auto-Save", desc: "Your data is automatically saved locally" },
                  { icon: "📥", title: "Export as PDF", desc: "Download your resume as a PDF file instantly" },
                  { icon: "📊", title: "Word Counter", desc: "Track word count and get real-time suggestions" },
                ].map((f) => (
                  <div className="feature" key={f.title}>
                    <div className="feature-icon">{f.icon}</div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </div>
                ))}
              </div>

              <button className="landing-btn" onClick={goToBuilder}>🚀 Build Your Resume</button>

              <div className="landing-explanation">
                <h2>How It Works</h2>
                <p>Our Professional Resume Builder is designed to help you create a stunning resume in just minutes. With an intuitive interface, real-time preview, and multiple professional templates, you can craft the perfect resume tailored to your needs. Simply fill in your information on the left side, watch your resume come to life on the right side in real-time, and customize it with your preferred template and theme. All your data is automatically saved locally on your device, so you never have to worry about losing your work.</p>
              </div>

              <div className="focus-section">
                <h2 className="focus-title">What We Focus On</h2>
                <p className="focus-subtitle">Built with one goal — helping you land the job you deserve</p>
                <div className="focus-grid">
                  {[
                    { icon: "🎯", title: "ATS Compatibility", desc: "Our templates are engineered to pass Applicant Tracking Systems used by 99% of Fortune 500 companies." },
                    { icon: "⚡", title: "Speed & Simplicity", desc: "No steep learning curve. Fill in your details, pick a template, and download — a polished resume in under 5 minutes." },
                    { icon: "🔒", title: "100% Private", desc: "Your personal data never leaves your device. Everything is stored locally in your browser." },
                    { icon: "💡", title: "Smart Suggestions", desc: "Real-time tips guide you on what recruiters look for — from writing impactful summaries to quantifying achievements." },
                    { icon: "📱", title: "Works Everywhere", desc: "Fully responsive design works seamlessly across desktop, tablet, and mobile." },
                    { icon: "🏆", title: "Professional Quality", desc: "Designed to match the standards of resumes that get callbacks — clean typography and perfect spacing." },
                  ].map((item) => (
                    <div className="focus-card" key={item.title}>
                      <div className="focus-icon">{item.icon}</div>
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="contact-section">
                <h2 className="contact-title">📬 Get In Touch</h2>
                <p className="contact-subtitle">Have questions, feedback, or want to collaborate? We'd love to hear from you.</p>
                <div className="contact-cards">
                  <a href="mailto:nawalkishoresatishpai@gmail.com" className="contact-card">
                    <div className="contact-icon">✉️</div>
                    <div className="contact-info"> <span className="contact-name">Nawal Kishore S Pai</span> <span className="contact-email">nawalkishoresatishpai@gmail.com</span> </div>
                  </a>
                  <a href="mailto:gokulb7776@gmail.com" className="contact-card">
                    <div className="contact-icon">✉️</div>
                    <div className="contact-info"> <span className="contact-name">Gokul B</span> <span className="contact-email">gokulb7776@gmail.com</span> </div>
                  </a>
                </div>
              </div>

              <p className="landing-footer">Your data stays private. Everything is saved locally on your device.</p>
            </div>
          </div>

          {showAboutModal && (
            <div className="about-modal-overlay" onClick={() => setShowAboutModal(false)}>
              <div className="about-modal" onClick={(e) => e.stopPropagation()}>
                <button className="about-modal-close" onClick={() => setShowAboutModal(false)}>✕</button>
                <h2 className="about-modal-title">Meet the Team</h2>
                <p className="about-modal-subtitle">The passionate minds behind SyntaxCV</p>
                <div className="team-grid">
                  <div className={`team-card ${expandedCard === "Nawal" ? "expanded" : ""}`} onClick={() => toggleTeamCard("Nawal")}>
                    <div className="team-card-header">
                      <h3 className="team-name">Nawal Kishore S Pai</h3>
                      <p className="team-role">Founder</p>
                    </div>
                    <div className="team-description">
                      A dedicated 2nd year B.Tech student in Computer Science Engineering, specializing in Cyber Security. 
                      Passionate about building secure, user-centric web applications and exploring ethical hacking. 
                      Strong foundation in full-stack development and cybersecurity principles.
                    </div>
                  </div>
                  <div className={`team-card ${expandedCard === "Gokul" ? "expanded" : ""}`} onClick={() => toggleTeamCard("Gokul")}>
                    <div className="team-card-header">
                      <h3 className="team-name">Gokul B</h3>
                      <p className="team-role">Founder</p>
                    </div>
                    <div className="team-description">
                      A driven 2nd year B.Tech student pursuing Computer Science Engineering with specialization in Cyber Security. 
                      Focuses on full-stack development, cryptography, and creating seamless digital experiences. 
                      Combines technical prowess with creative problem-solving.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showLoginModal && (
            <div className="about-modal-overlay" onClick={() => setShowLoginModal(false)}>
              <div className="login-modal" onClick={(e) => e.stopPropagation()}>
                <button className="about-modal-close" onClick={() => setShowLoginModal(false)}>✕</button>
                <div className="login-logo">📄 SyntaxCV</div>
                <div className="login-tabs">
                  <button className={`login-tab${loginTab === "signin" ? " active" : ""}`} onClick={() => { setLoginTab("signin"); setLoginError(""); }}>Sign In</button>
                  <button className={`login-tab${loginTab === "signup" ? " active" : ""}`} onClick={() => { setLoginTab("signup"); setLoginError(""); }}>Sign Up</button>
                </div>
                {loginTab === "signup" && (
                  <input className="login-input" type="text" placeholder="Full Name" autoComplete="name" value={loginForm.name} onChange={(e) => setLoginForm((f) => ({ ...f, name: e.target.value }))} />
                )}
                <input className="login-input" type="email" placeholder="Email Address" autoComplete="email" value={loginForm.email} onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))} />
                <input className="login-input" type="password" placeholder="Password" autoComplete="current-password" value={loginForm.password} onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") loginTab === "signin" ? handleSignIn() : handleSignUp(); }} />
                {loginError && <p className="login-error">{loginError}</p>}
                <button className="login-submit-btn" onClick={loginTab === "signin" ? handleSignIn : handleSignUp}>{loginTab === "signin" ? "🔐 Sign In" : "✨ Create Account"}</button>
                <p className="login-switch">
                  {loginTab === "signin" ? "Don't have an account? " : "Already have an account? "}
                  <span className="login-switch-link" onClick={() => { setLoginTab(loginTab === "signin" ? "signup" : "signin"); setLoginError(""); }}>{loginTab === "signin" ? "Sign Up" : "Sign In"}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {page === "builder" && (
        <div className="builder-page">
          <button className="back-home-btn" onClick={goToLanding}>← Home</button>
          
          {showTemplateModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>Choose Your Resume Template</h2>
                <p>Select a professional template to get started</p>
                <div className="template-grid">
                  {[
                    { id: "classic", label: "Classic", desc: "Traditional & ATS-friendly" },
                    { id: "modern", label: "Modern", desc: "Contemporary & stylish" },
                    { id: "minimal", label: "Minimal", desc: "Clean & professional" },
                    { id: "emory", label: "Emory", desc: "Professional black theme" },
                    { id: "harvard", label: "Harvard", desc: "Academic black-grey style" },
                    { id: "business", label: "Business", desc: "Corporate blue design" },
                  ].map((t) => (
                    <div className="template-card" key={t.id} onClick={() => selectTemplate(t.id)}>
                      <div className={`template-preview ${t.id}-preview`}>
                        <div className={`preview-header ${t.id}`}>{t.id === "emory" || t.id === "harvard" || t.id === "business" ? "JOHN DOE" : "John Doe"}</div>
                        {t.id === "modern" && <div className="preview-accent modern" />}
                        <div className={`preview-section ${t.id}`}>{t.id === "classic" || t.id === "modern" || t.id === "minimal" ? "SUMMARY" : "EDUCATION"}</div>
                        <div className="preview-line" /> <div className="preview-line short" />
                      </div>
                      <h3>{t.label}</h3> <p>{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button className="settings-btn" onClick={() => setShowSettings((s) => !s)}>⚙</button>

          {showSettings && (
            <div className="settings-panel">
              <div className="settings-section">
                <h3>⚙️ Preferences</h3>
                <label>Theme</label>
                <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option value="light">☀️ Light Theme</option>
                  <option value="dark">🌙 Dark Theme</option>
                </select>
              </div>
              <div className="settings-section">
                <label>Font</label>
                <select value={font} onChange={(e) => { setFont(e.target.value); localStorage.setItem("selectedFont", e.target.value); }}>
                  {["Arial", "Georgia", "Verdana", "Times New Roman", "Cambria"].map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="settings-section">
                <label>Template</label>
                <select value={template || "classic"} onChange={(e) => selectTemplate(e.target.value)}>
                  <option value="classic">Classic</option> <option value="modern">Modern</option>
                  <option value="minimal">Minimal</option> <option value="emory">Emory</option>
                  <option value="harvard">Harvard</option> <option value="business">Business</option>
                </select>
              </div>
            </div>
          )}

          <div className="wrapper">
            <div className="panel left">
              <h2 className="panel-title">Build Resume</h2>
              <input className="form-input" type="text" placeholder="Full Name" autoComplete="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
              <input className="form-input" type="tel" placeholder="Phone" autoComplete="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              <input className="form-input" type="text" placeholder="Location" autoComplete="off" value={form.location} onChange={(e) => updateField("location", e.target.value)} />
              <input className="form-input" type="email" placeholder="Gmail" autoComplete="email" value={form.gmail} onChange={(e) => updateField("gmail", e.target.value)} />
              
              {["about", "education", "experience", "skills"].map((field) => (
                <div key={field}>
                  <textarea className="form-textarea" placeholder={field.charAt(0).toUpperCase() + field.slice(1)} value={form[field]} onChange={(e) => { updateField(field, e.target.value); setActiveSuggest(field); }} onFocus={() => setActiveSuggest(field)} onBlur={() => setActiveSuggest(null)} />
                  <div className="field-meta">
                    <span className="suggest-text">{activeSuggest === field ? SUGGESTIONS[field] : ""}</span>
                    <span className="char-count" style={{ color: charColor(field) }}>{form[field].length}/{LIMITS[field]}</span>
                  </div>
                </div>
              ))}
              
              <div className="photo-row">
                <label className="photo-label"> 📷 Upload Photo <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} /> </label>
                {photoSrc && <button className="btn btn-danger-outline" onClick={removePhoto}>Remove Photo</button>}
              </div>
              
              <div className="btn-grid">
                <button className="btn btn-success" onClick={downloadPDF} style={{ gridColumn: "span 2" }}>⬇️ Save as PDF</button>
                <button className="btn btn-info" onClick={undo} title="Ctrl+Z">↶ Undo</button>
                <button className="btn btn-info" onClick={redo} title="Ctrl+Y">↷ Redo</button>
                <button className="btn btn-danger" onClick={clearAll} style={{ gridColumn: "span 2" }}>🔄 Clear All</button>
              </div>
              
              <div className="word-count">
                Total words: <strong>{totalWords()}</strong>
                {totalWords() < 100 && <span className="wc-hint"> — Add more detail!</span>}
                {totalWords() >= 100 && totalWords() < 250 && <span className="wc-hint wc-ok"> — Good start</span>}
                {totalWords() >= 250 && <span className="wc-hint wc-great"> — Great length!</span>}
              </div>
            </div>

            <div className="panel right" id="resumeArea">
              <div className={`resume template-${template || "classic"}`}>
                <div className="resume-header">
                  <div className="header-content">
                    <h1 className="resume-name">{form.name || "Your Name"}</h1>
                    <div className="header-contact">
                      {form.phone && <span className="contact-item">{form.phone}</span>}
                      {form.gmail && <span className="contact-item">{form.gmail}</span>}
                      {form.location && <span className="contact-item">{form.location}</span>}
                    </div>
                  </div>
                  {photoSrc && <img src={photoSrc} className="resume-photo" alt="Profile" />}
                </div>
                
                {form.about && ( <section className="resume-section"> <h2 className="section-title">Professional Summary</h2> <p className="section-content">{form.about}</p> </section>)}
                {form.experience && ( <section className="resume-section"> <h2 className="section-title">Professional Experience</h2> <p className="section-content">{form.experience}</p> </section>)}
                {form.education && ( <section className="resume-section"> <h2 className="section-title">Education</h2> <p className="section-content">{form.education}</p> </section>)}
                {form.skills && ( <section className="resume-section"> <h2 className="section-title">Skills</h2> <p className="section-content">{form.skills}</p> </section>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
