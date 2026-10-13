// Dev-only: drive the engine directly (?drive). Arrows steer/nitro/brake.
import {useEffect, useRef} from 'react';
import {carById, paintById} from '../game/cars';
import {Game} from '../game/engine';

export default function DriveTest() {
  const ref = useRef<HTMLCanvasElement>(null);
  const hud = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const car = carById(q.get('car') ?? 'pocket');
    const game = new Game(ref.current!, {car, paint: paintById(q.get('paint') ?? car.paint), mode: q.has('attract') ? 'attract' : 'play', units: 'mph', hud: hud.current!, onEnd: r => ((window as unknown as {result: unknown}).result = r)});
    (window as unknown as {game: Game}).game = game;
    game.start();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') game.steer(-1);
      if (e.key === 'ArrowRight') game.steer(1);
      if (e.key === 'ArrowUp' || e.key === 'Enter') game.nitro();
      if (e.key === 'ArrowDown') game.brake();
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      game.stop();
    };
  }, []);
  return (
    <div style={{position: 'relative', width: 600, height: 600}}>
      <canvas ref={ref} style={{width: 600, height: 600, display: 'block'}} />
      <canvas ref={hud} style={{position: 'absolute', inset: 0, width: 600, height: 600}} />
    </div>
  );
}
