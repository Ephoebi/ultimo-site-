(() => {
    const container = document.querySelector('#cube-scene');
    const THREE = window.THREE;
    if (!container || !THREE) return;

    const destinations = [
        { label: 'SOBRE', href: '#sobre', mark: '01' },
        { label: 'MÚSICA', href: '#agora', mark: '02' },
        { label: 'INÍCIO', href: '#inicio', mark: '03' },
        { label: 'RECADO', href: '#guestbook', mark: '04' },
        { label: 'DIÁRIO', href: '#diario', mark: '05' },
        { label: 'JOGO', href: 'jogo.html', mark: '06' }
    ];

    function createFaceMaterial(destination) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        const gradient = context.createLinearGradient(0, 0, 256, 256);
        gradient.addColorStop(0, '#f4f4f4');
        gradient.addColorStop(.28, '#777777');
        gradient.addColorStop(.52, '#d7d7d7');
        gradient.addColorStop(.78, '#515151');
        gradient.addColorStop(1, '#e5e5e5');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);
        context.fillStyle = '#171717';
        context.fillRect(14, 14, 228, 228);
        context.strokeStyle = '#f2f2f2';
        context.lineWidth = 3;
        context.strokeRect(21, 21, 214, 214);
        context.fillStyle = '#e8e8e8';
        context.textAlign = 'center';
        context.font = 'bold 26px monospace';
        context.fillText('PEDRO // 2026', 128, 75);
        context.font = 'bold 52px monospace';
        context.fillText(destination.mark, 128, 145);
        context.font = 'bold 26px monospace';
        context.fillText(destination.label, 128, 198);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return new THREE.MeshStandardMaterial({ map: texture, metalness: .72, roughness: .28 });
    }

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
        container.hidden = true;
        return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.append(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, .1, 100);
    camera.position.set(2.7, 2.25, 3.8);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xffffff, 12, 12);
    rimLight.position.set(-3, -1, -3);
    scene.add(rimLight);

    const cubeGeometry = new THREE.BoxGeometry(1.65, 1.65, 1.65, 2, 2, 2);
    const cube = new THREE.Mesh(
        cubeGeometry,
        destinations.map(createFaceMaterial)
    );
    cube.rotation.set(-.22, .58, 0);
    const polygonLines = new THREE.LineSegments(
        new THREE.WireframeGeometry(cubeGeometry),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .3 })
    );
    polygonLines.scale.setScalar(1.002);
    polygonLines.renderOrder = 2;
    cube.add(polygonLines);
    scene.add(cube);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = null;
    let isDragging = false;
    let previousPointer = null;
    let animationFrame = 0;

    renderer.domElement.addEventListener('pointerdown', (event) => {
        pointerDown = { x: event.clientX, y: event.clientY };
        previousPointer = pointerDown;
        isDragging = false;
        renderer.domElement.setPointerCapture(event.pointerId);
    });

    renderer.domElement.addEventListener('pointermove', (event) => {
        if (!pointerDown || !previousPointer) return;
        const deltaX = event.clientX - previousPointer.x;
        const deltaY = event.clientY - previousPointer.y;
        if (Math.abs(event.clientX - pointerDown.x) + Math.abs(event.clientY - pointerDown.y) > 5) isDragging = true;
        if (isDragging) {
            cube.rotation.y += deltaX * .012;
            cube.rotation.x += deltaY * .012;
        }
        previousPointer = { x: event.clientX, y: event.clientY };
    });

    renderer.domElement.addEventListener('pointerup', (event) => {
        if (!pointerDown) return;
        if (!isDragging) {
            const bounds = renderer.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
            pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            const [hit] = raycaster.intersectObject(cube);
            const destination = hit && destinations[hit.face.materialIndex];
            if (destination) window.location.href = destination.href;
        }
        pointerDown = null;
        previousPointer = null;
        if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
    });

    renderer.domElement.addEventListener('pointercancel', () => {
        pointerDown = null;
        previousPointer = null;
        isDragging = false;
    });

    function render() {
        if (!pointerDown) cube.rotation.y += .0025;
        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(render);
    }
    render();

    window.addEventListener('pagehide', () => window.cancelAnimationFrame(animationFrame), { once: true });
})();