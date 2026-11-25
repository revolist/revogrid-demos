import { useEffect, useRef } from 'react';
import { mountForecast } from './forecast';

export default function CategoryForecast() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => (host.current ? mountForecast(host.current) : undefined), []);
  return <div ref={host} className="forecast-host" />;
}
