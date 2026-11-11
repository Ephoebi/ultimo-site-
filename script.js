const deletedPostsStorageKey = 'pedro-blog-deleted-posts';
const storedDeletedPostIds = readStoredValue(deletedPostsStorageKey, []);
const deletedPostIds = new Set(Array.isArray(storedDeletedPostIds) ? storedDeletedPostIds.filter((id) => typeof id === 'string') : []);
let posts = [...document.querySelectorAll('.post')].filter((post) => {
    if (!deletedPostIds.has(post.dataset.postId)) return true;
    post.remove();
    return false;
});
const feed = document.querySelector('.feed');
const searchInput = document.querySelector('#search');
const emptyState = document.querySelector('#empty-state');
const feedCount = document.querySelector('.feed-count');
const filterGroup = document.querySelector('.filters');
const topicForm = document.querySelector('#topic-form');
const topicInput = document.querySelector('#topic-name');
const topicStatus = document.querySelector('#topic-status');
const topicOrderSelect = document.querySelector('#topic-order-select');
const topicDeleteButton = document.querySelector('#topic-delete');
const postForm = document.querySelector('#post-form');
const postTopicChoice = document.querySelector('#post-topic-choice');
const postTitleInput = document.querySelector('#post-title');
const postContentInput = document.querySelector('#post-content');
const postStatus = document.querySelector('#post-status');
let activeFilter = 'all';
const topicStorageKey = 'pedro-blog-topics';
const postTopicsStorageKey = 'pedro-blog-post-topics';
const topicOrderStorageKey = 'pedro-blog-topic-order';
const deletedTopicsStorageKey = 'pedro-blog-deleted-topics';
const userPostsStorageKey = 'pedro-blog-posts';

