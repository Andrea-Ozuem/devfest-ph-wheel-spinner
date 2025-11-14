import { useEffect } from 'react';

export const Confetti = () => {
  useEffect(() => {
    const colors = ['#5E35B1', '#4285F4', '#EA4335', '#FBBC04', '#34A853'];
    const confettiCount = 50;
    const confettiElements: HTMLDivElement[] = [];

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-particle';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.width = (Math.random() * 10 + 5) + 'px';
      confetti.style.height = (Math.random() * 10 + 5) + 'px';
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      
      document.body.appendChild(confetti);
      confettiElements.push(confetti);
    }

    return () => {
      confettiElements.forEach(el => el.remove());
    };
  }, []);

  return null;
};
