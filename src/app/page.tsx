"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { T, Locale, TranslationKey } from "@/lib/translations";
import { 
  WhatsappLogo, PlayCircle, HouseLine, Storefront, HandbagSimple, 
  Buildings, CurrencyDollarSimple, ForkKnife, DeviceMobileCamera, 
  FilmSlate, MagicWand, Palette, Briefcase, Envelope, 
  InstagramLogo, MapPin, PaperPlaneTilt, ArrowUpRight 
} from "@phosphor-icons/react/dist/ssr";
import ReelCard from "@/components/ReelCard";

export default function Home() {
  const [lang, setLang] = useState<Locale>('pt');
  const t = (k: TranslationKey) => T[lang][k];

  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hparRef = useRef<HTMLDivElement>(null);
  
  const [cursorPos, setCursorPos] = useState({ x: -200, y: -200 });
  const [ringPos, setRingPos] = useState({ x: -200, y: -200 });
  const [isHovering, setIsHovering] = useState(false);

  // Form
  const [formMsg, setFormMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    // Scroll progress
    const handleScroll = () => {
      const sp = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      setScrollProgress(sp);
      
      if (window.scrollY < window.innerHeight && hparRef.current) {
        hparRef.current.style.transform = `translateY(${window.scrollY * 0.28}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Cursor
    let rx = ringPos.x;
    let ry = ringPos.y;
    let animFrame: number;
    let mx = -200, my = -200;

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      setCursorPos({ x: mx, y: my });
    };
    
    const animC = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      setRingPos({ x: rx, y: ry });
      animFrame = requestAnimationFrame(animC);
    };
    
    if (window.innerWidth > 768) {
      document.addEventListener("mousemove", onMouseMove);
      animFrame = requestAnimationFrame(animC);
    }
    
    // Observers
    const rvObs = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("vis");
          rvObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    
    setTimeout(() => {
      document.querySelectorAll(".rv").forEach((el) => rvObs.observe(el));
    }, 1000);

    // Number counters
    const cntObs = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          animNum(e.target as HTMLElement);
          cntObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });

    setTimeout(() => {
      document.querySelectorAll("[data-count]").forEach((el) => cntObs.observe(el));
    }, 1000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(animFrame);
      rvObs.disconnect();
      cntObs.disconnect();
    };
  }, []);

  // Canvas
  useEffect(() => {
    if (window.innerWidth > 768 && canvasRef.current) {
      const cv = canvasRef.current;
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      
      let W = 0, H = 0;
      const rsz = () => {
        W = cv.width = cv.offsetWidth;
        H = cv.height = cv.offsetHeight;
      };
      rsz();
      window.addEventListener('resize', rsz);
      
      const pts = Array.from({length: 60}, () => ({
        x: Math.random() * 1920, 
        y: Math.random() * 1080, 
        vx: (Math.random() - 0.5) * 0.4, 
        vy: (Math.random() - 0.5) * 0.4, 
        r: Math.random() * 1.4 + 0.4, 
        a: Math.random() * 0.45 + 0.1
      }));
      
      let reqId: number;
      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        pts.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; 
          if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
          ctx.beginPath(); ctx.arc(p.x % W, p.y % H, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(71,241,228,${p.a})`; ctx.fill();
        });
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 110) {
              ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
              ctx.strokeStyle = `rgba(71,241,228,${0.06 * (1 - d / 110)})`; ctx.lineWidth = 0.5; ctx.stroke();
            }
          }
        }
        reqId = requestAnimationFrame(draw);
      };
      
      draw();
      return () => {
        window.removeEventListener('resize', rsz);
        cancelAnimationFrame(reqId);
      };
    }
  }, []);

  // Loader & Scramble
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const brand = "SHIFT CREATIV3";
    let li = 0;
    
    // Ensure loader works smoothly in React
    const ltxt = document.getElementById("loader-txt");
    if(!ltxt) return;

    const typeIt = () => {
      if (li < brand.length && ltxt) {
        const s = document.createElement("span");
        s.textContent = brand[li];
        ltxt.appendChild(s);
        requestAnimationFrame(() => (s.style.opacity = "1"));
        li++;
        setTimeout(typeIt, 75);
      } else {
        setTimeout(() => {
          setLoading(false);
          document.body.style.overflow = "";
          doScramble();
        }, 380);
      }
    };
    const tId = setTimeout(typeIt, 250);
    return () => clearTimeout(tId);
  }, []);

  const animNum = (el: HTMLElement) => {
    const target = +(el.dataset.count || 0);
    const suf = el.dataset.suf || "+";
    const dur = 1800;
    const t0 = performance.now();
    
    const step = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(e * target) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    step(t0);
  };

  const doScramble = () => {
    const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const scrambleEl = (el: Element) => {
      const orig = el.textContent || ""; 
      let f = 0; 
      const tot = 18;
      
      const step = () => {
        if (f >= tot) { el.textContent = orig; return; }
        el.textContent = orig.split("").map((c, i) => {
          if (c === " ") return " ";
          if (f / tot > i / orig.length) return c;
          return CH[Math.floor(Math.random() * CH.length)];
        }).join("");
        f++; setTimeout(step, 40);
      };
      step();
    };
    document.querySelectorAll("[data-sc]").forEach((el, i) => setTimeout(() => scrambleEl(el), i * 200));
  };

  const handleHover = (state: boolean) => () => setIsHovering(state);

  const sendForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const n = fd.get('fnome') as string;
    const em = fd.get('femail') as string;
    const emp = fd.get('femp') as string;
    const tp = fd.get('ftipo') as string;
    const mg = fd.get('fmsg') as string;
    
    if (!n || !em || !tp || !mg) {
      setFormMsg({ text: t('f.err'), type: 'err' });
      return;
    }
    
    const sub = encodeURIComponent(`Orçamento - ${tp} - ${n}`);
    const body = encodeURIComponent(`Nome: ${n}\nEmail: ${em}\nEmpresa: ${emp}\nTipo: ${tp}\n\n${mg}`);
    window.location.href = `mailto:geral@shiftcreativ3.com?subject=${sub}&body=${body}`;
    setFormMsg({ text: t('f.ok'), type: 'ok' });
  };

  return (
    <>
      <div id="cur-dot" style={{ left: cursorPos.x, top: cursorPos.y, width: isHovering ? 14 : 8, height: isHovering ? 14 : 8 }}></div>
      <div id="cur-ring" style={{ left: ringPos.x, top: ringPos.y, width: isHovering ? 56 : 36, height: isHovering ? 56 : 36, borderColor: isHovering ? 'rgba(71,241,228,.8)' : '' }}></div>
      <div id="spb" style={{ width: `${scrollProgress}%` }}></div>

      <div id="loader" className={!loading ? "gone" : ""}>
        <img src="/logo.png" alt="Shift Creativ3" id="loader-logo" />
        <div id="loader-txt"></div>
      </div>

      <nav id="nav">
        <div className="nav-in">
          <a href="#hero" className="nav-logo" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
            <img src="/logo.png" alt="Shift Creativ3" loading="lazy" />
          </a>
          <ul className="nav-links">
            <li><a href="#portfolio" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>{t('nav.portfolio')}</a></li>
            <li><a href="#servicos" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>{t('nav.services')}</a></li>
            <li><a href="#processo" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>{t('nav.process')}</a></li>
            <li><a href="#contacto" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>{t('nav.contact')}</a></li>
          </ul>
          <div className="nav-r">
            <div className="lang-t">
              <button className={`lang-b ${lang === 'pt' ? 'on' : ''}`} onClick={() => setLang('pt')} onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>PT</button>
              <button className={`lang-b ${lang === 'en' ? 'on' : ''}`} onClick={() => setLang('en')} onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>EN</button>
            </div>
            <a href="https://wa.me/351929071925?text=Ol%C3%A1%2C%20gostaria%20de%20pedir%20um%20or%C3%A7amento%20de%20v%C3%ADdeo." className="btn-wa" target="_blank" rel="noopener" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <WhatsappLogo weight="bold" /><span>{t('nav.cta')}</span>
            </a>
          </div>
          <div className="ham" onClick={() => setMenuOpen(!menuOpen)}><span></span><span></span><span></span></div>
        </div>
        <div className={`mob-menu ${menuOpen ? 'open' : ''}`} id="mob">
          <a href="#portfolio" onClick={() => setMenuOpen(false)}>{t('nav.portfolio')}</a>
          <a href="#servicos" onClick={() => setMenuOpen(false)}>{t('nav.services')}</a>
          <a href="#processo" onClick={() => setMenuOpen(false)}>{t('nav.process')}</a>
          <a href="#depoimentos" onClick={() => setMenuOpen(false)}>{t('t.label')}</a>
          <a href="#contacto" onClick={() => setMenuOpen(false)}>{t('nav.contact')}</a>
          <a href="https://wa.me/351929071925" target="_blank" rel="noopener" style={{color: 'var(--teal)'}}>{t('nav.cta')} WhatsApp</a>
        </div>
      </nav>

      <section id="hero">
        <canvas id="hero-canvas" ref={canvasRef}></canvas>
        <div className="mgrid"></div>
        <div className="hero-c" id="hpar" ref={hparRef}>
          <span className="hlabel rv">{t('hero.label')}</span>
          <h1 className="htitle rv d1">
            <span data-sc>{t('hero.h1')}</span><br />
            <span className="ac" data-sc>{t('hero.h2')}</span>
          </h1>
          <p className="hsub rv d2">{t('hero.sub')}</p>
          <div className="hctas rv d3">
            <a href="https://wa.me/351929071925" className="btn-p" target="_blank" rel="noopener" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <WhatsappLogo weight="bold" /><span>{t('hero.cta1')}</span>
            </a>
            <a href="#portfolio" className="btn-s" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <PlayCircle weight="bold" /><span>{t('hero.cta2')}</span>
            </a>
          </div>
          <div className="hstats rv d4">
            <div><div className="stat-n" data-count="100" data-suf="+">0+</div><div className="stat-l">{t('hero.s1')}</div></div>
            <div><div className="stat-n" data-count="50" data-suf="+">0+</div><div className="stat-l">{t('hero.s2')}</div></div>
            <div><div className="stat-n" data-count="3" data-suf="x">0x</div><div className="stat-l">{t('hero.s3')}</div></div>
          </div>
        </div>
        <div className="hscroll"><div className="hscroll-line"></div><span>{t('hero.scroll')}</span></div>
      </section>

      <section id="portfolio">
        <div className="si">
          <div className="ph">
            <span className="slabel rv">{t('p.label')}</span>
            <h2 className="stitle rv d1">{t('p.title')}</h2>
            <p className="ssub rv d2">{t('p.sub')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2 mt-8 w-full">
            <ReelCard 
              link="https://www.instagram.com/reel/DWCLUh7CL22/"
              title="Da Ruína ao Sonho"
              poster="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1080&auto=format&fit=crop"
              videoSrc="https://www.w3schools.com/html/mov_bbb.mp4" 
            />
            
            <ReelCard 
              link="https://www.instagram.com/reel/DVV21WgiP9V/"
              title="Sua Loja, Seu Sucesso"
              poster="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1080&auto=format&fit=crop"
              videoSrc="" 
            />

            <ReelCard 
              link="https://www.instagram.com/reel/DVYy9CqiKkm/"
              title="Sua Roupa, Nossa Magia"
              poster="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1080&auto=format&fit=crop"
              videoSrc="" 
            />

            <ReelCard 
              link="https://www.instagram.com/reel/DVUn4iRCNHc/"
              title="Do Terreno à Realidade"
              poster="https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=1080&auto=format&fit=crop"
              videoSrc="" 
            />

            <ReelCard 
              link="https://www.instagram.com/reel/DVuQPRPCEZB/"
              title="Valorize o Seu Património"
              poster="https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?q=80&w=1080&auto=format&fit=crop"
              videoSrc="" 
            />

            <ReelCard 
              link="https://www.instagram.com/reel/DVMcZVYCL9A/"
              title="Provar com os Olhos"
              poster="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1080&auto=format&fit=crop"
              videoSrc="" 
            />

          </div>
          <div style={{textAlign: "center", marginTop: "3rem"}} className="rv">
            <a href="https://www.instagram.com/shiftcreativ3/" target="_blank" rel="noopener" className="btn-p" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <InstagramLogo weight="bold" />
              <span>Ver portfólio completo no Instagram</span>
            </a>
          </div>
        </div>
      </section>

      <section id="servicos">
        <div className="mgrid" style={{opacity: 0.4}}></div>
        <div className="si">
          <span className="slabel rv">{t('s.label')}</span>
          <h2 className="stitle rv d1">{t('s.title')}</h2>
          <p className="ssub rv d2">{t('s.sub')}</p>
          <div className="sg">
            <div className="sc rv" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <div className="sico"><DeviceMobileCamera weight="bold" /></div>
              <div className="sname">{t('s.1n')}</div><p className="sdesc">{t('s.1d')}</p>
            </div>
            <div className="sc rv d1" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <div className="sico"><FilmSlate weight="bold" /></div>
              <div className="sname">{t('s.2n')}</div><p className="sdesc">{t('s.2d')}</p>
            </div>
            <div className="sc rv d2" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <div className="sico"><Buildings weight="bold" /></div>
              <div className="sname">{t('s.3n')}</div><p className="sdesc">{t('s.3d')}</p>
            </div>
            <div className="sc rv d3" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <div className="sico"><MagicWand weight="bold" /></div>
              <div className="sname">{t('s.4n')}</div><p className="sdesc">{t('s.4d')}</p>
            </div>
            <div className="sc rv d4" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <div className="sico"><Palette weight="bold" /></div>
              <div className="sname">{t('s.5n')}</div><p className="sdesc">{t('s.5d')}</p>
            </div>
            <div className="sc rv d5" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <div className="sico"><Briefcase weight="bold" /></div>
              <div className="sname">{t('s.6n')}</div><p className="sdesc">{t('s.6d')}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="processo">
        <div className="si">
          <span className="slabel rv">{t('pr.label')}</span>
          <h2 className="stitle rv d1">{t('pr.title')}</h2>
          <p className="ssub rv d2">{t('pr.sub')}</p>
          <div className="ptl">
            <div className="ps rv"><div className="pnum">01</div><div className="ptitle">{t('pr.1t')}</div><p className="pdesc">{t('pr.1d')}</p></div>
            <div className="ps rv d1"><div className="pnum">02</div><div className="ptitle">{t('pr.2t')}</div><p className="pdesc">{t('pr.2d')}</p></div>
            <div className="ps rv d2"><div className="pnum">03</div><div className="ptitle">{t('pr.3t')}</div><p className="pdesc">{t('pr.3d')}</p></div>
            <div className="ps rv d3"><div className="pnum">04</div><div className="ptitle">{t('pr.4t')}</div><p className="pdesc">{t('pr.4d')}</p></div>
          </div>
        </div>
      </section>

      <section id="depoimentos">
        <div className="si">
          <span className="slabel rv">{t('t.label')}</span>
          <h2 className="stitle rv d1">{t('t.title')}</h2>
          <div className="tg">
            <div className="tc rv" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <div className="qmark">"</div>
              <p className="ttext">{t('t.1')}</p>
              <div className="tauth"><div className="tav">MC</div><div><div className="taname">{t('t.1n')}</div><div className="tarole">{t('t.1r')}</div></div></div>
            </div>
            <div className="tc rv d1" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <div className="qmark">"</div>
              <p className="ttext">{t('t.2')}</p>
              <div className="tauth"><div className="tav">JF</div><div><div className="taname">{t('t.2n')}</div><div className="tarole">{t('t.2r')}</div></div></div>
            </div>
            <div className="tc rv d2" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <div className="qmark">"</div>
              <p className="ttext">{t('t.3')}</p>
              <div className="tauth"><div className="tav">AS</div><div><div className="taname">{t('t.3n')}</div><div className="tarole">{t('t.3r')}</div></div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="contacto">
        <div className="si">
          <div className="cg">
            <div>
              <span className="slabel rv">{t('c.label')}</span>
              <h2 className="stitle rv d1">{t('c.title')}</h2>
              <p className="ssub rv d2" style={{marginBottom: "2.5rem"}}>{t('c.sub')}</p>
              <div className="rv d3">
                <div className="cii"><WhatsappLogo weight="bold" /><div><div className="cil">WhatsApp</div><div className="civ">+351 929 071 925</div></div></div>
                <div className="cii"><Envelope weight="bold" /><div><div className="cil">Email</div><div className="civ">geral@shiftcreativ3.com</div></div></div>
                <div className="cii"><InstagramLogo weight="bold" /><div><div className="cil">Instagram</div><div className="civ">@shiftcreativ3</div></div></div>
                <div className="cii"><MapPin weight="bold" /><div><div className="cil">{t('c.loc')}</div><div className="civ">Portugal</div></div></div>
              </div>
            </div>
            <div className="rv d2">
              <form id="cform" onSubmit={sendForm}>
                <div className="frow">
                  <div className="fg"><label htmlFor="fnome">{t('f.name')}</label><input type="text" id="fnome" name="fnome" placeholder={lang === 'pt' ? 'O teu nome' : 'Your name'} onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)} required /></div>
                  <div className="fg"><label htmlFor="femail">Email</label><input type="email" id="femail" name="femail" placeholder="email@empresa.pt" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)} required /></div>
                </div>
                <div className="fg"><label htmlFor="femp">{t('f.company')}</label><input type="text" id="femp" name="femp" placeholder={lang === 'pt' ? 'Nome da tua empresa' : 'Company Name'} onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)} /></div>
                <div className="fg">
                  <label htmlFor="ftipo">{t('f.type')}</label>
                  <select id="ftipo" name="ftipo" required onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
                    <option value="">{t('f.td')}</option>
                    <option value="Reels & Social">Reels & Social</option>
                    <option value="Vídeo Publicitário">Vídeo Publicitário</option>
                    <option value="Vídeo Imobiliário">Vídeo Imobiliário</option>
                    <option value="Motion Graphics">Motion Graphics</option>
                    <option value="Identidade Visual">Identidade Visual</option>
                    <option value="Vídeo Corporativo">Vídeo Corporativo</option>
                    <option value="Outro">{t('f.other')}</option>
                  </select>
                </div>
                <div className="fg">
                  <label htmlFor="fmsg">{t('f.msg')}</label>
                  <textarea id="fmsg" name="fmsg" placeholder={lang === 'pt' ? 'Conta-nos sobre o teu projecto...' : 'Tell us about your project...'} required onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}></textarea>
                </div>
                <button type="submit" className="btn-p fsub" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}><PaperPlaneTilt weight="bold" /><span>{t('f.send')}</span></button>
                <div id="fres" className={`fmsg ${formMsg.type === 'ok' ? 'ok' : formMsg.type === 'err' ? 'err' : ''}`} style={{display: formMsg.text ? 'block' : 'none'}}>{formMsg.text}</div>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section id="cta-final">
        <div className="si" style={{textAlign: "center"}}>
          <h2 className="ctit rv">{t('cta.pre')} <span style={{color: "var(--teal)"}}>{t('cta.accent')}</span></h2>
          <p className="csub rv d1">{t('cta.sub')}</p>
          <div className="cbtns rv d2">
            <a href="https://wa.me/351929071925?text=Ol%C3%A1%2C%20quero%20falar%20sobre%20um%20projecto%20de%20v%C3%ADdeo." className="btn-p" target="_blank" rel="noopener" style={{padding: "1.1rem 2.5rem", fontSize: ".92rem"}} onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <WhatsappLogo weight="bold" /><span>{t('cta.wa')}</span>
            </a>
            <a href="https://instagram.com/shiftcreativ3" className="btn-ig" target="_blank" rel="noopener" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>
              <InstagramLogo weight="bold" /><span>{t('cta.ig')}</span>
            </a>
          </div>
        </div>
      </section>

      <footer>
        <div className="fi">
          <div className="ft">
            <div className="fb">
              <img src="/logo.png" alt="Shift Creativ3" loading="lazy" />
              <p>{t('ft.about')}</p>
            </div>
            <div>
              <div className="fct">{t('ft.services')}</div>
              <ul className="fl">
                <li><a href="#servicos" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>Reels & Social</a></li>
                <li><a href="#servicos" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>Vídeo Publicitário</a></li>
                <li><a href="#servicos" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>Vídeo Imobiliário</a></li>
                <li><a href="#servicos" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>Motion Graphics</a></li>
                <li><a href="#servicos" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>Identidade Visual</a></li>
                <li><a href="#servicos" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>Vídeo Corporativo</a></li>
              </ul>
            </div>
            <div>
              <div className="fct">{t('ft.contact')}</div>
              <ul className="fl">
                <li><a href="https://wa.me/351929071925" target="_blank" rel="noopener" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>+351 929 071 925</a></li>
                <li><a href="mailto:geral@shiftcreativ3.com" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>geral@shiftcreativ3.com</a></li>
                <li><a href="https://instagram.com/shiftcreativ3" target="_blank" rel="noopener" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>@shiftcreativ3</a></li>
                <li><a href="#contacto" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}>{t('ft.quote')}</a></li>
              </ul>
            </div>
          </div>
          <div className="fbot">
            <div className="fcp">{t('ft.copy')}</div>
            <div className="fsoc">
              <a href="https://wa.me/351929071925" target="_blank" rel="noopener" aria-label="WhatsApp" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}><WhatsappLogo weight="bold" /></a>
              <a href="https://instagram.com/shiftcreativ3" target="_blank" rel="noopener" aria-label="Instagram" onMouseEnter={handleHover(true)} onMouseLeave={handleHover(false)}><InstagramLogo weight="bold" /></a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