function readStoredValue(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

function saveStoredValue(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function addPostDeleteButton(post) {
    if (post.querySelector('.post-delete-button')) return;
    const button = document.createElement('button');
    button.className = 'post-delete-button';
    button.type = 'button';
    button.textContent = '×';
    button.title = 'Apagar post';
    button.setAttribute('aria-label', `Apagar post: ${post.querySelector('h2').textContent}`);
    button.addEventListener('click', () => deletePost(post));
    post.querySelector('.post-footer').append(button);
}

function deletePost(post) {
    const postId = post.dataset.postId;
    const postTitle = post.querySelector('h2').textContent;
    if (!window.confirm(`Apagar "${postTitle}" deste navegador?`)) return;

    const isUserPost = postId.startsWith('user-');
    let saved = true;
    if (isUserPost) {
        const userPostIndex = userPosts.findIndex((item) => `user-${item.id}` === postId);
        if (userPostIndex >= 0) userPosts.splice(userPostIndex, 1);
        delete savedPostTopics[postId];
        saved = saveStoredValue(userPostsStorageKey, userPosts) && saveStoredValue(postTopicsStorageKey, savedPostTopics);
    } else {
        deletedPostIds.add(postId);
        delete savedPostTopics[postId];
        saved = saveStoredValue(deletedPostsStorageKey, [...deletedPostIds]) && saveStoredValue(postTopicsStorageKey, savedPostTopics);
    }

    post.remove();
    posts = posts.filter((item) => item !== post);
    updatePosts();
    const message = saved ? 'post apagado.' : 'post apagado nesta sessão, mas o navegador não conseguiu salvar a mudança.';
    (isUserPost ? postStatus : topicStatus).textContent = message;
}

function topicIdFromName(name) {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const builtInTopics = [...filterGroup.querySelectorAll('.filter-button')]
    .filter((button) => button.dataset.filter !== 'all')
    .map((button) => ({ id: button.dataset.filter, name: button.textContent.trim() }));
const storedUserTopics = readStoredValue(topicStorageKey, []);
const userTopics = (Array.isArray(storedUserTopics) ? storedUserTopics : [])
    .filter((topic) => topic && typeof topic.name === 'string' && typeof topic.id === 'string' && topic.name.trim())
    .filter((topic) => !builtInTopics.some((builtInTopic) => builtInTopic.id === topic.id))
    .filter((topic, index, topics) => topics.findIndex((item) => item.id === topic.id) === index);
const storedDeletedTopics = readStoredValue(deletedTopicsStorageKey, []);
const deletedTopicIds = new Set((Array.isArray(storedDeletedTopics) ? storedDeletedTopics : [])
    .filter((id) => builtInTopics.some((topic) => topic.id === id)));
const activeBuiltInTopics = builtInTopics.filter((topic) => !deletedTopicIds.has(topic.id));
const availableTopicIds = [...activeBuiltInTopics, ...userTopics].map((topic) => topic.id);
const storedTopicOrder = readStoredValue(topicOrderStorageKey, []);
const savedTopicOrder = Array.isArray(storedTopicOrder) ? storedTopicOrder : [];
const topicOrder = [
    ...new Set([
        ...savedTopicOrder.filter((id) => availableTopicIds.includes(id)),
        ...availableTopicIds
    ])
];
const savedPostTopicsValue = readStoredValue(postTopicsStorageKey, {});
const savedPostTopics = savedPostTopicsValue && typeof savedPostTopicsValue === 'object' && !Array.isArray(savedPostTopicsValue)
    ? savedPostTopicsValue
    : {};
const storedUserPosts = readStoredValue(userPostsStorageKey, []);
const userPosts = (Array.isArray(storedUserPosts) ? storedUserPosts : [])
    .filter((post) => post && typeof post.id === 'string' && typeof post.title === 'string' && typeof post.content === 'string');

function getAllTopics() {
    const topicPositions = new Map(topicOrder.map((id, index) => [id, index]));
    return [...builtInTopics.filter((topic) => !deletedTopicIds.has(topic.id)), ...userTopics]
        .sort((first, second) => topicPositions.get(first.id) - topicPositions.get(second.id));
}

function activateFilter(button) {
    activeFilter = button.dataset.filter;
    filterGroup.querySelectorAll('.filter-button').forEach((item) => {
        item.setAttribute('aria-pressed', String(item === button));
    });
    updatePosts();
}

function updatePosts() {
    const query = searchInput.value.trim().toLocaleLowerCase('pt-BR');
    let visible = 0;
    posts.forEach((post) => {
        const matchesCategory = activeFilter === 'all' || post.dataset.category === activeFilter;
        const matchesQuery = `${post.dataset.search} ${post.textContent}`.toLocaleLowerCase('pt-BR').includes(query);
        post.hidden = !(matchesCategory && matchesQuery);
        if (!post.hidden) visible += 1;
    });
    emptyState.style.display = visible ? 'none' : 'block';
    feedCount.textContent = visible ? `01 — ${String(visible).padStart(2, '0')}` : '00 — 00';
}

function addTopicFilter(topic) {
    const button = document.createElement('button');
    button.className = 'filter-button';
    button.type = 'button';
    button.dataset.filter = topic.id;
    button.textContent = topic.name;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => activateFilter(button));
    filterGroup.append(button);
}

function renderTopicOrder() {
    const topics = getAllTopics();
    const validTopicIds = new Set(['all', ...topics.map((topic) => topic.id)]);
    filterGroup.querySelectorAll('.filter-button').forEach((button) => {
        if (!validTopicIds.has(button.dataset.filter)) button.remove();
    });
    const buttons = new Map([...filterGroup.querySelectorAll('.filter-button')].map((button) => [button.dataset.filter, button]));
    topicOrder.forEach((id) => {
        const button = buttons.get(id);
        if (button) filterGroup.append(button);
    });

    const selectedTopic = topicOrderSelect.value;
    topicOrderSelect.replaceChildren(...topics.map((topic) => {
        const option = document.createElement('option');
        option.value = topic.id;
        option.textContent = topic.name;
        return option;
    }));
    topicOrderSelect.value = topics.some((topic) => topic.id === selectedTopic) ? selectedTopic : topics[0]?.id ?? '';
    document.querySelector('#topic-move-up').disabled = topicOrderSelect.selectedIndex <= 0;
    document.querySelector('#topic-move-down').disabled = topicOrderSelect.selectedIndex < 0 || topicOrderSelect.selectedIndex >= topics.length - 1;
    topicDeleteButton.disabled = topics.length <= 1;
    renderPostComposerTopics();
}

function renderPostComposerTopics() {
    const topics = getAllTopics();
    const selectedTopic = postTopicChoice.value;
    postTopicChoice.replaceChildren(...topics.map((topic) => {
        const option = document.createElement('option');
        option.value = topic.id;
        option.textContent = topic.name;
        return option;
    }));
    postTopicChoice.value = topics.some((topic) => topic.id === selectedTopic) ? selectedTopic : topics[0]?.id ?? '';
}

function renderPostTopicSelects() {
    const topics = getAllTopics();
    const fallbackTopic = topics.find((topic) => topic.id === 'diario') ?? topics[0];
    posts.forEach((post) => {
        const select = post.querySelector('.post-topic-select');
        const savedTopic = savedPostTopics[post.dataset.postId];
        const requestedTopic = savedTopic || post.dataset.category;
        const selectedTopic = topics.some((topic) => topic.id === requestedTopic) ? requestedTopic : fallbackTopic?.id ?? '';
        select.replaceChildren(...topics.map((topic) => {
            const option = document.createElement('option');
            option.value = topic.id;
            option.textContent = topic.name;
            return option;
        }));
        select.value = selectedTopic;
        post.dataset.category = selectedTopic;
        post.querySelector('.post-category').textContent = topics.find((topic) => topic.id === selectedTopic)?.name ?? selectedTopic;

        if (select.dataset.bound) return;
        select.dataset.bound = 'true';
        select.addEventListener('change', () => {
            post.dataset.category = select.value;
            post.querySelector('.post-category').textContent = getAllTopics().find((topic) => topic.id === select.value)?.name ?? select.value;
            savedPostTopics[post.dataset.postId] = select.value;
            const userPost = userPosts.find((item) => `user-${item.id}` === post.dataset.postId);
            if (userPost) {
                userPost.topic = select.value;
                saveStoredValue(userPostsStorageKey, userPosts);
            }
            if (!saveStoredValue(postTopicsStorageKey, savedPostTopics)) {
                topicStatus.textContent = 'tópico alterado, mas o navegador não conseguiu salvar a mudança.';
            }
            updatePosts();
        });
    });
}

function bindLikeButton(button) {
    button.addEventListener('click', () => {
        const liked = button.getAttribute('aria-pressed') === 'true';
        const count = button.querySelector('.like-count');
        count.textContent = String(Number(count.textContent) + (liked ? -1 : 1)).padStart(2, '0');
        button.setAttribute('aria-pressed', String(!liked));
    });
}

function createUserPost(userPost) {
    const topics = getAllTopics();
    const fallbackTopic = topics.find((topic) => topic.id === 'diario') ?? topics[0];
    const requestedTopic = savedPostTopics[`user-${userPost.id}`] || userPost.topic;
    const topic = topics.find((item) => item.id === requestedTopic) ?? fallbackTopic;
    const article = document.createElement('article');
    article.className = 'post';
    article.dataset.postId = `user-${userPost.id}`;
    article.dataset.category = topic?.id ?? '';
    article.dataset.search = `${userPost.title} ${userPost.content}`;

    const meta = document.createElement('div');
    meta.className = 'post-meta';
    const createdAt = new Date(userPost.createdAt || Date.now());
    const date = document.createElement('time');
    date.dateTime = Number.isNaN(createdAt.valueOf()) ? new Date().toISOString() : createdAt.toISOString();
    date.textContent = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(createdAt);
    const separator = document.createElement('span');
    separator.textContent = '·';
    const category = document.createElement('span');
    category.className = 'post-category';
    category.textContent = topic?.name ?? '';
    const postLabel = document.createElement('span');
    postLabel.textContent = 'post pessoal';
    meta.append(date, separator.cloneNode(true), category, separator.cloneNode(true), postLabel);

    const heading = document.createElement('h2');
    heading.textContent = userPost.title;
    const content = document.createElement('p');
    content.textContent = userPost.content;

    const footer = document.createElement('div');
    footer.className = 'post-footer';
    const tags = document.createElement('div');
    tags.className = 'post-tags';
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = 'meu-post';
    tags.append(tag);

    const topicControl = document.createElement('label');
    topicControl.className = 'post-topic-control';
    const topicControlLabel = document.createElement('span');
    topicControlLabel.className = 'visually-hidden';
    topicControlLabel.textContent = 'Tópico deste post';
    const topicSelect = document.createElement('select');
    topicSelect.className = 'post-topic-select';
    topicSelect.setAttribute('aria-label', 'Tópico deste post');
    topicControl.append(topicControlLabel, topicSelect);

    const likeButton = document.createElement('button');
    likeButton.className = 'like-button';
    likeButton.type = 'button';
    likeButton.setAttribute('aria-pressed', 'false');
    likeButton.setAttribute('aria-label', 'Gostei deste post');
    likeButton.innerHTML = '<span class="heart" aria-hidden="true">&#9825;</span><span class="like-count">00</span>';
    footer.append(tags, topicControl, likeButton);
    article.append(meta, heading, content, footer);
    return article;
}

filterGroup.querySelectorAll('.filter-button').forEach((button) => {
    button.addEventListener('click', () => activateFilter(button));
});
userTopics.forEach(addTopicFilter);
userPosts.forEach((userPost) => {
    const article = createUserPost(userPost);
    posts.push(article);
    feed.insertBefore(article, emptyState);
});
posts.forEach(addPostDeleteButton);
renderTopicOrder();
renderPostTopicSelects();
posts.forEach((post) => bindLikeButton(post.querySelector('.like-button')));
updatePosts();
topicOrderSelect.addEventListener('change', renderTopicOrder);
function moveSelectedTopic(direction) {
    const currentIndex = topicOrder.indexOf(topicOrderSelect.value);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= topicOrder.length) return;

    [topicOrder[currentIndex], topicOrder[nextIndex]] = [topicOrder[nextIndex], topicOrder[currentIndex]];
    renderTopicOrder();
    const saved = saveStoredValue(topicOrderStorageKey, topicOrder);
    topicStatus.textContent = saved
        ? 'ordem dos tópicos atualizada.'
        : 'ordem alterada nesta sessão, mas o navegador não conseguiu salvá-la.';
}
document.querySelector('#topic-move-up').addEventListener('click', () => moveSelectedTopic(-1));
document.querySelector('#topic-move-down').addEventListener('click', () => moveSelectedTopic(1));
topicDeleteButton.addEventListener('click', () => {
    const topicId = topicOrderSelect.value;
    const topicsBeforeDelete = getAllTopics();
    const removedTopic = topicsBeforeDelete.find((topic) => topic.id === topicId);
    const remainingTopics = topicsBeforeDelete.filter((topic) => topic.id !== topicId);
    if (!removedTopic || remainingTopics.length === 0) {
        topicStatus.textContent = 'mantenha pelo menos um tópico.';
        return;
    }

    const fallbackTopic = remainingTopics.find((topic) => topic.id === 'diario') ?? remainingTopics[0];
    if (builtInTopics.some((topic) => topic.id === topicId)) {
        deletedTopicIds.add(topicId);
    } else {
        const userTopicIndex = userTopics.findIndex((topic) => topic.id === topicId);
        if (userTopicIndex >= 0) userTopics.splice(userTopicIndex, 1);
    }

    const topicOrderIndex = topicOrder.indexOf(topicId);
    if (topicOrderIndex >= 0) topicOrder.splice(topicOrderIndex, 1);
    let reassignedPosts = 0;
    posts.forEach((post) => {
        if (post.dataset.category !== topicId) return;
        post.dataset.category = fallbackTopic.id;
        post.querySelector('.post-category').textContent = fallbackTopic.name;
        post.querySelector('.post-topic-select').value = fallbackTopic.id;
        savedPostTopics[post.dataset.postId] = fallbackTopic.id;
        const userPost = userPosts.find((item) => `user-${item.id}` === post.dataset.postId);
        if (userPost) userPost.topic = fallbackTopic.id;
        reassignedPosts += 1;
    });

    if (activeFilter === topicId) {
        activeFilter = 'all';
        filterGroup.querySelector('[data-filter="all"]')?.setAttribute('aria-pressed', 'true');
    }
    renderTopicOrder();
    renderPostTopicSelects();
    updatePosts();

    const saved = [
        saveStoredValue(topicStorageKey, userTopics),
        saveStoredValue(deletedTopicsStorageKey, [...deletedTopicIds]),
        saveStoredValue(topicOrderStorageKey, topicOrder),
        saveStoredValue(postTopicsStorageKey, savedPostTopics),
        saveStoredValue(userPostsStorageKey, userPosts)
    ].every(Boolean);
    topicStatus.textContent = saved
        ? `tópico "${removedTopic.name}" apagado; ${reassignedPosts} post(s) movido(s) para "${fallbackTopic.name}".`
        : 'tópico apagado nesta sessão, mas o navegador não conseguiu salvar todas as mudanças.';
});

topicForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = topicInput.value.trim().replace(/\s+/g, ' ');
    const id = topicIdFromName(name);
    if (!id) {
        topicStatus.textContent = 'digite um nome de tópico válido.';
        return;
    }
    if (builtInTopics.some((topic) => topic.id === id) || getAllTopics().some((topic) => topic.id === id)) {
        topicStatus.textContent = 'esse tópico já existe.';
        return;
    }

    const topic = { id, name };
    userTopics.push(topic);
    topicOrder.push(topic.id);
    addTopicFilter(topic);
    renderTopicOrder();
    renderPostTopicSelects();
    topicInput.value = '';
    const topicsSaved = saveStoredValue(topicStorageKey, userTopics);
    const orderSaved = saveStoredValue(topicOrderStorageKey, topicOrder);
    topicStatus.textContent = topicsSaved && orderSaved
        ? `tópico "${name}" adicionado; agora você pode atribuí-lo a um post.`
        : 'tópico adicionado nesta sessão, mas o navegador não conseguiu salvá-lo.';
});

postForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = postTitleInput.value.trim();
    const content = postContentInput.value.trim();
    const category = postTopicChoice.value;
    if (!title || !content || !getAllTopics().some((topic) => topic.id === category)) {
        postStatus.textContent = 'adicione um título, um texto e escolha um tópico.';
        return;
    }

    const userPost = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        content,
        topic: category,
        createdAt: new Date().toISOString()
    };
    userPosts.push(userPost);
    const article = createUserPost(userPost);
    addPostDeleteButton(article);
    posts.push(article);
    feed.insertBefore(article, emptyState);
    savedPostTopics[article.dataset.postId] = category;
    bindLikeButton(article.querySelector('.like-button'));
    renderPostTopicSelects();
    postForm.reset();
    postTopicChoice.value = category;
    updatePosts();

    const saved = saveStoredValue(userPostsStorageKey, userPosts) && saveStoredValue(postTopicsStorageKey, savedPostTopics);
    postStatus.textContent = saved
        ? `post publicado em "${getAllTopics().find((topic) => topic.id === category)?.name ?? category}".`
        : 'post publicado nesta sessão, mas o navegador não conseguiu salvá-lo.';
});
searchInput.addEventListener('input', updatePosts);

posts.forEach((post) => bindLikeButton(post.querySelector('.like-button')));

document.querySelector('#guestbook-button').addEventListener('click', () => {
    document.querySelector('#guest-note').textContent = 'seu sinal chegou. obrigado por passar por aqui!';
});

const savedTrackAudio = document.querySelector('#saved-track-audio');

