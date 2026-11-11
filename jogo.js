const canvas = document.querySelector('#game-canvas');
const context = canvas.getContext('2d');
const overlay = document.querySelector('#game-overlay');
const startButton = document.querySelector('#start-button');
const scoreLabel = document.querySelector('#score');
const timeLabel = document.querySelector('#time');
const livesLabel = document.querySelector('#lives');
const bestLabel = document.querySelector('#best-score');
const statusLabel = document.querySelector('#game-status');
const overlayKicker = document.querySelector('#overlay-kicker');
const overlayTitle = document.querySelector('#overlay-title');
const overlayCopy = document.querySelector('#overlay-copy');
const width = canvas.width;
const height = canvas.height;
const bestKey = 'pedro-orbita-best';
const heldDirections = new Set();
const player = { x: width / 2, y: height - 58, width: 48, height: 44, speed: 440 };
let entities = [];
let particles = [];
let score = 0;
let lives = 3;
let remaining = 45;
let spawnTimer = 0;
let previousFrame = 0;
let running = false;
let animationFrame = 0;
let lastAnnouncedSecond = 45;

function readBest() {
    try {
        return Number(localStorage.getItem(bestKey)) || 0;
    } catch {
        return 0;
    }
}

function updateHud() {
    scoreLabel.textContent = String(score).padStart(3, '0');
    timeLabel.textContent = String(Math.ceil(remaining)).padStart(2, '0');
    livesLabel.textContent = `${'● '.repeat(lives)}${'○ '.repeat(3 - lives)}`.trim();
}

function drawBackground() {
    context.fillStyle = '#080a09a8';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#ffffff10';
    context.lineWidth = 1;
    for (let x = 0; x <= width; x += 80) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    }
    for (let y = 0; y <= height; y += 80) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
    }
    for (let index = 0; index < 48; index += 1) {
        const x = (index * 197 + 41) % width;
        const y = (index * 131 + 19) % height;
        context.fillStyle = index % 5 === 0 ? '#d7ff7088' : '#ffffff66';
        context.fillRect(x, y, index % 7 === 0 ? 2 : 1, index % 7 === 0 ? 2 : 1);
    }
}

function drawPlayer() {
    const { x, y } = player;
    context.save();
    context.translate(x, y);
    context.shadowBlur = 20;
    context.shadowColor = '#d7ff70a0';
    context.fillStyle = '#d7ff70';
    context.beginPath();
    context.moveTo(0, -25);
    context.lineTo(22, 19);
    context.lineTo(0, 11);
    context.lineTo(-22, 19);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = '#20251a';
    context.beginPath();
    context.ellipse(0, 1, 6, 9, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ff765f';
    context.beginPath();
    context.moveTo(-6, 18);
    context.lineTo(0, 30 + Math.random() * 7);
    context.lineTo(6, 18);
    context.closePath();
    context.fill();
    context.restore();
}

function drawEntity(entity) {
    const isMemory = entity.type === 'memory';
    context.save();
    context.translate(entity.x, entity.y);
    context.rotate(entity.rotation);
    context.shadowBlur = isMemory ? 19 : 12;
    context.shadowColor = isMemory ? '#d7ff70' : '#ff765f';
    context.fillStyle = isMemory ? '#d7ff70' : '#ff765f';
    if (isMemory) {
        context.beginPath();
        for (let point = 0; point < 8; point += 1) {
            const radius = point % 2 === 0 ? entity.size : entity.size * 0.55;
            const angle = point * Math.PI / 4 - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (point === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        }
        context.closePath();
        context.fill();
    } else {
        context.fillRect(-entity.size, -entity.size, entity.size * 2, entity.size * 2);
        context.strokeStyle = '#351a16';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(-entity.size * 0.5, -entity.size * 0.5);
        context.lineTo(entity.size * 0.5, entity.size * 0.5);
        context.moveTo(entity.size * 0.5, -entity.size * 0.5);
        context.lineTo(-entity.size * 0.5, entity.size * 0.5);
        context.stroke();
    }
    context.restore();
}

function burst(x, y, color) {
    for (let index = 0; index < 12; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 160;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.45, color });
    }
}

function drawParticles(delta) {
    particles = particles.filter((particle) => particle.life > 0);
    particles.forEach((particle) => {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.life -= delta;
        context.globalAlpha = Math.max(0, particle.life / 0.45);
        context.fillStyle = particle.color;
        context.fillRect(particle.x, particle.y, 3, 3);
    });
    context.globalAlpha = 1;
}

