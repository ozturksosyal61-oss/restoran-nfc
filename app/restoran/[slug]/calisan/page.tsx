"use client";

import { useState } from "react";

export default function EmployeeRatingPage() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  return (
    <main className="restaurant-page">
      <section className="hero">
        <div className="logo">OZT</div>

        <h1>OZT KAFE</h1>

        <p>Çalışanı Değerlendir</p>
      </section>

      <section className="rating-section">
        <h2>Çalışan Seç</h2>

        <select className="employee-select">
          <option value="">Çalışan seçiniz</option>
          <option value="ahmet">Ahmet</option>
          <option value="ayse">Ayşe</option>
          <option value="mehmet">Mehmet</option>
        </select>

        <h2>Puanınız</h2>

        <div className="stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={star <= rating ? "star active" : "star"}
            >
              ★
            </button>
          ))}
        </div>

        <p>Seçilen puan: {rating} / 5</p>

        <h2>Yorumunuz</h2>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Deneyiminizi paylaşabilirsiniz..."
          rows={5}
          className="comment-box"
        />

        <button
          type="button"
          className="submit-button"
          onClick={() => {
            alert("Değerlendirmeniz alınmıştır!");
          }}
        >
          Değerlendirmeyi Gönder
        </button>
      </section>
    </main>
  );
}