let popupZIndex = 21;
const reducePopupMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.retro-popup').forEach((popup, index) => {
    const titlebar = popup.querySelector('.popup-titlebar');
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let dragging = false;
    let x = Math.max(0, window.innerWidth - popup.offsetWidth - 24 - index * 36);
    let y = Math.min(window.innerHeight - popup.offsetHeight, 64 + index * (popup.offsetHeight + 14));
    let velocityX = index === 0 ? 0.72 : -0.58;
    let velocityY = index === 0 ? 0.48 : -0.62;
    let animationFrame;
    let lastTrailTime = 0;
    const popupLayer = popup.closest('.popup-layer');

    x = Math.max(0, x);
    y = Math.max(0, y);
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;

    popup.querySelectorAll('[data-close-popup]').forEach((button) => {
        button.addEventListener('click', () => {
            popup.hidden = true;
            cancelAnimationFrame(animationFrame);
        });
    });

    function leavePopupTrail(left, top) {
        if (reduceMotion) return;
        const trail = popup.cloneNode(true);
        trail.classList.add('retro-popup-trail');
        trail.setAttribute('aria-hidden', 'true');
        trail.inert = true;
        trail.style.left = `${left}px`;
        trail.style.top = `${top}px`;
        trail.style.zIndex = String(Math.max(1, popupZIndex - 1));
        popupLayer.append(trail);
        trail.addEventListener('animationend', () => trail.remove(), { once: true });
    }

    titlebar.addEventListener('pointerdown', (event) => {
        if (event.target.closest('button')) return;
        const bounds = popup.getBoundingClientRect();
        dragging = true;
        x = bounds.left;
        y = bounds.top;
        dragOffsetX = event.clientX - bounds.left;
        dragOffsetY = event.clientY - bounds.top;
        popup.style.zIndex = String(++popupZIndex);
        titlebar.setPointerCapture(event.pointerId);
    });

    titlebar.addEventListener('pointermove', (event) => {
        if (!titlebar.hasPointerCapture(event.pointerId)) return;
        const previousX = x;
        const previousY = y;
        x = Math.max(0, Math.min(window.innerWidth - popup.offsetWidth, event.clientX - dragOffsetX));
        y = Math.max(0, Math.min(window.innerHeight - popup.offsetHeight, event.clientY - dragOffsetY));
        const now = performance.now();
        if (Math.hypot(x - previousX, y - previousY) > 8 && now - lastTrailTime > 55) {
            leavePopupTrail(previousX, previousY);
            lastTrailTime = now;
        }
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
    });

    function stopDragging(event) {
        dragging = false;
        if (titlebar.hasPointerCapture(event.pointerId)) titlebar.releasePointerCapture(event.pointerId);
    }
    titlebar.addEventListener('pointerup', stopDragging);
    titlebar.addEventListener('pointercancel', stopDragging);

    window.addEventListener('resize', () => {
        x = Math.max(0, Math.min(window.innerWidth - popup.offsetWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - popup.offsetHeight, y));
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
    });

    function floatPopup() {
        if (popup.hidden || reducePopupMotion) return;
        if (!dragging) {
            const maxX = Math.max(0, window.innerWidth - popup.offsetWidth);
            const maxY = Math.max(0, window.innerHeight - popup.offsetHeight);
            x += velocityX;
            y += velocityY;

            if (x <= 0 || x >= maxX) {
                x = Math.max(0, Math.min(maxX, x));
                velocityX *= -1;
            }
            if (y <= 0 || y >= maxY) {
                y = Math.max(0, Math.min(maxY, y));
                velocityY *= -1;
            }

            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
        }
        animationFrame = requestAnimationFrame(floatPopup);
    }

    floatPopup();
});

const photoInput = document.querySelector('#photo-input');
const photoScatterLayer = document.querySelector('#photo-scatter-layer');
const photoEmpty = document.querySelector('#photo-empty');
const photoStatus = document.querySelector('#photo-status');
const profilePhotoInput = document.querySelector('#profile-photo-input');
const profilePhotoImage = document.querySelector('#profile-photo-image');
const avatarPlaceholder = document.querySelector('#avatar-placeholder');
const profilePhotoLabel = document.querySelector('#profile-photo-label');
const profilePhotoStatus = document.querySelector('#profile-photo-status');
const profileEditToggle = document.querySelector('#profile-edit-toggle');
const profileEditForm = document.querySelector('#profile-edit-form');
const profileEditCancel = document.querySelector('#profile-edit-cancel');
const profileEditMessage = document.querySelector('#profile-edit-message');
const profileFields = {
    name: document.querySelector('#profile-name'),
    handle: document.querySelector('#profile-handle'),
    bio: document.querySelector('#profile-bio'),
    status: document.querySelector('#profile-status-text')
};
const profileInputs = {
    name: document.querySelector('#profile-name-input'),
    handle: document.querySelector('#profile-handle-input'),
    bio: document.querySelector('#profile-bio-input'),
    status: document.querySelector('#profile-status-input')
};
const defaultProfileDetails = {
    name: profileFields.name.textContent,
    handle: profileFields.handle.textContent,
    bio: document.querySelector('#profile-bio').textContent,
    status: profileFields.status.textContent
};
let profileDetails = { ...defaultProfileDetails };
const photoDatabase = new Promise((resolve, reject) => {
    const request = indexedDB.open('pedro-photo-archive', 2);
    request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('photos')) database.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        if (!database.objectStoreNames.contains('profile')) database.createObjectStore('profile');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});
let photoObjectUrls = [];

function requestPersistentStorage() {
    if (!navigator.storage?.persist) return Promise.resolve(false);
    try {
        return navigator.storage.persist().catch(() => false);
    } catch {
        return Promise.resolve(false);
    }
}

