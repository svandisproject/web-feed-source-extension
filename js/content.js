chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_LOADED' });
chrome.runtime.onMessage.addListener(msg => {
    if (msg.action == 'add_source_clicked') {
        const absoluteUrl = msg.data.linkUrl;
        const relativeUrl = msg.data.linkUrl.replace(/http(s)?:\/\/[0-9a-zA-Z\.]+\//g, '/');
        const linkSelector = `a[href="${absoluteUrl}"], a[href="${relativeUrl}"]`;
        const $link = $(linkSelector);

        if ($link) {
            let nearestParents = $link.parents().toArray().slice(0, 2);
            // alert(JSON.stringify(nearestParents))
            let selectors = nearestParents.map(p => {
                let $element = $(p);
                let str = $element.prop('tagName').toString().toLowerCase();
                if ($element.prop('id') !== '') { str += '#'+$element.prop('id').split(' ')[0]; }
                if ($element.prop('class') !== '') { str += '.'+$element.prop('class').split(' ').join('.'); }
                return str
            });
            // alert(JSON.stringify(selectors))
            const selectorString = selectors.reverse().join(' > ') + ' > a';

            const data = {
                pageUrl: msg.data.pageUrl,
                sourceUrl: `${window.location.protocol}//${window.location.host}/`,
                titleSelector: selectors.reverse().join(' > ') + ' > a'
            }

            swal({
                text: `Add selector [${selectorString}] for [${window.location.protocol}//${window.location.host}/]`,
                buttons: true
            }).then(isConfirmed => {
                if (isConfirmed) {
                    chrome.runtime.sendMessage({ action: 'update_source_confirmed', data });
                }
            });
        }
    }
    
    if (msg.action == 'source_updated') { swal({ text: 'Source Updated', icon: 'success' }) };
    if (msg.action == 'source_created') { swal({ text: 'New Source Was Added', icon: 'success' }) };
    if (msg.action == 'source_updated_error' || msg.action == 'source_created_error') { swal({ text: 'Error During Source Creation/Update', icon: 'error' }) };
});