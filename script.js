// ⚠️ Your deployed Google Apps Script Web App URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzY4ACyKZmUrDdv9oHTvedz33sXb_CCxaN52L7Qgaj7OeVqmQSLHXT1XTJMnGS1t_cGYw/exec';

document.addEventListener('DOMContentLoaded', () => {
  // ─────────────────────────────────────────────
  // 1. Particle Animation System
  // ─────────────────────────────────────────────
  const particleCanvas = document.getElementById('particles-canvas');
  if (particleCanvas) {
    const ctx = particleCanvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 80;
    const CONNECTION_DISTANCE = 120;
    const PARTICLE_COLORS = [
      { r: 244, g: 196, b: 48 },   // gold #f4c430
      { r: 212, g: 165, b: 116 },  // amber #d4a574
      { r: 255, g: 255, b: 255 },  // white
    ];

    function resizeCanvas() {
      particleCanvas.width = particleCanvas.offsetWidth;
      particleCanvas.height = particleCanvas.offsetHeight;
    }

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * particleCanvas.width;
        this.y = Math.random() * particleCanvas.height;
        this.size = Math.random() * 2 + 1; // 1-3px
        this.opacity = Math.random() * 0.6 + 0.2; // 0.2-0.8
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        const colorChoice = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        this.r = colorChoice.r;
        this.g = colorChoice.g;
        this.b = colorChoice.b;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > particleCanvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > particleCanvas.height) this.speedY *= -1;

        this.x = Math.max(0, Math.min(particleCanvas.width, this.x));
        this.y = Math.max(0, Math.min(particleCanvas.height, this.y));
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.r}, ${this.g}, ${this.b}, ${this.opacity})`;
        ctx.fill();
      }
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
      }
    }

    function connectParticles() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < CONNECTION_DISTANCE) {
            const opacity = 0.15 * (1 - distance / CONNECTION_DISTANCE);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(244, 196, 48, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    function animateParticles() {
      ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      connectParticles();
      requestAnimationFrame(animateParticles);
    }

    resizeCanvas();
    initParticles();
    animateParticles();

    window.addEventListener('resize', () => {
      resizeCanvas();
      initParticles();
    });
  }

  // ─────────────────────────────────────────────
  // 2. Navigation
  // ─────────────────────────────────────────────
  const navbar = document.querySelector('.navbar');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  // Scroll class toggle
  window.addEventListener('scroll', () => {
    if (navbar) {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });

  // Smooth scroll for nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const navbarHeight = navbar ? navbar.offsetHeight : 0;
          const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight;
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }

        // Close mobile menu on link click
        if (navLinks) {
          navLinks.classList.remove('active');
        }
      }
    });
  });

  // Mobile menu toggle
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // ─────────────────────────────────────────────
  // 3. Scroll Reveal (IntersectionObserver)
  // ─────────────────────────────────────────────
  const revealElements = document.querySelectorAll('.reveal');

  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ─────────────────────────────────────────────
  // 4. Multi-Step Form Management
  // ─────────────────────────────────────────────
  
  const totalSteps = 4;

  function showStep(stepNumber, shouldScroll = true) {
    const allSteps = document.querySelectorAll('.form-step');
    allSteps.forEach(step => {
      step.classList.remove('active');
      step.style.display = 'none';
    });

    const targetStep = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    if (targetStep) {
      targetStep.style.display = 'block';
      // Trigger reflow before adding active for CSS transition
      void targetStep.offsetWidth;
      targetStep.classList.add('active');
    }

    // Update progress bar
    const progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach((ps, index) => {
      const stepNum = index + 1;
      ps.classList.remove('active', 'completed');
      if (stepNum === stepNumber) {
        ps.classList.add('active');
      } else if (stepNum < stepNumber) {
        ps.classList.add('completed');
      }
    });

    currentStep = stepNumber;

    // Scroll the form into view (only when navigating, not on initial load)
    if (shouldScroll) {
      const formSection = document.getElementById('register');
      if (formSection) {
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        const formTop = formSection.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;
        window.scrollTo({ top: formTop, behavior: 'smooth' });
      }
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setFieldError(fieldId, hasError) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const formGroup = field.closest('.form-group');
    if (formGroup) {
      if (hasError) {
        formGroup.classList.add('error');
      } else {
        formGroup.classList.remove('error');
      }
    }
  }

  function validateStep(stepNumber) {
    let isValid = true;

    if (stepNumber === 1) {
      const fullName = document.getElementById('fullName');
      const email = document.getElementById('email');
      const gender = document.getElementById('gender');
      const phone = document.getElementById('phone');

      if (!fullName || !fullName.value.trim()) {
        setFieldError('fullName', true);
        isValid = false;
      } else {
        setFieldError('fullName', false);
      }

      if (!email || !email.value.trim() || !isValidEmail(email.value.trim())) {
        setFieldError('email', true);
        isValid = false;
      } else {
        setFieldError('email', false);
      }

      if (!gender || !gender.value) {
        setFieldError('gender', true);
        isValid = false;
      } else {
        setFieldError('gender', false);
      }

      if (!phone || !phone.value.trim()) {
        setFieldError('phone', true);
        isValid = false;
      } else {
        setFieldError('phone', false);
      }
    }

    if (stepNumber === 2) {
      const periodOfStudy = document.getElementById('periodOfStudy');
      const degreeStudy = document.getElementById('degreeStudy');
      const courseStudy = document.getElementById('courseStudy');

      if (!periodOfStudy || !periodOfStudy.value) {
        setFieldError('periodOfStudy', true);
        isValid = false;
      } else {
        setFieldError('periodOfStudy', false);
      }

      if (!degreeStudy || !degreeStudy.value) {
        setFieldError('degreeStudy', true);
        isValid = false;
      } else {
        setFieldError('degreeStudy', false);
      }

      if (!courseStudy || !courseStudy.value) {
        setFieldError('courseStudy', true);
        isValid = false;
      } else {
        setFieldError('courseStudy', false);
      }
    }

    if (stepNumber === 3) {
      const participationType = document.getElementById('participationType');

      if (!participationType || !participationType.value) {
        setFieldError('participationType', true);
        isValid = false;
      } else {
        setFieldError('participationType', false);
      }

      // If family, validate spouse info
      if (participationType && participationType.value === 'family') {
        const spouseName = document.getElementById('spouseName');
        if (!spouseName || !spouseName.value.trim()) {
          setFieldError('spouseName', true);
          isValid = false;
        } else {
          setFieldError('spouseName', false);
        }
      }
    }

    if (stepNumber === 4) {
      const foodPref = document.querySelector('input[name="foodPreference"]:checked');
      if (!foodPref) {
        // Add error to the food preference container
        const foodGroup = document.querySelector('.food-preference-group') ||
                          document.querySelector('input[name="foodPreference"]')?.closest('.form-group');
        if (foodGroup) foodGroup.classList.add('error');
        isValid = false;
      } else {
        const foodGroup = document.querySelector('.food-preference-group') ||
                          document.querySelector('input[name="foodPreference"]')?.closest('.form-group');
        if (foodGroup) foodGroup.classList.remove('error');
      }
    }

    if (!isValid) {
      showToast('Please fill in all required fields correctly.', 'error');
    }

    return isValid;
  }

  // Next / Previous button listeners
  
  });

  
  });

  // Remove error class on input/change for form fields
  const formFields = [
    'fullName', 'email', 'gender', 'phone', 'whatsapp',
    'periodOfStudy', 'degreeStudy', 'courseStudy', 'participationType',
    'spouseName', 'numChildren', 'numGuests'
  ];

  formFields.forEach(id => {
    const field = document.getElementById(id);
    if (field) {
      const events = field.tagName === 'SELECT' ? ['change'] : ['input', 'change'];
      events.forEach(evt => {
        field.addEventListener(evt, () => {
          setFieldError(id, false);
        });
      });
    }
  });

  // Remove error on food preference radio change
  document.querySelectorAll('input[name="foodPreference"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const foodGroup = document.querySelector('.food-preference-group') ||
                        radio.closest('.form-group');
      if (foodGroup) foodGroup.classList.remove('error');
    });
  });

  // ─────────────────────────────────────────────
  // 5. Conditional Family Fields
  // ─────────────────────────────────────────────
  const participationType = document.getElementById('participationType');
  const familyFields = document.getElementById('familyFields');

  if (participationType && familyFields) {
    participationType.addEventListener('change', () => {
      if (participationType.value === 'family') {
        familyFields.style.display = 'block';
        // Trigger reflow then animate
        void familyFields.offsetWidth;
        familyFields.style.maxHeight = familyFields.scrollHeight + 'px';
        familyFields.style.opacity = '1';
        familyFields.classList.add('visible');
      } else {
        familyFields.style.maxHeight = '0';
        familyFields.style.opacity = '0';
        familyFields.classList.remove('visible');

        // Reset family fields
        const spouseName = document.getElementById('spouseName');
        const numChildren = document.getElementById('numChildren');
        if (spouseName) spouseName.value = '';
        if (numChildren) numChildren.value = '0';

        setTimeout(() => {
          if (!familyFields.classList.contains('visible')) {
            familyFields.style.display = 'none';
          }
        }, 400);
      }
      calculateTotalPersons();
    });
  }

  // ─────────────────────────────────────────────
  // 6. Auto-Calculate Total Persons
  // ─────────────────────────────────────────────
  function calculateTotalPersons() {
    let total = 1; // The registrant

    const pType = document.getElementById('participationType');
    const spouseName = document.getElementById('spouseName');
    const numChildren = document.getElementById('numChildren');
    const numGuests = document.getElementById('numGuests');
    const totalPersons = document.getElementById('totalPersons');

    if (pType && pType.value === 'family') {
      if (spouseName && spouseName.value.trim()) {
        total += 1; // Spouse
      }
      if (numChildren) {
        total += parseInt(numChildren.value) || 0;
      }
    }

    if (numGuests) {
      total += parseInt(numGuests.value) || 0;
    }

    if (totalPersons) {
      totalPersons.value = total;
    }
  }

  // Attach listeners for auto-calculation
  ['participationType', 'numChildren', 'numGuests', 'spouseName'].forEach(id => {
    const field = document.getElementById(id);
    if (field) {
      const events = field.tagName === 'SELECT' ? ['change'] : ['input', 'change'];
      events.forEach(evt => {
        field.addEventListener(evt, calculateTotalPersons);
      });
    }
  });

  // Initial calculation
  calculateTotalPersons();

  // ─────────────────────────────────────────────
  // 7. Form Submission
  // ─────────────────────────────────────────────
  const registrationForm = document.getElementById('registrationForm');

  if (registrationForm) {
    registrationForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validateAll()) return;

      const loadingOverlay = document.getElementById('loadingOverlay');
      const submitBtn = registrationForm.querySelector('button[type="submit"]');

      if (loadingOverlay) loadingOverlay.style.display = 'flex';
      if (submitBtn) submitBtn.disabled = true;

      const formData = {
        fullName: (document.getElementById('fullName')?.value || '').trim(),
        email: (document.getElementById('email')?.value || '').trim(),
        gender: document.getElementById('gender')?.value || '',
        phone: ((document.getElementById('phoneCode')?.value || '+91') + ' ' + (document.getElementById('phone')?.value || '').trim()).trim(),
        whatsapp: (document.getElementById('whatsapp')?.value || '').trim() 
                  ? ((document.getElementById('whatsappCode')?.value || '+91') + ' ' + (document.getElementById('whatsapp')?.value || '').trim()).trim()
                  : ((document.getElementById('phoneCode')?.value || '+91') + ' ' + (document.getElementById('phone')?.value || '').trim()).trim(),
        periodOfStudy: document.getElementById('periodOfStudy')?.value || '',
        degreeStudy: (document.getElementById('degreeStudy')?.value || '').trim(),
        courseStudy: document.getElementById('courseStudy')?.value || '',
        participationType: document.getElementById('participationType')?.value || '',
        spouseName: (document.getElementById('spouseName')?.value || '').trim(),
        numChildren: parseInt(document.getElementById('numChildren')?.value) || 0,
        numGuests: parseInt(document.getElementById('numGuests')?.value) || 0,
        totalPersons: parseInt(document.getElementById('totalPersons')?.value) || 1,
        foodPreference: document.querySelector('input[name="foodPreference"]:checked')?.value || '',
      };

      try {
        // Using GET with encoded URL param — the only CORS-free way to reach Apps Script
        const encodedData = encodeURIComponent(JSON.stringify(formData));
        const url = APPS_SCRIPT_URL + '?data=' + encodedData;

        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow'
        });

        const result = await response.json();
        console.log('Apps Script response:', result);

        if (result.status === 'error') {
          throw new Error(result.message || 'Server error');
        }

        if (loadingOverlay) loadingOverlay.style.display = 'none';

        const successModal = document.getElementById('successModal');
        if (successModal) {
          successModal.style.display = 'flex';
          void successModal.offsetWidth;
          successModal.classList.add('active');
        }

        // Show actual food token from server
        const displayToken = document.getElementById('displayToken');
        if (displayToken) {
          displayToken.textContent = result.foodToken || 'Check your email';
        }

        const displayPersons = document.getElementById('displayPersons');
        if (displayPersons) {
          displayPersons.textContent = `Valid for ${result.totalPersons || formData.totalPersons} person(s)`;
        }

        launchConfetti();
      } catch (error) {
        console.error('Registration error:', error);
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
        showToast('Something went wrong: ' + error.message, 'error');
      }
    });
  }

  // ─────────────────────────────────────────────
  // 8. Confetti Animation
  // ─────────────────────────────────────────────
  function launchConfetti() {
    const confettiColors = ['#f4c430', '#d4a574', '#ffffff', '#ff69b4', '#4a90d9'];
    const confettiCount = 100;
    const container = document.body;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';

      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      const leftPos = Math.random() * 100;
      const size = Math.random() * 8 + 4; // 4-12px
      const duration = Math.random() * 2 + 2; // 2-4s
      const delay = Math.random() * 0.5;
      const rotation = Math.random() * 360;
      const horizontalDrift = (Math.random() - 0.5) * 200;

      Object.assign(confetti.style, {
        position: 'fixed',
        top: '-12px',
        left: `${leftPos}%`,
        width: `${size}px`,
        height: `${size * 0.6}px`,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        zIndex: '10000',
        pointerEvents: 'none',
        opacity: '1',
        transform: `rotate(${rotation}deg)`,
        animation: `confettiFall ${duration}s ease-in ${delay}s forwards`,
      });

      container.appendChild(confetti);

      // Remove after animation
      setTimeout(() => {
        if (confetti.parentNode) confetti.parentNode.removeChild(confetti);
      }, (duration + delay) * 1000 + 200);
    }

    // Inject keyframes if not already present
    if (!document.getElementById('confetti-keyframes')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'confetti-keyframes';
      styleSheet.textContent = `
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg) translateX(0);
            opacity: 1;
          }
          25% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) translateX(${(Math.random() - 0.5) * 200}px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }

  // ─────────────────────────────────────────────
  // 9. Toast Notifications
  // ─────────────────────────────────────────────
  function showToast(message, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.toast-notification').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close notification">&times;</button>
    `;

    // Inject toast styles if not already present
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast-notification {
          position: fixed;
          bottom: 30px;
          right: 30px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          border-radius: 12px;
          color: #fff;
          font-family: inherit;
          font-size: 0.95rem;
          z-index: 10001;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transform: translateX(120%);
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
          opacity: 0;
          max-width: 420px;
        }
        .toast-notification.visible {
          transform: translateX(0);
          opacity: 1;
        }
        .toast-notification.hiding {
          transform: translateX(120%);
          opacity: 0;
        }
        .toast-success {
          background: linear-gradient(135deg, #2d6a4f, #40916c);
          border-left: 4px solid #95d5b2;
        }
        .toast-error {
          background: linear-gradient(135deg, #9b2226, #ae2012);
          border-left: 4px solid #f4a261;
        }
        .toast-info {
          background: linear-gradient(135deg, #1d3557, #457b9d);
          border-left: 4px solid #a8dadc;
        }
        .toast-icon {
          font-size: 1.3rem;
          flex-shrink: 0;
        }
        .toast-message {
          flex: 1;
          line-height: 1.4;
        }
        .toast-close {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.4rem;
          cursor: pointer;
          padding: 0 0 0 8px;
          line-height: 1;
          flex-shrink: 0;
          transition: color 0.2s ease;
        }
        .toast-close:hover {
          color: #fff;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Trigger slide-in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('visible');
      });
    });

    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => dismissToast(toast));
    }

    // Auto-dismiss after 5 seconds
    const autoDismiss = setTimeout(() => dismissToast(toast), 5000);

    function dismissToast(el) {
      clearTimeout(autoDismiss);
      el.classList.remove('visible');
      el.classList.add('hiding');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 400);
    }
  }

  // Make showToast available if needed elsewhere (unlikely but safe)
  window.showToast = showToast;

  // ─────────────────────────────────────────────
  // 10. Success Modal Close
  // ─────────────────────────────────────────────
  const closeModal = document.getElementById('closeModal');
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      const successModal = document.getElementById('successModal');
      if (successModal) {
        successModal.classList.remove('active');
        setTimeout(() => {
          successModal.style.display = 'none';
        }, 300);
      }

      // Reset the form
      if (registrationForm) registrationForm.reset();

      // Reset family fields visibility
      if (familyFields) {
        familyFields.style.display = 'none';
        familyFields.style.maxHeight = '0';
        familyFields.style.opacity = '0';
        familyFields.classList.remove('visible');
      }

      // Re-enable submit button
      const submitBtn = registrationForm?.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = false;

      // Clear all error states
      document.querySelectorAll('.form-group.error').forEach(fg => fg.classList.remove('error'));

      // Go back to step 1
      calculateTotalPersons();
      
    });
  }

  // ─────────────────────────────────────────────
  // 11. CTA Button Smooth Scroll
  // ─────────────────────────────────────────────
  const ctaButton = document.getElementById('cta-register');
  if (ctaButton) {
    ctaButton.addEventListener('click', (e) => {
      e.preventDefault();
      const registerSection = document.getElementById('register');
      if (registerSection) {
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        const targetPosition = registerSection.getBoundingClientRect().top + window.scrollY - navbarHeight;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  }

  // ─────────────────────────────────────────────
  // Countdown Timer
  // ─────────────────────────────────────────────
  const cdDays = document.getElementById('cd-days');
  const cdHours = document.getElementById('cd-hours');
  const cdMins = document.getElementById('cd-mins');
  const cdSecs = document.getElementById('cd-secs');

  if (cdDays && cdHours && cdMins && cdSecs) {
    const eventDate = new Date('July 18, 2026 10:00:00').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = eventDate - now;

      if (distance < 0) {
        cdDays.innerText = '00';
        cdHours.innerText = '00';
        cdMins.innerText = '00';
        cdSecs.innerText = '00';
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((distance % (1000 * 60)) / 1000);

      cdDays.innerText = days.toString().padStart(2, '0');
      cdHours.innerText = hours.toString().padStart(2, '0');
      cdMins.innerText = mins.toString().padStart(2, '0');
      cdSecs.innerText = secs.toString().padStart(2, '0');
    };

    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  // ─────────────────────────────────────────────
  // Initialize: show step 1 on load
  // ─────────────────────────────────────────────
  
});