function transactionComplete(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

function requestResult(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getSavedPhotos() {
    const database = await photoDatabase;
    const transaction = database.transaction('photos', 'readonly');
    const done = transactionComplete(transaction);
    const photos = await requestResult(transaction.objectStore('photos').getAll());
    await done;
    return photos;
}

function positionScatteredPhotos() {
    const cards = [...photoScatterLayer.querySelectorAll('.photo-item')];
    const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const cardWidth = window.matchMedia('(max-width: 700px)').matches ? 96 : 138;
    const cardHeight = cardWidth * 1.32;
    const maxX = Math.max(8, window.innerWidth - cardWidth - 8);
    const maxY = Math.max(80, pageHeight - cardHeight - 8);
    const placements = [];

    photoScatterLayer.style.height = `${pageHeight}px`;
    cards.forEach((card, index) => {
        card.style.width = `${cardWidth}px`;
        let placement = null;

        for (let attempt = 0; attempt < 36; attempt += 1) {
            const candidate = {
                x: 8 + Math.random() * Math.max(0, maxX - 8),
                y: 80 + Math.random() * Math.max(0, maxY - 80)
            };
            const overlaps = placements.some((other) =>
                Math.abs(candidate.x - other.x) < cardWidth * .78 &&
                Math.abs(candidate.y - other.y) < cardHeight * .74
            );
            if (!overlaps) {
                placement = candidate;
                break;
            }
        }

        if (!placement) {
            placement = { x: 8 + (index % 2) * Math.max(0, maxX - 8), y: Math.min(maxY, 100 + index * cardHeight) };
        }
        placements.push(placement);
        card.style.left = `${placement.x}px`;
        card.style.top = `${placement.y}px`;
    });
}

async function createPixelatedPhotoPreview(imageBlob) {
    if (typeof createImageBitmap !== 'function') return imageBlob;

    let bitmap;
    try {
        bitmap = await createImageBitmap(imageBlob);
        const cropSize = Math.min(bitmap.width, bitmap.height);
        const cropX = (bitmap.width - cropSize) / 2;
        const cropY = (bitmap.height - cropSize) / 2;
        const pixelSize = 96;
        const canvas = document.createElement('canvas');
        canvas.width = pixelSize;
        canvas.height = pixelSize;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.imageSmoothingEnabled = true;
        context.drawImage(bitmap, cropX, cropY, cropSize, cropSize, 0, 0, pixelSize, pixelSize);

        const pixels = context.getImageData(0, 0, pixelSize, pixelSize);
        for (let pixel = 0; pixel < pixels.data.length; pixel += 4) {
            const gray = Math.round(pixels.data[pixel] * .2126 + pixels.data[pixel + 1] * .7152 + pixels.data[pixel + 2] * .0722);
            pixels.data[pixel] = gray;
            pixels.data[pixel + 1] = gray;
            pixels.data[pixel + 2] = gray;
        }
        context.putImageData(pixels, 0, 0);

        const preview = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        return preview || imageBlob;
    } catch {
        return imageBlob;
    } finally {
        bitmap?.close();
    }
}

let profilePhotoObjectUrl;
async function displayProfilePhoto(imageBlob) {
    const preview = await createPixelatedPhotoPreview(imageBlob);
    if (profilePhotoObjectUrl) URL.revokeObjectURL(profilePhotoObjectUrl);
    profilePhotoObjectUrl = URL.createObjectURL(preview);
    profilePhotoImage.src = profilePhotoObjectUrl;
    profilePhotoImage.hidden = false;
    avatarPlaceholder.hidden = true;
    profilePhotoLabel.textContent = 'trocar foto';
}

async function loadProfilePhoto() {
    const database = await photoDatabase;
    const transaction = database.transaction('profile', 'readonly');
    const done = transactionComplete(transaction);
    const imageBlob = await requestResult(transaction.objectStore('profile').get('avatar'));
    await done;
    if (imageBlob) await displayProfilePhoto(imageBlob);
}

function renderProfileDetails(details) {
    profileFields.name.textContent = details.name;
    profileFields.handle.textContent = details.handle;
    document.querySelector('#profile-bio').textContent = details.bio;
    profileFields.status.textContent = details.status;
    Object.entries(profileInputs).forEach(([key, input]) => { input.value = details[key]; });
}

async function loadProfileDetails() {
    const database = await photoDatabase;
    const transaction = database.transaction('profile', 'readonly');
    const done = transactionComplete(transaction);
    const savedDetails = await requestResult(transaction.objectStore('profile').get('details'));
    await done;
    if (!savedDetails || typeof savedDetails !== 'object') return;

    profileDetails = Object.fromEntries(Object.keys(defaultProfileDetails).map((key) => [
        key,
        typeof savedDetails[key] === 'string' && savedDetails[key].trim() ? savedDetails[key] : defaultProfileDetails[key]
    ]));
    renderProfileDetails(profileDetails);
}

profileEditToggle.addEventListener('click', () => {
    const isOpening = profileEditForm.hidden;
    profileEditForm.hidden = !isOpening;
    profileEditToggle.setAttribute('aria-expanded', String(isOpening));
    profileEditMessage.textContent = '';
    if (isOpening) profileInputs.name.focus();
});

profileEditCancel.addEventListener('click', () => {
    renderProfileDetails(profileDetails);
    profileEditForm.hidden = true;
    profileEditToggle.setAttribute('aria-expanded', 'false');
    profileEditMessage.textContent = '';
});

profileEditForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nextDetails = Object.fromEntries(Object.entries(profileInputs).map(([key, input]) => [key, input.value.trim()]));
    if (Object.values(nextDetails).some((value) => !value)) {
        profileEditMessage.textContent = 'preencha todos os campos antes de salvar.';
        return;
    }

    profileEditToggle.disabled = true;
    profileEditMessage.textContent = 'salvando perfil...';
    try {
        const database = await photoDatabase;
        const transaction = database.transaction('profile', 'readwrite');
        const done = transactionComplete(transaction);
        transaction.objectStore('profile').put(nextDetails, 'details');
        await done;
        profileDetails = nextDetails;
        renderProfileDetails(profileDetails);
        profileEditForm.hidden = false;
        profileEditToggle.setAttribute('aria-expanded', 'true');
        profileEditMessage.textContent = 'perfil salvo neste navegador.';
        requestPersistentStorage();
    } catch {
        profileEditMessage.textContent = 'não foi possível salvar as alterações do perfil.';
    } finally {
        profileEditToggle.disabled = false;
    }
});

loadProfileDetails().catch(() => {
    profileEditMessage.textContent = 'não foi possível carregar o perfil salvo.';
});

profilePhotoInput.addEventListener('change', async () => {
    const image = profilePhotoInput.files[0];
    if (!image || !image.type.startsWith('image/')) {
        profilePhotoStatus.textContent = 'selecione uma imagem para seu retrato.';
        profilePhotoInput.value = '';
        return;
    }

    const persistenceRequest = requestPersistentStorage();
    profilePhotoInput.disabled = true;
    profilePhotoStatus.textContent = 'salvando seu retrato...';
    try {
        const database = await photoDatabase;
        const transaction = database.transaction('profile', 'readwrite');
        const done = transactionComplete(transaction);
        transaction.objectStore('profile').put(image, 'avatar');
        await done;
        await displayProfilePhoto(image);
        const persistent = await persistenceRequest;
        profilePhotoStatus.textContent = persistent
            ? 'retrato salvo neste navegador.'
            : 'retrato salvo; limpar os dados do site pode apagá-lo.';
    } catch {
        profilePhotoStatus.textContent = 'não foi possível salvar seu retrato.';
    } finally {
        profilePhotoInput.disabled = false;
        profilePhotoInput.value = '';
    }
});

loadProfilePhoto().catch(() => {
    profilePhotoStatus.textContent = 'não foi possível carregar o retrato salvo.';
});

async function renderScatteredPhotos() {
    const photos = await getSavedPhotos();
    photoObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    photoObjectUrls = [];
    photoScatterLayer.replaceChildren();
    const polaroidAngles = [-7, 5, -3, 8, -5, 4];

    for (const [index, photo] of photos.entries()) {
        const figure = document.createElement('figure');
        figure.className = 'photo-item';
        const angle = polaroidAngles[index % polaroidAngles.length];
        figure.style.setProperty('--polaroid-angle', `${angle}deg`);
        figure.style.setProperty('--polaroid-rest-angle', `${angle * -.55}deg`);
        figure.style.setProperty('--polaroid-delay', `${-(index % 5) * 0.6}s`);
        figure.style.zIndex = String(8 + index % 4);
        const image = document.createElement('img');
        image.src = URL.createObjectURL(await createPixelatedPhotoPreview(photo.image));
        image.alt = photo.name;
        image.loading = 'lazy';
        photoObjectUrls.push(image.src);

        const caption = document.createElement('figcaption');
        caption.textContent = photo.name;
        const removeButton = document.createElement('button');
        removeButton.className = 'photo-remove';
        removeButton.type = 'button';
        removeButton.setAttribute('aria-label', `Remover ${photo.name}`);
        removeButton.title = 'Remover foto';
        removeButton.innerHTML = '&#215;';
        removeButton.addEventListener('click', async () => {
            try {
                const database = await photoDatabase;
                const transaction = database.transaction('photos', 'readwrite');
                const done = transactionComplete(transaction);
                transaction.objectStore('photos').delete(photo.id);
                await done;
                await renderScatteredPhotos();
                photoStatus.textContent = 'foto removida do arquivo local.';
            } catch {
                photoStatus.textContent = 'não foi possível remover esta foto.';
            }
        });

        figure.append(image, caption, removeButton);
        photoScatterLayer.append(figure);
    }

    photoEmpty.hidden = photos.length > 0;
    positionScatteredPhotos();
}

