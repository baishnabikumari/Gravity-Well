const W = 160, H = 90;
const CX = W >> 1, CY = H >> 1;
const cvs = document.getElementById('c');
const ctx = cvs.getContext('2d');

const buf = document.createElement('canvas');
buf.width = W;
buf.height = H;
const bx = buf.getContext('2d');
bx.imageSmoothingEnabled = false;

function resize() {
    const sc = Math.max(2, Math.min(
        Math.floor(window.innerWidth / W),
        Math.floor(window.innerHeight / H)
    ));
    cvs.width = W * sc;
    cvs.height = H * sc;
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

const stars = Array.from({ length: 40 }, () => ({
    x: Math.random() * W | 0,
    y: Math.random() * H | 0,
    twinkle: Math.random() > 0.6,
    freq: 0.4 + Math.random() * 1.2,
    phase: Math.random() * 6.28
}));

let starT = 0, pulseT = 0, lastMs = 0;
const keys = {};
let ang = -Math.PI / 2, pullPow = 0;
let orbs = [];
let spawnT = 0, t = 0;
let alive = true, score = 0, scoreFlash = 0;
let holes = [], holeT = 0;
let best = 0;

function mkHole(){
    const a = Math.random() * Math.PI * 2;
    const d = 16 + Math.random() * 26;
    return{
        x: (CX + Math.cos(a) * d) | 0,
        y: (CY + Math.sin(a) * d) | 0,
        r: 4, life: 9 + Math.random() * 6, age: 0
    };
}

function mkOrb() {
    let x, y;
    const side = Math.random() * 4 | 0;
    if (side === 0) { x = Math.random() * W; y = -5; }
    else if (side === 1) { x = W + 5; y = Math.random() * H; }
    else if (side === 2) { x = Math.random() * W; y = H + 5; }
    else { x = -5; y = Math.random() * H; }

    const dx = CX - x, dy = CY - y, d = Math.hypot(dx, dy);
    const spread = (Math.random() - 0.5) * 0.9;
    const ca = Math.cos(spread), sa = Math.sin(spread);
    const nx = dx / d, ny = dy / d;
    const spd = Math.min(0.2 + Math.random() * 0.18 + t * 0.0003, 0.8);

    return {
        x, y,
        vx: (nx * ca - ny * sa) * spd,
        vy: (nx * sa + ny * ca) * spd,
        r: 2 + (Math.random() * 2.5 | 0),
        dead: false
    };
}

function pCircle(cx, cy, r, col, fill) {
    bx.fillStyle = col;
    const ir = r - 1;
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            const d2 = dx * dx + dy * dy;
            if (fill ? d2 <= r * r : (d2 <= r * r && d2 >= ir * ir))
                bx.fillRect((cx + dx) | 0, (cy + dy) | 0, 1, 1);
        }
    }
}

function draw() {
    bx.fillStyle = '#0a0a0f'
    bx.fillRect(0, 0, W, H);

    for (const s of stars) {
        bx.globalAlpha = s.twinkle
            ? 0.25 + 0.35 * Math.abs(Math.sin(starT * s.freq + s.phase))
            : 0.5;
        bx.fillStyle = '#fff';
        bx.fillRect(s.x, s.y, 1, 1);
    }
    for(const h of holes){
        const fade = Math.min(h.age * 2, (h.life - h.age) * 2, 1);
        bx.globalAlpha = fade * (0.7 + 0.3 * Math.abs(Math.sin(starT * 3 + h.x)));
        pCircle(h.x, h.y, h.r, '#00eebb', false);
        if(h.r > 2) pCircle(h.x, h.y, h.r - 2, '#00eebb', false);
        bx.globalAlpha = 1;
    }
    let minD = Infinity;
    for (const o of orbs){
        const d = Math.hypot(o.x - CX, o.y - CY);
        if(d < minD) minD = d;
        pCircle(o.x, o.y, o.r, d < 24 ? '#ff3344' : '#c0c0cc', true);
    }
    const cr = Math.round(5 + 0.8 * Math.sin(pulseT * 3));
    pCircle(CX, CY, cr, minD < 22 ? '#ff3344' : '#e0e0f0', false);
    // bx.globalAlpha = 1;

    // for (const o of orbs) {
    //     pCircle(o.x, o.y, o.r, '#c0c0cc', true);
    // }
    const len = 8 + pullPow * 7;
    const ex = (CX + Math.cos(ang) * len) | 0;
    const ey = (CY + Math.sin(ang) * len) | 0;
    bx.globalAlpha = 0.15 + pullPow * 0.4;
    bx.strokeStyle = '#7777dd';
    bx.lineWidth = 1;
    bx.beginPath(); bx.moveTo(CX, CY); bx.lineTo(ex, ey); bx.stroke();
    if (pullPow > 0.1) { bx.fillStyle = '#9999ff'; bx.fillRect(ex, ey, 2, 2); }
    bx.globalAlpha = 1;

    const sa = Math.min(0.38 + Math.max(scoreFlash, 0) * 0.55, 1);
    bx.globalAlpha = sa;
    bx.fillStyle = '#e0e0f0';
    const fs = scoreFlash > 0.5 ? '7px' : '6px';
    bx.font = fs + ' monospace';
    bx.fillText(score | 0, 2, 8);
    if(best > 0){
        bx.globalAlpha = sa * 0.4;
        bx.fillText('best ' + best, 2, 16);
    }
    bx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, cvs.width, cvs.height);
}

