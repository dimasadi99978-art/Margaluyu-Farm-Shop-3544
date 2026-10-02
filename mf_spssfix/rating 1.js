// rating.js (File terpisah, letakkan di folder yang sama dengan rating.html atau subfolder js/)

document.getElementById('ratingForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Mencegah pengiriman form default

    // Ambil nilai dari form
    const nama = document.getElementById('nama').value;
    const rating = document.querySelector('input[name="rating"]:checked') ? document.querySelector('input[name="rating"]:checked').value : '';
    const komentar = document.getElementById('komentar').value;

    // Validasi sederhana
    if (!nama || !rating || !komentar) {
        alert('Harap isi semua field!');
        return;
    }

    // Buat pesan untuk WhatsApp
    const pesan = `Penilaian Produk Susu Saanen\n\nNama: ${nama}\nRating: ${rating} bintang\nKomentar: ${komentar}`;

    // Nomor WhatsApp (GANTI DENGAN NOMOR ASLI, misalnya '6281234567890')
    const nomorWhatsApp = '628xxxxxxxxx'; // Ganti dengan nomor WhatsApp admin yang sebenarnya
    const urlWhatsApp = `https://wa.me/${nomorWhatsApp}?text=${encodeURIComponent(pesan)}`;

    // Buka WhatsApp di tab baru
    window.open(urlWhatsApp, '_blank');

    // Simpan data ke localStorage untuk testimoni
    try {
        let testimoni = JSON.parse(localStorage.getItem('testimoni')) || [];
        const dataTestimoni = {
            nama: nama,
            rating: rating,
            komentar: komentar,
            tanggal: new Date().toLocaleString('id-ID')
        };
        testimoni.push(dataTestimoni);
        localStorage.setItem('testimoni', JSON.stringify(testimoni));
    } catch (error) {
        alert('Gagal menyimpan data. Coba lagi atau hubungi admin.');
        console.error('Error saving to localStorage:', error);
        return;
    }

    // Tampilkan overlay terima kasih
    document.getElementById('thankYouOverlay').style.display = 'flex';

    // Reset form
    document.getElementById('ratingForm').reset();

    // Redirect ke testimoni.html setelah overlay ditutup (atau langsung setelah simpan)
    // Jika ingin langsung redirect tanpa overlay, uncomment baris di bawah dan comment overlay
    // window.location.href = 'testimoni.html';
});

// Fungsi untuk menutup overlay terima kasih dan redirect
function closeThankYou() {
    document.getElementById('thankYouOverlay').style.display = 'none';
    // Redirect ke testimoni.html setelah tutup overlay
    window.location.href = 'testimoni.html';
}