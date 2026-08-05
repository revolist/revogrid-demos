import { useEffect, useRef } from 'react';
import { mountRemoteFilteringRecipe } from './remote.shared';

export default function RemoteFilteringRecipe() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => root.current ? mountRemoteFilteringRecipe(root.current) : undefined, []);
  return <div ref={root} className="remote-filter-recipe" />;
}
