// Dev-only: the whole lineup, side and rear, for design review (?lineup).
import {useEffect, useRef} from 'react';
import {CARS, carSprite, paintById, PAINTS} from '../game/cars';
import CarSide from '../ui/CarSide';

function Rear({id, paint}: {id: string; paint: string}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const g = c.getContext('2d')!;
    const car = CARS.find(x => x.id === id)!;
    const s = carSprite(car, paintById(paint));
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(s.body, 0, 0);
    g.globalCompositeOperation = 'lighter';
    g.drawImage(s.glow, 0, 0);
    g.globalCompositeOperation = 'source-over';
  }, [id, paint]);
  return <canvas ref={ref} width={240} height={150} style={{width: 160, height: 100}} />;
}

export default function Lineup() {
  const page = Number(new URLSearchParams(location.search).get('p') ?? 0);
  const cars = CARS.slice(page * 4, page * 4 + 4);
  return (
    <div style={{display: 'grid', gap: 4, padding: 6, background: '#06080b', height: 600, overflow: 'hidden'}}>
      {cars.map(c => (
        <div key={c.id} style={{display: 'grid', gridTemplateColumns: '1fr 160px', alignItems: 'center', gap: 4}}>
          <div>
            <div style={{color: '#fff', font: '900 italic 14px system-ui'}}>{c.name}</div>
            <CarSide car={c} paint={paintById(c.paint)} width={400} />
          </div>
          <Rear id={c.id} paint={c.paint} />
        </div>
      ))}
      <div style={{display: 'flex', gap: 4}}>
        {PAINTS.map(p => (
          <span key={p.id} style={{width: 20, height: 20, borderRadius: 10, background: p.base}} />
        ))}
      </div>
    </div>
  );
}
