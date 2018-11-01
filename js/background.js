const App = {} || App;

chrome.runtime.onInstalled.addListener((details) => {
    chrome.runtime.openOptionsPage();
});

(function checkTokenFreshness() {
    chrome.storage.local.get(['auth'], (data) => {
        if (!data.auth) { return chrome.runtime.openOptionsPage(); }
        let jwtToken = data.auth.jwtToken;

        $.ajax({
            method: 'GET',
            url: 'https://svandis-api-prod.herokuapp.com/api/web-feed',
            beforeSend: (xhr) => { xhr.setRequestHeader('Authorization', 'Bearer ' + jwtToken) },
            success: (data) => {},
            error: (xhr, status, error) => {
                chrome.browserAction.setBadgeText({ text: 'off' });
            }
        })
    })
})()

const menuItem = {
    "id": "addSource",
    "title": "AddSource",
    "contexts": ["selection"]
}

chrome.contextMenus.create(menuItem);
chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'add_source_clicked', data: info }, response => {});
    });
})

function log(...data) {
    alert(JSON.stringify(data))
}

function sendTabMessage(msg) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, msg, response => {});
    });
}

chrome.runtime.onMessage.addListener(msg => {
    switch (msg.action) {
        case 'update_source_confirmed': checkAndUpdateSource(msg.data); break;
        case 'token_updated': updateToken(msg.data); break;
    }
})

function updateToken(data) {
    const {jwtToken, refreshToken} = data;
    chrome.storage.local.set({ auth: { jwtToken, refreshToken } });
    App.token = jwtToken;
    chrome.browserAction.setBadgeText({ text: 'on' })
}

function checkAndUpdateSource(data) {
    const {pageUrl, sourceUrl, titleSelector} = data;
    
    if (sourceUrl[sourceUrl.length-1] !== '/') {
        sourceUrl += '/';
    }

    const filterQueryBase64 = btoa(JSON.stringify([{property: 'url', type: 'eq', value: sourceUrl}]));

    $.ajax({
        method: 'GET',
        url: 'https://svandis-api-prod.herokuapp.com/api/web-feed/filter?filter=' + filterQueryBase64,
        beforeSend: (xhr) => { xhr.setRequestHeader('Authorization', 'Bearer ' + App.token) },
        success: data => {
            const sources = data.content;

            if (sources.length > 0) {
                const source = sources[0];
                const selectors = source.link_selector.split(', ');
                if (!selectors.includes(titleSelector)) {
                    selectors.push(titleSelector);
                }
                source.link_selector = selectors.join(',');
                return updateSource(source);
            }

            return createSource({ sourceUrl, titleSelector });
        },
        error: (xhr) => {
            log({ t: 'check_n_update_source', xhr })   
        }
    })
}

function updateSource(source) {
    $.ajax({
        method: 'PUT',
        url: 'https://svandis-api-prod.herokuapp.com/api/web-feed/' + source.id,
        beforeSend: (xhr) => { 
            xhr.setRequestHeader('Authorization', 'Bearer ' + App.token);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        },
        data: $.param({
            web_feed: {
                title: source.title,
                url: source.url,
                link_selector: source.link_selector,
                time_interval: source.time_interval
            }
        }),
        success: data => {
            sendTabMessage({ action: 'source_updated' })
        },
        error: xhr => { 
            sendTabMessage({ action: 'source_updated_error' })
        }
    });
}

function createSource(data) {
    const title = data.sourceUrl.split('/')[2];

    const params = $.param({
        web_feed: {
            title: title,
            url: data.sourceUrl,
            link_selector: data.titleSelector,
            time_interval: 2000
        }
    });

    $.ajax({
        method: 'POST',
        url: 'https://svandis-api-prod.herokuapp.com/api/web-feed',
        beforeSend: (xhr) => { 
            xhr.setRequestHeader('Authorization', 'Bearer ' + App.token);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        },
        data: params,
        success: data => { 
            sendTabMessage({ action: 'source_created' });
        },
        error: xhr => { 
            sendTabMessage({ action: 'source_created_error' })
        }
    });
}