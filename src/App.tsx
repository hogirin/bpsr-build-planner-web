import './App.css';
import BuildPlanner from './build-planner/BuildPlanner';
import LongUrlImporter from './build-planner/plan/LongUrlImporter';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './Footer';

function App() {
  return (
    <>
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