function spawnEntity() {
    const size = 10 + Math.random() * 8;
    entities.push({
        x: 30 + Math.random() * (width - 60),
        y: -30,
        size,
        speed: 145 + Math.random() * 95 + (45 - remaining) * 2.2,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 2,
        type: Math.random() < 0.72 ? 'memory' : 'noise'
    });
}

function endGame() {
    running = false;
    cancelAnimationFrame(animationFrame);
    const best = Math.max(score, readBest());
    try {
        localStorage.setItem(bestKey, String(best));
    } catch {
        statusLabel.textContent = 'Partida encerrada. O navegador não conseguiu salvar o recorde.';
    }
    bestLabel.textContent = String(best).padStart(3, '0');
    overlayKicker.textContent = lives ? 'sinal arquivado' : 'sinal perdido';
    overlayTitle.textContent = lives ? 'Missão concluída' : 'A nave foi atingida';
    overlayCopy.textContent = `Você recuperou ${score} fragmento${score === 1 ? '' : 's'} nessa viagem.`;
    startButton.innerHTML = '<span aria-hidden="true">&#8635;</span> jogar de novo';
    overlay.hidden = false;
    statusLabel.textContent = `Fim de jogo. Pontuação: ${score}.`;
}

function frame(timestamp) {
    if (!running) return;
    const delta = Math.min((timestamp - previousFrame) / 1000, 0.04);
    previousFrame = timestamp;
    remaining = Math.max(0, remaining - delta);
    spawnTimer -= delta;
    if (spawnTimer <= 0) {
        spawnEntity();
        spawnTimer = Math.max(0.24, 0.66 - (45 - remaining) * 0.006) + Math.random() * 0.22;
    }

    const direction = Number(heldDirections.has(-1)) * -1 + Number(heldDirections.has(1));
    player.x = Math.max(28, Math.min(width - 28, player.x + direction * player.speed * delta));
    entities = entities.filter((entity) => {
        entity.y += entity.speed * delta;
        entity.rotation += entity.spin * delta;
        const touched = Math.abs(entity.x - player.x) < entity.size + player.width * 0.38
            && Math.abs(entity.y - player.y) < entity.size + player.height * 0.38;
        if (touched && entity.type === 'memory') {
            score += 10;
            burst(entity.x, entity.y, '#d7ff70');
            return false;
        }
        if (touched) {
            lives -= 1;
            burst(entity.x, entity.y, '#ff765f');
            updateHud();
            if (!lives) endGame();
            return false;
        }
        return entity.y < height + 40;
    });

    drawBackground();
    entities.forEach(drawEntity);
    drawParticles(delta);
    drawPlayer();
    updateHud();
    const second = Math.ceil(remaining);
    if (second !== lastAnnouncedSecond && second % 10 === 0) {
        statusLabel.textContent = `${second} segundos restantes.`;
        lastAnnouncedSecond = second;
    }
    if (remaining <= 0) {
        endGame();
        return;
    }
    animationFrame = requestAnimationFrame(frame);
}

function startGame() {
    cancelAnimationFrame(animationFrame);
    score = 0;
    lives = 3;
    remaining = 45;
    spawnTimer = 0.35;
    previousFrame = performance.now();
    lastAnnouncedSecond = 45;
    player.x = width / 2;
    entities = [];
    particles = [];
    heldDirections.clear();
    running = true;
    overlay.hidden = true;
    updateHud();
    statusLabel.textContent = 'Missão iniciada. Colete fragmentos e desvie dos ruídos.';
    animationFrame = requestAnimationFrame(frame);
}

function setDirection(direction, pressed) {
    if (pressed) heldDirections.add(direction);
    else heldDirections.delete(direction);
    document.querySelector(`[data-direction="${direction}"]`).classList.toggle('is-active', pressed);
}

startButton.addEventListener('click', startGame);
bestLabel.textContent = String(readBest()).padStart(3, '0');
updateHud();
drawBackground();
drawPlayer();

window.addEventListener('keydown', (event) => {
    const direction = event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a' ? -1
        : event.key === 'ArrowRight' || event.key.toLowerCase() === 'd' ? 1
            : null;
    if (direction === null) return;
    event.preventDefault();
    setDirection(direction, true);
});
window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') setDirection(-1, false);
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') setDirection(1, false);
});
window.addEventListener('blur', () => {
    setDirection(-1, false);
    setDirection(1, false);
});

document.querySelectorAll('.move-button').forEach((button) => {
    const direction = Number(button.dataset.direction);
    button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        setDirection(direction, true);
    });
    button.addEventListener('pointerup', () => setDirection(direction, false));
    button.addEventListener('pointercancel', () => setDirection(direction, false));
    button.addEventListener('lostpointercapture', () => setDirection(direction, false));
});