// Struk pesanan sebagai gambar JPG (digambar di canvas; tanpa pustaka tambahan).
(function () {
    var S = 3, M = 20, PW = 380, W = PW + M * 2, PAD = M + 24, IW = PW - 48, T = 7;
    var HEAD = "'Bricolage Grotesque', 'Inter', Arial, sans-serif", BODY = "'Inter', 'Segoe UI', Arial, sans-serif";
    var INK = '#12362e', SAGE = '#6b8a7a', GRAY = '#6f6f66', BG = '#efede4';
    var STATUS = { 'Dikonfirmasi': ['#fff1c9', '#7a5a00'], 'Dikemas': ['#e1ecf8', '#1f4e79'], 'Dikirim': ['#e8e1f6', '#4b2e83'], 'Selesai': ['#dcefdc', '#1d6b3c'] };

    function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function font(g, wt, sz, fam) { g.font = wt + ' ' + sz + 'px ' + fam; }
    function spaced(g, px) { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; }
    function wrap(g, s, maxW) {
        var words = String(s || '-').split(/\s+/), lines = [], line = '';
        words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
        if (line) lines.push(line); return lines;
    }
    function rupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }

    function content(g, d, logo) {
        var y = M + T + 26, cx = W / 2;
        g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        if (logo && logo.width) { var lh = 30, lw = lh * logo.width / logo.height; g.drawImage(logo, cx - lw / 2, y, lw, lh); y += lh + 12; }
        font(g, 700, 22, HEAD); g.fillStyle = INK; g.fillText('Margaluyu Farm', cx, y + 16); y += 24;
        font(g, 600, 10, BODY); spaced(g, 2); g.fillStyle = SAGE; g.fillText('SUSU KAMBING SAANEN SEGAR', cx, y + 10); spaced(g, 0); y += 30;
        // pita "STRUK PESANAN"
        font(g, 700, 10.5, BODY); spaced(g, 1.8); var pw = g.measureText('STRUK PESANAN').width + 28;
        rr(g, cx - pw / 2, y, pw, 22, 11); g.fillStyle = '#e8f0e4'; g.fill();
        g.fillStyle = INK; g.fillText('STRUK PESANAN', cx + 1, y + 15); spaced(g, 0); y += 38;
        // kotak nomor pesanan
        rr(g, PAD, y, IW, 64, 12); g.fillStyle = '#f3f6ef'; g.fill(); g.strokeStyle = '#dbe6d6'; g.lineWidth = 1; g.stroke();
        font(g, 700, 9.5, BODY); spaced(g, 1.8); g.fillStyle = SAGE; g.fillText('NOMOR PESANAN', cx, y + 22); spaced(g, 0);
        font(g, 700, 21, BODY); g.fillStyle = INK; g.fillText(d.id, cx, y + 48); y += 64 + 16;
        // tanggal + status
        font(g, 400, 12.5, BODY); g.fillStyle = GRAY; g.textAlign = 'left'; g.fillText(d.tanggal, PAD, y + 15);
        var sc = STATUS[d.status] || STATUS['Dikonfirmasi']; font(g, 700, 11.5, BODY);
        var sw = g.measureText(d.status).width + 22; rr(g, PAD + IW - sw, y, sw, 22, 11); g.fillStyle = sc[0]; g.fill();
        g.fillStyle = sc[1]; g.textAlign = 'center'; g.fillText(d.status, PAD + IW - sw / 2, y + 15); y += 40;
        y = tear(g, y);
        y = section(g, 'PELANGGAN', y);
        [['Nama', d.nama], ['No. HP', d.hp], ['Alamat', d.alamat]].forEach(function (r) {
            font(g, 400, 12.5, BODY); g.fillStyle = GRAY; g.textAlign = 'left'; g.fillText(r[0], PAD, y + 13);
            font(g, 600, 13.5, BODY); g.fillStyle = '#222';
            var ls = wrap(g, r[1], IW - 82); ls.forEach(function (l, i) { g.fillText(l, PAD + 82, y + 13 + i * 18); });
            y += ls.length * 18 + 6;
        });
        y += 4; y = solid(g, y);
        y = section(g, 'RINCIAN PESANAN', y);
        font(g, 700, 14.5, BODY); g.fillStyle = INK; g.textAlign = 'left';
        var pl = wrap(g, d.produk, IW - 100); pl.forEach(function (l, i) { g.fillText(l, PAD, y + 13 + i * 18); });
        g.textAlign = 'right'; g.fillText(d.total ? rupiah(d.total) : '-', PAD + IW, y + 13);
        y += pl.length * 18; g.textAlign = 'left'; font(g, 400, 12.5, BODY); g.fillStyle = GRAY;
        g.fillText(d.qty + ' \u00D7 ' + rupiah(d.unit), PAD, y + 14); y += 34;
        // bar total
        rr(g, PAD, y, IW, 58, 12); g.fillStyle = INK; g.fill();
        font(g, 700, 10, BODY); spaced(g, 1.8); g.fillStyle = '#a9c9b6'; g.textAlign = 'left'; g.fillText('TOTAL BAYAR', PAD + 16, y + 24); spaced(g, 0);
        font(g, 400, 12, BODY); g.fillStyle = '#e6efe9'; g.fillText('via ' + d.bayar, PAD + 16, y + 43);
        font(g, 700, 25, HEAD); g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText(d.total ? rupiah(d.total) : '-', PAD + IW - 16, y + 37); y += 58 + 22;
        y = tear(g, y);
        // penutup
        g.textAlign = 'center'; font(g, 700, 13.5, BODY); g.fillStyle = INK; g.fillText('Terima kasih sudah memesan', cx, y + 14); y += 24;
        font(g, 400, 11.5, BODY); g.fillStyle = GRAY;
        wrap(g, 'Pantau status pesanan di halaman Lacak Pesanan menggunakan nomor pesanan di atas.', IW - 30).forEach(function (l, i) { g.fillText(l, cx, y + 12 + i * 15); y += 0; });
        y += 2 * 15 + 12;
        // garis kode (dekoratif, dari nomor pesanan)
        var bx = cx - 70, seed = 7; g.fillStyle = INK;
        for (var i = 0; i < d.id.length * 3 && bx < cx + 70; i++) { seed = (seed * 31 + d.id.charCodeAt(i % d.id.length)) % 97; var bw = 1 + seed % 3; g.fillRect(bx, y, bw, 28); bx += bw + 1 + (seed % 2); }
        y += 28 + 20;
        font(g, 400, 10.5, BODY); g.fillStyle = '#8a8a80'; g.fillText('0895-6350-67289  \u00B7  Surabaya, Jawa Timur', cx, y); y += 20;
        return y + T;
    }
    function section(g, t, y) { font(g, 700, 10, BODY); spaced(g, 1.8); g.fillStyle = SAGE; g.textAlign = 'left'; g.fillText(t, PAD, y + 10); spaced(g, 0); return y + 24; }
    function solid(g, y) { g.strokeStyle = '#ece8dc'; g.lineWidth = 1; g.beginPath(); g.moveTo(PAD, y); g.lineTo(PAD + IW, y); g.stroke(); return y + 18; }
    function tear(g, y) { // garis putus-putus dengan lubang tiket di kedua sisi
        g.strokeStyle = '#cfc9b8'; g.lineWidth = 1; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(PAD - 4, y); g.lineTo(PAD + IW + 4, y); g.stroke(); g.setLineDash([]);
        g.fillStyle = BG; [M, M + PW].forEach(function (x) { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); });
        return y + 24;
    }
    function paper(g, h) {
        g.fillStyle = BG; g.fillRect(0, 0, W, h);
        g.save(); g.shadowColor = 'rgba(18,54,46,.16)'; g.shadowBlur = 14; g.shadowOffsetY = 4; g.fillStyle = '#fff';
        g.beginPath(); g.moveTo(M, M + T);
        for (var x = M; x < M + PW; x += 10) { g.lineTo(x + 5, M); g.lineTo(x + 10, M + T); }
        g.lineTo(M + PW, h - M - T);
        for (var x2 = M + PW; x2 > M; x2 -= 10) { g.lineTo(x2 - 5, h - M); g.lineTo(x2 - 10, h - M - T); }
        g.closePath(); g.fill(); g.restore();
    }
    function loadLogo() { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = 'img/logo-mark.png'; }); }

    window.MFReceipt = {
        download: function (d) {
            var fonts = document.fonts ? Promise.all([document.fonts.load('700 22px "Bricolage Grotesque"'), document.fonts.load('400 13px "Inter"'), document.fonts.load('700 13px "Inter"')]).catch(function () { }) : Promise.resolve();
            fonts = Promise.race([fonts, new Promise(function (r) { setTimeout(r, 2500); })]); // jangan menunggu selamanya bila font gagal dimuat
            return Promise.all([fonts, loadLogo()]).then(function (r) {
                function build(logo) {
                    var sc = document.createElement('canvas').getContext('2d');
                    var h = Math.ceil(content(sc, d, logo) + M);
                    var cv = document.createElement('canvas'); cv.width = W * S; cv.height = h * S;
                    var g = cv.getContext('2d'); g.scale(S, S); paper(g, h); content(g, d, logo);
                    return new Promise(function (res) {
                        try {
                            cv.toBlob(function (b) {
                                var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'struk-' + d.id + '.jpg';
                                document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); res();
                            }, 'image/jpeg', 0.95);
                        } catch (e) { // dibuka langsung dari file lokal: logo membuat canvas "tercemar", ulangi tanpa logo
                            if (logo) res(build(null)); else res();
                        }
                    });
                }
                return build(r[1]);
            });
        }
    };
})();
