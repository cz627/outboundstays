/* Outbound Stays — shared Luxe navbar + Follow-us panel.
   Mount with: <nav id="site-nav" data-active="explore"></nav>
   Load qrcode lib before this file for the QR; degrades gracefully if absent. */
(function(){
  // Route external target=_blank links through window.open so sandboxed previews
  // open a real top-level tab instead of trying (and failing) to frame them.
  if(!window.__extLinkHandler){
    window.__extLinkHandler = true;
    document.addEventListener('click', e=>{
      const a = e.target.closest('a[target="_blank"]');
      if(a && /^https?:/i.test(a.getAttribute('href')||'')){
        e.preventDefault();
        window.open(a.href,'_blank','noopener,noreferrer');
      }
    });
    // Safe image fallback: if any photo fails to load, hide it so the container's
    // neutral background shows — never swap in another hotel's photo (which would
    // mislabel it). Curated/dark sections are pre-verified separately.
    document.addEventListener('error', e=>{
      const t = e.target;
      if(t && t.tagName==='IMG' && !t.dataset.failed){
        const s = t.getAttribute('src') || '';
        if(!/^https?:|^data:/i.test(s)) return; // ignore empty / not-yet-set images
        t.dataset.failed = '1';
        t.style.opacity = '0';
      }
    }, true);
  }

  const mount = document.getElementById('site-nav');
  if(!mount) return;
  const active = mount.dataset.active || '';
  const A = k => active===k ? ' active' : '';

  mount.className = 'nav';
  mount.innerHTML = `
  <div class="nav-inner">
    <button class="nav-burger" id="navBurger" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <div class="nav-left">
      <a href="explore.html" class="nav-link${A('explore')}">Explore map</a>
      <a href="destinations.html" class="nav-link${A('destinations')}">Destinations</a>
    </div>
    <div class="nav-center"><a href="index.html" class="wordmark">Outbound <span class="thin">Stays</span></a></div>
    <div class="nav-right">
      <a href="experiences.html" class="nav-link${A('experiences')}">Experiences</a>
      <div class="nav-item follow" id="followItem">
        <button class="follow-trigger" id="followBtn" aria-haspopup="true" aria-expanded="false">Follow
          <svg class="chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="follow-panel">
          <div class="qr-wrap"><div id="followQR"></div><span class="qr-badge">OS</span></div>
          <div class="follow-txt">
            <h4>Follow the journey</h4>
            <p>New stays, quiet corners of the world and travel stories — scan to follow along.</p>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  // QR code (scannable). Degrades to the badge alone if lib missing.
  try{
    if(window.QRCode){
      new QRCode(document.getElementById('followQR'),{
        text:'https://www.instagram.com/outboundstays',
        width:128,height:128,
        colorDark:'#1B1A17',colorLight:'#ffffff',
        correctLevel:QRCode.CorrectLevel.H
      });
    }
  }catch(e){}

  // touch / click toggle
  const item = document.getElementById('followItem');
  const btn = document.getElementById('followBtn');
  btn.addEventListener('click', e=>{
    e.preventDefault();
    const open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e=>{ if(!item.contains(e.target)) item.classList.remove('open'); });

  /* ---- Mobile slide-in menu ---- */
  const burger = document.getElementById('navBurger');
  if(burger && !document.getElementById('mMenu')){
    const menu = document.createElement('div');
    menu.id = 'mMenu';
    menu.className = 'm-menu';
    menu.innerHTML = `
      <div class="m-menu-overlay" data-mclose></div>
      <div class="m-menu-panel">
        <button class="m-close" data-mclose aria-label="Close menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
        <nav class="m-nav">
          <a class="m-link${A('explore')}" href="explore.html">Explore map</a>
          <a class="m-link${A('destinations')}" href="destinations.html">Destinations</a>
          <a class="m-link${A('experiences')}" href="experiences.html">Experiences</a>
          <a class="m-link${A('list')}" href="list-hotel.html">List your hotel</a>
        </nav>
        <a class="btn btn-dark m-news" href="https://www.instagram.com/outboundstays/" target="_blank" rel="noopener">Instagram</a>
      </div>`;
    document.body.appendChild(menu);

    const openM = ()=>{ menu.classList.add('open'); document.body.style.overflow='hidden'; burger.setAttribute('aria-expanded','true'); };
    const closeM = ()=>{ menu.classList.remove('open'); document.body.style.overflow=''; burger.setAttribute('aria-expanded','false'); };
    burger.addEventListener('click', openM);
    menu.addEventListener('click', e=>{ if(e.target.closest('[data-mclose], a')) closeM(); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeM(); });
  }

  /* ---- Newsletter modal (shared across pages) ---- */
  if(!document.getElementById('nl-modal')){
    const modal = document.createElement('div');
    modal.id = 'nl-modal';
    modal.className = 'nl-modal';
    modal.innerHTML = `
      <div class="nl-overlay" data-nl-close></div>
      <div class="nl-card" role="dialog" aria-modal="true" aria-label="Newsletter sign-up">
        <button class="nl-x" data-nl-close aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
        <div class="nl-form-side">
          <span class="eyebrow">The Outbound Letter</span>
          <h3>A few of our<br><em>favourite places</em></h3>
          <p>New stays, quiet corners of the world and the occasional travel story — once or twice a month, never more. No noise.</p>
          <form class="nl-form" id="nlForm" novalidate>
            <div class="nl-field">
              <input type="email" id="nlEmail" name="email" placeholder="Your email address" autocomplete="email" required>
              <button type="submit">Subscribe</button>
            </div>
            <input type="hidden" name="_subject" value="New Outbound Letter subscriber">
            <span class="nl-note">By subscribing you agree to receive occasional emails from Outbound Stays. Unsubscribe anytime.</span>
            <span class="nl-err">Something went wrong — please try again, or email us directly.</span>
          </form>
          <div class="nl-done" id="nlDone">
            <div class="nl-check"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m5 13 4 4L19 7"/></svg></div>
            <h4>You're on the list.</h4>
            <p>Look out for our next letter landing soon. In the meantime, the whole collection is yours to wander.</p>
          </div>
        </div>
        <div class="nl-art"><img src="uploads/countryside.avif" alt=""><span class="nl-art-tag">a few of our favourite places</span></div>
      </div>`;
    document.body.appendChild(modal);

    const open = ()=>{ modal.classList.add('open'); document.body.style.overflow='hidden'; setTimeout(()=>document.getElementById('nlEmail').focus(),120); };
    const close = ()=>{ modal.classList.remove('open'); document.body.style.overflow=''; };
    window.openNewsletter = open;

    document.addEventListener('click', e=>{
      const t = e.target.closest('[data-newsletter], a[href="#newsletter"]');
      if(t){ e.preventDefault(); open(); }
      if(e.target.closest('[data-nl-close]')) close();
    });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });

    const form = document.getElementById('nlForm');
    const NL_ENDPOINT = 'https://formspree.io/f/mqeodrlj';
    form.addEventListener('submit', async e=>{
      e.preventDefault();
      const email = document.getElementById('nlEmail');
      const btn = form.querySelector('button[type="submit"]');
      if(!email.value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)){ email.focus(); email.classList.add('err'); return; }
      email.classList.remove('err');
      form.classList.remove('nl-fail');
      btn.disabled = true; const label = btn.textContent; btn.textContent = 'Subscribing…';
      try{
        const res = await fetch(NL_ENDPOINT, {
          method:'POST',
          headers:{ 'Accept':'application/json' },
          body: new FormData(form)
        });
        if(!res.ok) throw new Error('bad status '+res.status);
        form.style.display='none';
        document.getElementById('nlDone').classList.add('show');
      }catch(err){
        btn.disabled = false; btn.textContent = label;
        form.classList.add('nl-fail');
      }
    });
  }
})();
