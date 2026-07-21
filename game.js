const W = 160, H = 90;
const cvs = document.getElementById('c');
const ctx = cvs.getContext('2d');

const buf = document.createElement('canvas');
buf.width = W;
buf.height = H;
const bx = buf.getContext('2d');
bx.imageSmoothingEnabled = false;

function resize(){
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

const stars = Array.from({length: 40}, () => ({
    x: Math.random() * W | 0,
    y: Math.random() * H | 0,
    twinkle: Math.random() > 0.6,
    freq: 0.4 + Math.random() * 1.2,
    phase: Math.random() * 6.28
}));

let starT = 0, lastMs = 0;

function draw(){
    bx.fillStyle = '#0a0a0f'
    bx.fillRect(0, 0, W, H);

    for (const s of stars){
        bx.globalAlpha = s.twinkle
            ? 0.25 + 0.35 * Math.abs(Math.sin(starT * s.freq + s.phase))
            : 0.5;
        bx.fillStyle = '#fff';
        bx.fillRect(s.x, s.y, 1, 1);
    }
    bx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, cvs.width, cvs.height);
}

function loop(ms){
    if(!lastMs) lastMs = ms;
    const dt = Math.min((ms - lastMs) / 1000, 0.05);
    lastMs = ms;
    starT += dt;
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