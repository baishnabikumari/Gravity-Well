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
let alive = true, score = 0; scoreFlash = 0;

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
    const spd = 0.2 + Math.random() * 0.18;

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

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, cvs.width, cvs.height);
}

document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key))
        e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

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
    if (spawnT >= 2.0) {
        spawnT = 0;
        orbs.push(mkOrb());
    }

    const tx = CX + Math.cos(ang) * 30;
    const ty = CY + Math.sin(ang) * 30;
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
        if(!o.dead && Math.hypot(o.x - CY, o.y - CY) < 5 + o.r){
            alive = false;
            if(( score | 0 ) > best) best = score | 0;
            break;
        }
    }
    orbs = orbs.filter(o => !o.dead);
    if(!alive) { draw(); return; }
    draw();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
// //test draw - fill bg + one block rect to confirm the pixelated upsale
// bx.fillStyle = '#0a0a0f';
// bx.fillRect(0, 0, W, H);

// bx.fillStyle = '#e0e0f0';
// bx.fillRect(70, 38, 20, 14);

// ctx.drawImage(buf, 0, 0, cvs.width, cvs.height);