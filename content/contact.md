---
title: "Contact"
description: "Get in touch with Ahmad Hassan — Software Engineer & Full Stack Developer. Send a message or connect on social media."
keywords: [Contact, Ahmad Hassan, Email, LinkedIn, GitHub, Get in Touch]
showtoc: false
searchHidden: true
ShowRssButtonInSectionTermList: false
ShowShareButtons: false
---

<style>
.main { max-width: 1000px !important; }
.post-content { max-width: 1000px !important; }

.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 1rem;
}

/* Form styles */
.contact-form-card {
  background: var(--entry);
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.contact-form-card h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.3rem;
}
.form-group {
  margin-bottom: 1.25rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--primary);
}
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--theme);
  color: var(--primary);
  font-size: 0.95rem;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}
.form-group textarea {
  resize: vertical;
  min-height: 130px;
}
.form-submit {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: var(--primary);
  color: var(--theme);
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}
.form-submit:hover {
  opacity: 0.85;
}
.form-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.form-status {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  display: none;
}
.form-status.success {
  display: block;
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.form-status.error {
  display: block;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Info side */
.contact-info-side {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.info-card {
  background: var(--entry);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.info-card h2 {
  margin: 0 0 1.25rem 0;
  font-size: 1.3rem;
}
.info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.info-item:last-child {
  margin-bottom: 0;
}
.info-item svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  fill: var(--secondary);
}
.info-item span {
  font-size: 0.95rem;
  color: var(--primary);
}
.info-item a {
  font-size: 0.95rem;
  color: var(--primary);
  text-decoration: none;
}
.info-item a:hover {
  text-decoration: underline;
}

/* Social links grid */
.social-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.social-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  background: var(--theme);
  border-radius: 6px;
  text-decoration: none;
  color: var(--primary);
  font-size: 0.9rem;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid var(--border);
}
.social-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.social-link svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  fill: var(--secondary);
}

@media (max-width: 768px) {
  .contact-grid {
    grid-template-columns: 1fr;
  }
  .social-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<div class="contact-grid">
<div class="contact-form-card">
<h2>Send a Message</h2>
<form id="contactForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
<div class="form-group">
<label for="name">Name</label>
<input type="text" id="name" name="name" required placeholder="Your name">
</div>
<div class="form-group">
<label for="email">Email</label>
<input type="email" id="email" name="email" required placeholder="your@email.com">
</div>
<div class="form-group">
<label for="subject">Subject</label>
<input type="text" id="subject" name="subject" required placeholder="What's this about?">
</div>
<div class="form-group">
<label for="message">Message</label>
<textarea id="message" name="message" required placeholder="Your message..."></textarea>
</div>
<button type="submit" class="form-submit" id="submitBtn">Send Message</button>
<div id="formStatus" class="form-status"></div>
</form>
</div>

<div class="contact-info-side">
<div class="info-card">
<h2>Contact Info</h2>
<div class="info-item">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
<a href="mailto:hi@ahmadx.dev">hi@ahmadx.dev</a>
</div>
<div class="info-item">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
<span>Islamabad, Pakistan</span>
</div>
<div class="info-item">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z"/></svg>
<span>Software Engineer @ VieroMind</span>
</div>
</div>

<div class="info-card">
<h2>Connect</h2>
<div class="social-grid">
<a href="https://www.linkedin.com/in/ahmad9059/" target="_blank" rel="noopener noreferrer" class="social-link">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
LinkedIn
</a>
<a href="https://github.com/ahmad9059" target="_blank" rel="noopener noreferrer" class="social-link">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>
GitHub
</a>
<a href="https://leetcode.com/ahmad9059/" target="_blank" rel="noopener noreferrer" class="social-link">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/></svg>
LeetCode
</a>
<a href="https://www.instagram.com/ahmad9059x/" target="_blank" rel="noopener noreferrer" class="social-link">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>
Instagram
</a>
<a href="https://x.com/ahmad9059x" target="_blank" rel="noopener noreferrer" class="social-link">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
X / Twitter
</a>
</div>
</div>
</div>
</div>

<script>
(function() {
  var form = document.getElementById('contactForm');
  var submitBtn = document.getElementById('submitBtn');
  var statusDiv = document.getElementById('formStatus');

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    statusDiv.className = 'form-status';
    statusDiv.style.display = 'none';

    var data = new FormData(form);

    fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    }).then(function(response) {
      if (response.ok) {
        statusDiv.textContent = 'Message sent successfully! I\'ll get back to you soon.';
        statusDiv.className = 'form-status success';
        form.reset();
      } else {
        return response.json().then(function(data) {
          if (data.errors) {
            statusDiv.textContent = data.errors.map(function(err) { return err.message; }).join(', ');
          } else {
            statusDiv.textContent = 'Something went wrong. Please try again.';
          }
          statusDiv.className = 'form-status error';
        });
      }
    }).catch(function() {
      statusDiv.textContent = 'Network error. Please check your connection and try again.';
      statusDiv.className = 'form-status error';
    }).finally(function() {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    });
  });
})();
</script>