photoInput.addEventListener('change', async () => {
    const files = [...photoInput.files];
    if (!files.length) return;
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (!images.length) {
        photoStatus.textContent = 'selecione arquivos de imagem.';
        photoInput.value = '';
        return;
    }

    const persistenceRequest = requestPersistentStorage();
    photoInput.disabled = true;
    photoStatus.textContent = 'salvando imagens no arquivo...';
    try {
        const database = await photoDatabase;
        const transaction = database.transaction('photos', 'readwrite');
        const done = transactionComplete(transaction);
        images.forEach((image) => transaction.objectStore('photos').add({ name: image.name, image }));
        await done;
        await renderScatteredPhotos();
        const persistent = await persistenceRequest;
        photoStatus.textContent = persistent
            ? `${images.length} imagem(ns) salva(s) no armazenamento persistente deste navegador.`
            : `${images.length} imagem(ns) salva(s) neste navegador; limpar os dados do site pode apagá-las.`;
    } catch {
        photoStatus.textContent = 'não foi possível salvar. o armazenamento pode estar cheio ou indisponível.';
    } finally {
        photoInput.disabled = false;
        photoInput.value = '';
    }
});

renderScatteredPhotos().catch(() => {
    photoStatus.textContent = 'armazenamento de imagens indisponível neste navegador.';
});

let photoScatterResizeTimeout;
window.addEventListener('resize', () => {
    window.clearTimeout(photoScatterResizeTimeout);
    photoScatterResizeTimeout = window.setTimeout(positionScatteredPhotos, 180);
});

