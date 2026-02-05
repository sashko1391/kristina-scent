// KRISTINA | SCENT â€” JavaScript
// Mobile menu, smooth scroll, active states

document.addEventListener('DOMContentLoaded', function() {
    
    // ========================================
    // HERO SLIDER
    // ========================================
    const slider = document.querySelector('.hero-slider');
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const prevBtn = document.querySelector('.hero-arrow-prev');
    const nextBtn = document.querySelector('.hero-arrow-next');
    
    if (slider && slides.length > 0 && dots.length > 0) {
        let currentSlide = 0;
        let autoplayInterval;
        const autoplayDelay = 5000; // 5 seconds
        
        function showSlide(index) {
            // Remove active class from all slides and dots
            slides.forEach(slide => slide.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            
            // Add active class to current slide and dot
            slides[index].classList.add('active');
            dots[index].classList.add('active');
            
            currentSlide = index;
        }
        
        function nextSlide() {
            const next = (currentSlide + 1) % slides.length;
            showSlide(next);
        }
        
        function prevSlide() {
            const prev = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(prev);
        }
        
        // Arrow navigation
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                nextSlide();
                resetAutoplay();
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                prevSlide();
                resetAutoplay();
            });
        }
        
        // Dots navigation
        dots.forEach((dot, index) => {
            dot.addEventListener('click', function() {
                showSlide(index);
                resetAutoplay();
            });
        });
        
        // Autoplay
        function startAutoplay() {
            autoplayInterval = setInterval(nextSlide, autoplayDelay);
        }
        
        function stopAutoplay() {
            clearInterval(autoplayInterval);
        }
        
        function resetAutoplay() {
            stopAutoplay();
            startAutoplay();
        }
        
        // Start autoplay on load
        startAutoplay();
        
        // Pause autoplay on hover
        if (slider) {
            slider.addEventListener('mouseenter', stopAutoplay);
            slider.addEventListener('mouseleave', startAutoplay);
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                prevSlide();
                resetAutoplay();
            } else if (e.key === 'ArrowRight') {
                nextSlide();
                resetAutoplay();
            }
        });
        
        // Touch/swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;
        
        if (slider) {
            slider.addEventListener('touchstart', function(e) {
                touchStartX = e.changedTouches[0].screenX;
            });
            
            slider.addEventListener('touchend', function(e) {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            });
        }
        
        function handleSwipe() {
            if (touchEndX < touchStartX - 50) {
                // Swipe left
                nextSlide();
                resetAutoplay();
            }
            if (touchEndX > touchStartX + 50) {
                // Swipe right
                prevSlide();
                resetAutoplay();
            }
        }
    }
    
    // ========================================
    // FEEDBACK SLIDER
    // ========================================
    const feedbackSlider = document.querySelector('.feedback-slider');
    const feedbackTrack = document.querySelector('.feedback-track');
    const feedbackItems = document.querySelectorAll('.feedback-item');
    const feedbackPrevBtn = document.querySelector('.feedback-arrow-prev');
    const feedbackNextBtn = document.querySelector('.feedback-arrow-next');
    
    if (feedbackTrack && feedbackItems.length > 0) {
        let feedbackCurrentIndex = 0;
        const feedbackItemWidth = feedbackItems[0].offsetWidth;
        const feedbackGap = 16; // gap between items in px
        
        function updateFeedbackSlider() {
            const offset = feedbackCurrentIndex * (feedbackItemWidth + feedbackGap);
            feedbackTrack.style.transform = `translateX(-${offset}px)`;
        }
        
        function feedbackNext() {
            if (feedbackCurrentIndex < feedbackItems.length - 1) {
                feedbackCurrentIndex++;
                updateFeedbackSlider();
            }
        }
        
        function feedbackPrev() {
            if (feedbackCurrentIndex > 0) {
                feedbackCurrentIndex--;
                updateFeedbackSlider();
            }
        }
        
        // Arrow navigation
        if (feedbackNextBtn) {
            feedbackNextBtn.addEventListener('click', feedbackNext);
        }
        
        if (feedbackPrevBtn) {
            feedbackPrevBtn.addEventListener('click', feedbackPrev);
        }
        
        // Touch/swipe support
        let feedbackTouchStartX = 0;
        let feedbackTouchEndX = 0;
        
        if (feedbackSlider) {
            feedbackSlider.addEventListener('touchstart', function(e) {
                feedbackTouchStartX = e.changedTouches[0].screenX;
            });
            
            feedbackSlider.addEventListener('touchend', function(e) {
                feedbackTouchEndX = e.changedTouches[0].screenX;
                handleFeedbackSwipe();
            });
        }
        
        function handleFeedbackSwipe() {
            if (feedbackTouchEndX < feedbackTouchStartX - 50) {
                feedbackNext();
            }
            if (feedbackTouchEndX > feedbackTouchStartX + 50) {
                feedbackPrev();
            }
        }
        
        // Recalculate on window resize
        window.addEventListener('resize', function() {
            updateFeedbackSlider();
        });
    }
    
    // ========================================
    // MOBILE MENU
    // ========================================
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Toggle mobile menu
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            menuToggle.classList.toggle('active');
            nav.classList.toggle('active');
            document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        });
    }
    
    // Close menu when clicking nav link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 768) {
                menuToggle.classList.remove('active');
                nav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // Close menu on window resize if desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768) {
            menuToggle.classList.remove('active');
            nav.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
    
    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#"
            if (href === '#') {
                e.preventDefault();
                return;
            }
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Active Navigation on Scroll
    const sections = document.querySelectorAll('section[id]');
    
    function setActiveNav() {
        const scrollY = window.pageYOffset;
        
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
            
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => link.classList.remove('active'));
                if (navLink) {
                    navLink.classList.add('active');
                }
            }
        });
    }
    
    window.addEventListener('scroll', setActiveNav);
    
    // Initial check
    setActiveNav();
    
    // Add simple fade-in animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe category cards, features, products, and other elements
    const animatedElements = document.querySelectorAll('.category-large-card, .feature, .contact-item, .product-card, .instagram-photo');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
});
