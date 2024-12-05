// ==UserScript==
// @name         Ads Navigation Control
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Kiểm soát điều hướng và iframe với nhiều phương thức nâng cao
// @author       thedusk4203
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Cấu hình whitelist
    const CONFIG = {
        // Danh sách domain được phép (whitelist)
        allowedDomains: [
            'example.com',
            'subdomain.example.com',
            // Thêm các domain khác vào đây
        ],

        allowedPaths: {
            'example.com': [
                '/allowed-path',
                '/another-path/*'
            ],
        },

        // Cấu hình cho iframe
        iframeWhitelist: [
            'trusted-iframe-source.com',
            // Thêm các domain được phép nhúng iframe
        ]
    };

    // Hàm kiểm tra path với wildcard
    function isPathAllowed(domain, path) {
        const allowedPaths = CONFIG.allowedPaths[domain];
        if (!allowedPaths) return true; // Nếu không có cấu hình path, cho phép tất cả

        return allowedPaths.some(allowedPath => {
            if (allowedPath.endsWith('/*')) {
                const basePath = allowedPath.slice(0, -1);
                return path.startsWith(basePath);
            }
            return path === allowedPath;
        });
    }

    // Hàm kiểm tra URL với whitelist
    function isAllowedNavigation(url) {
        try {
            const parsedUrl = new URL(url, window.location.href);

            // Kiểm tra origin hiện tại
            if (parsedUrl.origin === window.location.origin) return true;

            // Kiểm tra domain trong whitelist
            const isAllowedDomain = CONFIG.allowedDomains.some(domain => {
                return parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain);
            });

            if (!isAllowedDomain) return false;

            // Kiểm tra path nếu được cấu hình
            return isPathAllowed(parsedUrl.hostname, parsedUrl.pathname);
        } catch (e) {
            console.error('Lỗi kiểm tra URL:', e);
            return false;
        }
    }

    // Hàm kiểm tra iframe với whitelist riêng
    function isAllowedIframe(url) {
        try {
            const parsedUrl = new URL(url);
            return CONFIG.iframeWhitelist.some(domain =>
                parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
            );
        } catch (e) {
            console.error('Lỗi kiểm tra iframe URL:', e);
            return false;
        }
    }

    const originalWindowOpen = window.open;
    window.open = function(url, name, features) {
        if (isAllowedNavigation(url)) {
            window.location.href = url;
        }
        return window;
    };

    document.addEventListener('click', function(e) {
        const target = e.target.closest('a');
        if (target && target.href) {
            if (!isAllowedNavigation(target.href)) {
                e.preventDefault();
                e.stopPropagation();
                console.warn('Điều hướng bị chặn: ' + target.href);
            }
        }
    }, true);

    if (window.history) {
        const originalPushState = window.history.pushState;
        window.history.pushState = function(state, title, url) {
            if (isAllowedNavigation(url)) {
                return originalPushState.apply(this, arguments);
            }
        };

        const originalReplaceState = window.history.replaceState;
        window.history.replaceState = function(state, title, url) {
            if (isAllowedNavigation(url)) {
                return originalReplaceState.apply(this, arguments);
            }
        };
    }

    const originalLocationHref = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
    Object.defineProperty(window.location, 'href', {
        set: function(url) {
            if (isAllowedNavigation(url)) {
                originalLocationHref.set.call(this, url);
            }
        }
    });

    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.action && !isAllowedNavigation(form.action)) {
            e.preventDefault();
            console.warn('Form submit bị chặn: ' + form.action);
        }
    }, true);

    // Kiểm soát iframe với whitelist
    function setupIframeControl() {
        const existingIframes = document.getElementsByTagName('iframe');
        Array.from(existingIframes).forEach(iframe => {
            if (!isAllowedIframe(iframe.src)) {
                iframe.remove();
                console.warn('Iframe bị xóa:', iframe.src);
            }
        });

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'IFRAME') {
                        if (!isAllowedIframe(node.src)) {
                            node.remove();
                            console.warn('Iframe mới bị chặn:', node.src);
                        }
                    }
                });
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // Khởi tạo
    setupIframeControl();
})();