const musicInput = document.querySelector('#music-input');
const musicStatus = document.querySelector('#music-status');
const musicTitle = document.querySelector('#saved-track-title');
const musicPlayer = document.querySelector('#saved-track-audio');
const playlistList = document.querySelector('#playlist-list');
const musicVisualizer = document.querySelector('#music-visualizer');
const previousTrackButton = document.querySelector('#playlist-previous');
const nextTrackButton = document.querySelector('#playlist-next');
const defaultTracks = [
    { id: 'mujer-divina', name: 'mujer divina', url: 'sound/mujer-divina-audio-oficial.mp3' },
    { id: 'video', name: 'vídeo', url: 'sound/video.mp3' }
];
const musicDatabase = new Promise((resolve, reject) => {
    const request = indexedDB.open('pedro-music-playlist', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});
let playlistTracks = [...defaultTracks];
let currentTrackIndex = 0;
const musicObjectUrls = new Map();
const musicBars = Array.from({ length: 18 }, () => {
    const bar = document.createElement('span');
    bar.className = 'music-bar';
    musicVisualizer.append(bar);
    return bar;
});
let audioContext;
let audioAnalyser;
let audioFrequencyData;
let visualizerFrame = 0;

function initializeAudioAnalyser() {
    if (audioAnalyser) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio API indisponível.');

    audioContext = new AudioContextClass();
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 64;
    audioAnalyser.smoothingTimeConstant = .78;
    const audioSource = audioContext.createMediaElementSource(musicPlayer);
    audioSource.connect(audioAnalyser);
    audioAnalyser.connect(audioContext.destination);
    audioFrequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
}

function drawAudioVisualizer() {
    if (musicPlayer.paused || musicPlayer.ended || !audioAnalyser) {
        visualizerFrame = 0;
        return;
    }

    audioAnalyser.getByteFrequencyData(audioFrequencyData);
    musicBars.forEach((bar, index) => {
        const frequencyIndex = Math.floor(index * audioFrequencyData.length / musicBars.length);
        const level = Math.max(.06, audioFrequencyData[frequencyIndex] / 255);
        bar.style.transform = `scaleY(${level})`;
    });
    visualizerFrame = requestAnimationFrame(drawAudioVisualizer);
}

async function startAudioVisualizer() {
    musicVisualizer.classList.add('is-playing');
    try {
        initializeAudioAnalyser();
        if (audioContext.state === 'suspended') await audioContext.resume();
        musicVisualizer.classList.remove('is-fallback');
        if (!musicPlayer.paused && visualizerFrame === 0) drawAudioVisualizer();
    } catch {
        musicVisualizer.classList.add('is-fallback');
    }
}

function stopAudioVisualizer() {
    musicVisualizer.classList.remove('is-playing');
    if (visualizerFrame) cancelAnimationFrame(visualizerFrame);
    visualizerFrame = 0;
    musicBars.forEach((bar) => { bar.style.transform = 'scaleY(.06)'; });
}

musicPlayer.addEventListener('play', startAudioVisualizer);
musicPlayer.addEventListener('pause', stopAudioVisualizer);

function getMusicTrackUrl(track) {
    if (track.url) return track.url;
    if (!musicObjectUrls.has(track.id)) musicObjectUrls.set(track.id, URL.createObjectURL(track.file));
    return musicObjectUrls.get(track.id);
}

function updatePlaylistControls() {
    const hasMultipleTracks = playlistTracks.length > 1;
    previousTrackButton.disabled = !hasMultipleTracks;
    nextTrackButton.disabled = !hasMultipleTracks;
}

function renderPlaylist() {
    playlistList.replaceChildren();
    playlistTracks.forEach((track, index) => {
        const item = document.createElement('li');
        item.className = 'playlist-item';
        const trackButton = document.createElement('button');
        trackButton.className = 'playlist-track-button';
        trackButton.type = 'button';
        trackButton.textContent = `${String(index + 1).padStart(2, '0')}  ${track.name}`;
        trackButton.setAttribute('aria-current', String(index === currentTrackIndex));
        trackButton.addEventListener('click', () => playPlaylistTrack(index));
        item.append(trackButton);

        if (track.uploaded) {
            const removeButton = document.createElement('button');
            removeButton.className = 'playlist-remove';
            removeButton.type = 'button';
            removeButton.textContent = 'x';
            removeButton.title = `Remover ${track.name}`;
            removeButton.setAttribute('aria-label', `Remover ${track.name} da playlist`);
            removeButton.addEventListener('click', () => removePlaylistTrack(track));
            item.append(removeButton);
        }

        playlistList.append(item);
    });
    musicStatus.textContent = `${playlistTracks.length} ${playlistTracks.length === 1 ? 'faixa' : 'faixas'} na playlist`;
    updatePlaylistControls();
}

async function loadPlaylist() {
    const database = await musicDatabase;
    const transaction = database.transaction('tracks', 'readonly');
    const done = transactionComplete(transaction);
    const uploads = await requestResult(transaction.objectStore('tracks').getAll());
    await done;

    const currentTrackId = playlistTracks[currentTrackIndex]?.id;
    playlistTracks = [...defaultTracks, ...uploads.map((track) => ({
        id: `uploaded-${track.id}`,
        storageId: track.id,
        name: track.name,
        file: track.file,
        uploaded: true
    }))];
    currentTrackIndex = Math.max(0, playlistTracks.findIndex((track) => track.id === currentTrackId));
    musicTitle.textContent = playlistTracks[currentTrackIndex].name;
    renderPlaylist();
}

async function playPlaylistTrack(index) {
    if (!playlistTracks.length) return;
    currentTrackIndex = (index + playlistTracks.length) % playlistTracks.length;
    const track = playlistTracks[currentTrackIndex];
    musicTitle.textContent = track.name;
    renderPlaylist();
    const trackUrl = getMusicTrackUrl(track);
    if (musicPlayer.src !== new URL(trackUrl, document.baseURI).href) {
        musicPlayer.src = trackUrl;
        musicPlayer.load();
    }
    try {
        await musicPlayer.play();
    } catch {
        musicStatus.textContent = 'não foi possível reproduzir esta faixa.';
    }
}

async function removePlaylistTrack(track) {
    try {
        const database = await musicDatabase;
        const transaction = database.transaction('tracks', 'readwrite');
        const done = transactionComplete(transaction);
        transaction.objectStore('tracks').delete(track.storageId);
        await done;

        const objectUrl = musicObjectUrls.get(track.id);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        musicObjectUrls.delete(track.id);
        if (playlistTracks[currentTrackIndex]?.id === track.id) {
            musicPlayer.pause();
            musicPlayer.src = defaultTracks[0].url;
        }
        await loadPlaylist();
        musicStatus.textContent = `"${track.name}" removida da playlist.`;
    } catch {
        musicStatus.textContent = 'não foi possível remover esta faixa.';
    }
}

previousTrackButton.addEventListener('click', () => playPlaylistTrack(currentTrackIndex - 1));
nextTrackButton.addEventListener('click', () => playPlaylistTrack(currentTrackIndex + 1));
musicPlayer.addEventListener('ended', () => {
    stopAudioVisualizer();
    if (playlistTracks.length > 1) playPlaylistTrack(currentTrackIndex + 1);
});
musicInput.addEventListener('change', async () => {
    const files = [...musicInput.files].filter((file) => file.type.startsWith('audio/'));
    if (!files.length) {
        musicStatus.textContent = 'selecione arquivos de áudio.';
        musicInput.value = '';
        return;
    }

    const persistenceRequest = requestPersistentStorage();
    musicInput.disabled = true;
    musicStatus.textContent = 'adicionando músicas à playlist...';
    try {
        const database = await musicDatabase;
        const transaction = database.transaction('tracks', 'readwrite');
        const done = transactionComplete(transaction);
        files.forEach((file) => transaction.objectStore('tracks').add({ name: file.name, file }));
        await done;
        await loadPlaylist();
        const persistent = await persistenceRequest;
        musicStatus.textContent = persistent
            ? `${files.length} música(s) adicionada(s) ao armazenamento persistente.`
            : `${files.length} música(s) adicionada(s); limpar os dados do site pode apagá-las.`;
    } catch {
        musicStatus.textContent = 'não foi possível salvar. o armazenamento pode estar cheio ou indisponível.';
    } finally {
        musicInput.disabled = false;
        musicInput.value = '';
    }
});
renderPlaylist();
loadPlaylist().catch(() => {
    musicStatus.textContent = 'não foi possível carregar a playlist salva neste navegador.';
});

const cursorFloater = document.querySelector('#cursor-floater');
const supportsHover = window.matchMedia('(pointer: fine)').matches;
const cursorMotionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (cursorFloater && supportsHover && !cursorMotionReduced) {
    let targetX = 0;
    let targetY = 0;
    let positionX = 0;
    let positionY = 0;
    let animationFrame = null;

    function moveCursorFloater() {
        const distanceX = targetX - positionX;
        const distanceY = targetY - positionY;
        if (Math.abs(distanceX) < 0.2 && Math.abs(distanceY) < 0.2) {
            positionX = targetX;
            positionY = targetY;
            cursorFloater.style.transform = `translate3d(${positionX}px, ${positionY}px, 0)`;
            animationFrame = null;
            return;
        }

        positionX += distanceX * 0.14;
        positionY += distanceY * 0.14;
        cursorFloater.style.transform = `translate3d(${positionX}px, ${positionY}px, 0)`;
        animationFrame = requestAnimationFrame(moveCursorFloater);
    }

    window.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse') return;
        targetX = event.clientX + 14;
        targetY = event.clientY + 14;
        if (cursorFloater.classList.contains('is-visible') === false) {
            positionX = targetX;
            positionY = targetY;
            cursorFloater.style.transform = `translate3d(${positionX}px, ${positionY}px, 0)`;
            cursorFloater.classList.add('is-visible');
        }
        if (animationFrame === null) animationFrame = requestAnimationFrame(moveCursorFloater);
    }, { passive: true });

    function hideCursorFloater() {
        cursorFloater.classList.remove('is-visible');
    }

    window.addEventListener('blur', hideCursorFloater);
    document.addEventListener('mouseleave', hideCursorFloater);
}

const floatingSword = document.querySelector('#floating-sword');
let swordPointerId = null;
let swordStartX = 0;
let swordStartY = 0;
let swordOffsetX = 0;
let swordOffsetY = 0;
let swordWasDragged = false;
let ignoreSwordClick = false;
let swordX = floatingSword.getBoundingClientRect().left;
let swordY = floatingSword.getBoundingClientRect().top;
let swordVelocityX = 0;
let swordVelocityY = 0;
let swordPointerX = 0;
let swordPointerY = 0;
let swordPreviousFrame = 0;
const swordReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

floatingSword.style.left = `${swordX}px`;
floatingSword.style.top = `${swordY}px`;
floatingSword.style.right = 'auto';
floatingSword.style.bottom = 'auto';

