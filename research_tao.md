# Riset Eksperimen TAO (Bittensor)
# Skill: the-scientist | Metode: Hipotesis -> Kontrol -> Bukti

## Hipotesis
Sinyal Astronomi (planet alignment) + LSTM Bidirectional menghasilkan interferensi positif untuk prediksi arah TAO, mengingat sifat crossover AI/crypto yang sensitif terhadap siklus waktu.

## Kontrol
Buy & Hold TAO (baseline) vs Strategi LSTM Astronomi.

## Variabel Terkontrol
- Threshold: 0.005 (0.5%)
- Fitur: 12 fitur dari dataset_master (bb_width, Jupiter_sin, is_Venus_retrograde, dll)
- Model: Bidirectional LSTM (128) + Dropout 0.2, 20 epoch
- Data: dataset_master.csv (4040 baris, 2014-2026) — adaptasi diperlukan jika ingin data TAO spesifik

## Bukti (Metrics Target)
- Akurasi prediksi arah (>0.5% naik)
- Precision (seberapa sering BUY benar profit)
- Maximum Drawdown (risiko saat bear market)
- Return kumulatif vs Buy & Hold

## Catatan Analisis Coin
- Harga: ~$259.06
- Volume: ~$221M
- Kategori: AI x Crypto (unik dibanding ZEC/ARB/LINK)
- Turun -13.44% dari ATH → ruang uji drawdown
- Interferensi fitur: Astronomi mungkin memiliki korelasi berbeda dengan AI-token dibanding privacy/L2/oracle

## Langkah Selanjutnya (Riset)
1. Adaptasi dataset_master untuk data harga TAO (jika tersedia) atau gunakan dataset_master sebagai proxy dengan label TAO.
2. Jalankan train_lstm_experiment.py dengan target TAO.
3. Evaluasi dengan backtest.py (equity_curve vs buy_hold).
4. Catat hasil di experiment_log.csv.

## Referensi Skill
- Skill: `the-scientist` (metode ilmiah)
- Model: `model_astronacci_v1.keras`
- Data: `dataset_master.csv`, `coin_analysis.csv`
- Log: `experiment_log.csv`
