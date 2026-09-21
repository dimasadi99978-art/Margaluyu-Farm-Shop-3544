// Fungsi untuk menampilkan testimoni dari penyimpanan bersama (atau lokal jika belum di-setup)
async function displayDynamicTestimonials() {
    const testimoniContainer = document.getElementById('dynamicTestimonials');
    if (!testimoniContainer) return;

    testimoniContainer.innerHTML = '<p style="text-align:center;color:#666;">Memuat testimoni...</p>';

    try {
        const { data: testimoniList, online } = await TestimoniStore.load();

        renderStatusBadge(online);

        if (testimoniList.length === 0) {
            testimoniContainer.innerHTML = '<p style="text-align:center;color:#666;">Belum ada testimoni baru. Silakan isi formulir penilaian terlebih dahulu!</p>';
            return;
        }

        // Urutkan dari yang terbaru (akhir array)
        const sortedTestimoni = [...testimoniList].reverse();

        let html = '';
        sortedTestimoni.forEach((item) => {
            // Generate stars based on rating (kritik & saran entries have no rating)
            let starsBlock = '';
            if (item.rating && Number(item.rating) > 0) {
                let stars = '';
                for (let i = 0; i < 5; i++) {
                    if (i < item.rating) {
                        stars += '<i class="fas fa-star" style="color:#FFC300;"></i>';
                    } else {
                        stars += '<i class="fas fa-star" style="color:#ddd;"></i>';
                    }
                }
                starsBlock = `<div class="rating" style="margin:5px 0;">${stars}</div>`;
            } else {
                starsBlock = '<div class="rating" style="margin:5px 0; font-size:0.85em; color:#2e7d32; font-weight:600;">Kritik & Saran Pelanggan</div>';
            }

            html += `
                <div class="dynamic-testimoni-item">
                    <div class="customer-photo" style="margin: 0 auto 10px;">
                        <i class="fas fa-user"></i>
                    </div>
                    <h3>${item.nama}</h3>
                    ${starsBlock}
                    <p>"${item.komentar}"</p>
                    <small style="display:block;margin-top:8px;color:#666;font-style:italic;">Tanggal: ${item.tanggal}</small>
                </div>
            `;
        });

        testimoniContainer.innerHTML = html;
    } catch (e) {
        console.error('Error displaying testimonials:', e);
        testimoniContainer.innerHTML = '<p style="text-align:center;color:#666;">Terjadi kesalahan saat memuat testimoni.</p>';
    }
}

// Menampilkan badge kecil penanda apakah testimoni sudah tersambung ke server bersama
function renderStatusBadge(online) {
    const container = document.getElementById('dynamicTestimonials');
    if (!container || !container.parentElement) return;

    let badge = document.getElementById('testimoniStatusBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'testimoniStatusBadge';
        badge.style.cssText = 'text-align:center;font-size:12.5px;margin-bottom:14px;';
        container.parentElement.insertBefore(badge, container);
    }

    if (online) {
        badge.innerHTML = '<i class="fas fa-globe" style="color:#27ae60;"></i> Testimoni bersama — terlihat oleh semua pengunjung';
        badge.style.color = '#27ae60';
    } else if (typeof TestimoniStore !== 'undefined' && !TestimoniStore.isConfigured()) {
        badge.innerHTML = '<i class="fas fa-desktop" style="color:#c98a3e;"></i> Mode lokal — testimoni baru hanya terlihat di perangkat ini. Lihat setup-testimoni.html untuk mengaktifkan mode bersama.';
        badge.style.color = '#c98a3e';
    } else {
        badge.innerHTML = '<i class="fas fa-triangle-exclamation" style="color:#c0392b;"></i> Gagal tersambung ke server bersama, menampilkan data cadangan di perangkat ini.';
        badge.style.color = '#c0392b';
    }
}

// Panggil fungsi saat halaman dimuat
document.addEventListener('DOMContentLoaded', displayDynamicTestimonials);
