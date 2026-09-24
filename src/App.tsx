import './App.css';
import BuildPlanner from './build-planner/BuildPlanner';
import { useScrollToContentOnLandscape } from './build-planner/components/useScrollToContentOnLandscape';
import LongUrlImporter from './build-planner/plan/LongUrlImporter';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './Footer';
import MobileNotice from './mobile-notice/MobileNotice';

function App() {
  useScrollToContentOnLandscape();
  return (
    <>
      <MobileNotice />
      <main>
        <ErrorBoundary>
          <BuildPlanner />
        </ErrorBoundary>
      </main>
      <Footer />
      <LongUrlImporter />
    </>
  );
}

export default App;
