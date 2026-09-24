import { useEffect, useRef } from 'react';
import { mountScaleDemo } from './scale-demo';

export default function ScaleDemo() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => host.current ? mountScaleDemo(host.current) : undefined, []);
  return <div ref={host} className="pivot-scale-embed" />;
}
