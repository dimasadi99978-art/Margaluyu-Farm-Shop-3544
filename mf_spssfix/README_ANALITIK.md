# Pembaruan Admin Analitik Margaluyu Farm

## Excel
Tombol **Unduh Excel + Grafik (.xlsx)** menghasilkan workbook dengan:
- Sheet **Pesanan**: data pesanan lengkap.
- Sheet **Rating**: data rating/testimoni.
- Sheet **Ringkasan**: total pesanan, total pendapatan, rata-rata rating, ringkasan bulanan, ringkasan status, dan grafik Excel native.

## SPSS
Tombol **Unduh Data SPSS (.zip)** menghasilkan paket:
- `pesanan.csv`
- `rating.csv`
- `import-ke-spss.sps`
- `README-SPSS.txt`

Setelah ZIP diekstrak, buka `import-ke-spss.sps` di SPSS dan jalankan syntax. SPSS akan mengimpor CSV dan menyimpan hasil sebagai `pesanan.sav` dan `rating.sav`.


## Variable View SPSS
Paket SPSS sekarang juga menyertakan `variabel-view.csv` sebagai referensi Variable View. Syntax `import-ke-spss.sps` otomatis mengatur:
- Variable Label untuk setiap variabel.
- Value Labels untuk `Status_Kode` dan `Rating`.
- Measure: `Scale` untuk Jumlah dan Total_Rp; `Ordinal` untuk Rating; `Nominal` untuk variabel kategori/teks.
- File `.sav` yang dihasilkan SPSS akan membawa metadata tersebut ke Variable View.
