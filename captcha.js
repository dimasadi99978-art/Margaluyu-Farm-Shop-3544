// Menampilkan kotak CAPTCHA Turnstile di form (hanya bila site key diisi di turnstile-config.js).
(function () {
    var key = window.MF_TURNSTILE_SITEKEY;
    var box = document.getElementById('cfTurnstile');
    if (!key || !box) return;
    var widget = null, token = '';
    window.MF_captchaToken = function () { return token; };
    window.MF_captchaReset = function () {
        token = '';
        if (window.turnstile && widget !== null) { try { window.turnstile.reset(widget); } catch (e) { /* abaikan */ } }
    };
    window.onTurnstileLoad = function () {
        widget = window.turnstile.render(box, {
            sitekey: key,
            callback: function (t) { token = t; },
            'expired-callback': function () { token = ''; },
            'error-callback': function () { token = ''; }
        });
    };
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
    s.async = true; s.defer = true;
    document.head.appendChild(s);
})();
