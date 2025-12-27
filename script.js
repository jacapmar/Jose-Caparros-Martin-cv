// Make navbar shrink on scroll + enable ScrollSpy + close menu on mobile
window.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('#mainNav');

  // Shrink behavior
  const shrink = () => {
    if (!navbar) return;
    if (window.scrollY === 0) navbar.classList.remove('navbar-shrink');
    else navbar.classList.add('navbar-shrink');
  };
  shrink();
  document.addEventListener('scroll', shrink, {passive: true});

  // ScrollSpy (highlights active menu item while scrolling)
  if (navbar) new bootstrap.ScrollSpy(document.body, { target: '#mainNav', offset: 74 });

  // Auto-close mobile menu after clicking a link
  const navbarToggler = document.querySelector('.navbar-toggler');
  document.querySelectorAll('#navbarResponsive .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.getComputedStyle(navbarToggler).display !== 'none') navbarToggler.click();
    });
  });

  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

// ---- PubMed → Publications list ----

const PUBMED_TERM = 'Caparros-Martin [Author]'; 
const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

// Simple HTML escaping to avoid injecting unexpected text into innerHTML
const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

async function loadPublications(){
  const listEl = document.getElementById('pub-list');
  const noteEl = document.getElementById('pub-note');
  if(!listEl) return;

  try{
    // 1) IDs by date (newest first)
    const esearchUrl = `${PUBMED_BASE}/esearch.fcgi?db=pubmed&retmode=json&sort=pubdate&retmax=200&term=${encodeURIComponent(PUBMED_TERM)}`;
    const es = await fetch(esearchUrl).then(r=>r.json());
    const ids = es?.esearchresult?.idlist || [];
    if(!ids.length){ noteEl.textContent='No PubMed results for this query.'; return; }

    // 2) Summaries
    const esumUrl = `${PUBMED_BASE}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`;
    const sum = await fetch(esumUrl).then(r=>r.json());
    const result = sum.result || {};

    // 3) Normalize → group by year
    const groups = {}; // {year: [html, ...]}
    ids.forEach(id=>{
      const it = result[id];
      if(!it) return;

      const title   = it.title || '(No title)';
      const journal = (it.fulljournalname || it.source || '').trim();
      const year    = (it.pubdate || '').slice(0,4) || 'In press';
      const authors = (it.authors||[]).map(a=>a.name).slice(0,6).join(', ')
                      + ((it.authors||[]).length>6 ? ', et al.' : '');

      // DOI (if any)
      let doi = '';
      if(Array.isArray(it.articleids)){
        const d = it.articleids.find(a=>a.idtype==='doi');
        if(d?.value) doi = d.value;
      }
      const doiLink = doi ? ` <a href="https://doi.org/${doi}" target="_blank" rel="noopener">DOI</a>` : '';

      const itemHTML = `<li>${authors}. <em>${title}</em>. <strong>${journal}</strong>${year ? `, ${year}`:''}.${doiLink}</li>`;
      (groups[year] ||= []).push(itemHTML);
    });

    // 4) Render years (desc)
    const years = Object.keys(groups).sort((a,b)=> (b>a?1:-1));
    listEl.innerHTML = years.map(y=>`
      <li class="pub-year">${y}</li>
      <ul class="pub-items">
        ${groups[y].join('\n')}
      </ul>
    `).join('\n');

    noteEl.textContent = 'Loaded from PubMed (grouped by year).';
  }catch(err){
    console.error(err);
    noteEl.textContent = 'Could not load from PubMed.';
  }
}

document.addEventListener('DOMContentLoaded', loadPublications);