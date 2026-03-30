const CACHE_NAME = 'mtp-offline-v3';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // On cache aussi les librairies externes pour le PDF
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
];

// Installation et mise en cache immédiate
self.addEventListener('install', (e) => {
    console.log('[SW] Installation...');
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Mise en cache des fichiers');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation et nettoyage des vieux caches
self.addEventListener('activate', (e) => {
    console.log('[SW] Activation');
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            );
        }).then(() => self.clients.claim())
    );
});

// Stratégie : Cache First, puis Network (pour le offline)
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request)
            .then(res => {
                if (res) return res; // Retourne le fichier en cache
                
                // Sinon va chercher sur le réseau
                return fetch(e.request).then(netRes => {
                    // Mise à jour du cache dynamique si besoin
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(e.request.url, netRes.clone());
                        return netRes;
                    });
                }).catch(() => {
                    // Fallback ultime si offline et pas en cache
                    if(e.request.destination === 'document') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
