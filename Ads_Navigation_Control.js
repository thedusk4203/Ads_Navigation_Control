// ==UserScript==
// @name         Ads Navigation Control
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Chặn click và điều hướng của các ads
// @author       thedusk4203
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Thêm danh sách whitelist
    const whitelist = [
        'google.com',
        'gmail.com',
        'google.com.vn',
        'bing.com',
        'yahoo.com',
        'baidu.com',
        'duckduckgo.com',
        'yandex.com',
        'ask.com',
        'ecosia.org',
        'naver.com',
        'sogou.com',
        'wikipedia.org',
        'github.com',
        'facebook.com',
        'stackoverflow.com',
        'developer.mozilla.org',
        'w3schools.com',
        'khanacademy.org',
        'coursera.org',
        'edx.org',
        'ocw.mit.edu',
    ];

    // Hàm kiểm tra domain có trong whitelist
    function isWhitelisted(domain) {
        return whitelist.some(allowed => domain.includes(allowed));
    }

    // Hàm kiểm tra URL
    function isAllowedNavigation(url) {
        try {
            const parsedUrl = new URL(url, window.location.href);
            const currentOrigin = window.location.origin;

            // Nếu trang hiện tại trong whitelist, cho phép mọi điều hướng
            if (isWhitelisted(window.location.hostname)) {
                return true;
            }

            // Nếu không trong whitelist, chỉ cho phép điều hướng trong cùng origin
            return parsedUrl.origin === currentOrigin;
        } catch (e) {
            console.error('Lỗi kiểm tra URL:', e);
            return false;
        }
    }

    // Hàm kiểm tra iframe
    function isAllowedIframe(url) {
        try {
            const parsedUrl = new URL(url);

            // Nếu trang hiện tại trong whitelist, cho phép iframe từ mọi nguồn
            if (isWhitelisted(window.location.hostname)) {
                return true;
            }

            // Nếu không trong whitelist, chỉ cho phép iframe từ cùng origin
            return parsedUrl.origin === window.location.origin;
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

    setupIframeControl();
})();
