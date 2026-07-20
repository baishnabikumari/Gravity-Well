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

//test draw - fill bg + one block rect to confirm the pixelated upsale
bx.fillStyle = '#0a0a0f';
bx.fillRect(0, 0, W, H);

bx.fillStyle = '#e0e0f0';
bx.fillRect(70, 38, 20, 14);

ctx.drawImage(buf, 0, 0, cvs.width, cvs.height);