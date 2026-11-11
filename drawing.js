(() => {
    const canvas = document.querySelector('#drawing-canvas');
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const brushButtons = [...document.querySelectorAll('.brush-choice')];
    const colorButtons = [...document.querySelectorAll('.drawing-color')];
    const brushSize = document.querySelector('#brush-size');
    const brushSizeValue = document.querySelector('#brush-size-value');
    const status = document.querySelector('#drawing-status');
    const strokes = [];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeBrush = 'round';
    let activeColor = '#f5f5f5';
    let activeSize = Number(brushSize.value);
    let currentStroke = null;
    let frameRequest = 0;
    let pixelRatio = 1;

    function resizeCanvas() {
        const bounds = canvas.getBoundingClientRect();
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(bounds.width * pixelRatio);
        canvas.height = Math.round(bounds.height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        drawFrame(performance.now());
    }

    function canvasPoint(event) {
        const bounds = canvas.getBoundingClientRect();
        return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    }

    function drawStar(x, y, radius, rotation) {
        context.beginPath();
        for (let pointIndex = 0; pointIndex < 10; pointIndex += 1) {
            const pointRadius = pointIndex % 2 === 0 ? radius : radius * .43;
            const angle = rotation + Math.PI * pointIndex / 5 - Math.PI / 2;
            const pointX = x + Math.cos(angle) * pointRadius;
            const pointY = y + Math.sin(angle) * pointRadius;
            if (pointIndex === 0) context.moveTo(pointX, pointY);
            else context.lineTo(pointX, pointY);
        }
        context.closePath();
        context.fill();
    }

    function drawStroke(stroke, time) {
        context.fillStyle = stroke.color;
        stroke.points.forEach((point, pointIndex) => {
            const phase = stroke.phase + time * .0014 + pointIndex * .28;
            const motion = reduceMotion ? 0 : Math.sin(phase) * 2.5;
            const x = point.x + motion;
            const y = point.y + (reduceMotion ? 0 : Math.cos(phase * .8) * 2.5);
            const size = stroke.size;

            if (stroke.brush === 'square') {
                context.save();
                context.translate(x, y);
                context.rotate(reduceMotion ? Math.PI / 4 : Math.PI / 4 + Math.sin(phase) * .12);
                context.fillRect(-size / 2, -size / 2, size, size);
                context.restore();
            } else if (stroke.brush === 'star') {
                drawStar(x, y, size / 1.8, reduceMotion ? 0 : Math.sin(phase) * .16);
            } else {
                context.beginPath();
                context.arc(x, y, size / 2, 0, Math.PI * 2);
                context.fill();
            }
        });
    }

    function drawFrame(time) {
        const bounds = canvas.getBoundingClientRect();
        const width = bounds.width;
        const height = bounds.height;
        context.clearRect(0, 0, width, height);
        context.fillStyle = '#0a0a0a';
        context.fillRect(0, 0, width, height);
        context.strokeStyle = '#ffffff0d';
        context.lineWidth = 1;
        for (let x = 24; x < width; x += 24) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, height);
            context.stroke();
        }
        for (let y = 24; y < height; y += 24) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }
        strokes.forEach((stroke) => drawStroke(stroke, time));
    }

    function requestDraw() {
        if (frameRequest) return;
        if (reduceMotion) {
            drawFrame(performance.now());
            return;
        }
        frameRequest = requestAnimationFrame((time) => {
            frameRequest = 0;
            drawFrame(time);
            if (strokes.length || currentStroke) requestDraw();
        });
    }

    function appendPoint(stroke, point) {
        const previousPoint = stroke.points[stroke.points.length - 1];
        const distance = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
        const spacing = Math.max(2, stroke.size * .22);
        const steps = Math.max(1, Math.ceil(distance / spacing));
        for (let step = 1; step <= steps; step += 1) {
            const ratio = step / steps;
            stroke.points.push({
                x: previousPoint.x + (point.x - previousPoint.x) * ratio,
                y: previousPoint.y + (point.y - previousPoint.y) * ratio
            });
        }
    }

    canvas.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        currentStroke = {
            brush: activeBrush,
            color: activeColor,
            size: activeSize,
            phase: Math.random() * Math.PI * 2,
            points: [canvasPoint(event)]
        };
        strokes.push(currentStroke);
        canvas.setPointerCapture(event.pointerId);
        status.textContent = 'traço em movimento // continue desenhando';
        requestDraw();
    });

    canvas.addEventListener('pointermove', (event) => {
        if (!currentStroke) return;
        appendPoint(currentStroke, canvasPoint(event));
        requestDraw();
    });

    function finishStroke(event) {
        if (!currentStroke) return;
        currentStroke = null;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        status.textContent = `${strokes.length} ${strokes.length === 1 ? 'traço' : 'traços'} no caderno`;
        requestDraw();
    }

    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointercancel', finishStroke);

    brushButtons.forEach((button) => {
        button.addEventListener('click', () => {
            activeBrush = button.dataset.brush;
            brushButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        });
    });

    colorButtons.forEach((button) => {
        button.addEventListener('click', () => {
            activeColor = button.dataset.color;
            colorButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        });
    });

    brushSize.addEventListener('input', () => {
        activeSize = Number(brushSize.value);
        brushSizeValue.value = String(activeSize);
        brushSizeValue.textContent = String(activeSize);
    });

    document.querySelector('#draw-undo').addEventListener('click', () => {
        if (currentStroke) currentStroke = null;
        strokes.pop();
        status.textContent = `${strokes.length} ${strokes.length === 1 ? 'traço' : 'traços'} no caderno`;
        requestDraw();
    });

    document.querySelector('#draw-clear').addEventListener('click', () => {
        currentStroke = null;
        strokes.length = 0;
        status.textContent = 'caderno limpo';
        requestDraw();
    });

    document.querySelector('#draw-save').addEventListener('click', () => {
        drawFrame(performance.now());
        canvas.toBlob((blob) => {
            if (!blob) {
                status.textContent = 'não foi possível salvar o desenho.';
                return;
            }
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = 'desenho-do-pedro.png';
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            status.textContent = 'desenho salvo como PNG.';
        }, 'image/png');
    });

    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(canvas);
    } else {
        window.addEventListener('resize', resizeCanvas);
    }
    resizeCanvas();
})();