document.addEventListener("DOMContentLoaded", () => {
    AOS.init({ duration: 600 });

    const key = 'bfbfbb6afe1c4ef68a7c50ca597fd813'; // Replace with your NewsAPI key
    const feed = document.getElementById('news-feed');
    const savedFeed = document.getElementById('saved-articles-feed');
    const savedSection = document.getElementById('saved-articles-section');
    const spin = document.getElementById('loading-spinner');
    const more = document.getElementById('load-more');
    const tog = document.getElementById('theme-toggle');
    const inp = document.getElementById('search-input');
    const btn = document.getElementById('search-btn');
    const voiceBtn = document.getElementById('voice-search-btn');
    const cat = document.getElementById('category-selector');
    const date = document.getElementById('date-filter');
    const clearBtn = document.getElementById('clear-filters-btn');
    const trend = document.getElementById('trending-topics');
    const toast = document.getElementById('toast');
    const modal = document.getElementById('article-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalImage = document.getElementById('modal-image');
    const modalDesc = document.getElementById('modal-description');
    const modalLink = document.getElementById('modal-link');
    const modalNotes = document.getElementById('modal-notes');
    const saveArticleBtn = document.getElementById('save-article-btn');
    const closeModal = document.getElementById('close-modal');

    let page = 1, query = 'technology', perPage = 9, loading = false;
    let savedArticles = JSON.parse(localStorage.getItem('savedArticles')) || [];

    // Theme Persistence
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark');
        tog.textContent = '☀️';
    }

    tog.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        tog.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
        localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    });

    function debounce(fn, wait) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    }

    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = `fixed bottom-4 right-4 p-4 rounded shadow ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }

    async function fetchNews(q, p = 1, add = false) {
        if (loading) return;
        loading = true;
        query = q;
        page = p;
        spin.classList.remove('hidden');

        let url = `https://newsapi.org/v2/everything?q=${q}&pageSize=${perPage}&page=${p}&apiKey=${key}`;
        if (date.value !== 'all') {
            const now = new Date();
            let fromDate;
            if (date.value === 'today') fromDate = now.toISOString().split('T')[0];
            else if (date.value === 'week') fromDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
            else if (date.value === 'month') fromDate = new Date(now.setFullYear(now.getFullYear(), now.getMonth() - 1)).toISOString().split('T')[0];
            url += `&from=${fromDate}`;
        }

        try {
            const res = await fetch(url);
            const data = await res.json();
            spin.classList.add('hidden');
            loading = false;

            if (data.articles.length) {
                showNews(data.articles, add);
                more.classList.toggle('hidden', data.articles.length < perPage);
            } else {
                feed.innerHTML = `<p class="text-center col-span-full text-gray-700 dark:text-gray-300">No news for "${q}".</p>`;
                more.classList.add('hidden');
            }
        } catch (e) {
            spin.classList.add('hidden');
            loading = false;
            feed.innerHTML = `<p class="text-center col-span-full text-red-500">Error. <button id="retry-btn" class="underline hover:text-red-700">Retry</button></p>`;
            more.classList.add('hidden');
            document.getElementById('retry-btn')?.addEventListener('click', () => fetchNews(q, p, add));
        }
    }

    async function fetchTrends() {
        try {
            const res = await fetch(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${key}`);
            const data = await res.json();
            const topics = [...new Set(data.articles.map(a => a.source.name).slice(0, 8))];
            trend.innerHTML = topics.map(t => `<button class="px-3 py-1 bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-gray-600 transition" data-topic="${t}" title="Search ${t}">${t}</button>`).join('');
            trend.querySelectorAll('button').forEach(b => b.addEventListener('click', () => fetchNews(b.dataset.topic, 1)));
        } catch (e) {}
    }

    function showNews(articles, add = false) {
        if (!add) feed.innerHTML = '';
        articles.forEach(a => {
            const item = document.createElement('div');
            item.classList.add('news-item', 'bg-white', 'dark:bg-gray-800', 'p-4', 'rounded-lg', 'shadow-md', 'hover:shadow-lg', 'transition');
            item.setAttribute('data-aos', 'fade-up');
            item.innerHTML = `
                <img src="${a.urlToImage || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="News Image" class="w-full h-40 object-cover rounded-md mb-4 cursor-pointer">
                <h3 class="text-lg font-semibold"><a href="${a.url}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">${a.title}</a></h3>
                <p class="text-gray-600 dark:text-gray-300 line-clamp-3">${a.description || 'No description'}</p>
                <button class="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 view-details-btn" data-article='${JSON.stringify(a)}' title="View Details">View Details</button>
            `;
            feed.appendChild(item);
        });

        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const article = JSON.parse(btn.dataset.article);
                modalTitle.textContent = article.title;
                modalImage.src = article.urlToImage || 'https://via.placeholder.com/300x200?text=No+Image';
                modalDesc.textContent = article.description || 'No description';
                modalLink.href = article.url;
                modalNotes.value = savedArticles.find(a => a.url === article.url)?.notes || '';
                saveArticleBtn.dataset.article = JSON.stringify(article);
                modal.classList.remove('hidden');
            });
        });
    }

    function showSavedArticles() {
        savedFeed.innerHTML = '';
        if (!savedArticles.length) {
            savedFeed.innerHTML = `<p class="text-center col-span-full text-gray-700 dark:text-gray-300">No saved articles.</p>`;
            return;
        }
        savedArticles.forEach(a => {
            const item = document.createElement('div');
            item.classList.add('news-item', 'bg-white', 'dark:bg-gray-800', 'p-4', 'rounded-lg', 'shadow-md', 'hover:shadow-lg', 'transition');
            item.setAttribute('data-aos', 'fade-up');
            item.innerHTML = `
                <img src="${a.urlToImage || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="News Image" class="w-full h-40 object-cover rounded-md mb-4 cursor-pointer">
                <h3 class="text-lg font-semibold"><a href="${a.url}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">${a.title}</a></h3>
                <p class="text-gray-600 dark:text-gray-300 line-clamp-3">${a.description || 'No description'}</p>
                <p class="text-gray-500 dark:text-gray-400 mt-2"><strong>Notes:</strong> ${a.notes || 'No notes'}</p>
                <div class="flex justify-between mt-2">
                    <button class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 remove-article-btn" data-url="${a.url}" title="Remove Article">Remove</button>
                    <button class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 view-details-btn" data-article='${JSON.stringify(a)}' title="View Details">View Details</button>
                </div>
            `;
            savedFeed.appendChild(item);
        });

        document.querySelectorAll('.remove-article-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                savedArticles = savedArticles.filter(a => a.url !== btn.dataset.url);
                localStorage.setItem('savedArticles', JSON.stringify(savedArticles));
                showSavedArticles();
                showToast('Article removed');
            });
        });

        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const article = JSON.parse(btn.dataset.article);
                modalTitle.textContent = article.title;
                modalImage.src = article.urlToImage || 'https://via.placeholder.com/300x200?text=No+Image';
                modalDesc.textContent = article.description || 'No description';
                modalLink.href = article.url;
                modalNotes.value = article.notes || '';
                saveArticleBtn.dataset.article = JSON.stringify(article);
                modal.classList.remove('hidden');
            });
        });
    }

    saveArticleBtn.addEventListener('click', () => {
        const article = JSON.parse(saveArticleBtn.dataset.article);
        const existing = savedArticles.find(a => a.url === article.url);
        if (existing) {
            existing.notes = modalNotes.value;
            showToast('Notes updated');
        } else {
            article.notes = modalNotes.value;
            savedArticles.push(article);
            showToast('Article saved');
        }
        localStorage.setItem('savedArticles', JSON.stringify(savedArticles));
        modal.classList.add('hidden');
    });

    closeModal.addEventListener('click', () => modal.classList.add('hidden'));

    // Voice Search
    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        voiceBtn.addEventListener('click', () => {
            recognition.start();
            voiceBtn.classList.add('animate-pulse');
        });

        recognition.onresult = event => {
            const transcript = event.results[0][0].transcript;
            inp.value = transcript;
            fetchNews(transcript, 1);
            voiceBtn.classList.remove('animate-pulse');
        };

        recognition.onerror = () => {
            showToast('Voice search error', 'error');
            voiceBtn.classList.remove('animate-pulse');
        };

        recognition.onend = () => voiceBtn.classList.remove('animate-pulse');
    } else {
        voiceBtn.disabled = true;
        voiceBtn.title = 'Voice search not supported';
    }

    btn.addEventListener('click', () => fetchNews(inp.value.trim() || 'technology', 1));
    inp.addEventListener('input', debounce(() => fetchNews(inp.value.trim() || 'technology', 1), 500));
    inp.addEventListener('keypress', e => e.key === 'Enter' && btn.click());
    cat.addEventListener('change', () => fetchNews(cat.value, 1));
    date.addEventListener('change', () => fetchNews(query, 1));
    clearBtn.addEventListener('click', () => {
        inp.value = '';
        cat.value = 'technology';
        date.value = 'all';
        fetchNews('technology', 1);
    });
    more.addEventListener('click', () => fetchNews(query, page + 1, true));

    document.getElementById('home-link').addEventListener('click', e => {
        e.preventDefault();
        savedSection.classList.add('hidden');
        feed.classList.remove('hidden');
        more.classList.remove('hidden');
        fetchNews('technology', 1);
        inp.value = '';
    });

    document.getElementById('saved-articles-link').addEventListener('click', e => {
        e.preventDefault();
        feed.classList.add('hidden');
        more.classList.add('hidden');
        savedSection.classList.remove('hidden');
        showSavedArticles();
    });

    fetchNews('technology');
    fetchTrends();
});