import React from 'react';
import './Flashcard.css';

export default function Flashcard({ isFlipped, front, back }) {
  return (
    <div className="flashcard-container">
      <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-front">{front}</div>
        <div className="flashcard-back">{back}</div>
      </div>
    </div>
  );
}