function moveSwordWithGravity(time) {
    const frameScale = swordPreviousFrame ? Math.min((time - swordPreviousFrame) / 16.67, 2) : 1;
    swordPreviousFrame = time;

    if (swordPointerId === null) {
        swordVelocityY += (swordReduceMotion ? .24 : .42) * frameScale;
        swordX += swordVelocityX * frameScale;
        swordY += swordVelocityY * frameScale;

        const maxX = Math.max(0, window.innerWidth - floatingSword.offsetWidth);
        const floorY = Math.max(0, window.innerHeight - floatingSword.offsetHeight);
        if (swordX < 0 || swordX > maxX) {
            swordX = Math.max(0, Math.min(maxX, swordX));
            swordVelocityX *= -.56;
        }
        if (swordY < 0) {
            swordY = 0;
            swordVelocityY = Math.abs(swordVelocityY) * .45;
        }
        if (swordY >= floorY) {
            swordY = floorY;
            swordVelocityY = swordReduceMotion ? 0 : -Math.abs(swordVelocityY) * .4;
            swordVelocityX *= .82;
            if (Math.abs(swordVelocityY) < .8) swordVelocityY = 0;
        }

        floatingSword.style.left = `${swordX}px`;
        floatingSword.style.top = `${swordY}px`;
    }

    requestAnimationFrame(moveSwordWithGravity);
}
requestAnimationFrame(moveSwordWithGravity);

floatingSword.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const bounds = floatingSword.getBoundingClientRect();
    swordPointerId = event.pointerId;
    swordStartX = event.clientX;
    swordStartY = event.clientY;
    swordPointerX = event.clientX;
    swordPointerY = event.clientY;
    swordOffsetX = event.clientX - bounds.left;
    swordOffsetY = event.clientY - bounds.top;
    swordWasDragged = false;
    swordVelocityX = 0;
    swordVelocityY = 0;
    floatingSword.style.left = `${bounds.left}px`;
    floatingSword.style.top = `${bounds.top}px`;
    floatingSword.style.right = 'auto';
    floatingSword.style.bottom = 'auto';
    floatingSword.setPointerCapture(event.pointerId);
    event.preventDefault();
});

floatingSword.addEventListener('pointermove', (event) => {
    if (event.pointerId !== swordPointerId) return;
    if (Math.hypot(event.clientX - swordStartX, event.clientY - swordStartY) > 5) swordWasDragged = true;
    if (!swordWasDragged) return;

    const left = Math.max(0, Math.min(window.innerWidth - floatingSword.offsetWidth, event.clientX - swordOffsetX));
    const top = Math.max(0, Math.min(window.innerHeight - floatingSword.offsetHeight, event.clientY - swordOffsetY));
    swordVelocityX = (event.clientX - swordPointerX) * .42;
    swordVelocityY = (event.clientY - swordPointerY) * .42;
    swordPointerX = event.clientX;
    swordPointerY = event.clientY;
    swordX = left;
    swordY = top;
    floatingSword.style.left = `${left}px`;
    floatingSword.style.top = `${top}px`;
});

floatingSword.addEventListener('pointerup', (event) => {
    if (event.pointerId !== swordPointerId) return;
    if (swordWasDragged) {
        ignoreSwordClick = true;
        window.setTimeout(() => { ignoreSwordClick = false; }, 0);
    }
    swordPointerId = null;
    if (floatingSword.hasPointerCapture(event.pointerId)) floatingSword.releasePointerCapture(event.pointerId);
});

floatingSword.addEventListener('pointercancel', () => {
    swordPointerId = null;
    swordWasDragged = false;
    swordVelocityX = 0;
    swordVelocityY = 0;
});

window.addEventListener('resize', () => {
    swordX = Math.max(0, Math.min(window.innerWidth - floatingSword.offsetWidth, swordX));
    swordY = Math.max(0, Math.min(window.innerHeight - floatingSword.offsetHeight, swordY));
    floatingSword.style.left = `${swordX}px`;
    floatingSword.style.top = `${swordY}px`;
});

floatingSword.addEventListener('click', () => {
    if (ignoreSwordClick) {
        ignoreSwordClick = false;
        return;
    }
    floatingSword.classList.remove('is-swinging');
    void floatingSword.offsetWidth;
    floatingSword.classList.add('is-swinging');
    window.setTimeout(() => floatingSword.classList.remove('is-swinging'), 450);
});

const clock = document.querySelector('#clock');
function updateClock() {
    clock.textContent = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date()) + ' · horário de brasília';
}
updateClock();
setInterval(updateClock, 60_000);

const performanceFps = document.querySelector('#performance-fps');
const performanceCpu = document.querySelector('#performance-cpu');
const performanceHeap = document.querySelector('#performance-heap');
const performanceCores = document.querySelector('#performance-cores');
const performanceMonitor = document.querySelector('.performance-monitor');
const supportedEntryTypes = window.PerformanceObserver?.supportedEntryTypes ?? [];
const supportsLongTasks = supportedEntryTypes.includes('longtask');
let longTaskDuration = 0;
let frameCount = 0;
let sampleStart = performance.now();
let performanceFrame = 0;

if (supportsLongTasks) {
    const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => { longTaskDuration += entry.duration; });
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
}

performanceCores.textContent = navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : 'n/d';

function updatePerformanceMonitor(now) {
    frameCount += 1;
    const elapsed = now - sampleStart;
    if (elapsed >= 1000) {
        performanceFps.textContent = String(Math.round(frameCount * 1000 / elapsed));
        performanceCpu.textContent = supportsLongTasks
            ? `${Math.min(100, Math.round(longTaskDuration * 100 / elapsed))}%`
            : 'n/d';

        const memory = performance['memory'];
        performanceHeap.textContent = memory?.usedJSHeapSize
            ? `${Math.round(memory.usedJSHeapSize / 1048576)} MB`
            : 'n/d';

        frameCount = 0;
        longTaskDuration = 0;
        sampleStart = now;
    }
    if (performanceMonitor.open) performanceFrame = window.requestAnimationFrame(updatePerformanceMonitor);
    else performanceFrame = 0;
}

performanceMonitor.addEventListener('toggle', () => {
    if (performanceMonitor.open && !performanceFrame) {
        sampleStart = performance.now();
        performanceFrame = window.requestAnimationFrame(updatePerformanceMonitor);
    } else if (!performanceMonitor.open && performanceFrame) {
        window.cancelAnimationFrame(performanceFrame);
        performanceFrame = 0;
    }
});

if (performanceMonitor.open) performanceFrame = window.requestAnimationFrame(updatePerformanceMonitor);

const uvHiddenMessages = document.querySelector('#uv-hidden-messages');
let uvHideTimeout;

function hideUvMessages() {
    window.clearTimeout(uvHideTimeout);
    uvHiddenMessages.classList.remove('is-active');
}

window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    uvHiddenMessages.style.setProperty('--uv-x', `${event.clientX}px`);
    uvHiddenMessages.style.setProperty('--uv-y', `${event.clientY}px`);
    uvHiddenMessages.classList.add('is-active');
    window.clearTimeout(uvHideTimeout);
    uvHideTimeout = window.setTimeout(hideUvMessages, 1400);
}, { passive: true });

document.addEventListener('mouseleave', hideUvMessages);
window.addEventListener('blur', hideUvMessages);