document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key))
        e.preventDefault();
    if(!alive && e.key === ' ') start();
});

cvs.addEventListener('click', () => { if (!alive) start(); });

let touchX = 0;
cvs.addEventListener('touchstart', e => {
    touchX = e.touches[0].clientX;
    if(!alive) start();
    e.preventDefault();
}, {passive: false});
cvs.addEventListener('touchmove', e => {
    if(!alive) return;
    const dx = e.touches[0].clientX - touchX;
    ang += dx * 0.015;
    touchX = e.touches[0].clientX;
    pullPow = Math.min(pullPow + 0.04, 1.6);
    e.preventDefault();
}, {passive: false});
cvs.addEventListener('touchend', () => {
    pullPow = Math.max(pullPow - 0.5, 0);
}, {passive: false});
document.addEventListener('keyup', e => { keys[e.key] = false; });

function start(){
    orbs = []; holes = [];
    ang = -Math.PI / 2; pullPow = 0;
    score = 0; scoreFlash = 0;
    t = 0; spawnT = 0; holeT = 0;
    pulseT = 0; alive = true;
    lastMs = 0;
    requestAnimationFrame(loop)
}

function drawGameOver(){
    bx.fillStyle = 'rgba(10,10,15,0.82)';
    bx.fillRect(0, 0, W, H);
    bx.textAlign = 'center';
    bx.fillStyle = '#e0e0f0';
    bx.font = '8px monospace';
    bx.fillText('GAME OVER', CX, CY - 12);
    bx.font = '6px monospace';
    bx.fillText(score | 0, CX, CY);
    if((score | 0) >= best && best > 0){
        bx.fillStyle = '#ffcc44';
        bx.fillText('new best!', CX, CY + 10);
    } else if(best > 0){
        bx.fillStyle = '#555566';
        bx.fillText('best ' + best, CX, CY + 10);
    }
    bx.fillStyle = '#555566';
    bx.font = '5px monospace';
    bx.fillText('space / tap to play again', CX, CY + 20);
    bx.textAlign = 'left';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, cvs.width, cvs.height);
}

function drawTitle(){
    bx.fillStyle = '#0a0a0f';
    bx.fillRect(0, 0, W, H);
    for(const s of stars){
        bx.globalAlpha = 0.5;
        bx.fillStyle = '#fff';
        bx.fillRect(s.x, s.y, 1, 1);
    }
    bx.globalAlpha = 1;
    pCircle(CX, CY, 5, '#e0e0f0', false);
    bx.textAlign = 'center';
    bx.fillStyle = '#e0e0f0';
    bx.font = '8px monospace';
    bx.fillText('GRAVITY WELL', CX, CY - 20);
    bx.fillStyle = '#555566';
    bx.font = '5px monospace';
    bx.fillText('\u2190 \u2192 to rotate pull', CX, CY + 10);
    bx.fillText('fling orbs into each other', CX, CY + 18);
    bx.fillText('or into cyan holes', CX, CY + 26);
    bx.fillStyle = '#e0e0f0';
    bx.fillText('space or tap to play', CX, CY + 38);
    bx.textAlign = 'left';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, cvs.width, cvs.height);
}

