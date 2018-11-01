$(function() {
    const $loginForm = $('#login-form');
    const $email = $('#id-email');
    const $password = $('#id-password');
    const $submitButton = $('form#login button.submit');
    const $regenerateTokenButton = $('button#regenerate-token');

    $submitButton.on('click', (e) => {
        e.preventDefault();

        $.ajax({
            method: 'POST',
            url: 'https://svandis-api-prod.herokuapp.com/api/login_check',
            data: {
                username: $email.val(),
                password:  $password.val()
            },
            success: function(data) {
                // log({t:'login_succes', data})
                // chrome.storage.local.set({auth: {jwtToken: data.token, refreshToken: data.refresh_token}});

                $('#login-form').hide();
                $('#token-info').show();
                $('#auth-token').val(data.token);
                $('#refresh-token').val(data.refresh_token);

                chrome.runtime.sendMessage({ action: 'token_updated', data: { jwtToken: data.token, refreshToken: data.refresh_token } });
                swal({ text: 'Authorized', icon: 'success' });
            },
            error: function(xhr, status, error) {
                { swal({ text: 'Authentication error:\n' + JSON.stringify(xhr), icon: 'error' }); }
            }
        })
    })

    chrome.storage.local.get(['auth'], (data) => {
        if (data.auth) {
            $('#login-form').hide();
            $('#token-info').show();
            $('#auth-token').val(data.auth.jwtToken);
            $('#refresh-token').val(data.auth.refreshToken);
        }
        else {
            $('#login-form').show();
            $('#token-info').hide();
        }
    })

    $regenerateTokenButton.on('click', (e) => {
        e.preventDefault();

        chrome.storage.local.get(['auth'], (data) => {
            if (data.auth) {
                $.ajax({
                    method: 'POST',
                    url: 'https://svandis-api-prod.herokuapp.com/api/token/refresh',
                    data: {
                        refresh_token: data.auth.refreshToken
                    },
                    success: (data) => {
                        // log(data)
                        // chrome.storage.local.set({auth: {jwtToken: data.token, refreshToken: data.refresh_token}});
                        $('#auth-token').text(data.token);
                        $('#refresh-token').text(data.refresh_token);

                        chrome.runtime.sendMessage({ action: 'token_updated', data: { jwtToken: data.token, refreshToken: data.refresh_token } });
                        swal({ text: 'Token regenerated', icon: 'success' });
                    },
                    error: xhr => { swal({ text: 'Regeneration token error:\n' + JSON.stringify(xhr), icon: 'error' }); }
                });
            }
        })
    })
});

function log(data) { alert(JSON.stringify(data)) } 