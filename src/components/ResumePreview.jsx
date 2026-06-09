// src/components/ResumePreview.jsx
export default function ResumePreview({ template, form, photoSrc, resumeRef }) {
  return (
    <div className="panel right" id="resumeArea">
      <div className={`resume template-${template || "classic"}`} ref={resumeRef}>
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
        
        {!form.name && !form.about && !form.experience && !form.education && !form.skills && (
          <div className="resume-placeholder"> <p>Fill in the form on the left to see your resume preview here in real time.</p> </div>
        )}
      </div>
    </div>
  );
}