function loop(ms) {
    if (!lastMs) lastMs = ms;
    const dt = Math.min((ms - lastMs) / 1000, 0.05);
    lastMs = ms;
    starT += dt;
    pulseT += dt;
    const left = keys['ArrowLeft'] || keys['a'] || keys['A'];
    const right = keys['ArrowRight'] || keys['d'] || keys['D'];
    if (left) { ang -= 2.5 * dt; pullPow = Math.min(pullPow + dt * 1.2, 1.6); }
    if (right) { ang += 2.5 * dt; pullPow = Math.min(pullPow + dt * 1.2, 1.6); }
    if (!left && !right) pullPow = Math.max(pullPow - dt * 4, 0);
    t += dt;
    spawnT += dt;
    const rate = Math.max(2.0 - t * 0.03, 0.5);
    if (spawnT >= rate) {
        spawnT = 0;
        orbs.push(mkOrb());
        if(t > 20 && Math.random() < 0.35) orbs.push(mkOrb());
        if(t > 55 && Math.random() < 0.25) orbs.push(mkOrb());
    }

    const tx = CX + Math.cos(ang) * 30;
    const ty = CY + Math.sin(ang) * 30;
    
    holeT += dt;
    if(holes.length < 2 && holeT >= 12){
        holeT = 0; holes.push(mkHole());
    }
    for(let i = holes.length - 1; i >= 0; i--){
        holes[i].age += dt;
        if(holes[i].age >= holes[i].life) holes.splice(i, 1);
    }
    for (const o of orbs) {
        if (pullPow > 0.01) {
            const pdx = tx - o.x, pdy = ty - o.y;
            const pd = Math.hypot(pdx, pdy);
            if (pd < 52) {
                const f = pullPow * 3.5 / (pd + 2);
                o.vx += pdx / pd * f * dt;
                o.vy += pdy / pd * f * dt;
            }
        }
        for (const h of holes){
            const hx = h.x - o.x, hy = h.y - o.y;
            const hd = Math.hypot(hx, hy);
            if(hd < h.r + o.r){ o.dead = true; score += 150; scoreFlash = 1; break; }
            if(hd < 30){
                const f = 6 / (hd + 1);
                o.vx += hx/hd * f * dt;
                o.vy += hy/hd * f * dt;
            }
        }
        o.x += o.vx * dt * 60;
        o.y += o.vy * dt * 60;
        const spd = Math.hypot(o.vx, o.vy);
        if (spd > 1.5) { o.vx = o.vx / spd * 1.5; o.vy = o.vy / spd * 1.5; }
        if (o.x < -20 || o.x > W + 20 || o.y < -20 || o.y > H + 20) o.dead = true;
    }
    for(let i = 0; i < orbs.length; i++){
        if(orbs[i].dead) continue;
        for(let j = i + 1; j < orbs.length; j++){
            if(orbs[j].dead) continue;
            const dd = Math.hypot(orbs[j].x - orbs[i].x, orbs[j].y - orbs[i].y);
            if(dd <= orbs[i].r + orbs[j].r){
                orbs[i].dead = orbs[j].dead = true;
                score += 100; scoreFlash = 1;
            }
        }
    }
    for (const o of orbs){
        if(!o.dead && Math.hypot(o.x - CX, o.y - CY) < 5 + o.r){
            alive = false;
            if(( score | 0 ) > best) best = score | 0;
            break;
        }
    }

    score += dt * 3;
    if(scoreFlash > 0) scoreFlash -= dt * 2.5;
    orbs = orbs.filter(o => !o.dead);
    if(!alive) { draw(); drawGameOver(); return; }
    draw();
    requestAnimationFrame(loop);
}

//requestAnimationFrame(loop)
drawTitle();
document.addEventListener('keydown', e => { if (e.key === ' ') start(); }, { once: true });
cvs.addEventListener('click', start, { once: true });
// //test draw - fill bg + one block rect to confirm the pixelated upsale
// bx.fillStyle = '#0a0a0f';
// bx.fillRect(0, 0, W, H);

// bx.fillStyle = '#e0e0f0';
// bx.fillRect(70, 38, 20, 14);

// ctx.drawImage(buf, 0, 0, cvs.width, cvs.height);