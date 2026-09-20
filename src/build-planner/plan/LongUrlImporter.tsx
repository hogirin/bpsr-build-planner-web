import { useEffect } from 'react';
import { extractPlanCodeFromHash } from './longUrl';
import { useBuildStore } from '../store/useBuildStore';

function LongUrlImporter() {
  const importPlanCode = useBuildStore((state) => state.importPlanCode);

  useEffect(() => {
    const runImport = () => {
      const planCode = extractPlanCodeFromHash(window.location.hash);
      if (!planCode) return;
      importPlanCode(planCode);
    };

    runImport();
    window.addEventListener('hashchange', runImport);
    return () => window.removeEventListener('hashchange', runImport);
  }, [importPlanCode]);

  return null;
}

export default LongUrlImporter;
