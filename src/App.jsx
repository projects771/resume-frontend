import { useState, useEffect, useRef, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import ParticleCanvas from "./components/ParticleCanvas";
import ResumePreview from "./components/ResumePreview";
import "./App.css";

const LIMITS = { about: 300, education: 250, experience: 500, skills: 150 };
const SUGGESTIONS = {
  about: "💡 Start with headline (e.g., 'Senior Developer'), add 2-3 sentences on key achievements + value you bring",
  education: "💡 Include: School, Degree type, Year, GPA (if 3.5+), Relevant coursework or honors",
  experience: "💡 Format: Role at Company (dates). Use action verbs (Led, Built, Increased). Include metrics when possible",
  skills: "💡 Group by category: Languages, Tools, Frameworks, Soft Skills. List 12-15 most relevant to role",
};

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
  
  const [photoSrc, setPhotoSrc] = useState(null); 
  
  const [token, setToken] = useState(() => localStorage.getItem('resumeToken') || null);
  const [loggedInUser, setLoggedInUser] = useState(() => {
    const u = localStorage.getItem("loggedInUser"); return u ? JSON.parse(u) : null;
  });
  
  const [loginForm, setLoginForm] = useState({ name: "", email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const [form, setForm] = useState({ name: "", phone: "", location: "", gmail: "", about: "", education: "", experience: "", skills: "" });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [activeSuggest, setActiveSuggest] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [templateModalShown, setTemplateModalShown] = useState(() => sessionStorage.getItem("templateModalShown") === "true");

  const resumeRef = useRef();

  useEffect(() => {
    if (token && page === "builder") {
      fetch(`${import.meta.env.VITE_API_URL}/api/resume`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.name !== undefined) {
          setForm({
            name: data.name || "", phone: data.phone || "", location: data.location || "", 
            gmail: data.gmail || "", about: data.about || "", education: data.education || "", 
            experience: data.experience || "", skills: data.skills || ""
          });
          if (data.photo) setPhotoSrc(data.photo);
        }
      })
      .catch(err => console.error("Error fetching resume", err));
    }
  }, [token, page]);

  useEffect(() => {
    if (!token || page !== "builder") return;
    setSaveStatus("Saving...");
    
    const autoSaveTimer = setTimeout(() => {
      fetch(`${import.meta.env.VITE_API_URL}/api/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...form, photo: photoSrc })
      })
      .then(res => {
        if (res.ok) setSaveStatus("Saved to DB ✔️");
        else setSaveStatus("Save failed");
      })
      .catch(() => setSaveStatus("Offline"));
    }, 1500);

    return () => clearTimeout(autoSaveTimer);
  }, [form, photoSrc, token, page]);

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

  const goToBuilder = () => {
    if (!token) setShowLoginModal(true);
    else setPage("builder");
  };
  
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
      saveState(form, undoStack); setForm(empty); setPhotoSrc(null);
    }
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]; 
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select a valid image file"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("File size must be less than 5MB"); return; }
    
    setSaveStatus("Processing image...");

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoSrc(reader.result); 
      setSaveStatus("Image uploaded! ✔️");
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoSrc(null); 
  };
  
  const handlePrint = useReactToPrint({
    content: () => resumeRef.current, 
    contentRef: resumeRef,            
    documentTitle: `${form.name || 'Resume'}_SyntaxCV`,
    onAfterPrint: () => {
      if (token) {
        const emptyForm = { name: "", phone: "", location: "", gmail: "", about: "", education: "", experience: "", skills: "" };
        fetch(`${import.meta.env.VITE_API_URL}/api/resume`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ ...emptyForm, photo: null }) 
        }).then(() => {
          setForm(emptyForm);
          setPhotoSrc(null);
          alert("Success! Your data has been securely wiped.");
        });
      }
    }
  });

  const selectTemplate = (t) => { setTemplate(t); localStorage.setItem("template", t); setShowTemplateModal(false); };
  const totalWords = () => [form.about, form.education, form.experience, form.skills].reduce((s, t) => s + (t.trim() ? t.trim().split(/\s+/).length : 0), 0);
  const charPercent = (f) => { const l = LIMITS[f]; return l ? Math.round((form[f].length / l) * 100) : 100; };
  const charColor = (f) => { const p = charPercent(f); return p > 90 ? "#dc3545" : p > 75 ? "#ffc107" : "#28a745"; };

  const handleSignUp = async () => {
    setLoginError("");
    if (!loginForm.name || !loginForm.email || !loginForm.password) { setLoginError("Please fill in all fields."); return; }
    if (loginForm.password.length < 6) { setLoginError("Password must be at least 6 characters."); return; }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password })
      });
      const result = await response.json();
      if (response.ok) {
        setLoginTab("signin");
        setLoginError("Account created! Please log in.");
      } else {
        setLoginError(result.error);
      }
    } catch (err) {
      setLoginError("Server connection failed.");
    }
  };

  const handleSignIn = async () => {
    setLoginError("");
    if (!loginForm.email || !loginForm.password) { setLoginError("Please enter email and password."); return; }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password })
      });
      const result = await response.json();
      
      if (response.ok) {
        localStorage.setItem('resumeToken', result.token);
        setToken(result.token);
        const userObj = { name: "User", email: loginForm.email };
        localStorage.setItem("loggedInUser", JSON.stringify(userObj)); 
        setLoggedInUser(userObj);
        setShowLoginModal(false); 
        setLoginForm({ name: "", email: "", password: "" });
        if (page === "landing") setPage("builder");
      } else {
        setLoginError(result.error);
      }
    } catch (err) {
      setLoginError("Server connection failed.");
    }
  };

  const handleLogout = () => { 
    localStorage.removeItem("loggedInUser"); 
    localStorage.removeItem("resumeToken");
    setToken(null);
    setLoggedInUser(null); 
    setForm({ name: "", phone: "", location: "", gmail: "", about: "", education: "", experience: "", skills: "" }); 
    setPhotoSrc(null);
    setPage("landing");
  };

  const toggleTeamCard = (name) => setExpandedCard(expandedCard === name ? null : name);

  return (
    <>
      <ParticleCanvas theme={theme} />
      
      {/* UPDATED: Mobile Navbar Dashboard Fix */}
      <style>{`
        @media (max-width: 768px) {
          .top-nav {
            flex-wrap: wrap !important;
            height: auto !important;
            padding: 15px !important;
            gap: 15px;
            justify-content: center !important;
          }
          .nav-logo img {
            height: 35px !important;
          }
          .nav-actions {
            width: 100%;
            justify-content: center !important;
            flex-wrap: wrap;
            gap: 10px !important;
          }
          .nav-btn {
            padding: 8px 14px !important;
            font-size: 14px !important;
          }
          .nav-username { 
            max-width: 140px; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            white-space: nowrap; 
          }
        }
      `}</style>

      {page === "landing" && (
        <nav className="top-nav">
          <button className="nav-logo" onClick={() => window.location.href = '/'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            <img 
              src={theme === "dark" ? "/syntaxcv_navbar_dark.png" : "/syntaxcv_navbar_light.png"} 
              alt="SyntaxCV" 
              style={{ height: '40px', width: 'auto' }} 
            />
          </button>
          <div className="nav-actions">
            <button className="nav-btn nav-btn-ghost" onClick={() => { setShowAboutModal(true); setShowLoginModal(false); setExpandedCard(null); }}>👥 About Us</button>
            {loggedInUser ? (
              <div className="nav-user">
                <span className="nav-username">👤 {loggedInUser.email.split('@')[0]}</span>
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
              
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <img 
                  src={theme === "dark" ? "/syntaxcv_hero_dark.png" : "/syntaxcv_hero_light.png"} 
                  alt="SyntaxCV - Professional Resume Builder" 
                  style={{ maxWidth: '100%', height: 'auto', maxHeight: '180px' }} 
                />
              </div>

              <div className="landing-features">
                {[
                  { icon: "✨", title: "Multiple Templates", desc: "Choose from 6 unique professional resume templates" },
                  { icon: "🎨", title: "Customize Themes", desc: "Light & Dark theme modes with real-time preview" },
                  { icon: "☁️", title: "Auto-Save", desc: "Your data is automatically saved to your private account" },
                  { icon: "📥", title: "Export as PDF", desc: "Download your resume as an ATS-friendly PDF instantly" },
                  { icon: "🔒", title: "Auto-Delete", desc: "We securely wipe your data from our servers once you download" },
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
                <p>Our Professional Resume Builder is designed to help you create a stunning resume in just minutes. With an intuitive interface, real-time preview, and multiple professional templates, you can craft the perfect resume tailored to your needs. Simply fill in your information on the left side, watch your resume come to life on the right side in real-time, and customize it with your preferred template and theme. All your data is automatically saved to the cloud, so you never have to worry about losing your work.</p>
              </div>

              <div className="focus-section">
                <h2 className="focus-title">What We Focus On</h2>
                <p className="focus-subtitle">Built with one goal — helping you land the job you deserve</p>
                <div className="focus-grid">
                  {[
                    { icon: "🎯", title: "ATS Compatibility", desc: "Our templates are engineered to pass Applicant Tracking Systems used by 99% of Fortune 500 companies." },
                    { icon: "⚡", title: "Speed & Simplicity", desc: "No steep learning curve. Fill in your details, pick a template, and download — a polished resume in under 5 minutes." },
                    { icon: "🔒", title: "100% Secure", desc: "Your personal data is encrypted and saved directly to our secure MongoDB database." },
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
                      A dedicated B.Tech student in Computer Science Engineering, specializing in Cyber Security. 
                      Passionate about building secure, user-centric web applications and exploring ethical hacking.
                    </div>
                  </div>
                  <div className={`team-card ${expandedCard === "Gokul" ? "expanded" : ""}`} onClick={() => toggleTeamCard("Gokul")}>
                    <div className="team-card-header">
                      <h3 className="team-name">Gokul B</h3>
                      <p className="team-role">Founder</p>
                    </div>
                    <div className="team-description">
                      A driven B.Tech student pursuing Computer Science Engineering with specialization in Cyber Security. 
                      Focuses on full-stack development, cryptography, and creating seamless digital experiences.
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
                  <input className="login-input" type="text" placeholder="Full Name" value={loginForm.name} onChange={(e) => setLoginForm((f) => ({ ...f, name: e.target.value }))} />
                )}
                <input className="login-input" type="email" placeholder="Email Address" value={loginForm.email} onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))} />
                <input className="login-input" type="password" placeholder="Password" value={loginForm.password} onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") loginTab === "signin" ? handleSignIn() : handleSignUp(); }} />
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
          {/* UPDATED: Reverted back to smooth internal navigation! */}
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
              <div className="settings-section">
                <button onClick={handleLogout} style={{ width: '100%', padding: '8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
              </div>
            </div>
          )}

          <div className="wrapper">
            <div className="panel left">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="panel-title" style={{ margin: 0 }}>Build Resume</h2>
                <span style={{ fontSize: '12px', color: '#888', fontWeight: 'bold' }}>{saveStatus}</span>
              </div>
              
              <input className="form-input" type="text" placeholder="Full Name" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
              <input className="form-input" type="tel" placeholder="Phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              <input className="form-input" type="text" placeholder="Location" value={form.location} onChange={(e) => updateField("location", e.target.value)} />
              <input className="form-input" type="email" placeholder="Gmail" value={form.gmail} onChange={(e) => updateField("gmail", e.target.value)} />
              
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
              
              <div className="btn-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button className="btn btn-success" onClick={handlePrint} style={{ gridColumn: "span 2" }}>⬇️ Download resume</button>
                <button className="btn btn-info" onClick={undo} title="Ctrl+Z">↶ Undo</button>
                <button className="btn btn-info" onClick={redo} title="Ctrl+Y">↷ Redo</button>
                <button className="btn btn-danger" onClick={clearAll} style={{ gridColumn: "span 2" }}>🔄 Clear Form</button>
              </div>
              
              <div className="word-count">
                Total words: <strong>{totalWords()}</strong>
                {totalWords() < 100 && <span className="wc-hint"> — Add more detail!</span>}
                {totalWords() >= 100 && totalWords() < 250 && <span className="wc-hint wc-ok"> — Good start</span>}
                {totalWords() >= 250 && <span className="wc-hint wc-great"> — Great length!</span>}
              </div>
            </div>

            <ResumePreview 
              template={template} 
              form={form} 
              photoSrc={photoSrc} 
              resumeRef={resumeRef} 
            />
          </div>
        </div>
      )}
    </>
  );
}
