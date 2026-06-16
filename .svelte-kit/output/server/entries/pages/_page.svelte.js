import { O as ensure_array_like, P as attr_style, Q as stringify } from "../../chunks/index.js";
import "../../chunks/gameUiStore.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.5 + Math.random() * 2,
      delay: Math.random() * 5
    }));
    $$renderer2.push(`<div class="home svelte-1uha8ag"><div class="bg-grid svelte-1uha8ag"></div> <!--[-->`);
    const each_array = ensure_array_like(stars);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let star = each_array[$$index];
      $$renderer2.push(`<div class="star svelte-1uha8ag"${attr_style(`left: ${stringify(star.x)}%; top: ${stringify(star.y)}%; width: ${stringify(star.size)}px; height: ${stringify(star.size)}px; animation-delay: ${stringify(star.delay)}s;`)}></div>`);
    }
    $$renderer2.push(`<!--]--> <div class="hero svelte-1uha8ag"><div class="hero-glow svelte-1uha8ag"></div> <div class="hero-glow-secondary svelte-1uha8ag"></div> <div class="hero-content svelte-1uha8ag"><div class="title-badge svelte-1uha8ag">Alpha v0.1</div> <h1 class="title svelte-1uha8ag"><span class="title-emoji svelte-1uha8ag">🐨</span> <span class="title-text svelte-1uha8ag">KoalaTower</span></h1> <p class="subtitle svelte-1uha8ag">Neon Cyber Idle Tower Defense</p> <p class="description svelte-1uha8ag">Defend the tower against endless waves of digital enemies.
				Upgrade your defenses, research new technologies, and climb the tiers.</p> <div class="cta-buttons svelte-1uha8ag"><a href="/play" class="btn-primary svelte-1uha8ag"><span class="btn-icon svelte-1uha8ag">▶</span> <span class="btn-label svelte-1uha8ag">Play Now</span></a> <a href="/privacy" class="btn-secondary svelte-1uha8ag"><span class="btn-label svelte-1uha8ag">Privacy</span></a></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div> <div class="features svelte-1uha8ag"><div class="feature-card svelte-1uha8ag"><div class="feature-icon-wrap svelte-1uha8ag"><div class="feature-icon-bg svelte-1uha8ag" style="background: linear-gradient(135deg, rgba(0,255,255,0.15), rgba(68,136,255,0.05));"></div> <span class="feature-icon svelte-1uha8ag">🏗️</span></div> <h3 class="svelte-1uha8ag">Build &amp; Upgrade</h3> <p class="svelte-1uha8ag">Strengthen your tower with battle upgrades mid-run and permanent workshop upgrades.</p></div> <div class="feature-card svelte-1uha8ag"><div class="feature-icon-wrap svelte-1uha8ag"><div class="feature-icon-bg svelte-1uha8ag" style="background: linear-gradient(135deg, rgba(68,255,136,0.15), rgba(0,255,255,0.05));"></div> <span class="feature-icon svelte-1uha8ag">🌊</span></div> <h3 class="svelte-1uha8ag">Endless Waves</h3> <p class="svelte-1uha8ag">Face increasingly difficult waves with 5 unique enemy types and escalating rewards.</p></div> <div class="feature-card svelte-1uha8ag"><div class="feature-icon-wrap svelte-1uha8ag"><div class="feature-icon-bg svelte-1uha8ag" style="background: linear-gradient(135deg, rgba(136,68,255,0.15), rgba(255,68,170,0.05));"></div> <span class="feature-icon svelte-1uha8ag">🔬</span></div> <h3 class="svelte-1uha8ag">Research &amp; Progress</h3> <p class="svelte-1uha8ag">Unlock labs, tiers, milestones, and challenges as you grow stronger.</p></div></div> <footer class="footer svelte-1uha8ag"><p class="svelte-1uha8ag">All data stored locally in your browser. No tracking, no cookies.</p> <a href="/privacy" class="footer-link svelte-1uha8ag">Privacy Policy</a></footer></div>`);
  });
}
export {
  _page as default
};
