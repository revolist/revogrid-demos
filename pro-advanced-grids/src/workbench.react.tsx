import { useEffect, useRef } from 'react';
import { mountWorkbench } from './workbench';

export default function AdvancedGrids() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(
    () => (host.current ? mountWorkbench(host.current) : undefined),
    [],
  );
  return <div ref={host} className="workbench-host" />;
}
